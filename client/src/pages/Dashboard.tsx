import { useEffect } from "react";
import DashboardStats from "@/components/dashboard/DashboardStats";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import PendingPickupsTable from "@/components/dashboard/PendingPickupsTable";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useMailrooms } from "@/hooks/useMailrooms";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Dashboard() {
  const { currentOrganization } = useOrganizations();
  const { currentMailroom } = useMailrooms();
  
  // Set document title
  useDocumentTitle("Dashboard - MailFlow");
  
  // Log current context
  useEffect(() => {
    if (currentOrganization) {
      console.log(`Active Organization: ${currentOrganization.name}`);
    }
    if (currentMailroom) {
      console.log(`Active Mailroom: ${currentMailroom.name}`);
    }
  }, [currentOrganization, currentMailroom]);

  return (
    <div className="p-4 lg:p-6">
      {/* Stats Cards */}
      <DashboardStats />
      
      {/* Activity Feed & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivityFeed />
        <InsightsPanel />
      </div>
      
      {/* Pending Pickups Table */}
      <PendingPickupsTable />
    </div>
  );
}
