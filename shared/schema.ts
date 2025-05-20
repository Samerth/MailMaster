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
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  contact_name: text('contact_name'),
  contact_email: text('contact_email'),
  contact_phone: text('contact_phone'),
  logo: text('logo'),
  settings: jsonb('settings'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const mailRooms = pgTable('mail_rooms', {
  id: uuid('id').primaryKey(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  location: text('location'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  user_id: uuid('user_id').notNull().unique(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  mail_room_id: uuid('mail_room_id').references(() => mailRooms.id),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull(),
  password: text('password'),
  phone: text('phone'),
  role: userRoleEnum('role').default('recipient').notNull(),
  department: text('department'),
  location: text('location'),
  is_active: boolean('is_active'),
  settings: jsonb('settings'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const externalPeople = pgTable('external_people', {
  id: uuid('id').primaryKey(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  department: text('department'),
  location: text('location'),
  external_id: text('external_id'),
  is_active: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const mailItems = pgTable('mail_items', {
  id: uuid('id').primaryKey(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  mail_room_id: uuid('mail_room_id').references(() => mailRooms.id).notNull(),
  recipient_id: uuid('recipient_id').references(() => userProfiles.id),
  external_recipient_id: uuid('external_recipient_id').references(() => externalPeople.id),
  tracking_number: text('tracking_number'),
  carrier: carrierEnum('carrier').default('other'),
  type: mailItemTypeEnum('type').default('package'),
  description: text('description'),
  notes: text('notes'),
  is_priority: boolean('is_priority').default(false),
  status: mailItemStatusEnum('status').default('pending'),
  received_at: timestamp('received_at').defaultNow(),
  notified_at: timestamp('notified_at'),
  picked_up_at: timestamp('picked_up_at'),
  processed_by_id: uuid('processed_by_id').references(() => userProfiles.id),
  label_image: text('label_image'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const pickups = pgTable('pickups', {
  id: uuid('id').primaryKey(),
  mail_item_id: uuid('mail_item_id').references(() => mailItems.id).notNull(),
  recipient_id: uuid('recipient_id').references(() => userProfiles.id),
  external_recipient_id: uuid('external_recipient_id').references(() => externalPeople.id),
  processed_by_id: uuid('processed_by_id').references(() => userProfiles.id).notNull(),
  picked_up_at: timestamp('picked_up_at').defaultNow(),
  signature: text('signature'),
  photo_confirmation: text('photo_confirmation'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  mail_item_id: uuid('mail_item_id').references(() => mailItems.id).notNull(),
  recipient_id: uuid('recipient_id').references(() => userProfiles.id),
  external_recipient_id: uuid('external_recipient_id').references(() => externalPeople.id),
  type: notificationTypeEnum('type').default('email'),
  destination: text('destination').notNull(),
  message: text('message').notNull(),
  status: notificationStatusEnum('status').default('pending'),
  sent_at: timestamp('sent_at'),
  delivered_at: timestamp('delivered_at'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  user_id: uuid('user_id').references(() => userProfiles.id),
  action: auditActionEnum('action').notNull(),
  table_name: text('table_name'),
  record_id: uuid('record_id'),
  details: jsonb('details'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow(),
});

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey(),
  org_id: uuid('org_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  type: integrationTypeEnum('type').default('csv'),
  configuration: jsonb('configuration'),
  last_synced_at: timestamp('last_synced_at'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
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
    fields: [mailRooms.org_id],
    references: [organizations.id],
  }),
  userProfiles: many(userProfiles),
  mailItems: many(mailItems),
}));

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [userProfiles.org_id],
    references: [organizations.id],
  }),
  mailRoom: one(mailRooms, {
    fields: [userProfiles.mail_room_id],
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
    fields: [externalPeople.org_id],
    references: [organizations.id],
  }),
  mailItems: many(mailItems),
  pickups: many(pickups),
  notifications: many(notifications),
}));

export const mailItemsRelations = relations(mailItems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mailItems.org_id],
    references: [organizations.id],
  }),
  mailRoom: one(mailRooms, {
    fields: [mailItems.mail_room_id],
    references: [mailRooms.id],
  }),
  recipient: one(userProfiles, {
    fields: [mailItems.recipient_id],
    references: [userProfiles.id],
    relationName: 'recipient_mail_items',
  }),
  externalRecipient: one(externalPeople, {
    fields: [mailItems.external_recipient_id],
    references: [externalPeople.id],
  }),
  processedBy: one(userProfiles, {
    fields: [mailItems.processed_by_id],
    references: [userProfiles.id],
    relationName: 'processor_mail_items',
  }),
  pickup: many(pickups),
  notifications: many(notifications),
}));

export const pickupsRelations = relations(pickups, ({ one }) => ({
  mailItem: one(mailItems, {
    fields: [pickups.mail_item_id],
    references: [mailItems.id],
  }),
  recipient: one(userProfiles, {
    fields: [pickups.recipient_id],
    references: [userProfiles.id],
    relationName: 'recipient_pickups',
  }),
  externalRecipient: one(externalPeople, {
    fields: [pickups.external_recipient_id],
    references: [externalPeople.id],
  }),
  processedBy: one(userProfiles, {
    fields: [pickups.processed_by_id],
    references: [userProfiles.id],
    relationName: 'processor_pickups',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.org_id],
    references: [organizations.id],
  }),
  mailItem: one(mailItems, {
    fields: [notifications.mail_item_id],
    references: [mailItems.id],
  }),
  recipient: one(userProfiles, {
    fields: [notifications.recipient_id],
    references: [userProfiles.id],
  }),
  externalRecipient: one(externalPeople, {
    fields: [notifications.external_recipient_id],
    references: [externalPeople.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.org_id],
    references: [organizations.id],
  }),
  user: one(userProfiles, {
    fields: [auditLogs.user_id],
    references: [userProfiles.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.org_id],
    references: [organizations.id],
  }),
}));

// Schemas for validation
export const organizationsInsertSchema = createInsertSchema(organizations, {
  name: (schema) => schema.min(3, "Organization name must be at least 3 characters"),
  contact_email: (schema) => schema.email("Must provide a valid email").optional().nullable(),
});
export type OrganizationInsert = z.infer<typeof organizationsInsertSchema>;
export type Organization = typeof organizations.$inferSelect;

export const mailRoomsInsertSchema = createInsertSchema(mailRooms, {
  name: (schema) => schema.min(2, "Mail room name must be at least 2 characters"),
});
export type MailRoomInsert = z.infer<typeof mailRoomsInsertSchema>;
export type MailRoom = typeof mailRooms.$inferSelect;

export const userProfilesInsertSchema = createInsertSchema(userProfiles, {
  first_name: (schema) => schema.min(2, "First name must be at least 2 characters"),
  last_name: (schema) => schema.min(2, "Last name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  password: (schema) => schema.optional(),
});
export type UserProfileInsert = z.infer<typeof userProfilesInsertSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export const externalPeopleInsertSchema = createInsertSchema(externalPeople, {
  first_name: (schema) => schema.min(2, "First name must be at least 2 characters"),
  last_name: (schema) => schema.min(2, "Last name must be at least 2 characters"),
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
