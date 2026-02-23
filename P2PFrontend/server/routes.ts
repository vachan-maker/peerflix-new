import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // TODO: Video endpoints (will be added in next phase)
  // GET    /api/videos           - List videos
  // GET    /api/videos/:id       - Get video by ID
  // POST   /api/videos/upload    - Upload video (requires auth)
  // DELETE /api/videos/:id       - Delete video (requires auth)
  // PATCH  /api/videos/:id/privacy - Update privacy (requires auth)

  // TODO: Auth endpoints (will be added in next phase)
  // POST   /api/auth/register    - Register user
  // POST   /api/auth/login       - Login user
  // POST   /api/auth/logout      - Logout user
  // GET    /api/auth/me          - Get current user (requires auth)

  // Placeholder: Return 501 for unimplemented video endpoints
  app.use("/api/videos", (_req, res) => {
    console.warn(`Unimplemented endpoint: ${_req.method} ${_req.path}`);
    res.status(501).json({ 
      error: "Video API endpoints not yet implemented",
      hint: "Backend routes are being migrated to this server"
    });
  });

  return httpServer;
}
