import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MailIntakeForm from "@/components/mail/MailIntakeForm";
import { useMailrooms } from "@/hooks/useMailrooms";
import { Plus, FileText, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/common/StatusBadge";
import UserAvatar from "@/components/common/UserAvatar";
import { format } from "date-fns";

export default function MailIntake() {
  useDocumentTitle("Mail Intake - MailFlow");
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [search, setSearch] = useState("");
  const { currentMailroom } = useMailrooms();
  
  // Fetch recent mail items
  const { data: recentItems, isLoading } = useQuery({
    queryKey: ['/api/mail-items/recent'],
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-slate-800">Mail Intake</h1>
        <Button 
          onClick={() => setShowIntakeForm(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record New Mail Item
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-2">1</span>
                <span className="font-medium">Scan or photograph the package label</span>
              </div>
              <p className="pl-8">Use OCR to automatically extract tracking numbers and recipient details</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-2">2</span>
                <span className="font-medium">Verify recipient and details</span>
              </div>
              <p className="pl-8">Check that the recipient matches someone in your organization</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-2">3</span>
                <span className="font-medium">Save and notify</span>
              </div>
              <p className="pl-8">Recipients will be automatically notified when you save the item</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Recently Received Items</CardTitle>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 lg:w-64"
            />
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
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Processed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading recent items...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : recentItems && recentItems.length > 0 ? (
                  recentItems
                    .filter(item => {
                      if (!search) return true;
                      const searchTerm = search.toLowerCase();
                      return (
                        item.recipient.firstName.toLowerCase().includes(searchTerm) ||
                        item.recipient.lastName.toLowerCase().includes(searchTerm) ||
                        (item.trackingNumber && item.trackingNumber.toLowerCase().includes(searchTerm)) ||
                        item.carrier.toLowerCase().includes(searchTerm) ||
                        item.type.toLowerCase().includes(searchTerm)
                      );
                    })
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <StatusBadge status={item.status} priority={item.isPriority} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <UserAvatar 
                              firstName={item.recipient.firstName}
                              lastName={item.recipient.lastName}
                              className="h-8 w-8 mr-2"
                            />
                            <div>
                              <p className="font-medium">{item.recipient.firstName} {item.recipient.lastName}</p>
                              <p className="text-xs text-muted-foreground">{item.recipient.department}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{item.carrier} {item.type}</p>
                            {item.trackingNumber && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {item.trackingNumber}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.receivedAt), 'MMM d, h:mm a')}
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
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No recent items found</p>
                      <Button 
                        variant="link"
                        onClick={() => setShowIntakeForm(true)}
                        className="mt-2"
                      >
                        Record your first mail item
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <MailIntakeForm 
        open={showIntakeForm} 
        onClose={() => setShowIntakeForm(false)} 
        mailroomId={currentMailroom?.id}
      />
    </div>
  );
}
