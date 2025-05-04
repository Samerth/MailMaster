import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

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

  // Add additional API routes as needed

  const httpServer = createServer(app);

  return httpServer;
}
