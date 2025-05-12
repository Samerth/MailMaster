import { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '@db';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

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
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Check if the user exists in our database
      const userProfile = await db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, userId)
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
      const { userId, firstName, lastName, email, organizationId, role } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ message: 'User ID and email are required' });
      }
      
      // First check if a profile already exists
      const existingProfile = await db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, userId)
      });
      
      if (existingProfile) {
        return res.status(409).json({ 
          message: 'User profile already exists',
          profile: existingProfile
        });
      }
      
      // Get default mailroom for the organization
      const defaultMailroom = await db.query.mailRooms.findFirst({
        where: eq(schema.mailRooms.organizationId, organizationId || 1)
      });
      
      // Create new profile
      const [profile] = await db.insert(schema.userProfiles).values({
        userId,
        firstName: firstName || 'New',
        lastName: lastName || 'User',
        email,
        organizationId: organizationId || 1, // Default to first organization
        mailRoomId: defaultMailroom?.id, // May be null
        role: role || 'recipient',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'supabase-auth', // Not used with Supabase auth
        settings: {}
      }).returning();
      
      return res.status(201).json(profile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      return res.status(500).json({ message: 'Server error creating user profile' });
    }
  });
  
  // Current user endpoint
  app.get('/api/user', async (req: Request, res: Response) => {
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
        
        // Get user profile from our database
        const userProfile = await db.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.userId, user.id)
        });
        
        if (!userProfile) {
          return res.status(404).json({ message: 'User profile not found' });
        }
        
        return res.status(200).json(userProfile);
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
          where: eq(schema.userProfiles.userId, user.id)
        });
        
        if (!adminProfile || adminProfile.role !== 'admin') {
          return res.status(403).json({ message: 'Unauthorized' });
        }
        
        // Get all users for the admin's organization
        const users = await db.query.userProfiles.findMany({
          where: eq(schema.userProfiles.organizationId, adminProfile.organizationId)
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