import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  priority?: boolean;
  showIcon?: boolean;
}

export default function StatusBadge({ status, priority = false, showIcon = false }: StatusBadgeProps) {
  // Get badge color based on status
  const getBadgeVariant = () => {
    if (priority) return "destructive";
    
    // Handle null or undefined status
    if (!status) return "secondary";
    
    switch (status.toLowerCase()) {
      case 'pending':
        return "default";
      case 'notified':
        return "warning";
      case 'picked_up':
        return "success";
      case 'returned_to_sender':
        return "outline";
      case 'lost':
        return "destructive";
      case 'new':
        return "info";
      default:
        return "secondary";
    }
  };
  
  // Get display text
  const getDisplayText = () => {
    if (priority) return "Urgent";
    
    // Handle null or undefined status
    if (!status) return "Unknown";
    
    switch (status.toLowerCase()) {
      case 'pending':
        return "Pending";
      case 'notified':
        return "Notified";
      case 'picked_up':
        return "Picked Up";
      case 'returned_to_sender':
        return "Returned";
      case 'lost':
        return "Lost";
      case 'new':
        return "New";
      default:
        return status;
    }
  };
  
  // Custom class based on variant
  const getCustomClass = () => {
    if (priority) return "bg-red-100 text-red-800";
    
    // Handle null or undefined status
    if (!status) return "bg-slate-100 text-slate-800";
    
    switch (status.toLowerCase()) {
      case 'pending':
        return "bg-blue-100 text-blue-800";
      case 'notified':
        return "bg-yellow-100 text-yellow-800";
      case 'picked_up':
        return "bg-green-100 text-green-800";
      case 'returned_to_sender':
        return "bg-slate-100 text-slate-800";
      case 'lost':
        return "bg-red-100 text-red-800";
      case 'new':
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <Badge 
      variant="outline"
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCustomClass()}`}
    >
      {showIcon && priority && <AlertCircle className="h-3 w-3 mr-1" />}
      {getDisplayText()}
    </Badge>
  );
}
