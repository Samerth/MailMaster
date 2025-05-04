import { createContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Organization, MailRoom } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization) => void;
  isLoading: boolean;
  mailrooms: MailRoom[];
  currentMailroom: MailRoom | null;
  setCurrentMailroom: (mailroom: MailRoom) => void;
}

export const OrganizationContext = createContext<OrganizationContextType>({
  organizations: [],
  currentOrganization: null,
  setCurrentOrganization: () => {},
  isLoading: true,
  mailrooms: [],
  currentMailroom: null,
  setCurrentMailroom: () => {},
});

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [mailrooms, setMailrooms] = useState<MailRoom[]>([]);
  const [currentMailroom, setCurrentMailroom] = useState<MailRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch organizations the user has access to
  const {
    data: orgsData,
    isLoading: orgsLoading,
  } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  // Fetch mailrooms when organization changes
  const {
    data: mailroomsData,
    isLoading: mailroomsLoading,
  } = useQuery<MailRoom[]>({
    queryKey: ['/api/mailrooms', currentOrganization?.id],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!currentOrganization,
  });

  // Update organizations state when data changes
  useEffect(() => {
    if (orgsData) {
      setOrganizations(orgsData);
      
      // Set current organization to the first one or keep existing if it's in the list
      const existingOrgStillValid = currentOrganization && 
        orgsData.some((org: Organization) => org.id === currentOrganization.id);
          
      if (!existingOrgStillValid && orgsData.length > 0) {
        setCurrentOrganization(orgsData[0]);
      }
    }
  }, [orgsData, currentOrganization]);

  // Update mailrooms state when data changes
  useEffect(() => {
    if (mailroomsData) {
      setMailrooms(mailroomsData);
      
      // Set current mailroom to the first one or keep existing if it's in the list
      const existingMailroomStillValid = currentMailroom && 
        mailroomsData.some((mr: MailRoom) => mr.id === currentMailroom.id);
          
      if (!existingMailroomStillValid && mailroomsData.length > 0) {
        setCurrentMailroom(mailroomsData[0]);
      } else if (mailroomsData.length === 0) {
        setCurrentMailroom(null);
      }
    }
  }, [mailroomsData, currentMailroom]);

  // Update loading state
  useEffect(() => {
    setIsLoading(orgsLoading || mailroomsLoading);
  }, [orgsLoading, mailroomsLoading]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        setCurrentOrganization,
        isLoading,
        mailrooms,
        currentMailroom,
        setCurrentMailroom,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}