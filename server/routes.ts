import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupSupabaseAuth, requireSupabaseAuth } from "./supabase-auth"; // Import Supabase auth and middleware
import { db } from "@db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import crypto from "crypto";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Shared password hashing function (also in auth.ts)
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes - using both for now during transition
  if (process.env.USE_LEGACY_AUTH === 'true') {
    console.log("[Auth] Using legacy authentication");
    setupAuth(app);
  } else {
    console.log("[Auth] Using Supabase authentication");
    setupSupabaseAuth(app);
  }

  // Organizations routes
  app.get("/api/organizations", requireSupabaseAuth, async (req, res) => {
    const user = (req as any).user;
    try {
      // Get organizations the user has access to
      const orgs = await db.query.organizations.findMany({
        where: eq(schema.organizations.id, user.id)
      });
      res.json(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update organization
  app.patch("/api/organizations/:id", requireSupabaseAuth, async (req, res) => {
    const organization_id = req.params.id;
    const user = (req as any).user;
    if (organization_id !== user.id) {
      return res.status(403).json({ message: "Unauthorized to update this organization" });
    }
    try {
      // Only update specific fields to prevent unwanted changes
      const allowedFields = ['name', 'address', 'contact_name', 'contact_email', 'contact_phone', 'logo', 'settings', 'updated_at'];
      const updateData: Record<string, any> = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      updateData.updated_at = new Date();
      const [updatedOrg] = await db.update(schema.organizations)
        .set(updateData)
        .where(eq(schema.organizations.id, organization_id))
        .returning();
      await db.insert(schema.auditLogs)
        .values({
          organization_id: user.id,
          user_id: user.id,
          action: "update",
          table_name: "organizations",
          record_id: organization_id,
          details: JSON.stringify({ message: "Updated organization settings" })
        });
      res.json(updatedOrg);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Mailrooms routes
  app.get("/api/mailrooms", requireSupabaseAuth, async (req, res) => {
    const { organization_id } = req.query;
    
    try {
      // If organization_id is provided in the query, use it
      // Otherwise, use the user's organization ID from the session
      const user = (req as any).user;
      const org_id = organization_id 
        ? Number(organization_id) 
        : user.organization_id;
        
      const mailrooms = await db.query.mailRooms.findMany({
        where: eq(schema.mailRooms.organization_id, org_id)
      });
      
      res.json(mailrooms);
    } catch (error) {
      console.error("Error fetching mailrooms:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create mailroom
  app.post("/api/mailrooms", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const mailroomData = {
        organization_id: user.organization_id,
        name: req.body.name,
        location: req.body.location || null,
        contact_email: req.body.contact_email || null,
        contact_phone: req.body.contact_phone || null,
        status: req.body.status || "active",
      };
      
      const [mailroom] = await db.insert(schema.mailRooms)
        .values(mailroomData)
        .returning();
      
      // Create an audit log
      await db.insert(schema.auditLogs).values({
        organization_id: user.organization_id,
        user_id: user.id,
        action: "create",
        table_name: "mail_rooms",
        record_id: mailroom.id,
        details: JSON.stringify({ message: `Created mailroom: ${mailroom.name}` })
      });
      
      res.status(201).json(mailroom);
    } catch (error) {
      console.error("Error creating mailroom:", error);
      res.status(500).json({ message: "Failed to create mailroom" });
    }
  });
  
  // Update mailroom
  app.patch("/api/mailrooms/:id", requireSupabaseAuth, async (req, res) => {
    const mailroom_id = req.params.id;
    
    try {
      // Verify the mailroom belongs to the user's organization
      const user = (req as any).user;
      const mailroom = await db.query.mailRooms.findFirst({
        where: and(
          eq(schema.mailRooms.id, mailroom_id),
          eq(schema.mailRooms.organization_id, user.organization_id)
        ),
      });
      
      if (!mailroom) {
        return res.status(404).json({ message: "Mailroom not found" });
      }
      
      // Only update specific fields
      const allowedFields = ['name', 'location', 'contact_email', 'contact_phone', 'status'];
      const updateData: Record<string, any> = {};
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      // Add updatedAt timestamp
      updateData.updated_at = new Date();
      
      const [updatedMailroom] = await db.update(schema.mailRooms)
        .set(updateData)
        .where(eq(schema.mailRooms.id, mailroom_id))
        .returning();
      
      // Log the update
      await db.insert(schema.auditLogs).values({
        organization_id: user.organization_id,
        user_id: user.id,
        action: "update",
        table_name: "mail_rooms",
        record_id: mailroom_id,
        details: JSON.stringify({ message: `Updated mailroom: ${mailroom.name}` })
      });
      
      res.json(updatedMailroom);
    } catch (error) {
      console.error("Error updating mailroom:", error);
      res.status(500).json({ message: "Failed to update mailroom" });
    }
  });

  // Recent activity endpoint
  app.get("/api/recent-activity", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const activities = await db.query.auditLogs.findMany({
        where: eq(schema.auditLogs.organization_id, user.organization_id),
        orderBy: (auditLogs, { desc }) => [desc(auditLogs.created_at)],
        limit: 10,
        with: {
          user: true
        }
      });
      
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mail items
  app.get("/api/mail-items", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const items = await db.query.mailItems.findMany({
        where: eq(schema.mailItems.org_id, user.organization_id),
        orderBy: (mailItems, { desc }) => [desc(mailItems.created_at)],
        limit: 20
      });
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching mail items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create a new mail item
  app.post("/api/mail-items", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      // Create a new mail item
      const mailItemData = {
        organization_id: user.organization_id,
        mail_room_id: req.body.mail_room_id || user.mail_room_id,
        recipient_id: req.body.recipient_id,
        tracking_number: req.body.tracking_number || null,
        carrier: req.body.carrier || "other",
        type: req.body.type || "package",
        notes: req.body.notes || null,
        is_priority: !!req.body.is_priority,
        status: schema.mailItemStatusEnum.enumValues[0], // "pending"
        processed_by_id: user.id,
        label_image: req.body.label_image || null,
      };
      
      const [mailItem] = await db.insert(schema.mailItems)
        .values([mailItemData])
        .returning();
      
      // Create an audit log entry
      await db.insert(schema.auditLogs)
        .values([{
          organization_id: user.organization_id,
          action: schema.auditActionEnum.enumValues[0], // "create"
          details: `Created new mail item (${mailItem.type}) for recipient ID ${mailItem.recipient_id}`,
          table_name: "mail_items",
          record_id: mailItem.id,
          user_id: user.id
        }]);
      
      res.status(201).json(mailItem);
    } catch (error) {
      console.error("Error creating mail item:", error);
      res.status(500).json({ message: "Failed to create mail item" });
    }
  });

  // Recipients
  app.get("/api/recipients", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const recipients = await db.query.userProfiles.findMany({
        where: eq(schema.userProfiles.organization_id, user.organization_id)
      });
      
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get internal recipients
  app.get("/api/recipients/internal", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const recipients = await db.query.userProfiles.findMany({
        where: and(
          eq(schema.userProfiles.organization_id, user.organization_id),
          eq(schema.userProfiles.role, "recipient")
        )
      });
      
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching internal recipients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get external recipients
  app.get("/api/recipients/external", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const recipients = await db.query.externalPeople.findMany({
        where: eq(schema.externalPeople.organization_id, user.organization_id)
      });
      
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching external recipients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add internal recipient
  app.post("/api/recipients/internal", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      // Generate a UUID for the user
      const user_id = crypto.randomUUID();
      
      const [recipient] = await db.insert(schema.userProfiles)
        .values({
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email: req.body.email,
          phone: req.body.phone || null,
          department: req.body.department || null,
          location: req.body.location || null,
          user_id,
          organization_id: user.organization_id,
          mail_room_id: user.mail_room_id || null,
          role: "recipient",
          password: await hashPassword("welcome123"), // Default password
        })
        .returning();
      
      res.json(recipient);
    } catch (error) {
      console.error("Error creating internal recipient:", error);
      res.status(500).json({ message: "Failed to create recipient" });
    }
  });

  // Add external recipient
  app.post("/api/recipients/external", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const [recipient] = await db.insert(schema.externalPeople)
        .values({
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email: req.body.email,
          phone: req.body.phone || null,
          department: req.body.department || null,
          location: req.body.location || null,
          organization_id: user.organization_id,
        })
        .returning();
      
      res.json(recipient);
    } catch (error) {
      console.error("Error creating external recipient:", error);
      res.status(500).json({ message: "Failed to create recipient" });
    }
  });
  
  // Process mail OCR scan
  app.post("/api/mail/scan", requireSupabaseAuth, async (req, res) => {
    try {
      // In a real implementation, we would use tesseract.js on the backend
      // or a cloud OCR service to process the image
      
      // For demonstration, return a mock result with tracking data
      const mockData = {
        success: true,
        text: "Sample OCR text extracted from the image",
        tracking_number: `${Math.floor(Math.random() * 1000000000)}`,
        carrier: ["ups", "usps", "fedex", "dhl", "other"][Math.floor(Math.random() * 5)],
        recipient_name: "John Doe"
      };
      
      // Add a small delay to simulate processing
      setTimeout(() => {
        res.json(mockData);
      }, 1500);
    } catch (error) {
      console.error("Error processing mail scan:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to process image" 
      });
    }
  });
  
  // Dashboard endpoints
  app.get("/api/mail-items/stats", requireSupabaseAuth, async (req, res) => {
    try {
      // In a full implementation, we would query the database for these stats
      
      // For demonstration, return sample statistics
      res.json({
        pending_count: Math.floor(Math.random() * 20),
        priority_count: Math.floor(Math.random() * 10),
        delivered_today_count: Math.floor(Math.random() * 15),
        delivered_diff: Math.floor(Math.random() * 30) - 15,
        aging_count: Math.floor(Math.random() * 8),
        oldest_days: Math.floor(Math.random() * 10) + 1,
        avg_processing_days: (Math.random() * 3).toFixed(1),
        processing_diff: (Math.random() * 2 - 1).toFixed(1)
      });
    } catch (error) {
      console.error("Error fetching mail stats:", error);
      res.status(500).json({ message: "Failed to fetch mail statistics" });
    }
  });
  
  app.get("/api/activities/recent", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const activities = await db.query.auditLogs.findMany({
        where: eq(schema.auditLogs.organization_id, user.organization_id),
        orderBy: (logs, { desc }) => [desc(logs.created_at)],
        limit: 10,
        with: {
          user: true
        }
      });
      
      // If no activities yet, create some sample data
      if (activities.length === 0) {
        const types = ["create", "update", "delete"];
        const action_descriptions = [
          "Added new package",
          "Updated recipient information",
          "Processed mail pickup",
          "Registered new recipient",
          "Updated mailroom settings"
        ];
        
        const sampleActivities = Array.from({ length: 5 }).map((_, i) => ({
          id: i + 1,
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          user: {
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.id
          },
          type: types[Math.floor(Math.random() * types.length)],
          description: action_descriptions[i % action_descriptions.length]
        }));
        
        return res.json(sampleActivities);
      }
      
      // Map the DB results to a more frontend-friendly format
      const formattedActivities = activities.map(activity => ({
        id: activity.id,
        timestamp: activity.created_at.toISOString(),
        user: {
          first_name: activity.user?.first_name || "System",
          last_name: activity.user?.last_name || "User",
          id: activity.user?.id || 0
        },
        type: activity.action,
        description: activity.details || "Performed an action"
      }));
      
      res.json(formattedActivities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });
  
  app.get("/api/mail-items/pending", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const items = await db.query.mailItems.findMany({
        where: and(
          eq(schema.mailItems.org_id, user.organization_id),
          eq(schema.mailItems.status, "pending")
        ),
        orderBy: (mailItems, { desc }) => [desc(mailItems.created_at)],
        limit: 10,
        with: {
          recipient: true
        }
      });
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching pending mail items:", error);
      res.status(500).json({ message: "Failed to fetch pending mail items" });
    }
  });
  
  // Get recent mail items for the mail intake view
  app.get("/api/mail-items/recent", requireSupabaseAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const items = await db.query.mailItems.findMany({
        where: eq(schema.mailItems.org_id, user.organization_id),
        orderBy: (mailItems, { desc }) => [desc(mailItems.created_at)],
        limit: 20,
        with: {
          recipient: true,
          processed_by: true
        }
      });
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching recent mail items:", error);
      res.status(500).json({ message: "Failed to fetch recent mail items" });
    }
  });
  
  // Add insights endpoints for the dashboard
  app.get("/api/insights/distribution", requireSupabaseAuth, async (req, res) => {
    try {
      // Return package type distribution
      res.json([
        { name: "Package", value: Math.floor(Math.random() * 50) + 30 },
        { name: "Letter", value: Math.floor(Math.random() * 40) + 20 },
        { name: "Large Package", value: Math.floor(Math.random() * 20) + 10 },
        { name: "Envelope", value: Math.floor(Math.random() * 15) + 5 }
      ]);
    } catch (error) {
      console.error("Error fetching insights distribution:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });
  
  app.get("/api/insights/mail-volume", requireSupabaseAuth, async (req, res) => {
    try {
      // Generate 6 months of data
      const user = (req as any).user;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      const data = months.map(month => ({
        month,
        "incoming": Math.floor(Math.random() * 100) + 50,
        "outgoing": Math.floor(Math.random() * 80) + 30
      }));
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching mail volume insights:", error);
      res.status(500).json({ message: "Failed to fetch mail volume data" });
    }
  });
  
  app.get("/api/insights/busiest-periods", requireSupabaseAuth, async (req, res) => {
    try {
      // Generate hourly distribution
      const user = (req as any).user;
      const hours = Array.from({ length: 8 }, (_, i) => ({
        hour: `${i + 9}:00`,
        value: Math.floor(Math.random() * 20) + 5
      }));
      
      res.json(hours);
    } catch (error) {
      console.error("Error fetching busiest periods:", error);
      res.status(500).json({ message: "Failed to fetch busiest periods data" });
    }
  });
  
  app.get("/api/mail-items/history", requireSupabaseAuth, async (req, res) => {
    const user = (req as any).user;
    const page = Number(req.query.page) || 1;
    const page_size = Number(req.query.page_size) || 10;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    
    try {
      // For now, just return an empty array
      // In a real implementation, we would query the database with proper filters
      res.json({
        items: [],
        total_count: 0,
        page,
        page_size
      });
    } catch (error) {
      console.error("Error fetching mail history:", error);
      res.status(500).json({ message: "Failed to fetch mail history" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
