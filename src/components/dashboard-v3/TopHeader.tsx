import { Bell, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  address: string;
  healthStatus: 'healthy' | 'attention' | 'critical';
  onAddressClick?: () => void;
  hasNotifications?: boolean;
}

/**
 * TopHeader - Property selector + health status + notifications
 * 
 * Displays the current property with a health badge.
 * Clicking the address opens the property selector/profile.
 */
export function TopHeader({ 
  address, 
  healthStatus, 
  onAddressClick,
  hasNotifications = false 
}: TopHeaderProps) {
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
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between shrink-0">
      {/* Left: Property Selector */}
      <button 
        onClick={onAddressClick}
        className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1.5 -ml-2 transition-colors"
      >
        <div className="h-8 w-8 rounded bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">🏠</span>
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[200px]">
              {address.split(',')[0]}
            </span>
            {getStatusBadge()}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </button>

      {/* Center: Date (hidden on smaller screens) */}
      <div className="hidden md:block text-sm text-muted-foreground">
        {currentDate}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasNotifications && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
