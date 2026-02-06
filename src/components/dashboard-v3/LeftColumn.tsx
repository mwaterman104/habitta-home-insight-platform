import { useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, Settings, FileText, MapPin, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeftColumnProps {
  address: string;
  onAddressClick?: () => void;
}

/**
 * LeftColumn - Navigation + Property Identity
 * 
 * Per spec: Navigation + identity ONLY (not health).
 * Health belongs in the middle column forecast.
 * Bottom nav items are sticky to bottom of the sidebar.
 * 
 * Navigation order:
 * - Home (dashboard) — no "Home Pulse" branding per doctrine
 * - Systems Hub
 * - Home Profile
 */
export function LeftColumn({ address, onAddressClick }: LeftColumnProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path || 
    (path === '/dashboard' && location.pathname.startsWith('/system')) ||
    (path === '/systems' && location.pathname.startsWith('/systems'));

  const navItems = [
    { title: "Home", path: "/dashboard", icon: Home },
    { title: "Systems Hub", path: "/systems", icon: Cpu },
    { title: "Home Profile", path: "/home-profile", icon: MapPin },
  ];

  const bottomItems = [
    { title: "Report", path: "/report", icon: FileText },
    { title: "Chat", path: "/dashboard", icon: MessageCircle, action: 'chat' },
    { title: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Property Identity Card */}
      <div className="p-4 border-b shrink-0">
        <button
          onClick={onAddressClick}
          className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{address.split(',')[0]}</p>
              <p className="text-xs text-muted-foreground truncate">
                {address.split(',').slice(1).join(',').trim()}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Main Navigation - takes remaining space */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              isActive(item.path)
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </button>
        ))}
      </nav>

      {/* Bottom Section - Sticky to bottom */}
      <div className="p-4 border-t mt-auto shrink-0">
        <div className="space-y-1">
          {bottomItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive(item.path)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
