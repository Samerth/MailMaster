import { useMailItems } from "@/hooks/useMailItems";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  Inbox, 
  CheckCircle, 
  Hourglass, 
  Clock
} from "lucide-react";

export default function DashboardStats() {
  const { stats } = useMailItems();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Pending Items */}
      <Card className="bg-white rounded-lg shadow-sm border-l-4 border-amber-500">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Items</p>
              <p className="text-2xl font-bold text-slate-800">{stats.pendingCount || 0}</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-md text-amber-600">
              <Inbox className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className="text-slate-500">{stats.priorityCount || 0} priority packages</span>
            {stats.priorityCount > 0 && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Items Delivered */}
      <Card className="bg-white rounded-lg shadow-sm border-l-4 border-green-500">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Delivered Today</p>
              <p className="text-2xl font-bold text-slate-800">{stats.deliveredTodayCount || 0}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-md text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className="text-slate-500">+{stats.deliveredDiff || 0} since yesterday</span>
            {(stats.deliveredDiff > 0) && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Aging Items */}
      <Card className="bg-white rounded-lg shadow-sm border-l-4 border-red-500">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Aging Items ({'>'}5d)</p>
              <p className="text-2xl font-bold text-slate-800">{stats.agingCount || 0}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-md text-red-600">
              <Hourglass className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className="text-slate-500">Oldest: {stats.oldestDays || 0} days</span>
            {stats.oldestDays > 7 && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Processing Time */}
      <Card className="bg-white rounded-lg shadow-sm border-l-4 border-blue-500">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Avg Processing</p>
              <p className="text-2xl font-bold text-slate-800">{stats.avgProcessingDays?.toFixed(1) || '0.0'} days</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-md text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className="text-slate-500">{stats.processingDiff > 0 ? '+' : ''}{stats.processingDiff?.toFixed(1) || '0.0'} days this week</span>
            {stats.processingDiff < 0 && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {stats.processingDiff > 0 && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
