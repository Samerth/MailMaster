import { eq, and, desc, sql, like, inArray, or, isNull, not } from "drizzle-orm";
import { db } from "@db";
import * as schema from "@shared/schema";
import supabase from "@/lib/supabaseClient";

// Types
import type { 
  ActivityItem,
  DashboardStats,
  PackageDistribution,
  Insight,
  BusiestPeriod,
  PaginatedResult,
  MailHistoryItem
} from "@/types";

// Organization management
export const getOrganizationById = async (id: string) => {
  return db.query.organizations.findFirst({
    where: eq(schema.organizations.id, id)
  });
};

export const updateOrganization = async (id: string, data: Partial<schema.Organization>) => {
  const [updated] = await db.update(schema.organizations)
    .set({ 
      ...data,
      updated_at: new Date()
    })
    .where(eq(schema.organizations.id, id))
    .returning();
  
  return updated;
};

// Mailroom management
export const getMailroomsByOrganizationId = async (organizationId: string) => {
  return db.query.mailRooms.findMany({
    where: eq(schema.mailRooms.org_id, organizationId),
    orderBy: [schema.mailRooms.name]
  });
};

export const getMailroomById = async (id: string) => {
  return db.query.mailRooms.findFirst({
    where: eq(schema.mailRooms.id, id)
  });
};

export const createMailroom = async (data: schema.MailRoomInsert) => {
  const [mailroom] = await db.insert(schema.mailRooms)
    .values(data)
    .returning();
  
  return mailroom;
};

export const updateMailroom = async (id: string, data: Partial<schema.MailRoom>) => {
  const [updated] = await db.update(schema.mailRooms)
    .set({ 
      ...data,
      updated_at: new Date()
    })
    .where(eq(schema.mailRooms.id, id))
    .returning();
  
  return updated;
};

// User profile management
export const getUserProfileByUserId = async (userId: string) => {
  return db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.userId, userId)
  });
};

export const getUserProfileById = async (id: string) => {
  return db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.id, id)
  });
};

export const updateUserProfile = async (id: string, data: Partial<schema.UserProfile>) => {
  const [updated] = await db.update(schema.userProfiles)
    .set({ 
      ...data,
      updated_at: new Date()
    })
    .where(eq(schema.userProfiles.id, id))
    .returning();
  
  return updated;
};

// Get internal recipients (user profiles) by organization
export const getInternalRecipientsByOrganizationId = async (organizationId: string) => {
  return db.query.userProfiles.findMany({
    where: and(
      eq(schema.userProfiles.org_id, organizationId),
      eq(schema.userProfiles.is_active, true)
    ),
    orderBy: [schema.userProfiles.last_name, schema.userProfiles.first_name]
  });
};

// External people management
export const getExternalPeopleByOrganizationId = async (organizationId: string) => {
  return db.query.externalPeople.findMany({
    where: eq(schema.externalPeople.org_id, organizationId),
    orderBy: [schema.externalPeople.last_name, schema.externalPeople.first_name]
  });
};

export const createExternalPerson = async (data: schema.ExternalPersonInsert) => {
  const [person] = await db.insert(schema.externalPeople)
    .values(data)
    .returning();
  
  return person;
};

export const updateExternalPerson = async (id: string, data: Partial<schema.ExternalPerson>) => {
  const [updated] = await db.update(schema.externalPeople)
    .set({ 
      ...data,
      updated_at: new Date()
    })
    .where(eq(schema.externalPeople.id, id))
    .returning();
  
  return updated;
};

// Mail item management
export const createMailItem = async (data: schema.MailItemInsert) => {
  const [mailItem] = await db.insert(schema.mailItems)
    .values(data)
    .returning();
  
  return mailItem;
};

export const updateMailItem = async (id: string, data: Partial<schema.MailItem>) => {
  const [updated] = await db.update(schema.mailItems)
    .set({ 
      ...data,
      updated_at: new Date()
    })
    .where(eq(schema.mailItems.id, id))
    .returning();
  
  return updated;
};

