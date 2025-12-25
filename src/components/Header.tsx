import { Activity, User, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  showActivity: boolean;
  setShowActivity: (show: boolean) => void;
  onAddItem: () => void;
  avatarUrl?: string | null;
  username?: string | null;
}

const Header = ({ showActivity, setShowActivity, onAddItem, avatarUrl, username }: HeaderProps) => {
  const navigate = useNavigate();

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        <span className="font-semibold text-lg text-foreground">Ndomog Investment</span>
      </div>

      <nav className="flex items-center gap-2">
        <NotificationBell />

        <button
          onClick={() => setShowActivity(!showActivity)}
          className={`nav-button ${showActivity ? 'nav-button-active' : 'nav-button-default'}`}
        >
          <Activity size={18} />
          <span className="hidden sm:inline">Activity</span>
        </button>

        <Button onClick={onAddItem} size="sm" className="nav-button-primary">
          <Plus size={18} />
          <span className="hidden sm:inline">Add Item</span>
        </Button>

        <button onClick={() => navigate("/profile")} className="p-1 rounded-full hover:bg-secondary transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || undefined} alt={username || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
        </button>
      </nav>
    </header>
  );
};

export default Header;
