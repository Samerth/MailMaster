import { createContext, useState, useEffect, ReactNode } from "react";
import supabase from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Organization, MailRoom } from "@shared/schema";

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
  const { user, isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [mailrooms, setMailrooms] = useState<MailRoom[]>([]);
  const [currentMailroom, setCurrentMailroom] = useState<MailRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch organizations the user has access to
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!isAuthenticated || !user) {
        setOrganizations([]);
        setCurrentOrganization(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch organizations based on user's organization ID
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', user.organizationId);

        if (error) {
          console.error("Error fetching organizations:", error);
          return;
        }

        if (data && data.length > 0) {
          setOrganizations(data as Organization[]);
          
          // Set current organization to the first one or keep existing if it's in the list
          const existingOrgStillValid = currentOrganization && 
            data.some(org => org.id === currentOrganization.id);
            
          if (existingOrgStillValid) {
            // Keep current organization
          } else {
            setCurrentOrganization(data[0] as Organization);
          }
        }
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, [user, isAuthenticated]);

  // Fetch mailrooms when organization changes
  useEffect(() => {
    const fetchMailrooms = async () => {
      if (!currentOrganization) {
        setMailrooms([]);
        setCurrentMailroom(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('mail_rooms')
          .select('*')
          .eq('organizationId', currentOrganization.id);

        if (error) {
          console.error("Error fetching mailrooms:", error);
          return;
        }

        if (data && data.length > 0) {
          setMailrooms(data as MailRoom[]);
          
          // Set current mailroom to the first one or keep existing if it's in the list
          const existingMailroomStillValid = currentMailroom && 
            data.some(mr => mr.id === currentMailroom.id);
            
          if (existingMailroomStillValid) {
            // Keep current mailroom
          } else {
            setCurrentMailroom(data[0] as MailRoom);
          }
        } else {
          setMailrooms([]);
          setCurrentMailroom(null);
        }
      } catch (error) {
        console.error("Failed to fetch mailrooms:", error);
      }
    };

    fetchMailrooms();
  }, [currentOrganization]);

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