export const getMailItemById = async (id: string) => {
  return db.query.mailItems.findFirst({
    where: eq(schema.mailItems.id, id),
    with: {
      recipient: true,
      externalRecipient: true,
      processedBy: true,
      mailRoom: true
    }
  });
};

export const getPendingMailItems = async (
  organizationId: string, 
  page = 1, 
  pageSize = 10, 
  search = '',
  mailroomId?: string
): Promise<PaginatedResult<any>> => {
  // Build the query conditions
  const conditions = [
    eq(schema.mailItems.org_id, organizationId),
    or(
      eq(schema.mailItems.status, schema.mailItemStatusEnum.enumValues[0]),
      eq(schema.mailItems.status, schema.mailItemStatusEnum.enumValues[1])
    )
  ];
  
  if (mailroomId) {
    conditions.push(eq(schema.mailItems.mail_room_id, mailroomId));
  }
  
  // Create search query if needed
  if (search) {
    // For simplicity, we handle a very basic search using LIKE
    // In a production app, you'd want a more robust search mechanism
    const searchCondition = or(
      like(sql`CONCAT(up.first_name, ' ', up.last_name)`, `%${search}%`),
      like(sql`CONCAT(ep.first_name, ' ', ep.last_name)`, `%${search}%`),
      like(schema.mailItems.tracking_number || '', `%${search}%`),
      like(schema.mailItems.description || '', `%${search}%`)
    );
    conditions.push(searchCondition);
  }
  
  // Count total items matching the query
  const countQuery = db.select({ count: sql<number>`count(*)` })
    .from(schema.mailItems)
    .leftJoin(
      schema.userProfiles, 
      eq(schema.mailItems.recipient_id, schema.userProfiles.id)
    )
    .leftJoin(
      schema.externalPeople,
      eq(schema.mailItems.external_recipient_id, schema.externalPeople.id)
    )
    .where(and(...conditions));
  
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;
  
  // If no items, return empty result
  if (total === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      start: 0,
      end: 0
    };
  }
  
  // Get the actual items with pagination
  const offset = (page - 1) * pageSize;
  const items = await db.query.mailItems.findMany({
    where: and(...conditions),
    with: {
      recipient: true,
      externalRecipient: true,
      processedBy: true,
      mailRoom: true
    },
    orderBy: [desc(schema.mailItems.is_priority), desc(schema.mailItems.received_at)],
    limit: pageSize,
    offset
  });
  
  // Process the results to combine recipient information
  const processedItems = items.map(item => {
    // Determine the recipient (either internal or external)
    const recipient = item.recipient || item.externalRecipient;
    
    return {
      ...item,
      recipient: {
        id: recipient?.id || 0,
        firstName: recipient?.first_name || 'Unknown',
        lastName: recipient?.last_name || 'Recipient',
        department: recipient?.department || null,
        location: recipient?.location || null
      }
    };
  });
  
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    items: processedItems,
    total,
    page,
    pageSize,
    totalPages,
    start: offset + 1,
    end: offset + processedItems.length
  };
};

export const getRecentMailItems = async (organizationId: string, limit = 10, mailroomId?: string) => {
  const conditions = [eq(schema.mailItems.org_id, organizationId)];
  
  if (mailroomId) {
    conditions.push(eq(schema.mailItems.mail_room_id, mailroomId));
  }
  
  const items = await db.query.mailItems.findMany({
    where: and(...conditions),
    with: {
      recipient: true,
      externalRecipient: true,
      processedBy: true
    },
    orderBy: [desc(schema.mailItems.received_at)],
    limit
  });
  
  // Process the results to combine recipient information
  return items.map(item => {
    // Determine the recipient (either internal or external)
    const recipient = item.recipient || item.externalRecipient;
    
    return {
      ...item,
      recipient: {
        id: recipient?.id || 0,
        firstName: recipient?.first_name || 'Unknown',
        lastName: recipient?.last_name || 'Recipient',
        department: recipient?.department || null,
        location: recipient?.location || null
      }
    };
  });
};

