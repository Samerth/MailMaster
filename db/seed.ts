import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
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
      limit: 10,
    });

    if (existingOrgs.length === 0) {
      console.log("Seeding organizations...");
      // Create organizations
      const insertedOrgs = await db.insert(schema.organizations).values([
        {
          name: "Acme Corp HQ",
          address: "123 Main Street, San Francisco, CA 94105",
          contactName: "John Smith",
          contactEmail: "john.smith@acmecorp.com",
          contactPhone: "415-555-1234",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "TechSpace Offices",
          address: "456 Innovation Drive, Palo Alto, CA 94301",
          contactName: "Sarah Johnson",
          contactEmail: "sarah.johnson@techspace.com",
          contactPhone: "650-555-5678",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]).returning();

      console.log(`Created ${insertedOrgs.length} organizations`);

      // Create mailrooms for each organization
      const mailroomsToInsert = [];
      for (const org of insertedOrgs) {
        if (org.id === 1) {
          mailroomsToInsert.push(
            {
              organizationId: org.id,
              name: "Main Lobby",
              location: "Building A, Floor 1",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              organizationId: org.id,
              name: "East Wing",
              location: "Building B, Floor 2",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          );
        } else {
          mailroomsToInsert.push(
            {
              organizationId: org.id,
              name: "Reception",
              location: "Main Building",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          );
        }
      }

      const insertedMailrooms = await db.insert(schema.mailRooms).values(mailroomsToInsert).returning();
      console.log(`Created ${insertedMailrooms.length} mailrooms`);

      // Create user profiles (staff and recipients)
      // Create default password for all users
      const defaultPassword = await hashPassword("password123");
      
      const usersToInsert = [
        // Admin for Acme Corp
        {
          userId: "00000000-0000-0000-0000-000000000001", // This would be a UUID from auth system
          organizationId: 1,
          mailRoomId: 1,
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@acmecorp.com",
          password: defaultPassword,
          phone: "415-555-1234",
          role: "admin",
          department: "Facilities",
          location: "Floor 1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Staff for Acme Corp
        {
          userId: "00000000-0000-0000-0000-000000000002",
          organizationId: 1,
          mailRoomId: 1,
          firstName: "Mark",
          lastName: "Wilson",
          email: "mark.wilson@acmecorp.com",
          password: defaultPassword,
          phone: "415-555-2345",
          role: "staff",
          department: "Mailroom",
          location: "Floor 1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Recipients for Acme Corp
        {
          userId: "00000000-0000-0000-0000-000000000003",
          organizationId: 1,
          mailRoomId: 1,
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@acmecorp.com",
          password: defaultPassword,
          phone: "415-555-3456",
          role: "recipient",
          department: "Marketing",
          location: "Floor 3",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: "00000000-0000-0000-0000-000000000004",
          organizationId: 1,
          mailRoomId: 1,
          firstName: "James",
          lastName: "Peterson",
          email: "james.peterson@acmecorp.com",
          password: defaultPassword,
          phone: "415-555-4567",
          role: "recipient",
          department: "Engineering",
          location: "Floor 5",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: "00000000-0000-0000-0000-000000000005",
          organizationId: 1,
          mailRoomId: 1,
          firstName: "Jessica",
          lastName: "Davis",
          email: "jessica.davis@acmecorp.com",
          password: defaultPassword,
          phone: "415-555-5678",
          role: "recipient",
          department: "Accounting",
          location: "Floor 2",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Admin for TechSpace
        {
          userId: "00000000-0000-0000-0000-000000000006",
          organizationId: 2,
          mailRoomId: 3,
          firstName: "David",
          lastName: "Lee",
          email: "david.lee@techspace.com",
          password: defaultPassword,
          phone: "650-555-1234",
          role: "admin",
          department: "Operations",
          location: "Floor 1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Staff for TechSpace
        {
          userId: "00000000-0000-0000-0000-000000000007",
          organizationId: 2,
          mailRoomId: 3,
          firstName: "Emily",
          lastName: "Chen",
          email: "emily.chen@techspace.com",
          password: defaultPassword,
          phone: "650-555-2345",
          role: "staff",
          department: "Facilities",
          location: "Floor 1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const insertedUsers = await db.insert(schema.userProfiles).values(usersToInsert).returning();
      console.log(`Created ${insertedUsers.length} user profiles`);

      // Create external people (visitors, contractors, etc.)
      const externalPeopleToInsert = [
        {
          organizationId: 1,
          firstName: "Michael",
          lastName: "Roberts",
          email: "michael.roberts@vendor.com",
          phone: "415-555-9876",
          department: "Vendor Relations",
          location: "External",
          externalId: "V-001",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          organizationId: 1,
          firstName: "Lisa",
          lastName: "Thompson",
          email: "lisa.thompson@partner.com",
          phone: "415-555-8765",
          department: "Partner Company",
          location: "External",
          externalId: "P-001",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const insertedExternalPeople = await db.insert(schema.externalPeople).values(externalPeopleToInsert).returning();
      console.log(`Created ${insertedExternalPeople.length} external people`);

      // Create sample mail items
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const mailItemsToInsert = [
        // Pending items
        {
          organizationId: 1,
          mailRoomId: 1,
          recipientId: 3, // Sarah Johnson
          trackingNumber: "1Z999AA10123456784",
          carrier: "ups",
          type: "package",
          description: "UPS Express Package",
          status: "notified",
          receivedAt: now,
          notifiedAt: now,
          processedById: 2, // Mark Wilson
          createdAt: now,
          updatedAt: now,
        },
        {
          organizationId: 1,
          mailRoomId: 1,
          recipientId: 4, // James Peterson
          trackingNumber: "9400 1000 0000 0000 0000 00",
          carrier: "usps",
          type: "letter",
          description: "USPS Certified Letter",
          notes: "Requires signature",
          isPriority: true,
          status: "pending",
          receivedAt: yesterday,
          processedById: 2, // Mark Wilson
          createdAt: yesterday,
          updatedAt: yesterday,
        },
        {
          organizationId: 1,
          mailRoomId: 1,
          recipientId: 5, // Jessica Davis
          trackingNumber: "7901 2345 6789",
          carrier: "fedex",
          type: "package",
          description: "FedEx Package (2)",
          notes: "Multiple packages",
          status: "pending",
          receivedAt: twoDaysAgo,
          processedById: 2, // Mark Wilson
          createdAt: twoDaysAgo,
          updatedAt: twoDaysAgo,
        },
        // Old items (for aging)
        {
          organizationId: 1,
          mailRoomId: 1,
          recipientId: 3, // Sarah Johnson
          trackingNumber: "DHL-12345678",
          carrier: "dhl",
          type: "package",
          description: "DHL International",
          status: "notified",
          receivedAt: sevenDaysAgo,
          notifiedAt: sevenDaysAgo,
          processedById: 2, // Mark Wilson
          createdAt: sevenDaysAgo,
          updatedAt: sevenDaysAgo,
        },
        // Items for external recipients
        {
          organizationId: 1,
          mailRoomId: 1,
          externalRecipientId: 1, // Michael Roberts
          carrier: "fedex",
          type: "package",
          description: "FedEx Package",
          status: "notified",
          receivedAt: yesterday,
          notifiedAt: yesterday,
          processedById: 2, // Mark Wilson
          createdAt: yesterday,
          updatedAt: yesterday,
        },
        // Item for TechSpace org
        {
          organizationId: 2,
          mailRoomId: 3,
          recipientId: 6, // David Lee
          trackingNumber: "AMZN-12345",
          carrier: "amazon",
          type: "package",
          description: "Amazon Package",
          status: "pending",
          receivedAt: now,
          processedById: 7, // Emily Chen
          createdAt: now,
          updatedAt: now,
        },
      ];

      const insertedMailItems = await db.insert(schema.mailItems).values(mailItemsToInsert).returning();
      console.log(`Created ${insertedMailItems.length} mail items`);
      
      // Create pickup records for some items that were already picked up
      const pickupsToInsert = [
        {
          mailItemId: 5, // Michael Roberts' FedEx package
          externalRecipientId: 1, // Michael Roberts
          processedById: 2, // Mark Wilson
          pickedUpAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000), // 2 hours after notification
          signature: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0yMCwyMCBDNDAsMTAgODAsMTAgMTIwLDIwIEMxNDAsMjUgMTgwLDI1IDE5MCwxMCIgc3Ryb2tlPSJibGFjayIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+",
          notes: "Picked up by recipient",
          createdAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
          updatedAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
        },
      ];

      const insertedPickups = await db.insert(schema.pickups).values(pickupsToInsert).returning();
      console.log(`Created ${insertedPickups.length} pickup records`);

      // Update the status of the picked up item
      await db.update(schema.mailItems)
        .set({ 
          status: "picked_up",
          pickedUpAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(schema.mailItems.id, 5))
        .returning();

      // Create notifications for notified items
      const notificationsToInsert = [
        {
          organizationId: 1,
          mailItemId: 1, // Sarah Johnson's UPS package
          recipientId: 3, // Sarah Johnson
          type: "email",
          destination: "sarah.johnson@acmecorp.com",
          message: "You have a new package waiting for pickup at Main Lobby mailroom.",
          status: "sent",
          sentAt: now,
          deliveredAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          organizationId: 1,
          mailItemId: 4, // Sarah Johnson's DHL package
          recipientId: 3, // Sarah Johnson
          type: "email",
          destination: "sarah.johnson@acmecorp.com",
          message: "REMINDER: You have a package waiting for pickup at Main Lobby mailroom.",
          status: "sent",
          sentAt: sevenDaysAgo,
          deliveredAt: sevenDaysAgo,
          createdAt: sevenDaysAgo,
          updatedAt: sevenDaysAgo,
        },
        {
          organizationId: 1,
          mailItemId: 5, // Michael Roberts' FedEx package
          externalRecipientId: 1, // Michael Roberts
          type: "email",
          destination: "michael.roberts@vendor.com",
          message: "You have a new package waiting for pickup at Acme Corp HQ.",
          status: "delivered",
          sentAt: yesterday,
          deliveredAt: yesterday,
          createdAt: yesterday,
          updatedAt: yesterday,
        },
      ];

      const insertedNotifications = await db.insert(schema.notifications).values(notificationsToInsert).returning();
      console.log(`Created ${insertedNotifications.length} notifications`);

      // Create audit logs
      const auditLogsToInsert = [
        {
          organizationId: 1,
          userId: 2, // Mark Wilson
          action: "create",
          tableName: "mail_items",
          recordId: 1,
          details: { description: "Created mail item for Sarah Johnson" },
          ipAddress: "192.168.1.1",
          createdAt: now,
        },
        {
          organizationId: 1,
          userId: 2, // Mark Wilson
          action: "create",
          tableName: "mail_items",
          recordId: 2,
          details: { description: "Created mail item for James Peterson" },
          ipAddress: "192.168.1.1",
          createdAt: yesterday,
        },
        {
          organizationId: 1,
          userId: 2, // Mark Wilson
          action: "update",
          tableName: "mail_items",
          recordId: 5,
          details: { description: "Updated mail item status to picked_up" },
          ipAddress: "192.168.1.1",
          createdAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
        },
      ];

      const insertedAuditLogs = await db.insert(schema.auditLogs).values(auditLogsToInsert).returning();
      console.log(`Created ${insertedAuditLogs.length} audit logs`);

      // Create integrations
      const integrationsToInsert = [
        {
          organizationId: 1,
          name: "HR Directory Sync",
          type: "csv",
          configuration: {
            schedule: "daily",
            mappings: {
              firstName: "first_name",
              lastName: "last_name",
              email: "email_address",
              department: "dept",
              location: "location",
            },
          },
          lastSyncedAt: yesterday,
          isActive: true,
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          updatedAt: yesterday,
        },
        {
          organizationId: 1,
          name: "Active Directory API",
          type: "api",
          configuration: {
            url: "https://api.acmecorp.com/active-directory",
            apiKey: "sample_api_key_123",
            schedule: "hourly",
          },
          lastSyncedAt: now,
          isActive: true,
          createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
          updatedAt: now,
        },
      ];

      const insertedIntegrations = await db.insert(schema.integrations).values(integrationsToInsert).returning();
      console.log(`Created ${insertedIntegrations.length} integrations`);

      console.log("Database seeding completed successfully");
    } else {
      console.log("Database already contains data. Skipping seed operation.");
    }
  } 
  catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
