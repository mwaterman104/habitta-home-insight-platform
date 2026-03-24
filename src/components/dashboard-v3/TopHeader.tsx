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
import type { AlertItem } from "@/hooks/useMaintenanceAlerts";

interface TopHeaderProps {
  address: string;
  healthStatus: 'healthy' | 'attention' | 'critical';
  onAddressClick?: () => void;

  /** Maintenance alert count for notification badge */
  alertCount?: number;
  /** Maintenance alert items for notification dropdown */
  alerts?: AlertItem[];

  /** Mobile condensed mode: smaller height, tighter truncation, hide date */
  condensed?: boolean;
  /** Callback for hamburger menu tap (mobile only) */
  onMenuOpen?: () => void;
  /** Callback when health badge is tapped (for filtering) */
  onHealthBadgeClick?: () => void;
  /** Whether the badge filter is currently active */
  filterActive?: boolean;
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
  alertCount = 0,
  alerts = [],
  condensed = false,
  onMenuOpen,
  onHealthBadgeClick,
  filterActive = false,
}: TopHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const activeRing = filterActive ? ' ring-2 ring-[hsl(var(--habitta-slate)/0.4)]' : '';

  const getStatusBadge = () => {
    const badge = (() => {
      switch (healthStatus) {
        case 'healthy':
          return <Badge variant="outline" className={`text-emerald-600 border-emerald-200 bg-emerald-50${activeRing}`}>healthy</Badge>;
        case 'attention':
          return <Badge variant="outline" className={`text-amber-600 border-amber-200 bg-amber-50${activeRing}`}>attention</Badge>;
        case 'critical':
          return <Badge variant="outline" className={`text-red-600 border-red-200 bg-red-50${activeRing}`}>critical</Badge>;
      }
    })();

    if (onHealthBadgeClick) {
      return (
        <button onClick={onHealthBadgeClick} className="focus:outline-none">
          {badge}
        </button>
      );
    }
    return badge;
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formatDueDate = (dueDateStr: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    if (due < today) return 'Overdue';

    return 'Due ' + due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (dueDateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const badgeLabel = alertCount > 9 ? '9+' : alertCount > 0 ? String(alertCount) : null;

  return (
    <header className={`border-b flex items-center justify-between shrink-0 ${
      condensed ? 'h-14 px-3 bg-habitta-ivory' : 'h-16 px-6 bg-card'
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

        <span className={`font-serif font-semibold text-primary ${condensed ? 'text-lg' : 'text-xl'}`}>
          Habitta
        </span>

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
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {alertCount >= 4 && badgeLabel && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {badgeLabel}
                </span>
              )}
              {alertCount > 0 && alertCount < 4 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.length > 0 ? (
              <div className="max-h-72 overflow-y-auto">
                {alerts.map(alert => {
                  const overdue = isOverdue(alert.due_date);
                  return (
                    <div
                      key={alert.id}
                      className={`px-3 py-2.5 border-b border-border/40 last:border-b-0 ${
                        overdue ? 'border-l-2 border-l-amber-400 pl-2.5' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {alert.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${overdue ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                          {formatDueDate(alert.due_date)}
                        </span>
                        {alert.system_type && (
                          <span className="text-xs text-muted-foreground">
                            · {alert.system_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Habitta will notify you when something needs attention.</p>
              </div>
            )}
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
