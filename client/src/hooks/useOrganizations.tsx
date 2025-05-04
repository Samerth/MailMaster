import { useContext } from "react";
import { OrganizationContext } from "@/contexts/OrganizationContext";

export function useOrganizations() {
  const context = useContext(OrganizationContext);
  
  if (context === undefined) {
    throw new Error("useOrganizations must be used within an OrganizationProvider");
  }
  
  return {
    organizations: context.organizations,
    currentOrganization: context.currentOrganization,
    setCurrentOrganization: context.setCurrentOrganization,
    isLoading: context.isLoading,
  };
}
