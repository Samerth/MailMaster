import { useLocation } from "wouter";
import { useMailrooms } from "@/hooks/useMailrooms";
import { Bell, HelpCircle, Menu } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [location] = useLocation();
  const { mailrooms, currentMailroom, setCurrentMailroom } = useMailrooms();
  const { toast } = useToast();

  const handleMailroomChange = (value: string) => {
    const mailroomId = parseInt(value);
    const mailroom = mailrooms.find(m => m.id === mailroomId);
    if (mailroom) {
      setCurrentMailroom(mailroom);
      toast({
        title: "Mailroom Changed",
        description: `Switched to ${mailroom.name}`,
        duration: 3000,
      });
    }
  };

  // Get page title based on current route
  const getPageTitle = () => {
    switch (location) {
      case "/dashboard": return "Dashboard";
      case "/mail-intake": return "Mail Intake";
      case "/pickups": return "Pending Pickups";
      case "/recipients": return "Recipients";
      case "/history": return "History";
      case "/integrations": return "Integrations";
      case "/settings": return "Settings";
      default: return "MailFlow";
    }
  };

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between h-16 bg-white shadow-sm px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      {/* Page Title */}
      <h1 className="text-xl font-semibold text-slate-800 ml-4 lg:ml-0">{getPageTitle()}</h1>
      
      {/* Right Nav Actions */}
      <div className="flex items-center space-x-4">
        {/* Mailroom Selector */}
        <div className="hidden sm:block">
          <Select 
            value={currentMailroom?.id?.toString()} 
            onValueChange={handleMailroomChange}
          >
            <SelectTrigger className="text-sm rounded-md border-slate-300 focus:border-primary focus:ring-primary">
              <SelectValue placeholder="Select mailroom" />
            </SelectTrigger>
            <SelectContent>
              {mailrooms.map((mailroom) => (
                <SelectItem key={mailroom.id} value={mailroom.id.toString()}>
                  {mailroom.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 hover:text-primary relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">3</span>
        </Button>
        
        {/* Help */}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 hover:text-primary"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
