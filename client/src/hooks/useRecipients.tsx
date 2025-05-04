import { useQuery } from "@tanstack/react-query";
import { useOrganizations } from "./useOrganizations";
import type { UserProfile, ExternalPerson } from "@shared/schema";

interface RecipientData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  location: string | null;
  type: "internal" | "external";
}

export function useRecipients() {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;
  
  // Fetch internal recipients (user profiles)
  const { data: internalRecipients, isLoading: loadingInternal } = useQuery<UserProfile[]>({
    queryKey: ['/api/recipients/internal', { organizationId }],
    enabled: !!organizationId,
  });
  
  // Fetch external recipients
  const { data: externalRecipients, isLoading: loadingExternal } = useQuery<ExternalPerson[]>({
    queryKey: ['/api/recipients/external', { organizationId }],
    enabled: !!organizationId,
  });
  
  // Transform and combine recipients
  const recipients: RecipientData[] = [];
  
  if (internalRecipients) {
    recipients.push(
      ...internalRecipients.map(r => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        department: r.department,
        location: r.location,
        type: "internal" as const,
      }))
    );
  }
  
  if (externalRecipients) {
    recipients.push(
      ...externalRecipients.map(r => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email || "",
        phone: r.phone,
        department: r.department,
        location: r.location,
        type: "external" as const,
      }))
    );
  }
  
  return {
    recipients,
    internalRecipients,
    externalRecipients,
    isLoading: loadingInternal || loadingExternal,
  };
}
