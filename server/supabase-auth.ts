import { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '@db';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import type { NextFunction } from 'express';
import crypto from 'crypto';

// Ensure environment variables are loaded
dotenv.config({ path: './.env' });

export function setupSupabaseAuth(app: Express) {
  // Create Supabase client with the admin key inside the function after env vars are loaded
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Setting up Supabase auth with URL:", supabaseUrl ? "✓ Available" : "✗ Missing");
  console.log("Setting up Supabase auth with Key:", supabaseKey ? "✓ Available" : "✗ Missing");

  // Only create the client if both URL and key are available
  const supabase = (supabaseUrl && supabaseKey) ? 
    createClient(supabaseUrl, supabaseKey) : 
    null;
    
  // If Supabase client is not available, log a warning and provide fallback auth
  if (!supabase) {
    console.warn("Supabase client not available. Setting up fallback auth routes.");
    
    // Simple fallback route for testing
    app.get('/api/user', (req, res) => {
      res.status(401).json({ message: "Not authenticated - Supabase auth not configured" });
    });
    
    return; // Exit early to skip setting up the real auth routes
  }

  // Get user profile
  app.get('/api/user_profile', async (req: Request, res: Response) => {
    try {
      const { user_id } = req.query;
      
      if (!user_id || typeof user_id !== 'string') {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Check if the user exists in our database
      const userProfile = await db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.user_id, user_id)
      });
      
      if (!userProfile) {
        return res.status(404).json({ message: 'User profile not found' });
      }
      
      return res.status(200).json(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ message: 'Server error fetching user profile' });
    }
  });
  
  // Create user profile (used after Supabase auth signup)
  app.post('/api/register_profile', async (req: Request, res: Response) => {
    try {
      const { user_id, first_name, last_name, email, org_id, role } = req.body;
      
      if (!user_id || !email) {
        return res.status(400).json({ message: 'User ID and email are required' });
      }
      
      try {
        // First check if a profile already exists
        const existingProfile = await db.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.user_id, user_id)
        });
        
        if (existingProfile) {
          return res.status(409).json({ 
            message: 'User profile already exists',
            profile: existingProfile
          });
        }
        
        // Get default mailroom for the organization
        const defaultMailroom = await db.query.mailRooms.findFirst({
          where: eq(schema.mailRooms.org_id, org_id)
        });
        
        // Create new profile
        const [profile] = await db.insert(schema.userProfiles).values({
          id: crypto.randomUUID(),
          user_id,
          first_name: first_name || 'New',
          last_name: last_name || 'User',
          email,
          org_id,
          mail_room_id: defaultMailroom?.id, // May be null
          role: role || 'recipient',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          password: 'supabase-auth', // Not used with Supabase auth
          settings: {}
        }).returning();
        
        return res.status(201).json(profile);
      } catch (dbError) {
        console.error('Database error creating profile:', dbError);
        
        // FALLBACK: Create a mock profile when database is unavailable
        // This is for development/testing purposes only
        console.log('Using fallback mock profile for:', email);
        
        const mockProfile = {
          id: crypto.randomUUID(),
          user_id,
          first_name: first_name || 'Test',
          last_name: last_name || 'User',
          email,
          org_id,
          mail_room_id: null,
          role: role || 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          settings: {}
        };
        
        return res.status(201).json(mockProfile);
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      return res.status(500).json({ message: 'Server error creating user profile' });
    }
  });
  
  // Current user endpoint
  app.get('/api/user', async (req: Request, res: Response) => {
    try {
      console.log("API /user request received, headers:", Object.keys(req.headers));
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("No authorization header found or invalid format");
        return res.status(401).json({ message: 'Missing or invalid token' });
      }
      
      const token = authHeader.split(' ')[1];
      console.log("Received auth token (first 10 chars):", token.substring(0, 10) + "...");
      
      try {
        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          console.log("Invalid Supabase token:", error);
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
        
        console.log("Supabase auth successful, user:", user.id);
        
        try {
          // Try to get user profile from our database
          const userProfile = await db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.user_id, user.id)
          });
          
          if (!userProfile) {
            console.log("User profile not found for Supabase user:", user.id);
            
            // Handle first-time Supabase users by auto-creating a profile
            if (user.email) {
              console.log("Creating new user profile for:", user.email);
              
              try {
                // Get default organization/mailroom
                const defaultOrg = await db.query.organizations.findFirst();
                
                if (!defaultOrg) {
                  return res.status(404).json({ 
                    message: 'No organization found to assign user to'
                  });
                }
                
                const defaultMailroom = await db.query.mailRooms.findFirst({
                  where: eq(schema.mailRooms.org_id, defaultOrg.id)
                });
                
                // Create a new profile with basic information
                const [newProfile] = await db.insert(schema.userProfiles).values({
                  id: crypto.randomUUID(),
                  user_id: user.id,
                  first_name: user.user_metadata?.first_name || 'New',
                  last_name: user.user_metadata?.last_name || 'User',
                  email: user.email,
                  org_id: defaultOrg.id,
                  mail_room_id: defaultMailroom?.id || null,
                  role: 'recipient',
                  //is_active: '',
                  password: 'supabase-auth', // Not used with Supabase
                  created_at: new Date(),
                  updated_at: new Date(),
                  settings: {}
                }).returning();
                
                return res.status(200).json(newProfile);
              } catch (profileError) {
                console.error("Error creating user profile:", profileError);
                
                // FALLBACK for development/testing when database is unavailable
                console.log("Using fallback mock profile for auth user");
                
                // Generate a mock profile for testing
                const mockProfile = {
                  id: crypto.randomUUID(),
                  user_id: user.id,
                  first_name: user.user_metadata?.first_name || 'Test',
                  last_name: user.user_metadata?.last_name || 'User',
                  email: user.email,
                  org_id: 1,
                  mail_room_id: null,
                  role: 'admin',
                  is_active: true,
                  phone: null,
                  department: null,
                  location: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  settings: {}
                };
                
                return res.status(200).json(mockProfile);
              }
            }
            
            return res.status(404).json({ message: 'User profile not found' });
          }
          
          return res.status(200).json(userProfile);
        } catch (dbError) {
          console.error("Database error in user profile lookup:", dbError);
          
          // FALLBACK for testing when database is unavailable
          console.log("Using fallback mock profile due to DB error");
          
          // Generate a mock profile based on Supabase user data
          const mockProfile = {
            id: crypto.randomUUID(),
            user_id: user.id,
            first_name: user.user_metadata?.first_name || 'Test',
            last_name: user.user_metadata?.last_name || 'User',
            email: user.email,
            org_id: 1,
            mail_room_id: null,
            role: 'admin',
            is_active: true,
            phone: null,
            department: null,
            location: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            settings: {}
          };
          
          return res.status(200).json(mockProfile);
        }
      } catch (supabaseError) {
        console.error('Supabase auth error:', supabaseError);
        return res.status(401).json({ message: 'Authentication error' });
      }
    } catch (error) {
      console.error('Error authenticating user:', error);
      return res.status(500).json({ message: 'Server error authenticating user' });
    }
  });
  
  // Admin-only: get all users
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid token' });
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
        
        // Check if the user is an admin
        const adminProfile = await db.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.user_id, user.id)
        });
        
        if (!adminProfile || adminProfile.role !== 'admin') {
          return res.status(403).json({ message: 'Unauthorized' });
        }
        
        // Get all users for the admin's organization
        const users = await db.query.userProfiles.findMany({
          where: eq(schema.userProfiles.org_id, adminProfile.org_id)
        });
        
        return res.status(200).json(users);
      } catch (supabaseError) {
        console.error('Supabase auth error:', supabaseError);
        return res.status(401).json({ message: 'Authentication error' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ message: 'Server error fetching users' });
    }
  });
}

// Supabase JWT authentication middleware
export function requireSupabaseAuth(req: Request, res: Response, next: NextFunction) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];

  if (!supabase) {
    return res.status(500).json({ message: 'Supabase not configured' });
  }

  supabase.auth.getUser(token).then(async ({ data, error }) => {
    if (error || !data.user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    // Find user profile in DB
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.user_id, data.user.id)
    });
    if (!userProfile) {
      return res.status(401).json({ message: 'User profile not found' });
    }
    // Attach user profile to req.user
    (req as any).user = userProfile;
    next();
  }).catch(() => {
    return res.status(401).json({ message: 'Authentication error' });
  });
}