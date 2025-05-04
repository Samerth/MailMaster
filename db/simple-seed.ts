import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting to seed database...");

    // Check if organizations exist to avoid duplication
    const existingOrgs = await db.query.organizations.findMany({
      limit: 1,
    });

    let organizationId: number;

    if (existingOrgs.length === 0) {
      console.log("Seeding organization...");
      // Create test organization
      const [org] = await db.insert(schema.organizations).values({
        name: "Test Organization",
        address: "123 Test Street",
        contactName: "Admin User",
        contactEmail: "admin@test.com",
        contactPhone: "555-123-4567",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      organizationId = org.id;
      console.log(`Created organization with ID: ${organizationId}`);
    } else {
      organizationId = existingOrgs[0].id;
      console.log(`Using existing organization with ID: ${organizationId}`);
    }

    // Check if mailrooms exist
    const existingMailrooms = await db.query.mailRooms.findMany({
      where: (mailRooms, { eq }) => eq(mailRooms.organizationId, organizationId),
      limit: 1,
    });

    let mailroomId: number;

    if (existingMailrooms.length === 0) {
      console.log("Seeding mailroom...");
      // Create test mailroom
      const [mailroom] = await db.insert(schema.mailRooms).values({
        organizationId,
        name: "Main Mailroom",
        location: "Building A",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      mailroomId = mailroom.id;
      console.log(`Created mailroom with ID: ${mailroomId}`);
    } else {
      mailroomId = existingMailrooms[0].id;
      console.log(`Using existing mailroom with ID: ${mailroomId}`);
    }

    // Check if users exist
    const existingUsers = await db.query.userProfiles.findMany({
      where: (users, { eq }) => eq(users.email, "admin@test.com"),
      limit: 1,
    });

    if (existingUsers.length === 0) {
      console.log("Seeding users...");
      
      // Hash password
      const defaultPassword = await hashPassword("password123");

      // Create admin user
      await db.insert(schema.userProfiles).values({
        userId: "00000000-0000-0000-0000-000000000001",
        organizationId,
        mailRoomId: mailroomId,
        firstName: "Admin",
        lastName: "User",
        email: "admin@test.com",
        password: defaultPassword,
        phone: "555-123-4567",
        role: "admin",
        department: "Administration",
        location: "Main Office",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create staff user
      await db.insert(schema.userProfiles).values({
        userId: "00000000-0000-0000-0000-000000000002",
        organizationId,
        mailRoomId: mailroomId,
        firstName: "Staff",
        lastName: "User",
        email: "staff@test.com",
        password: defaultPassword,
        phone: "555-765-4321",
        role: "staff",
        department: "Mailroom",
        location: "Main Office",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("Created test users");
    } else {
      console.log("Test users already exist");
    }

    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Error during seeding:", error);
  }
}

seed()
  .then(() => {
    console.log("Seed process completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in seed process:", err);
    process.exit(1);
  });