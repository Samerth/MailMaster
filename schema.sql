-- This file contains the complete database schema for the MailFlow application
-- It defines the tables, views, indexes, and row-level security policies

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff', 'recipient');
CREATE TYPE mail_item_type AS ENUM ('package', 'letter', 'large_package', 'envelope', 'perishable', 'signature_required', 'other');
CREATE TYPE mail_item_status AS ENUM ('pending', 'notified', 'picked_up', 'returned_to_sender', 'lost', 'other');
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'app', 'other');
CREATE TYPE notification_status AS ENUM ('sent', 'delivered', 'failed', 'pending');
CREATE TYPE carrier AS ENUM ('ups', 'fedex', 'usps', 'dhl', 'amazon', 'other');
CREATE TYPE integration_type AS ENUM ('csv', 'api', 'other');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'other');

-- Organizations table - parent organization that owns mail rooms
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo TEXT,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Mail rooms table - physical locations where mail is processed
CREATE TABLE mail_rooms (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User profiles table - linked to auth.users table
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE, -- Links to Supabase auth.users
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  mail_room_id INTEGER REFERENCES mail_rooms(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'recipient',
  department TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- External people - guests, visitors, contractors who don't have Supabase auth accounts
CREATE TABLE external_people (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  location TEXT,
  external_id TEXT, -- For linking with external systems
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Mail items - packages, letters, etc.
CREATE TABLE mail_items (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  mail_room_id INTEGER REFERENCES mail_rooms(id) NOT NULL,
  recipient_id INTEGER REFERENCES user_profiles(id),
  external_recipient_id INTEGER REFERENCES external_people(id),
  tracking_number TEXT,
  carrier carrier DEFAULT 'other',
  type mail_item_type DEFAULT 'package',
  description TEXT,
  notes TEXT,
  is_priority BOOLEAN DEFAULT FALSE,
  status mail_item_status DEFAULT 'pending',
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  processed_by_id INTEGER REFERENCES user_profiles(id),
  label_image TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraint: must have either recipient_id or external_recipient_id
  CONSTRAINT recipient_check CHECK (
    (recipient_id IS NOT NULL AND external_recipient_id IS NULL) OR
    (recipient_id IS NULL AND external_recipient_id IS NOT NULL)
  )
);

-- Pickups - records of mail item pickups by recipients
CREATE TABLE pickups (
  id SERIAL PRIMARY KEY,
  mail_item_id INTEGER REFERENCES mail_items(id) NOT NULL,
  recipient_id INTEGER REFERENCES user_profiles(id),
  external_recipient_id INTEGER REFERENCES external_people(id),
  processed_by_id INTEGER REFERENCES user_profiles(id) NOT NULL,
  picked_up_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  signature TEXT,
  photo_confirmation TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraint: must have either recipient_id or external_recipient_id
  CONSTRAINT recipient_check CHECK (
    (recipient_id IS NOT NULL AND external_recipient_id IS NULL) OR
    (recipient_id IS NULL AND external_recipient_id IS NOT NULL)
  )
);

-- Notifications - records of notifications sent to recipients
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  mail_item_id INTEGER REFERENCES mail_items(id) NOT NULL,
  recipient_id INTEGER REFERENCES user_profiles(id),
  external_recipient_id INTEGER REFERENCES external_people(id),
  type notification_type DEFAULT 'email',
  destination TEXT NOT NULL, -- email address or phone number
  message TEXT NOT NULL,
  status notification_status DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraint: must have either recipient_id or external_recipient_id
  CONSTRAINT recipient_check CHECK (
    (recipient_id IS NOT NULL AND external_recipient_id IS NULL) OR
    (recipient_id IS NULL AND external_recipient_id IS NOT NULL)
  )
);

-- Audit logs - records of all important actions
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  user_id INTEGER REFERENCES user_profiles(id),
  action audit_action NOT NULL,
  table_name TEXT,
  record_id INTEGER,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Integrations - external connections for syncing people data
CREATE TABLE integrations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  type integration_type DEFAULT 'csv',
  configuration JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX mail_items_recipient_id_idx ON mail_items(recipient_id);
CREATE INDEX mail_items_external_recipient_id_idx ON mail_items(external_recipient_id);
CREATE INDEX mail_items_status_idx ON mail_items(status);
CREATE INDEX mail_items_organization_id_idx ON mail_items(organization_id);
CREATE INDEX mail_items_mail_room_id_idx ON mail_items(mail_room_id);
CREATE INDEX mail_items_received_at_idx ON mail_items(received_at);
CREATE INDEX user_profiles_organization_id_idx ON user_profiles(organization_id);
CREATE INDEX user_profiles_user_id_idx ON user_profiles(user_id);
CREATE INDEX external_people_organization_id_idx ON external_people(organization_id);
CREATE INDEX notifications_mail_item_id_idx ON notifications(mail_item_id);
CREATE INDEX pickups_mail_item_id_idx ON pickups(mail_item_id);

-- Create View: Weekly mailroom statistics
CREATE VIEW mailroom_weekly_stats AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  mr.id AS mail_room_id,
  mr.name AS mail_room_name,
  DATE_TRUNC('week', mi.received_at) AS week,
  COUNT(*) AS total_items,
  SUM(CASE WHEN mi.status = 'picked_up' THEN 1 ELSE 0 END) AS picked_up,
  SUM(CASE WHEN mi.status = 'pending' OR mi.status = 'notified' THEN 1 ELSE 0 END) AS pending,
  SUM(CASE WHEN mi.is_priority THEN 1 ELSE 0 END) AS priority_items,
  AVG(EXTRACT(EPOCH FROM (COALESCE(mi.picked_up_at, NOW()) - mi.received_at))/3600)::NUMERIC(10,2) AS avg_processing_hours
FROM 
  organizations o
JOIN 
  mail_rooms mr ON o.id = mr.organization_id
JOIN 
  mail_items mi ON mr.id = mi.mail_room_id
WHERE 
  mi.received_at > NOW() - INTERVAL '90 days'
GROUP BY
  o.id, o.name, mr.id, mr.name, DATE_TRUNC('week', mi.received_at)
ORDER BY
  o.id, mr.id, week DESC;

-- Create View: Delayed mail items
CREATE VIEW mailroom_delayed_items AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  mr.id AS mail_room_id,
  mr.name AS mail_room_name,
  mi.id AS mail_item_id,
  mi.tracking_number,
  mi.carrier,
  mi.type,
  mi.description,
  mi.is_priority,
  mi.received_at,
  COALESCE(up.first_name || ' ' || up.last_name, ep.first_name || ' ' || ep.last_name) AS recipient_name,
  EXTRACT(DAY FROM (NOW() - mi.received_at)) AS days_in_mailroom
FROM 
  organizations o
JOIN 
  mail_rooms mr ON o.id = mr.organization_id
JOIN 
  mail_items mi ON mr.id = mi.mail_room_id
LEFT JOIN
  user_profiles up ON mi.recipient_id = up.id
LEFT JOIN
  external_people ep ON mi.external_recipient_id = ep.id
WHERE 
  (mi.status = 'pending' OR mi.status = 'notified')
AND
  mi.received_at < NOW() - INTERVAL '5 days'
ORDER BY
  mi.received_at ASC;

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Organizations: Users can read and manage their own organization
CREATE POLICY organization_select ON organizations 
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY organization_insert ON organizations 
  FOR INSERT WITH CHECK (
    id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY organization_update ON organizations 
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

-- Mail Rooms: Users can read all mail rooms in their organization, but only admins/managers can modify
CREATE POLICY mail_room_select ON mail_rooms 
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY mail_room_insert ON mail_rooms 
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY mail_room_update ON mail_rooms 
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- User Profiles: Users can read all profiles in their organization, but only themselves and admins can modify
CREATE POLICY user_profile_select ON user_profiles 
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY user_profile_insert ON user_profiles 
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY user_profile_update_admin ON user_profiles 
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY user_profile_update_self ON user_profiles 
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- External People: Users can read all external people in their organization, but only staff+ can modify
CREATE POLICY external_people_select ON external_people 
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY external_people_insert ON external_people 
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY external_people_update ON external_people 
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

-- Mail Items: Users can read their own items or all if staff+
CREATE POLICY mail_item_select_staff ON mail_items 
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY mail_item_select_recipient ON mail_items 
  FOR SELECT USING (
    recipient_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY mail_item_insert ON mail_items 
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY mail_item_update ON mail_items 
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

-- Pickups: Staff+ can read/create all, recipients only their own
CREATE POLICY pickup_select_staff ON pickups 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mail_items mi 
      JOIN user_profiles up ON up.organization_id = mi.organization_id 
      WHERE mi.id = mail_item_id AND up.user_id = auth.uid() AND up.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY pickup_select_recipient ON pickups 
  FOR SELECT USING (
    recipient_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY pickup_insert ON pickups 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mail_items mi 
      JOIN user_profiles up ON up.organization_id = mi.organization_id 
      WHERE mi.id = mail_item_id AND up.user_id = auth.uid() AND up.role IN ('admin', 'manager', 'staff')
    )
  );

-- Notifications: Staff+ can read/create all, recipients only their own
CREATE POLICY notification_select_staff ON notifications 
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY notification_select_recipient ON notifications 
  FOR SELECT USING (
    recipient_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY notification_insert ON notifications 
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY notification_update ON notifications 
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

-- Audit Logs: Only admins can view
CREATE POLICY audit_log_select ON audit_logs 
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY audit_log_insert ON audit_logs 
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Integrations: Only admins can manage
CREATE POLICY integration_select ON integrations 
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY integration_insert ON integrations 
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY integration_update ON integrations 
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

-- Insert initial demo data
-- An admin user must be created through Supabase Auth first,
-- then their user_id should be used to create the first organization and user profile
