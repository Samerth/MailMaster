import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'staff', 'recipient']);
export const mailItemTypeEnum = pgEnum('mail_item_type', ['package', 'letter', 'large_package', 'envelope', 'perishable', 'signature_required', 'other']);
export const mailItemStatusEnum = pgEnum('mail_item_status', ['pending', 'notified', 'picked_up', 'returned_to_sender', 'lost', 'other']);
export const notificationTypeEnum = pgEnum('notification_type', ['email', 'sms', 'app', 'other']);
export const notificationStatusEnum = pgEnum('notification_status', ['sent', 'delivered', 'failed', 'pending']);
export const carrierEnum = pgEnum('carrier', ['ups', 'fedex', 'usps', 'dhl', 'amazon', 'other']);
export const integrationTypeEnum = pgEnum('integration_type', ['csv', 'api', 'other']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'update', 'delete', 'login', 'logout', 'other']);

// Tables
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  logo: text('logo'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mailRooms = pgTable('mail_rooms', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  location: text('location'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().unique(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  mailRoomId: integer('mail_room_id').references(() => mailRooms.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  role: userRoleEnum('role').default('recipient').notNull(),
  department: text('department'),
  location: text('location'),
  isActive: boolean('is_active').default(true),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const externalPeople = pgTable('external_people', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  department: text('department'),
  location: text('location'),
  externalId: text('external_id'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mailItems = pgTable('mail_items', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  mailRoomId: integer('mail_room_id').references(() => mailRooms.id).notNull(),
  recipientId: integer('recipient_id').references(() => userProfiles.id),
  externalRecipientId: integer('external_recipient_id').references(() => externalPeople.id),
  trackingNumber: text('tracking_number'),
  carrier: carrierEnum('carrier').default('other'),
  type: mailItemTypeEnum('type').default('package'),
  description: text('description'),
  notes: text('notes'),
  isPriority: boolean('is_priority').default(false),
  status: mailItemStatusEnum('status').default('pending'),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
  notifiedAt: timestamp('notified_at'),
  pickedUpAt: timestamp('picked_up_at'),
  processedById: integer('processed_by_id').references(() => userProfiles.id),
  labelImage: text('label_image'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pickups = pgTable('pickups', {
  id: serial('id').primaryKey(),
  mailItemId: integer('mail_item_id').references(() => mailItems.id).notNull(),
  recipientId: integer('recipient_id').references(() => userProfiles.id),
  externalRecipientId: integer('external_recipient_id').references(() => externalPeople.id),
  processedById: integer('processed_by_id').references(() => userProfiles.id).notNull(),
  pickedUpAt: timestamp('picked_up_at').defaultNow().notNull(),
  signature: text('signature'),
  photoConfirmation: text('photo_confirmation'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  mailItemId: integer('mail_item_id').references(() => mailItems.id).notNull(),
  recipientId: integer('recipient_id').references(() => userProfiles.id),
  externalRecipientId: integer('external_recipient_id').references(() => externalPeople.id),
  type: notificationTypeEnum('type').default('email'),
  destination: text('destination').notNull(),
  message: text('message').notNull(),
  status: notificationStatusEnum('status').default('pending'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  userId: integer('user_id').references(() => userProfiles.id),
  action: auditActionEnum('action').notNull(),
  tableName: text('table_name'),
  recordId: integer('record_id'),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const integrations = pgTable('integrations', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  type: integrationTypeEnum('type').default('csv'),
  configuration: jsonb('configuration'),
  lastSyncedAt: timestamp('last_synced_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  mailRooms: many(mailRooms),
  userProfiles: many(userProfiles),
  externalPeople: many(externalPeople),
  mailItems: many(mailItems),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  integrations: many(integrations),
}));

export const mailRoomsRelations = relations(mailRooms, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mailRooms.organizationId],
    references: [organizations.id],
  }),
  userProfiles: many(userProfiles),
  mailItems: many(mailItems),
}));

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [userProfiles.organizationId],
    references: [organizations.id],
  }),
  mailRoom: one(mailRooms, {
    fields: [userProfiles.mailRoomId],
    references: [mailRooms.id],
  }),
  receivedMailItems: many(mailItems, { relationName: 'recipient_mail_items' }),
  processedMailItems: many(mailItems, { relationName: 'processor_mail_items' }),
  pickups: many(pickups, { relationName: 'recipient_pickups' }),
  processedPickups: many(pickups, { relationName: 'processor_pickups' }),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}));

export const externalPeopleRelations = relations(externalPeople, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [externalPeople.organizationId],
    references: [organizations.id],
  }),
  mailItems: many(mailItems),
  pickups: many(pickups),
  notifications: many(notifications),
}));

