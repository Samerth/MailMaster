import { useQuery } from "@tanstack/react-query";
import { useOrganizations } from "./useOrganizations";
import { useMailrooms } from "./useMailrooms";

interface MailItemsStats {
  pendingCount: number;
  priorityCount: number;
  deliveredTodayCount: number;
  deliveredDiff: number;
  agingCount: number;
  oldestDays: number;
  avgProcessingDays: number;
  processingDiff: number;
}

export function useMailItems(options?: { page?: number; pageSize?: number; search?: string; status?: string; }) {
  const { currentOrganization } = useOrganizations();
  const { currentMailroom } = useMailrooms();
  
  const organizationId = currentOrganization?.id;
  const mailroomId = currentMailroom?.id;
  
  // Fetch mail items based on current organization and mailroom
  const { data: mailItems, isLoading, error } = useQuery({
    queryKey: [
      '/api/mail-items', 
      { 
        organizationId,
        mailroomId,
        ...options
      }
    ],
    enabled: !!organizationId,
  });
  
  // Fetch mail item statistics
  const { data: stats = {} as MailItemsStats } = useQuery({
    queryKey: [
      '/api/mail-items/stats',
      {
        organizationId,
        mailroomId
      }
    ],
    enabled: !!organizationId,
  });
  
  // Fetch pending mail items specifically
  const { data: pendingItems } = useQuery({
    queryKey: [
      '/api/mail-items/pending',
      {
        organizationId,
        mailroomId,
        page: options?.page || 1,
        pageSize: options?.pageSize || 10,
        search: options?.search || ''
      }
    ],
    enabled: !!organizationId,
  });

  return {
    mailItems,
    pendingItems,
    stats,
    isLoading,
    error,
  };
}
