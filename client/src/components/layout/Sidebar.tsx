import { useLocation, Link } from "wouter";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, 
  Inbox, 
  Package, 
  Users, 
  History, 
  Plug, 
  Settings, 
  LogOut,
  Mail
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganizations();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleOrganizationChange = (value: string) => {
    const orgId = parseInt(value);
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      toast({
        title: "Organization Changed",
        description: `Switched to ${org.name}`,
        duration: 3000,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div 
      className={`fixed z-30 inset-y-0 left-0 w-64 transition-transform duration-300 transform bg-sidebar lg:relative ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } flex flex-col`}
    >
      {/* Org Selection & Branding */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
          <div className="bg-primary p-1.5 rounded">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">MailFlow</span>
        </div>
        <button onClick={onClose} className="text-white lg:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Organization Selector */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Organization</span>
        </div>
        <div className="mt-1 relative">
          <Select 
            value={currentOrganization?.id?.toString()} 
            onValueChange={handleOrganizationChange}
          >
            <SelectTrigger className="w-full pl-3 pr-10 py-2 text-sm rounded-md text-white bg-slate-700 border-none focus:ring-2 focus:ring-primary">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-1">
          {/* Dashboard */}
          <Link href="/dashboard">
            <a className={`flex items-center px-4 py-2.5 text-sm font-medium ${
              location === "/dashboard" 
                ? "text-white bg-slate-700 rounded-md"
                : "text-slate-300 hover:bg-slate-700 rounded-md"
            } group`}>
              <BarChart3 className={`w-6 h-6 mr-3 ${
                location === "/dashboard" ? "text-primary" : "text-slate-400 group-hover:text-primary"
              }`} />
              Dashboard
            </a>
          </Link>
          
          {/* Mail Intake */}
          <Link href="/mail-intake">
            <a className={`flex items-center px-4 py-2.5 text-sm font-medium ${
              location === "/mail-intake" 
                ? "text-white bg-slate-700 rounded-md"
                : "text-slate-300 hover:bg-slate-700 rounded-md"
            } group`}>
              <Inbox className={`w-6 h-6 mr-3 ${
                location === "/mail-intake" ? "text-primary" : "text-slate-400 group-hover:text-primary"
              }`} />
              Mail Intake
            </a>
          </Link>
          
          {/* Pending Pickups */}
          <Link href="/pickups">
            <a className={`flex items-center px-4 py-2.5 text-sm font-medium ${
              location === "/pickups" 
                ? "text-white bg-slate-700 rounded-md"
                : "text-slate-300 hover:bg-slate-700 rounded-md"
            } group`}>
              <Package className={`w-6 h-6 mr-3 ${
                location === "/pickups" ? "text-primary" : "text-slate-400 group-hover:text-primary"
              }`} />
              Pending Pickups
            </a>
          </Link>
          
          {/* Recipients */}
          <Link href="/recipients">
            <a className={`flex items-center px-4 py-2.5 text-sm font-medium ${
              location === "/recipients" 
                ? "text-white bg-slate-700 rounded-md"
                : "text-slate-300 hover:bg-slate-700 rounded-md"
            } group`}>
              <Users className={`w-6 h-6 mr-3 ${
                location === "/recipients" ? "text-primary" : "text-slate-400 group-hover:text-primary"
              }`} />
              Recipients
            </a>
          </Link>
          
          {/* History */}
          <Link href="/history">
            <a className={`flex items-center px-4 py-2.5 text-sm font-medium ${
              location === "/history" 
                ? "text-white bg-slate-700 rounded-md"
                : "text-slate-300 hover:bg-slate-700 rounded-md"
            } group`}>
              <History className={`w-6 h-6 mr-3 ${
                location === "/history" ? "text-primary" : "text-slate-400 group-hover:text-primary"
              }`} />
              History
            </a>
          </Link>
          
          {/* Admin separator */}
          <div className="pt-4 pb-2">
            <div className="px-4">
              <Separator className="border-sidebar-border" />
              <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Administration
              </p>
            </div>
          </div>
          
          {/* Integrations */}
          <Link href="/integrations">
            <a className={`flex items-center px-4 py-2.5 text-sm font-medium ${
              location === "/integrations" 
                ? "text-white bg-slate-700 rounded-md"
                : "text-slate-300 hover:bg-slate-700 rounded-md"
            } group`}>
              <Plug className={`w-6 h-6 mr-3 ${
                location === "/integrations" ? "text-primary" : "text-slate-400 group-hover:text-primary"
              }`} />
              Integrations
            </a>
          </Link>
          
          {/* Settings */}
          <Link href="/settings">
            <a className={`flex items-center px-4 py-2.5 text-sm font-medium ${
              location === "/settings" 
                ? "text-white bg-slate-700 rounded-md"
                : "text-slate-300 hover:bg-slate-700 rounded-md"
            } group`}>
              <Settings className={`w-6 h-6 mr-3 ${
                location === "/settings" ? "text-primary" : "text-slate-400 group-hover:text-primary"
              }`} />
              Settings
            </a>
          </Link>
        </nav>
      </div>
      
      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white">
            <span>{user?.firstName && user?.lastName ? getInitials(`${user.firstName} ${user.lastName}`) : 'U'}</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-400">{user?.role}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="ml-auto text-slate-400 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
