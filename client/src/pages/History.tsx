import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription, 
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Filter, 
  Calendar as CalendarIcon, 
  Download, 
  ChevronDown,
  Eye,
} from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import StatusBadge from "@/components/common/StatusBadge";
import { format } from "date-fns";

export default function History() {
  useDocumentTitle("History - MailFlow");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all_statuses");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Query mail history with filters
  const { data, isLoading } = useQuery({
    queryKey: [
      '/api/mail-items/history',
      {
        page: currentPage,
        search,
        status: statusFilter === "all_statuses" ? undefined : statusFilter,
        dateFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      }
    ],
  });
  
  const handleExport = () => {
    // In a real app, this would generate a CSV/Excel file
    console.log("Exporting history with filters:", { search, statusFilter, dateRange });
  };
  
  const handleViewDetails = (itemId: number) => {
    // In a real app, this would show item details
    console.log("View details for item:", itemId);
  };
  
  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-slate-800">Mail History</h1>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Historical Records</CardTitle>
              <CardDescription>
                View and search all past mail items and their status.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:self-start"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <div className="px-6 py-3 border-b border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                <Input
                  placeholder="Search by recipient, tracking..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="notified">Notified</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="returned_to_sender">Returned</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM d, yyyy")} -{" "}
                            {format(dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                    />
                    <div className="p-3 border-t border-slate-200 flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDateRange({ from: undefined, to: undefined })}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => document.body.click()} // Close the popover
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}
        
        <CardContent className="p-0">
          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Processed By</TableHead>
                  <TableHead>Pickup Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading mail history...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data && data.items && data.items.length > 0 ? (
                  data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <StatusBadge 
                          status={item.status} 
                          priority={item.isPriority} 
                          showIcon={item.isPriority}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.receivedAt), "MMM d, yyyy")}
                        <div className="text-xs text-slate-500">
                          {format(new Date(item.receivedAt), "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <UserAvatar 
                            firstName={item.recipient.firstName}
                            lastName={item.recipient.lastName}
                            className="h-7 w-7 mr-2"
                          />
                          <div>
                            <p className="font-medium">{item.recipient.firstName} {item.recipient.lastName}</p>
                            <p className="text-xs text-slate-500">{item.recipient.department}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="font-normal">
                            {item.carrier.toUpperCase()}
                          </Badge>
                          <span className="ml-2">{item.type}</span>
                          {item.trackingNumber && (
                            <p className="text-xs text-slate-500 mt-1 truncate max-w-[150px]">
                              {item.trackingNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.processedBy ? (
                          <div className="flex items-center">
                            <UserAvatar
                              firstName={item.processedBy.firstName}
                              lastName={item.processedBy.lastName}
                              className="h-6 w-6 mr-1"
                            />
                            <span className="text-sm">{item.processedBy.firstName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.pickedUpAt ? (
                          <div>
                            {format(new Date(item.pickedUpAt), "MMM d, yyyy")}
                            <div className="text-xs text-slate-500">
                              {format(new Date(item.pickedUpAt), "h:mm a")}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(item.id)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <p className="text-muted-foreground">No mail history found</p>
                      {(search || statusFilter !== "all_statuses" || dateRange.from) && (
                        <Button 
                          variant="link" 
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("all_statuses");
                            setDateRange({ from: undefined, to: undefined });
                          }}
                          className="mt-2"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {data && data.total > 0 && (
            <div className="px-4 py-3 sm:px-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
              <p className="text-sm text-slate-700">
                Showing <span className="font-medium">{data.start}</span> to{" "}
                <span className="font-medium">{data.end}</span> of{" "}
                <span className="font-medium">{data.total}</span> results
              </p>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </Button>
                
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                
                {data.totalPages > 5 && <span className="px-2">...</span>}
                
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === data.totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
