import { Bell, ChevronDown, Settings, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface TopHeaderProps {
  address: string;
  healthStatus: 'healthy' | 'attention' | 'critical';
  onAddressClick?: () => void;
  
  /** Mobile condensed mode: smaller height, tighter truncation, hide date */
  condensed?: boolean;
  /** Callback for hamburger menu tap (mobile only) */
  onMenuOpen?: () => void;
}

/**
 * TopHeader - Property selector + health status + notifications + profile
 * 
 * Displays the current property with a health badge.
 * Includes full auth controls since Dashboard V3 is a standalone layout.
 */
export function TopHeader({ 
  address, 
  healthStatus, 
  onAddressClick,
  
  condensed = false,
  onMenuOpen
}: TopHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getStatusBadge = () => {
    switch (healthStatus) {
      case 'healthy':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">healthy</Badge>;
      case 'attention':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">attention</Badge>;
      case 'critical':
        return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">critical</Badge>;
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric' 
  });

  return (
    <header className={`border-b bg-card flex items-center justify-between shrink-0 ${
      condensed ? 'h-14 px-3' : 'h-16 px-6'
    }`}>
      {/* Left: Hamburger (mobile) + Brand + Property Selector */}
      <div className={`flex items-center ${condensed ? 'gap-2' : 'gap-4'}`}>
        {/* Hamburger menu for mobile */}
        {condensed && onMenuOpen && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuOpen}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <span className={`font-serif font-semibold text-primary ${condensed ? 'text-lg' : 'text-xl'}`}>Habitta</span>
        
        <button 
          onClick={onAddressClick}
          className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors"
        >
          <div className={`rounded bg-primary flex items-center justify-center shrink-0 ${
            condensed ? 'h-7 w-7' : 'h-8 w-8'
          }`}>
            <span className={`text-primary-foreground font-bold ${condensed ? 'text-xs' : 'text-sm'}`}>🏠</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${condensed ? 'max-w-[120px]' : 'max-w-[200px]'}`}>
                {address.split(',')[0]}
              </span>
              {!condensed && getStatusBadge()}
              <ChevronDown className={`text-muted-foreground ${condensed ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </div>
          </div>
        </button>
      </div>

      {/* Center: Date (hidden on mobile/condensed) */}
      {!condensed && (
        <div className="hidden md:block text-sm text-muted-foreground">
          {currentDate}
        </div>
      )}

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Habitta will notify you when something needs attention.</p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
