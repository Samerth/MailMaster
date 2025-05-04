import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "@db";

declare global {
  namespace Express {
    interface User extends schema.UserProfile {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Storage for user-related queries
const storage = {
  async getUserByUsername(username: string) {
    return db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.email, username),
    });
  },
  
  async getUser(id: number) {
    return db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.id, id),
    });
  },
  
  async createUser(userData: any) {
    // In a real app, we would validate userData with Zod
    const [user] = await db.insert(schema.userProfiles)
      .values(userData)
      .returning();
    return user;
  },
  
  // Session store using PostgreSQL
  sessionStore: new (connectPg(session))({
    pool,
    tableName: 'user_sessions', // This table will be created automatically
    createTableIfMissing: true
  })
};

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev_session_secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }
        
        // For development, allow a simple password like "password" for all users
        if (process.env.NODE_ENV === "development" && password === "password") {
          return done(null, user);
        }
        
        // In production, use the real password check
        if (user.password && await comparePasswords(password, user.password)) {
          return done(null, user);
        }
        
        return done(null, false, { message: 'Invalid password' });
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: Express.User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(400).json({ message: "Invalid credentials" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });
}