export const getMailHistory = async (
  organizationId: string,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    mailroomId?: string;
  }
): Promise<PaginatedResult<MailHistoryItem>> => {
  const {
    page = 1,
    pageSize = 10,
    search = '',
    status,
    dateFrom,
    dateTo,
    mailroomId
  } = params;
  
  // Build the query conditions
  const conditions = [eq(schema.mailItems.org_id, organizationId)];
  
  if (mailroomId) {
    conditions.push(eq(schema.mailItems.mail_room_id, mailroomId));
  }
  
  if (status) {
    conditions.push(eq(schema.mailItems.status, status));
  }
  
  if (dateFrom) {
    conditions.push(sql`DATE(${schema.mailItems.received_at}) >= ${dateFrom}`);
  }
  
  if (dateTo) {
    conditions.push(sql`DATE(${schema.mailItems.received_at}) <= ${dateTo}`);
  }
  
  // Create search query if needed
  if (search) {
    const searchCondition = or(
      like(sql`CONCAT(up.first_name, ' ', up.last_name)`, `%${search}%`),
      like(sql`CONCAT(ep.first_name, ' ', ep.last_name)`, `%${search}%`),
      like(schema.mailItems.tracking_number || '', `%${search}%`),
      like(schema.mailItems.description || '', `%${search}%`)
    );
    conditions.push(searchCondition);
  }
  
  // Count total items matching the query
  const countQuery = db.select({ count: sql<number>`count(*)` })
    .from(schema.mailItems)
    .leftJoin(
      schema.userProfiles, 
      eq(schema.mailItems.recipient_id, schema.userProfiles.id)
    )
    .leftJoin(
      schema.externalPeople,
      eq(schema.mailItems.external_recipient_id, schema.externalPeople.id)
    )
    .where(and(...conditions));
  
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;
  
  // If no items, return empty result
  if (total === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      start: 0,
      end: 0
    };
  }
  
  // Get the actual items with pagination
  const offset = (page - 1) * pageSize;
  const items = await db.query.mailItems.findMany({
    where: and(...conditions),
    with: {
      recipient: true,
      externalRecipient: true,
      processedBy: true,
      mailRoom: true
    },
    orderBy: [desc(schema.mailItems.received_at)],
    limit: pageSize,
    offset
  });
  
  // Process the results to combine recipient information
  const processedItems = items.map(item => {
    // Determine the recipient (either internal or external)
    const recipient = item.recipient || item.externalRecipient;
    
    return {
      ...item,
      recipient: {
        id: recipient?.id || 0,
        firstName: recipient?.first_name || 'Unknown',
        lastName: recipient?.last_name || 'Recipient',
        department: recipient?.department || null,
        location: recipient?.location || null
      }
    };
  }) as MailHistoryItem[];
  
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    items: processedItems,
    total,
    page,
    pageSize,
    totalPages,
    start: offset + 1,
    end: offset + processedItems.length
  };
};

