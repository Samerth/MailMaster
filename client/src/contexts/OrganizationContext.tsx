import { createContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Organization, MailRoom } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Fallback data in case the database doesn't respond
const fallbackOrganizations: Organization[] = [
  {
    id: 1,
    name: "Acme Corp HQ",
    address: "123 Main Street, San Francisco, CA 94105",
    contactName: "John Smith",
    contactEmail: "john.smith@acmecorp.com",
    contactPhone: "415-555-1234",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

const fallbackMailrooms: MailRoom[] = [
  {
    id: 1,
    organizationId: 1,
    name: "Main Lobby",
    location: "Building A, Floor 1",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    organizationId: 1,
    name: "East Wing",
    location: "Building B, Floor 2",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

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
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [mailrooms, setMailrooms] = useState<MailRoom[]>([]);
  const [currentMailroom, setCurrentMailroom] = useState<MailRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useLocalData, setUseLocalData] = useState(false);

  // Fetch organizations the user has access to
  const {
    data: orgsData,
    isLoading: orgsLoading,
    error: orgsError
  } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && !useLocalData,
    retry: 1
  });

  // Fetch mailrooms when organization changes
  const {
    data: mailroomsData,
    isLoading: mailroomsLoading,
    error: mailroomsError
  } = useQuery<MailRoom[]>({
    queryKey: ['/api/mailrooms', currentOrganization?.id],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!currentOrganization && !useLocalData,
    retry: 1
  });

  // Check for DB connection errors and switch to local data if needed
  useEffect(() => {
    if (orgsError || mailroomsError) {
      if (!useLocalData) {
        console.log("Database connection error, using fallback data");
        setUseLocalData(true);
        toast({
          title: "Database Connection Issue",
          description: "Using temporary data. Some features may be limited.",
          variant: "destructive",
        });
        
        // Set fallback data
        setOrganizations(fallbackOrganizations);
        setCurrentOrganization(fallbackOrganizations[0]);
        setMailrooms(fallbackMailrooms);
        setCurrentMailroom(fallbackMailrooms[0]);
        setIsLoading(false);
      }
    }
  }, [orgsError, mailroomsError, useLocalData, toast]);

  // Update organizations state when data changes
  useEffect(() => {
    if (orgsData && !useLocalData) {
      setOrganizations(orgsData);
      
      // Set current organization to the first one or keep existing if it's in the list
      const existingOrgStillValid = currentOrganization && 
        orgsData.some((org: Organization) => org.id === currentOrganization.id);
          
      if (!existingOrgStillValid && orgsData.length > 0) {
        setCurrentOrganization(orgsData[0]);
      }
    }
  }, [orgsData, currentOrganization, useLocalData]);

  // Update mailrooms state when data changes
  useEffect(() => {
    if (mailroomsData && !useLocalData) {
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
  }, [mailroomsData, currentMailroom, useLocalData]);

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