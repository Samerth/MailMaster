import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription, 
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  RefreshCw, 
  UploadCloud, 
  Download, 
  Edit, 
  Trash2, 
  Database, 
  FileSpreadsheet, 
  Globe, 
  Clock,
  CheckCircle, 
  AlertCircle,
  Power,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// Form schema for adding/editing integrations
const integrationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["csv", "api", "other"]),
  configuration: z.object({
    url: z.string().optional(),
    apiKey: z.string().optional(),
    schedule: z.string().optional(),
    mappings: z.record(z.string()).optional(),
  }).optional(),
  isActive: z.boolean().default(true),
});

type IntegrationFormValues = z.infer<typeof integrationFormSchema>;

export default function Integrations() {
  useDocumentTitle("Integrations - MailFlow");
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['/api/integrations'],
  });
  
  // Form for adding/editing integrations
  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      name: "",
      type: "csv",
      isActive: true,
      configuration: {
        url: "",
        apiKey: "",
        schedule: "daily",
        mappings: {},
      },
    },
  });
  
  // Mutation for adding integrations
  const addIntegrationMutation = useMutation({
    mutationFn: async (values: IntegrationFormValues) => {
      const response = await apiRequest("POST", "/api/integrations", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Integration added",
        description: "The integration has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      setOpenAddDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add integration. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding integration:", error);
    },
  });
  
  const onSubmit = (values: IntegrationFormValues) => {
    addIntegrationMutation.mutate(values);
  };
  
  // Filter integrations based on active tab
  const filteredIntegrations = integrations?.filter(integration => {
    return activeTab === "all" || 
      (activeTab === "active" && integration.isActive) ||
      (activeTab === "inactive" && !integration.isActive);
  }) || [];
  
  const handleRunSync = async (integrationId: number) => {
    try {
      // In a real app, this would make an API call to start a sync
      toast({
        title: "Sync started",
        description: "The integration sync has been initiated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start sync. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleToggleActive = async (integrationId: number, currentActive: boolean) => {
    try {
      // In a real app, this would make an API call to toggle active status
      toast({
        title: currentActive ? "Integration disabled" : "Integration enabled",
        description: currentActive 
          ? "The integration has been disabled."
          : "The integration has been enabled and will sync on schedule.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update integration status. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get icon for integration type
  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5" />;
      case 'api':
        return <Globe className="h-5 w-5" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-slate-800">Integrations</h1>
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Integration</DialogTitle>
              <DialogDescription>
                Connect external systems to synchronize recipient data.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Integration Name</FormLabel>
                      <FormControl>
                        <Input placeholder="HR Directory Sync" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this integration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Integration Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="csv">CSV Upload</SelectItem>
                          <SelectItem value="api">API Connection</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How will data be imported into the system?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch("type") === "api" && (
                  <>
                    <FormField
                      control={form.control}
                      name="configuration.url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Endpoint URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://api.example.com/employees" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="configuration.apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input placeholder="sk_live_..." type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                <FormField
                  control={form.control}
                  name="configuration.schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sync Schedule</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select schedule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How often should data be synchronized?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable or disable this integration
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                disabled={addIntegrationMutation.isPending}
              >
                {addIntegrationMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Add Integration"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>About Integrations</CardTitle>
            <CardDescription>
              Connect external systems to keep your recipient directories in sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-start">
                  <div className="rounded-full bg-blue-100 p-2 mr-3">
                    <UploadCloud className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">CSV Uploads</h3>
                    <p className="text-slate-600">Import recipient lists from CSV files</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start">
                  <div className="rounded-full bg-purple-100 p-2 mr-3">
                    <Globe className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">API Connections</h3>
                    <p className="text-slate-600">Sync with HR systems and directories</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start">
                  <div className="rounded-full bg-green-100 p-2 mr-3">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Automated Syncing</h3>
                    <p className="text-slate-600">Schedule recurring updates</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Connected Integrations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="active" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Last Synced</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                            <p className="mt-2 text-sm text-muted-foreground">Loading integrations...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredIntegrations.length > 0 ? (
                      filteredIntegrations.map((integration) => (
                        <TableRow key={integration.id}>
                          <TableCell>
                            <div className="font-medium">{integration.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className={`rounded-full p-1.5 ${
                                integration.type === 'csv' ? 'bg-blue-100 text-blue-600' :
                                integration.type === 'api' ? 'bg-purple-100 text-purple-600' :
                                'bg-slate-100 text-slate-600'
                              } mr-2`}>
                                {getIntegrationIcon(integration.type)}
                              </div>
                              <span className="capitalize">{integration.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {integration.configuration?.schedule || "Manual"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {integration.lastSyncedAt ? (
                              format(new Date(integration.lastSyncedAt), "MMM d, h:mm a")
                            ) : (
                              <span className="text-slate-400">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {integration.isActive ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                <span>Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-slate-400">
                                <AlertCircle className="h-4 w-4 mr-1.5" />
                                <span>Inactive</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRunSync(integration.id)}
                                disabled={!integration.isActive}
                                title="Run Sync Now"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  // In a real app, this would edit the integration
                                  console.log("Edit integration:", integration.id);
                                }}
                                title="Edit Integration"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size={integration.isActive ? "icon" : "sm"}
                                onClick={() => handleToggleActive(integration.id, integration.isActive)}
                                className={integration.isActive ? "text-red-500" : "text-green-500"}
                                title={integration.isActive ? "Disable" : "Enable"}
                              >
                                {integration.isActive ? (
                                  <Power className="h-4 w-4" />
                                ) : (
                                  <span className="flex items-center">
                                    <Power className="h-4 w-4 mr-1" />
                                    Enable
                                  </span>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-muted-foreground">No integrations found</p>
                          <Button 
                            variant="link" 
                            onClick={() => setOpenAddDialog(true)}
                            className="mt-2"
                          >
                            Add your first integration
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
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Not sure how to set up your integration? Contact our support team or check our documentation.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between">
          <Button variant="outline">View Documentation</Button>
          <Button variant="default">Contact Support</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