// Dashboard statistics
export const getMailStats = async (organizationId: string, mailroomId?: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Base conditions for all queries
  const baseConditions = [eq(schema.mailItems.org_id, organizationId)];
  
  if (mailroomId) {
    baseConditions.push(eq(schema.mailItems.mail_room_id, mailroomId));
  }
  
  // Pending count (pending or notified status)
  const pendingConditions = [
    ...baseConditions,
    or(
      eq(schema.mailItems.status, schema.mailItemStatusEnum.enumValues[0]),
      eq(schema.mailItems.status, schema.mailItemStatusEnum.enumValues[1])
    )
  ];
  
  const pendingQuery = db.select({ count: sql<number>`count(*)` })
    .from(schema.mailItems)
    .where(and(...pendingConditions));
  
  // Priority count
  const priorityConditions = [
    ...pendingConditions,
    eq(schema.mailItems.is_priority, true)
  ];
  
  const priorityQuery = db.select({ count: sql<number>`count(*)` })
    .from(schema.mailItems)
    .where(and(...priorityConditions));
  
  // Delivered today count
  const deliveredTodayConditions = [
    ...baseConditions,
    eq(schema.mailItems.status, schema.mailItemStatusEnum.enumValues[2]),
    sql`DATE(${schema.mailItems.picked_up_at}) = ${today.toISOString().split('T')[0]}`
  ];
  
  const deliveredTodayQuery = db.select({ count: sql<number>`count(*)` })
    .from(schema.mailItems)
    .where(and(...deliveredTodayConditions));
  
  // Delivered yesterday count for comparison
  const deliveredYesterdayConditions = [
    ...baseConditions,
    eq(schema.mailItems.status, schema.mailItemStatusEnum.enumValues[2]),
    sql`DATE(${schema.mailItems.picked_up_at}) = ${yesterday.toISOString().split('T')[0]}`
  ];
  
  const deliveredYesterdayQuery = db.select({ count: sql<number>`count(*)` })
    .from(schema.mailItems)
    .where(and(...deliveredYesterdayConditions));
  
  // Aging items (>5 days old and not picked up)
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  
  const agingConditions = [
    ...pendingConditions,
    sql`${schema.mailItems.received_at} < ${fiveDaysAgo.toISOString()}`
  ];
  
  const agingQuery = db.select({ count: sql<number>`count(*)` })
    .from(schema.mailItems)
    .where(and(...agingConditions));
  
  // Oldest item
  const oldestQuery = db.select({
    days: sql<number>`EXTRACT(DAY FROM (NOW() - MAX(${schema.mailItems.received_at})))`
  })
    .from(schema.mailItems)
    .where(and(...pendingConditions));
  
  // Average processing time for items picked up in the last 14 days
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const processingTimeQuery = db.select({
    avg: sql<number>`AVG(EXTRACT(DAY FROM (${schema.mailItems.picked_up_at} - ${schema.mailItems.received_at})))`
  })
    .from(schema.mailItems)
    .where(and(
      ...baseConditions,
      eq(schema.mailItems.status, schema.mailItemStatusEnum.enumValues[2]),
      not(isNull(schema.mailItems.picked_up_at)),
      sql`${schema.mailItems.picked_up_at} >= ${twoWeeksAgo.toISOString()}`
    ));
  
  // Processing time from previous period for comparison
  const fourWeeksAgo = new Date(twoWeeksAgo);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 14);
  
  const prevProcessingTimeQuery = db.select({
    avg: sql<number>`AVG(EXTRACT(DAY FROM (${schema.mailItems.picked_up_at} - ${schema.mailItems.received_at})))`
  })
    .from(schema.mailItems)
    .where(and(
      ...baseConditions,
      eq(schema.mailItems.status, schema.mailItemStatusEnum.enumValues[2]),
      not(isNull(schema.mailItems.picked_up_at)),
      sql`${schema.mailItems.picked_up_at} >= ${fourWeeksAgo.toISOString()}`,
      sql`${schema.mailItems.picked_up_at} < ${twoWeeksAgo.toISOString()}`
    ));
  
  // Execute all queries in parallel
  const [
    pendingResult,
    priorityResult,
    deliveredTodayResult,
    deliveredYesterdayResult,
    agingResult,
    oldestResult,
    processingTimeResult,
    prevProcessingTimeResult
  ] = await Promise.all([
    pendingQuery,
    priorityQuery,
    deliveredTodayQuery,
    deliveredYesterdayQuery,
    agingQuery,
    oldestQuery,
    processingTimeQuery,
    prevProcessingTimeQuery
  ]);
  
  // Extract the counts from the results
  const pendingCount = pendingResult[0]?.count || 0;
  const priorityCount = priorityResult[0]?.count || 0;
  const deliveredTodayCount = deliveredTodayResult[0]?.count || 0;
  const deliveredYesterdayCount = deliveredYesterdayResult[0]?.count || 0;
  const agingCount = agingResult[0]?.count || 0;
  const oldestDays = oldestResult[0]?.days || 0;
  const avgProcessingDays = processingTimeResult[0]?.avg || 0;
  const prevAvgProcessingDays = prevProcessingTimeResult[0]?.avg || 0;
  
  // Calculate differences
  const deliveredDiff = deliveredTodayCount - deliveredYesterdayCount;
  const processingDiff = avgProcessingDays - prevAvgProcessingDays;
  
  // Return all stats in an object
  const stats: DashboardStats = {
    pendingCount,
    priorityCount,
    deliveredTodayCount,
    deliveredDiff,
    agingCount,
    oldestDays,
    avgProcessingDays,
    processingDiff
  };
  
  return stats;
};

