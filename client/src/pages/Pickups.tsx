import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Hand, Bell, CircleHelp, Filter, RefreshCw } from "lucide-react";
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
import StatusBadge from "@/components/common/StatusBadge";
import UserAvatar from "@/components/common/UserAvatar";
import PickupConfirmation from "@/components/mail/PickupConfirmation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Pickups() {
  useDocumentTitle("Pending Pickups - MailFlow");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const pageSize = 10;
  const { toast } = useToast();
  
  // Fetch pending items with filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      '/api/mail-items/pending', 
      { page: currentPage, search, filter, pageSize }
    ],
  });
  
  const handleProcessPickup = (item: any) => {
    setSelectedItem(item);
    setShowPickupModal(true);
  };
  
  const handleResendNotification = async (itemId: number) => {
    try {
      // In a real app, this would make an API call
      toast({
        title: "Notification sent",
        description: "The recipient has been notified about their mail item.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleViewDetails = (itemId: number) => {
    // Implement view details functionality
    console.log(`View details for item ${itemId}`);
  };
  
  // Calculate total pages
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  
  // Generate array of page numbers
  const pageNumbers = [];
  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-slate-800">Pending Pickups</h1>
        <Button 
          variant="outline"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-lg">Items Awaiting Pickup</CardTitle>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search recipients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 lg:w-64"
            />
            <Select
              value={filter}
              onValueChange={setFilter}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="notified">Notified</SelectItem>
                <SelectItem value="priority">Priority Only</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
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
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-2 text-sm text-slate-500">Loading mail items...</p>
                    </TableCell>
                  </TableRow>
                ) : data && data.items && data.items.length > 0 ? (
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
                        <div className="text-sm text-slate-800">{item.carrier} {item.type}</div>
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
                            onClick={() => handleProcessPickup(item)}
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
            <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
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
            </div>
          )}
        </CardContent>
      </Card>
      
      {showPickupModal && selectedItem && (
        <PickupConfirmation 
          open={showPickupModal} 
          onClose={() => {
            setShowPickupModal(false);
            setSelectedItem(null);
          }}
          mailItem={selectedItem}
        />
      )}
    </div>
  );
}
