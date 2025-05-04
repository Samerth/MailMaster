import { useState } from "react";
import { useRecipients } from "@/hooks/useRecipients";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  UserPlus, 
  MoreHorizontal, 
  Search, 
  Upload, 
  UserCog, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase,
  Download
} from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Form schema for adding/editing recipients
const recipientFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(["internal", "external"]),
});

type RecipientFormValues = z.infer<typeof recipientFormSchema>;

export default function Recipients() {
  useDocumentTitle("Recipients - MailFlow");
  const { recipients, isLoading } = useRecipients();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Form for adding/editing recipients
  const form = useForm<RecipientFormValues>({
    resolver: zodResolver(recipientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "",
      location: "",
      type: "internal",
    },
  });
  
  // Mutation for adding recipients
  const addRecipientMutation = useMutation({
    mutationFn: async (values: RecipientFormValues) => {
      const endpoint = values.type === "internal" 
        ? "/api/recipients/internal" 
        : "/api/recipients/external";
        
      const response = await apiRequest("POST", endpoint, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recipient added",
        description: "The recipient has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recipients/internal'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipients/external'] });
      setOpenAddDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add recipient. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding recipient:", error);
    },
  });
  
  const onSubmit = (values: RecipientFormValues) => {
    addRecipientMutation.mutate(values);
  };
  
  // Filter recipients based on search and active tab
  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = search.trim() === "" || 
      `${recipient.firstName} ${recipient.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      (recipient.email && recipient.email.toLowerCase().includes(search.toLowerCase())) ||
      (recipient.department && recipient.department.toLowerCase().includes(search.toLowerCase()));
      
    const matchesTab = activeTab === "all" || recipient.type === activeTab;
    
    return matchesSearch && matchesTab;
  });
  
  const handleImportCSV = () => {
    // Implementation would go here
    toast({
      title: "Import started",
      description: "Your CSV file is being processed. Recipients will be imported shortly.",
    });
    setImportDialogOpen(false);
  };
  
  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-slate-800">Recipients</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Recipient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Recipient</DialogTitle>
                <DialogDescription>
                  Add a new mail recipient to your organization's directory.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input placeholder="Marketing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Floor 3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="internal">Internal (Employee)</SelectItem>
                            <SelectItem value="external">External (Guest/Visitor)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Internal recipients are managed within your organization.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenAddDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={addRecipientMutation.isPending}
                >
                  {addRecipientMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Add Recipient"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Import Recipients</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import multiple recipients at once.
                </DialogDescription>
              </DialogHeader>
              
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <Upload className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-500 mb-2">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                />
                <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
                  Browse Files
                </Button>
                <p className="text-xs text-slate-400 mt-2">
                  CSV must include: firstName, lastName, email, (optional: phone, department, location)
                </p>
              </div>
              
              <div className="bg-slate-50 rounded-md p-3 text-sm">
                <p className="flex items-center text-slate-700 mb-2">
                  <Download className="h-4 w-4 mr-2 text-slate-500" />
                  <a href="#" className="text-primary hover:underline">Download template CSV</a>
                </p>
                <p className="text-slate-600 text-xs">
                  Use our template to ensure your data is formatted correctly for import.
                </p>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportCSV}>
                  Start Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Directory</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search recipients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <CardDescription>
            Manage all recipients who can receive mail at your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="all">All Recipients</TabsTrigger>
              <TabsTrigger value="internal">Employees</TabsTrigger>
              <TabsTrigger value="external">External</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email/Phone</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                            <p className="mt-2 text-sm text-muted-foreground">Loading recipients...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRecipients.length > 0 ? (
                      filteredRecipients.map((recipient) => (
                        <TableRow key={`${recipient.type}-${recipient.id}`}>
                          <TableCell>
                            <div className="flex items-center">
                              <UserAvatar
                                firstName={recipient.firstName}
                                lastName={recipient.lastName}
                                className="h-8 w-8 mr-2"
                              />
                              <div>
                                <p className="font-medium">{recipient.firstName} {recipient.lastName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <div className="flex items-center">
                                <Mail className="h-3.5 w-3.5 text-slate-400 mr-1" />
                                <span>{recipient.email}</span>
                              </div>
                              {recipient.phone && (
                                <div className="flex items-center mt-1">
                                  <Phone className="h-3.5 w-3.5 text-slate-400 mr-1" />
                                  <span>{recipient.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {recipient.department ? (
                              <div className="flex items-center">
                                <Briefcase className="h-3.5 w-3.5 text-slate-400 mr-1" />
                                <span>{recipient.department}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {recipient.location ? (
                              <div className="flex items-center">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 mr-1" />
                                <span>{recipient.location}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={recipient.type === "internal" ? "default" : "secondary"}>
                              {recipient.type === "internal" ? "Employee" : "External"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Test Notification
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-muted-foreground">No recipients found</p>
                          <Button 
                            variant="link" 
                            onClick={() => setOpenAddDialog(true)}
                            className="mt-2"
                          >
                            Add your first recipient
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
