import type {
  Organization,
  MailRoom,
  UserProfile,
  ExternalPerson,
  MailItem,
  Pickup,
  Notification,
  Integration,
  AuditLog
} from "@shared/schema";

// Re-export types from schema for easier imports
export type {
  Organization,
  MailRoom,
  UserProfile,
  ExternalPerson,
  MailItem,
  Pickup,
  Notification,
  Integration,
  AuditLog
};

// Activity feed item type
export interface ActivityItem {
  id: number;
  type: 'received' | 'pickup' | 'notification';
  description: string;
  details: string;
  timestamp: string;
  status: string;
}

// Dashboard stats type
export interface DashboardStats {
  pendingCount: number;
  priorityCount: number;
  deliveredTodayCount: number;
  deliveredDiff: number;
  agingCount: number;
  oldestDays: number;
  avgProcessingDays: number;
  processingDiff: number;
}

// Package distribution for insights chart
export interface PackageDistribution {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

// AI insight type
export interface Insight {
  title: string;
  content: string;
  source: string;
}

// Busiest period for insights chart
export interface BusiestPeriod {
  label: string;
  type: string;
  value: number;
  period: string;
}

// OCR result type
export interface OCRResult {
  trackingNumber?: string;
  carrier?: string;
  recipient?: string;
  success: boolean;
  error?: string;
  text: string;
}

// Pagination result type
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  start: number;
  end: number;
}

// Mail history item with extended fields
export interface MailHistoryItem extends MailItem {
  recipient: {
    id: number;
    firstName: string;
    lastName: string;
    department: string | null;
    location: string | null;
  };
  processedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

// Combined recipient type (internal or external)
export interface Recipient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  location: string | null;
  type: "internal" | "external";
}

// Organization settings
export interface OrganizationSettings {
  defaultMailroomId?: number;
  notificationSettings?: {
    enableEmailNotifications: boolean;
    enableSmsNotifications: boolean;
    notificationDelay: string;
    reminderInterval: string;
    itemAgingThreshold: string;
    customEmailSubject?: string;
    customEmailTemplate?: string;
  };
  appearance?: {
    primaryColor: string;
    logoUrl?: string;
  };
}

// User settings
export interface UserSettings {
  preferredMailroom?: number;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
}

// Auth types
export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

// API error response
export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}
