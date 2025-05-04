import { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  UserCog,
  Building,
  MailCheck,
  BellRing,
  Lock,
  Save,
  RefreshCw,
  Settings2,
  Clock,
} from "lucide-react";

// Organization settings form schema
const organizationFormSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  address: z.string().optional(),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  logo: z.string().optional(),
});

// Notification settings form schema
const notificationFormSchema = z.object({
  enableEmailNotifications: z.boolean().default(true),
  enableSmsNotifications: z.boolean().default(false),
  notificationDelay: z.string(),
  reminderInterval: z.string(),
  itemAgingThreshold: z.string(),
  customEmailSubject: z.string().optional(),
  customEmailTemplate: z.string().optional(),
});

// User profile form schema
const userProfileFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
});

// Password change form schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
type NotificationFormValues = z.infer<typeof notificationFormSchema>;
type UserProfileFormValues = z.infer<typeof userProfileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function Settings() {
  useDocumentTitle("Settings - MailFlow");
  const { currentOrganization } = useOrganizations();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("organization");

  // Organization settings form
  const organizationForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: currentOrganization?.name || "",
      address: currentOrganization?.address || "",
      contactName: currentOrganization?.contactName || "",
      contactEmail: currentOrganization?.contactEmail || "",
      contactPhone: currentOrganization?.contactPhone || "",
      logo: currentOrganization?.logo || "",
    },
  });

  // Notification settings form
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      notificationDelay: "immediate",
      reminderInterval: "24h",
      itemAgingThreshold: "5d",
      customEmailSubject: "You have new mail waiting for pickup",
      customEmailTemplate: "Hello {recipient_name},\n\nYou have {item_count} new mail item(s) waiting for pickup in {mailroom_name}.\n\nItem details:\n{item_details}\n\nPlease collect your mail at your earliest convenience.\n\nThank you,\n{organization_name} Mailroom",
    },
  });

  // User profile form
  const userProfileForm = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      department: user?.department || "",
      location: user?.location || "",
    },
  });

  // Password change form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Mutation for updating organization
  const updateOrganizationMutation = useMutation({
    mutationFn: async (values: OrganizationFormValues) => {
      if (!currentOrganization?.id) return null;
      const response = await apiRequest("PATCH", `/api/organizations/${currentOrganization.id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Organization updated",
        description: "Organization settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update organization settings. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating organization:", error);
    },
  });

  // Mutation for updating notification settings
  const updateNotificationSettingsMutation = useMutation({
    mutationFn: async (values: NotificationFormValues) => {
      if (!currentOrganization?.id) return null;
      const response = await apiRequest("PATCH", `/api/organizations/${currentOrganization.id}/notification-settings`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Notification settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating notification settings:", error);
    },
  });

  // Mutation for updating user profile
  const updateUserProfileMutation = useMutation({
    mutationFn: async (values: UserProfileFormValues) => {
      if (!user?.id) return null;
      const response = await apiRequest("PATCH", `/api/user-profiles/${user.id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating user profile:", error);
    },
  });

  // Mutation for changing password
  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const response = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to change your password. Please verify your current password and try again.",
        variant: "destructive",
      });
      console.error("Error changing password:", error);
    },
  });

  // Form submit handlers
  const onOrganizationSubmit = (values: OrganizationFormValues) => {
    updateOrganizationMutation.mutate(values);
  };

  const onNotificationSubmit = (values: NotificationFormValues) => {
    updateNotificationSettingsMutation.mutate(values);
  };

  const onUserProfileSubmit = (values: UserProfileFormValues) => {
    updateUserProfileMutation.mutate(values);
  };

  const onPasswordSubmit = (values: PasswordFormValues) => {
    changePasswordMutation.mutate(values);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div
                className="flex flex-row lg:flex-col border-b lg:border-b-0 overflow-x-auto lg:overflow-visible"
                role="tablist"
              >
                <Button
                  variant={activeTab === "organization" ? "default" : "ghost"}
                  className="w-full justify-start rounded-none border-r lg:border-r-0 lg:border-b px-4 py-3"
                  onClick={() => setActiveTab("organization")}
                >
                  <Building className="h-5 w-5 mr-2" />
                  <span>Organization</span>
                </Button>
                <Button
                  variant={activeTab === "notifications" ? "default" : "ghost"}
                  className="w-full justify-start rounded-none border-r lg:border-r-0 lg:border-b px-4 py-3"
                  onClick={() => setActiveTab("notifications")}
                >
                  <BellRing className="h-5 w-5 mr-2" />
                  <span>Notifications</span>
                </Button>
                <Button
                  variant={activeTab === "mailrooms" ? "default" : "ghost"}
                  className="w-full justify-start rounded-none border-r lg:border-r-0 lg:border-b px-4 py-3"
                  onClick={() => setActiveTab("mailrooms")}
                >
                  <MailCheck className="h-5 w-5 mr-2" />
                  <span>Mailrooms</span>
                </Button>
                <Button
                  variant={activeTab === "account" ? "default" : "ghost"}
                  className="w-full justify-start rounded-none border-r lg:border-r-0 lg:border-b px-4 py-3"
                  onClick={() => setActiveTab("account")}
                >
                  <UserCog className="h-5 w-5 mr-2" />
                  <span>Account</span>
                </Button>
                <Button
                  variant={activeTab === "security" ? "default" : "ghost"}
                  className="w-full justify-start rounded-none px-4 py-3"
                  onClick={() => setActiveTab("security")}
                >
                  <Lock className="h-5 w-5 mr-2" />
                  <span>Security</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="col-span-12 lg:col-span-9">
          {/* Organization Settings */}
          {activeTab === "organization" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Organization Settings
                </CardTitle>
                <CardDescription>
                  Manage your organization's details and appearance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...organizationForm}>
                  <form
                    onSubmit={organizationForm.handleSubmit(onOrganizationSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={organizationForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={organizationForm.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={organizationForm.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border rounded-md p-4">
                      <FormField
                        control={organizationForm.control}
                        name="logo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo URL</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Enter a URL for your organization's logo
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateOrganizationMutation.isPending}
                      className="flex"
                    >
                      {updateOrganizationMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <BellRing className="h-5 w-5 mr-2" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure how and when mail notifications are sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form
                    onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Notification Methods</h3>
                      <FormField
                        control={notificationForm.control}
                        name="enableEmailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Send email notifications to recipients
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

                      <FormField
                        control={notificationForm.control}
                        name="enableSmsNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">SMS Notifications</FormLabel>
                              <FormDescription>
                                Send SMS notifications to recipients
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
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Timing Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={notificationForm.control}
                          name="notificationDelay"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Initial Notification</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select timing" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="immediate">Immediate</SelectItem>
                                  <SelectItem value="15m">After 15 minutes</SelectItem>
                                  <SelectItem value="30m">After 30 minutes</SelectItem>
                                  <SelectItem value="1h">After 1 hour</SelectItem>
                                  <SelectItem value="batch">Daily Batch (9am)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                When to send the first notification
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="reminderInterval"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reminder Interval</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select interval" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No Reminders</SelectItem>
                                  <SelectItem value="24h">Every 24 hours</SelectItem>
                                  <SelectItem value="48h">Every 48 hours</SelectItem>
                                  <SelectItem value="72h">Every 72 hours</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                How often to send reminders
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="itemAgingThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Aging Threshold</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select threshold" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="3d">3 days</SelectItem>
                                  <SelectItem value="5d">5 days</SelectItem>
                                  <SelectItem value="7d">7 days</SelectItem>
                                  <SelectItem value="14d">14 days</SelectItem>
                                  <SelectItem value="30d">30 days</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                When items are considered aging
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Email Templates</h3>
                      <FormField
                        control={notificationForm.control}
                        name="customEmailSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Subject</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Subject line for notification emails
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="customEmailTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Template</FormLabel>
                            <FormControl>
                              <Textarea
                                className="h-[200px] font-mono text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Template for notification emails. Use variables like {"{recipient_name}"}, {"{item_count}"}, {"{item_details}"}, {"{mailroom_name}"}, {"{organization_name}"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateNotificationSettingsMutation.isPending}
                      className="flex"
                    >
                      {updateNotificationSettingsMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Mailroom Settings */}
          {activeTab === "mailrooms" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <MailCheck className="h-5 w-5 mr-2" />
                  Mailroom Management
                </CardTitle>
                <CardDescription>
                  Manage mailrooms in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="list">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="list">Mailroom List</TabsTrigger>
                    <TabsTrigger value="add">Add Mailroom</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="list" className="space-y-4">
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="p-3 text-left text-sm font-medium text-slate-500">Name</th>
                            <th className="p-3 text-left text-sm font-medium text-slate-500">Location</th>
                            <th className="p-3 text-left text-sm font-medium text-slate-500">Status</th>
                            <th className="p-3 text-right text-sm font-medium text-slate-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-3 text-sm">Main Lobby</td>
                            <td className="p-3 text-sm">Building A, Floor 1</td>
                            <td className="p-3 text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            </td>
                            <td className="p-3 text-sm text-right">
                              <Button variant="ghost" size="sm">Edit</Button>
                              <Button variant="ghost" size="sm" className="text-red-500">Deactivate</Button>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 text-sm">East Wing</td>
                            <td className="p-3 text-sm">Building B, Floor 2</td>
                            <td className="p-3 text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            </td>
                            <td className="p-3 text-sm text-right">
                              <Button variant="ghost" size="sm">Edit</Button>
                              <Button variant="ghost" size="sm" className="text-red-500">Deactivate</Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="add">
                    <form className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Mailroom Name</label>
                          <Input placeholder="Enter mailroom name" />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Location</label>
                          <Input placeholder="Enter location (e.g., Building A, Floor 1)" />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch id="active" defaultChecked />
                          <label htmlFor="active" className="text-sm font-medium">Active</label>
                        </div>
                      </div>
                      
                      <Button>Add Mailroom</Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Account Settings */}
          {activeTab === "account" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <UserCog className="h-5 w-5 mr-2" />
                  Account Settings
                </CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...userProfileForm}>
                  <form
                    onSubmit={userProfileForm.handleSubmit(onUserProfileSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={userProfileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={userProfileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={userProfileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={userProfileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={userProfileForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={userProfileForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateUserProfileMutation.isPending}
                      className="flex"
                    >
                      {updateUserProfileMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Update your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Change Password</h3>
                  <Form {...passwordForm}>
                    <form
                      onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormDescription>
                              Must be at least 6 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="flex"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Login Sessions</h3>
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="p-3 text-left text-sm font-medium text-slate-500">Device</th>
                          <th className="p-3 text-left text-sm font-medium text-slate-500">IP Address</th>
                          <th className="p-3 text-left text-sm font-medium text-slate-500">Last Activity</th>
                          <th className="p-3 text-right text-sm font-medium text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3 text-sm">
                            <div className="flex items-center">
                              <Settings2 className="h-4 w-4 mr-2 text-slate-500" />
                              <span>This device (Chrome on Windows)</span>
                            </div>
                          </td>
                          <td className="p-3 text-sm">192.168.1.1</td>
                          <td className="p-3 text-sm">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-slate-500" />
                              <span>Just now</span>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Current
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <Button variant="destructive" size="sm">
                      Logout from All Other Devices
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