// Recent activity for dashboard
export const getRecentActivity = async (
  organizationId: string, 
  limit = 10, 
  mailroomId?: string
): Promise<ActivityItem[]> => {
  const activities: ActivityItem[] = [];
  
  // Base conditions for all queries
  const baseConditions = [eq(schema.mailItems.org_id, organizationId)];
  
  if (mailroomId) {
    baseConditions.push(eq(schema.mailItems.mail_room_id, mailroomId));
  }
  
  // Recent mail items received (limited to last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentMailItems = await db.query.mailItems.findMany({
    where: and(
      ...baseConditions,
      sql`${schema.mailItems.received_at} >= ${thirtyDaysAgo.toISOString()}`
    ),
    with: {
      recipient: true,
      externalRecipient: true,
      processedBy: true
    },
    orderBy: [desc(schema.mailItems.received_at)],
    limit: limit * 2 // Get extra to filter later
  });
  
  // Recent pickups
  const recentPickups = await db.query.pickups.findMany({
    where: and(
      eq(schema.pickups.mailItem.org_id, organizationId),
      sql`${schema.pickups.picked_up_at} >= ${thirtyDaysAgo.toISOString()}`
    ),
    with: {
      mailItem: true,
      recipient: true,
      externalRecipient: true,
      processedBy: true
    },
    orderBy: [desc(schema.pickups.picked_up_at)],
    limit: limit * 2 // Get extra to filter later
  });
  
  // Recent notifications
  const recentNotifications = await db.query.notifications.findMany({
    where: and(
      eq(schema.notifications.org_id, organizationId),
      sql`${schema.notifications.created_at} >= ${thirtyDaysAgo.toISOString()}`
    ),
    with: {
      mailItem: true,
      recipient: true,
      externalRecipient: true
    },
    orderBy: [desc(schema.notifications.created_at)],
    limit: limit * 2 // Get extra to filter later
  });
  
  // Transform mail items to activity items
  recentMailItems.forEach(item => {
    const recipient = item.recipient || item.externalRecipient;
    if (!recipient) return;
    
    activities.push({
      id: item.id,
      type: 'received',
      description: `Package received for ${recipient.first_name} ${recipient.last_name}`,
      details: `${item.carrier.toUpperCase()} ${item.type} - Recorded by ${item.processedBy?.first_name || 'Staff'}`,
      timestamp: item.received_at.toISOString(),
      status: item.is_priority ? 'urgent' : 'new'
    });
  });
  
  // Transform pickups to activity items
  recentPickups.forEach(pickup => {
    const recipient = pickup.recipient || pickup.externalRecipient;
    if (!recipient) return;
    
    activities.push({
      id: pickup.id,
      type: 'pickup',
      description: `${recipient.first_name} ${recipient.last_name} picked up package`,
      details: `${pickup.mailItem.carrier.toUpperCase()} - Package ID: ${pickup.mailItem.tracking_number || 'N/A'}`,
      timestamp: pickup.picked_up_at.toISOString(),
      status: 'picked_up'
    });
  });
  
  // Transform notifications to activity items
  recentNotifications.forEach(notification => {
    const recipient = notification.recipient || notification.externalRecipient;
    if (!recipient) return;
    
    activities.push({
      id: notification.id,
      type: 'notification',
      description: `Notification sent to ${recipient.first_name} ${recipient.last_name}`,
      details: `${notification.type.toUpperCase()} - ${notification.mailItem.type}`,
      timestamp: notification.created_at.toISOString(),
      status: 'notification'
    });
  });
  
  // Sort all activities by timestamp and limit to the requested number
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
};

