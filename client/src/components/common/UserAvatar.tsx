import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  src?: string;
  className?: string;
}

export default function UserAvatar({ firstName, lastName, src, className = "" }: UserAvatarProps) {
  // Get initials from first and last name
  const getInitials = () => {
    if (!firstName && !lastName) return 'U';
    
    return `${firstName ? firstName[0] : ''}${lastName ? lastName[0] : ''}`.toUpperCase();
  };

  return (
    <Avatar className={`${className} bg-slate-200`}>
      {src && <img src={src} alt={`${firstName} ${lastName}`} />}
      <AvatarFallback className="text-xs font-medium text-slate-600">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}
