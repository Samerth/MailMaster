import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
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
  // Setup authentication routes
  setupAuth(app);

  // Organizations routes
  app.get("/api/organizations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Get organizations the user has access to
      const orgs = await db.query.organizations.findMany({
        where: eq(schema.organizations.id, req.user.organizationId)
      });
      
      res.json(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mailrooms routes
  app.get("/api/mailrooms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { organizationId } = req.query;
    
    try {
      // If organizationId is provided in the query, use it
      // Otherwise, use the user's organization ID from the session
      const orgId = organizationId 
        ? Number(organizationId) 
        : req.user.organizationId;
        
      const mailrooms = await db.query.mailRooms.findMany({
        where: eq(schema.mailRooms.organizationId, orgId)
      });
      
      res.json(mailrooms);
    } catch (error) {
      console.error("Error fetching mailrooms:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recent activity endpoint
  app.get("/api/recent-activity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const activities = await db.query.auditLogs.findMany({
        where: eq(schema.auditLogs.organizationId, req.user.organizationId),
        orderBy: (auditLogs, { desc }) => [desc(auditLogs.createdAt)],
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
  app.get("/api/mail-items", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const items = await db.query.mailItems.findMany({
        where: eq(schema.mailItems.organizationId, req.user.organizationId),
        orderBy: (mailItems, { desc }) => [desc(mailItems.createdAt)],
        limit: 20
      });
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching mail items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recipients
  app.get("/api/recipients", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const recipients = await db.query.userProfiles.findMany({
        where: eq(schema.userProfiles.organizationId, req.user.organizationId)
      });
      
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add recipient
  app.post("/api/recipients", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Generate a UUID for the user
      const userId = crypto.randomUUID();
      
      const [recipient] = await db.insert(schema.userProfiles)
        .values({
          ...req.body,
          userId,
          organizationId: req.user.organizationId,
          mailRoomId: req.user.mailRoomId,
          role: "recipient",
          password: await hashPassword("welcome123"), // Default password
        })
        .returning();
      
      res.status(201).json(recipient);
    } catch (error) {
      console.error("Error creating recipient:", error);
      res.status(500).json({ message: "Failed to create recipient" });
    }
  });
  
  // Process mail OCR scan
  app.post("/api/mail/scan", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // In a real implementation, we would use tesseract.js on the backend
      // or a cloud OCR service to process the image
      
      // For demonstration, return a mock result with tracking data
      const mockData = {
        success: true,
        text: "Sample OCR text extracted from the image",
        trackingNumber: `${Math.floor(Math.random() * 1000000000)}`,
        carrier: ["ups", "usps", "fedex", "dhl", "other"][Math.floor(Math.random() * 5)],
        recipientName: "John Doe"
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
  app.get("/api/mail-items/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // In a full implementation, we would query the database for these stats
      
      // For demonstration, return sample statistics
      res.json({
        pendingCount: Math.floor(Math.random() * 20),
        priorityCount: Math.floor(Math.random() * 10),
        deliveredTodayCount: Math.floor(Math.random() * 15),
        deliveredDiff: Math.floor(Math.random() * 30) - 15,
        agingCount: Math.floor(Math.random() * 8),
        oldestDays: Math.floor(Math.random() * 10) + 1,
        avgProcessingDays: (Math.random() * 3).toFixed(1),
        processingDiff: (Math.random() * 2 - 1).toFixed(1)
      });
    } catch (error) {
      console.error("Error fetching mail stats:", error);
      res.status(500).json({ message: "Failed to fetch mail statistics" });
    }
  });
  
  app.get("/api/activities/recent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const activities = await db.query.auditLogs.findMany({
        where: eq(schema.auditLogs.organizationId, req.user.organizationId),
        orderBy: (logs, { desc }) => [desc(logs.createdAt)],
        limit: 10,
        with: {
          user: true
        }
      });
      
      // If no activities yet, create some sample data
      if (activities.length === 0) {
        const types = ["create", "update", "delete"];
        const actionDescriptions = [
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
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            id: req.user.id
          },
          type: types[Math.floor(Math.random() * types.length)],
          description: actionDescriptions[i % actionDescriptions.length]
        }));
        
        return res.json(sampleActivities);
      }
      
      // Map the DB results to a more frontend-friendly format
      const formattedActivities = activities.map(activity => ({
        id: activity.id,
        timestamp: activity.createdAt.toISOString(),
        user: {
          firstName: activity.user?.firstName || "System",
          lastName: activity.user?.lastName || "User",
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
  
  app.get("/api/mail-items/pending", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const items = await db.query.mailItems.findMany({
        where: and(
          eq(schema.mailItems.organizationId, req.user.organizationId),
          eq(schema.mailItems.status, "pending")
        ),
        orderBy: (mailItems, { desc }) => [desc(mailItems.createdAt)],
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
  
  // Add insights endpoints for the dashboard
  app.get("/api/insights/distribution", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
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
  
  app.get("/api/insights/mail-volume", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Generate 6 months of data
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
  
  app.get("/api/insights/busiest-periods", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Generate hourly distribution
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
  
  app.get("/api/mail-items/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    
    try {
      // For now, just return an empty array
      // In a real implementation, we would query the database with proper filters
      res.json({
        items: [],
        totalCount: 0,
        page,
        pageSize
      });
    } catch (error) {
      console.error("Error fetching mail history:", error);
      res.status(500).json({ message: "Failed to fetch mail history" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