// Dashboard insights
export const getPackageDistribution = async (
  organizationId: string,
  mailroomId?: string
): Promise<PackageDistribution[]> => {
  const conditions = [eq(schema.mailItems.org_id, organizationId)];
  
  if (mailroomId) {
    conditions.push(eq(schema.mailItems.mail_room_id, mailroomId));
  }
  
  // Get counts by type
  const typeCountsQuery = db.select({
    type: schema.mailItems.type,
    count: sql<number>`count(*)`
  })
    .from(schema.mailItems)
    .where(and(...conditions))
    .groupBy(schema.mailItems.type);
  
  const typeCounts = await typeCountsQuery;
  
  // Get total count
  const totalQuery = db.select({ count: sql<number>`count(*)` })
    .from(schema.mailItems)
    .where(and(...conditions));
  
  const [totalResult] = await totalQuery;
  const total = totalResult?.count || 0;
  
  if (total === 0) {
    return [];
  }
  
  // Define colors for each type
  const typeColors: Record<string, string> = {
    package: '#3B82F6', // blue
    large_package: '#2563EB', // darker blue
    letter: '#10B981', // green
    envelope: '#34D399', // lighter green
    perishable: '#F59E0B', // amber
    signature_required: '#8B5CF6', // purple
    other: '#6B7280', // gray
  };
  
  // Transform to distribution format
  return typeCounts.map(item => {
    const percentage = Math.round((item.count / total) * 100);
    
    return {
      name: formatMailType(item.type),
      value: item.count,
      color: typeColors[item.type] || '#6B7280',
      percentage
    };
  }).sort((a, b) => b.value - a.value);
};

