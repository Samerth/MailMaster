import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
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
    
    if (!organizationId) {
      return res.status(400).json({ message: "organizationId is required" });
    }
    
    try {
      const mailrooms = await db.query.mailRooms.findMany({
        where: eq(schema.mailRooms.organizationId, Number(organizationId))
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

  const httpServer = createServer(app);

  return httpServer;
}
