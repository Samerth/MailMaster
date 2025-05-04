import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Hand, Bell, CircleHelp, Filter } from "lucide-react";
import UserAvatar from "../common/UserAvatar";
import StatusBadge from "../common/StatusBadge";
import { formatDistanceToNow, format } from "date-fns";

interface PendingMailItem {
  id: number;
  recipient: {
    id: number;
    firstName: string;
    lastName: string;
    department: string;
    location: string;
  };
  trackingNumber: string;
  carrier: string;
  description: string;
  receivedAt: string;
  status: string;
  isPriority: boolean;
}

export default function PendingPickupsTable() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;

  // Fetch pending mail items
  const { data, isLoading, error } = useQuery<{ items: PendingMailItem[], total: number }>({
    queryKey: ['/api/mail-items/pending', { page: currentPage, search, pageSize }],
  });

  const handlePickupClick = (itemId: number) => {
    // Navigate to pickup processing page or open modal
    console.log('Process pickup for item:', itemId);
  };

  const handleResendNotification = (itemId: number) => {
    // API call to resend notification
    console.log('Resend notification for item:', itemId);
  };

  const handleViewDetails = (itemId: number) => {
    // Open details page or modal
    console.log('View details for item:', itemId);
  };

  // Calculate total pages
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  // Generate array of page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <Card className="mt-6 bg-white rounded-lg shadow-sm">
      <CardHeader className="border-b border-slate-200 p-4 flex items-center justify-between">
        <CardTitle className="font-semibold text-slate-800">Pending Pickups</CardTitle>
        <div className="flex items-center">
          <div className="mr-2">
            <Input
              type="text"
              placeholder="Search recipients..."
              className="text-sm rounded-md border-slate-300 focus:border-primary focus:ring-primary w-full sm:w-60"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 ${showFilters ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
            aria-label="Filter"
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Recipient
              </TableHead>
              <TableHead className="py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Item Details
              </TableHead>
              <TableHead className="py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Received
              </TableHead>
              <TableHead className="py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-slate-200">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-slate-500">Loading mail items...</p>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-red-500">
                  Failed to load mail items. Please try again.
                </TableCell>
              </TableRow>
            ) : data && data.items.length > 0 ? (
              data.items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50">
                  <TableCell className="py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserAvatar 
                        firstName={item.recipient.firstName} 
                        lastName={item.recipient.lastName} 
                        className="flex-shrink-0 h-8 w-8"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-slate-800">
                          {item.recipient.firstName} {item.recipient.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.recipient.department}, {item.recipient.location}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="text-sm text-slate-800">{item.carrier} {item.description}</div>
                    <div className="text-xs text-slate-500">
                      {item.trackingNumber ? `Tracking: ${item.trackingNumber}` : "No tracking number"}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDistanceToNow(new Date(item.receivedAt), { addSuffix: true })}
                    <div className="text-xs">
                      {format(new Date(item.receivedAt), 'MMM d, h:mm a')}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 whitespace-nowrap">
                    <StatusBadge 
                      status={item.status} 
                      showIcon={item.isPriority}
                      priority={item.isPriority}
                    />
                  </TableCell>
                  <TableCell className="py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handlePickupClick(item.id)}
                        className="p-1 text-blue-600 hover:text-blue-900"
                        title="Process Pickup"
                      >
                        <Hand className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleResendNotification(item.id)}
                        className="p-1 text-amber-600 hover:text-amber-900"
                        title="Resend Notification"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewDetails(item.id)}
                        className="p-1 text-slate-600 hover:text-slate-900"
                        title="View Details"
                      >
                        <CircleHelp className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-slate-500">
                  No pending mail items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {data && data.total > 0 && (
        <CardFooter className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, data.total)}
                </span>{" "}
                of <span className="font-medium">{data.total}</span> results
              </p>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                
                {pageNumbers.map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