export const mailItemsRelations = relations(mailItems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mailItems.organizationId],
    references: [organizations.id],
  }),
  mailRoom: one(mailRooms, {
    fields: [mailItems.mailRoomId],
    references: [mailRooms.id],
  }),
  recipient: one(userProfiles, {
    fields: [mailItems.recipientId],
    references: [userProfiles.id],
    relationName: 'recipient_mail_items',
  }),
  externalRecipient: one(externalPeople, {
    fields: [mailItems.externalRecipientId],
    references: [externalPeople.id],
  }),
  processedBy: one(userProfiles, {
    fields: [mailItems.processedById],
    references: [userProfiles.id],
    relationName: 'processor_mail_items',
  }),
  pickup: many(pickups),
  notifications: many(notifications),
}));

export const pickupsRelations = relations(pickups, ({ one }) => ({
  mailItem: one(mailItems, {
    fields: [pickups.mailItemId],
    references: [mailItems.id],
  }),
  recipient: one(userProfiles, {
    fields: [pickups.recipientId],
    references: [userProfiles.id],
    relationName: 'recipient_pickups',
  }),
  externalRecipient: one(externalPeople, {
    fields: [pickups.externalRecipientId],
    references: [externalPeople.id],
  }),
  processedBy: one(userProfiles, {
    fields: [pickups.processedById],
    references: [userProfiles.id],
    relationName: 'processor_pickups',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  mailItem: one(mailItems, {
    fields: [notifications.mailItemId],
    references: [mailItems.id],
  }),
  recipient: one(userProfiles, {
    fields: [notifications.recipientId],
    references: [userProfiles.id],
  }),
  externalRecipient: one(externalPeople, {
    fields: [notifications.externalRecipientId],
    references: [externalPeople.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(userProfiles, {
    fields: [auditLogs.userId],
    references: [userProfiles.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.organizationId],
    references: [organizations.id],
  }),
}));

// Schemas for validation
export const organizationsInsertSchema = createInsertSchema(organizations, {
  name: (schema) => schema.min(3, "Organization name must be at least 3 characters"),
  contactEmail: (schema) => schema.email("Must provide a valid email").optional().nullable(),
});
export type OrganizationInsert = z.infer<typeof organizationsInsertSchema>;
export type Organization = typeof organizations.$inferSelect;

export const mailRoomsInsertSchema = createInsertSchema(mailRooms, {
  name: (schema) => schema.min(2, "Mail room name must be at least 2 characters"),
});
export type MailRoomInsert = z.infer<typeof mailRoomsInsertSchema>;
export type MailRoom = typeof mailRooms.$inferSelect;

export const userProfilesInsertSchema = createInsertSchema(userProfiles, {
  firstName: (schema) => schema.min(2, "First name must be at least 2 characters"),
  lastName: (schema) => schema.min(2, "Last name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
});
export type UserProfileInsert = z.infer<typeof userProfilesInsertSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export const externalPeopleInsertSchema = createInsertSchema(externalPeople, {
  firstName: (schema) => schema.min(2, "First name must be at least 2 characters"),
  lastName: (schema) => schema.min(2, "Last name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email").optional().nullable(),
});
export type ExternalPersonInsert = z.infer<typeof externalPeopleInsertSchema>;
export type ExternalPerson = typeof externalPeople.$inferSelect;

export const mailItemsInsertSchema = createInsertSchema(mailItems);
export type MailItemInsert = z.infer<typeof mailItemsInsertSchema>;
export type MailItem = typeof mailItems.$inferSelect;

export const pickupsInsertSchema = createInsertSchema(pickups);
export type PickupInsert = z.infer<typeof pickupsInsertSchema>;
export type Pickup = typeof pickups.$inferSelect;

export const notificationsInsertSchema = createInsertSchema(notifications, {
  destination: (schema) => schema.min(3, "Destination must be at least 3 characters"),
  message: (schema) => schema.min(5, "Message must be at least 5 characters"),
});
export type NotificationInsert = z.infer<typeof notificationsInsertSchema>;
export type Notification = typeof notifications.$inferSelect;

export const auditLogsInsertSchema = createInsertSchema(auditLogs);
export type AuditLogInsert = z.infer<typeof auditLogsInsertSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const integrationsInsertSchema = createInsertSchema(integrations, {
  name: (schema) => schema.min(3, "Integration name must be at least 3 characters"),
});
export type IntegrationInsert = z.infer<typeof integrationsInsertSchema>;
export type Integration = typeof integrations.$inferSelect;