export const getMailVolumeInsight = async (
  organizationId: string,
  mailroomId?: string
): Promise<Insight> => {
  const conditions = [eq(schema.mailItems.org_id, organizationId)];
  
  if (mailroomId) {
    conditions.push(eq(schema.mailItems.mail_room_id, mailroomId));
  }
  
  // Get counts by day for the past 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const dailyCountsQuery = db.select({
    date: sql<string>`DATE(${schema.mailItems.received_at})`,
    count: sql<number>`count(*)`
  })
    .from(schema.mailItems)
    .where(and(
      ...conditions,
      sql`${schema.mailItems.received_at} >= ${thirtyDaysAgo.toISOString()}`
    ))
    .groupBy(sql`DATE(${schema.mailItems.received_at})`)
    .orderBy(sql`DATE(${schema.mailItems.received_at})`);
  
  const dailyCounts = await dailyCountsQuery;
  
  if (dailyCounts.length === 0) {
    return {
      title: "Mail Volume Insights",
      content: "Insufficient data to generate insights. Start recording mail items to see volume trends.",
      source: "Based on mail activity"
    };
  }
  
  // Calculate weekly volume
  const weeklyData: Record<string, number> = {};
  dailyCounts.forEach(day => {
    const date = new Date(day.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Go to start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = 0;
    }
    weeklyData[weekKey] += day.count;
  });
  
  const weeks = Object.keys(weeklyData).sort();
  
  if (weeks.length < 2) {
    return {
      title: "Mail Volume Insights",
      content: "More data needed for meaningful insights. Continue recording mail to see weekly trends.",
      source: "Based on recent mail activity"
    };
  }
  
  // Calculate week-over-week changes
  const currentWeekVolume = weeklyData[weeks[weeks.length - 1]];
  const previousWeekVolume = weeklyData[weeks[weeks.length - 2]];
  const percentChange = Math.round(((currentWeekVolume - previousWeekVolume) / previousWeekVolume) * 100);
  
  // Find busiest days
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayData: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  dailyCounts.forEach(day => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    dayData[dayOfWeek] += day.count;
  });
  
  const totalVolume = Object.values(dayData).reduce((sum, count) => sum + count, 0);
  const dayPercentages = Object.entries(dayData).map(([day, count]) => ({
    day: parseInt(day),
    name: dayNames[parseInt(day)],
    percentage: Math.round((count / totalVolume) * 100)
  }));
  
  // Sort by volume to find busiest days
  const sortedDays = [...dayPercentages].sort((a, b) => b.percentage - a.percentage);
  const busiestDay = sortedDays[0];
  const secondBusiestDay = sortedDays[1];
  
  // Generate insight text
  let insightText = "";
  
  if (percentChange > 0) {
    insightText = `Package volume has increased ${Math.abs(percentChange)}% week-over-week. `;
  } else if (percentChange < 0) {
    insightText = `Package volume has decreased ${Math.abs(percentChange)}% week-over-week. `;
  } else {
    insightText = "Package volume has remained stable week-over-week. ";
  }
  
  insightText += `${busiestDay.name}s (${busiestDay.percentage}%) and ${secondBusiestDay.name}s (${secondBusiestDay.percentage}%) are your busiest mail days. `;
  
  if (busiestDay.percentage > 25) {
    insightText += `Consider scheduling additional staff on ${busiestDay.name}s when volume peaks.`;
  } else {
    insightText += "Your mail volume is fairly evenly distributed throughout the week.";
  }
  
  return {
    title: "Mail Volume Insights",
    content: insightText,
    source: "Based on the last 30 days of activity"
  };
};

export const getBusiestPeriods = async (
  organizationId: string,
  mailroomId?: string
): Promise<BusiestPeriod[]> => {
  const conditions = [eq(schema.mailItems.org_id, organizationId)];
  
  if (mailroomId) {
    conditions.push(eq(schema.mailItems.mail_room_id, mailroomId));
  }
  
  // Get counts by day of week
  const dayOfWeekQuery = db.select({
    day: sql<number>`EXTRACT(DOW FROM ${schema.mailItems.received_at})`,
    count: sql<number>`count(*)`
  })
    .from(schema.mailItems)
    .where(and(...conditions))
    .groupBy(sql`EXTRACT(DOW FROM ${schema.mailItems.received_at})`)
    .orderBy(sql`count(*) DESC`);
  
  // Get counts by hour of day
  const hourOfDayQuery = db.select({
    hour: sql<number>`EXTRACT(HOUR FROM ${schema.mailItems.received_at})`,
    count: sql<number>`count(*)`
  })
    .from(schema.mailItems)
    .where(and(...conditions))
    .groupBy(sql`EXTRACT(HOUR FROM ${schema.mailItems.received_at})`)
    .orderBy(sql`count(*) DESC`);
  
  const [dayOfWeekResults, hourOfDayResults] = await Promise.all([
    dayOfWeekQuery,
    hourOfDayQuery
  ]);
  
  // Format results
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const totalDays = dayOfWeekResults.reduce((sum, day) => sum + day.count, 0);
  
  const busiestDay = dayOfWeekResults.length > 0 ? {
    label: "Day of Week",
    type: "day",
    value: Math.round((dayOfWeekResults[0].count / totalDays) * 100),
    period: dayNames[dayOfWeekResults[0].day]
  } : null;
  
  const totalHours = hourOfDayResults.reduce((sum, hour) => sum + hour.count, 0);
  const busiestHourIndex = hourOfDayResults.length > 0 ? hourOfDayResults[0].hour : 0;
  const busiestHour = hourOfDayResults.length > 0 ? {
    label: "Time of Day",
    type: "hour",
    value: Math.round((hourOfDayResults[0].count / totalHours) * 100),
    period: formatHourRange(busiestHourIndex)
  } : null;
  
  const result: BusiestPeriod[] = [];
  if (busiestDay) result.push(busiestDay);
  if (busiestHour) result.push(busiestHour);
  
  return result;
};

