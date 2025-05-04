import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Organizations routes
  app.get("/api/organizations", async (req, res) => {
    // This route will be protected by authentication in the auth middleware
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Return orgs the user has access to
    res.json([]);
  });

  // Add additional API routes as needed

  const httpServer = createServer(app);

  return httpServer;
}
