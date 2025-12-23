import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, User, Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

interface HeaderProps {
  showActivity: boolean;
  setShowActivity: (show: boolean) => void;
  onAddItem: () => void;
}

const Header = ({ showActivity, setShowActivity, onAddItem }: HeaderProps) => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        <span className="font-semibold text-lg text-foreground">Ndomog Investment</span>
      </div>

      <nav className="flex items-center gap-2">
        <button
          onClick={() => setShowActivity(!showActivity)}
          className={`nav-button ${showActivity ? 'nav-button-active' : 'nav-button-default'}`}
        >
          <Activity size={18} />
          <span className="hidden sm:inline">Activity</span>
        </button>

        <button onClick={() => navigate("/profile")} className="nav-button nav-button-default">
          <User size={18} />
          <span className="hidden sm:inline">Profile</span>
        </button>

        <Button onClick={onAddItem} size="sm" className="nav-button-primary">
          <Plus size={18} />
          <span className="hidden sm:inline">Add Item</span>
        </Button>

        <button onClick={handleLogout} className="nav-button nav-button-default">
          <LogOut size={18} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </nav>
    </header>
  );
};

export default Header;
