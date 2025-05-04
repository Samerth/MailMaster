import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, CheckCircle, Bell } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import { formatDistanceToNow } from "date-fns";

interface RecentActivity {
  id: number;
  type: 'received' | 'pickup' | 'notification';
  description: string;
  details: string;
  timestamp: string;
  status: string;
}

export default function ActivityFeed() {
  const { data: activities, isLoading, error } = useQuery<RecentActivity[]>({
    queryKey: ['/api/activities/recent'],
  });

  // Get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'received':
        return <Inbox className="h-5 w-5 text-blue-600" />;
      case 'pickup':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'notification':
        return <Bell className="h-5 w-5 text-yellow-600" />;
      default:
        return <Inbox className="h-5 w-5 text-blue-600" />;
    }
  };

  // Get background color based on activity type
  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'received':
        return 'bg-blue-100';
      case 'pickup':
        return 'bg-green-100';
      case 'notification':
        return 'bg-yellow-100';
      default:
        return 'bg-blue-100';
    }
  };
  
  return (
    <Card className="lg:col-span-2 bg-white rounded-lg shadow-sm">
      <CardHeader className="border-b border-slate-200 p-4">
        <CardTitle className="font-semibold text-slate-800">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-slate-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-slate-500">Loading activities...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-red-500">Failed to load activities. Please try again.</p>
          </div>
        ) : (activities && activities.length > 0) ? (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 flex items-start">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getActivityBgColor(activity.type)} flex items-center justify-center mr-4`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{activity.description}</p>
                <p className="text-xs text-slate-500">{activity.details}</p>
                <div className="mt-1 flex items-center text-xs text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <StatusBadge status={activity.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-500">No recent activities found.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-slate-200 p-3 text-center">
        <Button variant="link" className="text-sm text-primary hover:text-primary-dark font-medium w-full">
          View All Activity
        </Button>
      </CardFooter>
    </Card>
  );
}