// Pickup management
export const createPickup = async (data: schema.PickupInsert) => {
  // Start a transaction
  return db.transaction(async (tx) => {
    // Create the pickup record
    const [pickup] = await tx.insert(schema.pickups)
      .values(data)
      .returning();
    
    // Update the mail item status
    await tx.update(schema.mailItems)
      .set({
        status: schema.mailItemStatusEnum.enumValues[2],
        picked_up_at: data.picked_up_at || new Date(),
        updated_at: new Date()
      })
      .where(eq(schema.mailItems.id, data.mailItemId))
      .returning();
    
    return pickup;
  });
};

export const getPickupById = async (id: string) => {
  return db.query.pickups.findFirst({
    where: eq(schema.pickups.id, id),
    with: {
      mailItem: true,
      recipient: true,
      externalRecipient: true,
      processedBy: true
    }
  });
};

// Notification management
export const createNotification = async (data: schema.NotificationInsert) => {
  const [notification] = await db.insert(schema.notifications)
    .values(data)
    .returning();
  
  return notification;
};

export const updateMailItemNotificationStatus = async (mailItemId: string) => {
  const [updated] = await db.update(schema.mailItems)
    .set({
      status: schema.mailItemStatusEnum.enumValues[1],
      notified_at: new Date(),
      updated_at: new Date()
    })
    .where(eq(schema.mailItems.id, mailItemId))
    .returning();
  
  return updated;
};

// Integration management
export const getIntegrationsByOrganizationId = async (organizationId: string) => {
  return db.query.integrations.findMany({
    where: eq(schema.integrations.org_id, organizationId),
    orderBy: [desc(schema.integrations.is_active), schema.integrations.name]
  });
};

export const createIntegration = async (data: schema.IntegrationInsert) => {
  const [integration] = await db.insert(schema.integrations)
    .values(data)
    .returning();
  
  return integration;
};

export const updateIntegration = async (id: string, data: Partial<schema.Integration>) => {
  const [updated] = await db.update(schema.integrations)
    .set({
      ...data,
      updated_at: new Date()
    })
    .where(eq(schema.integrations.id, id))
    .returning();
  
  return updated;
};

// Audit logging
export const createAuditLog = async (data: schema.AuditLogInsert) => {
  const [log] = await db.insert(schema.auditLogs)
    .values(data)
    .returning();
  
  return log;
};

// Auth functions (using Supabase)
export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) {
    throw new Error(`Failed to change password: ${error.message}`);
  }
  
  return { success: true };
};

// Helper functions
function formatMailType(type: string): string {
  switch (type) {
    case 'package': return 'Packages';
    case 'large_package': return 'Large Packages';
    case 'letter': return 'Letters';
    case 'envelope': return 'Envelopes';
    case 'perishable': return 'Perishable';
    case 'signature_required': return 'Signature Required';
    case 'other': return 'Other';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function formatHourRange(hour: number): string {
  const hourString = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'am' : 'pm';
  const nextHour = (hour + 1) % 24;
  const nextHourString = nextHour % 12 === 0 ? 12 : nextHour % 12;
  const nextPeriod = nextHour < 12 ? 'am' : 'pm';
  
  return `${hourString}${period}-${nextHourString}${nextPeriod}`;
}
