import { useContext } from "react";
import { OrganizationContext } from "@/contexts/OrganizationContext";

export function useMailrooms() {
  const context = useContext(OrganizationContext);
  
  if (context === undefined) {
    throw new Error("useMailrooms must be used within an OrganizationProvider");
  }
  
  return {
    mailrooms: context.mailrooms,
    currentMailroom: context.currentMailroom,
    setCurrentMailroom: context.setCurrentMailroom,
  };
}
