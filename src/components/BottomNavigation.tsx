import { Home, MessageCircle, Wrench, Settings, Layers } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  /** Callback to open the chat sheet (replaces "Help" navigation) */
  onChatOpen?: () => void;
}

type NavItem = 
  | { title: string; url: string; icon: React.ElementType; action?: never }
  | { title: string; action: string; icon: React.ElementType; url?: never };

// Phase 2: Chat replaces Help as core mobile primitive
const bottomNavItems: NavItem[] = [
  { title: "Home Pulse", url: "/dashboard", icon: Home },
  { title: "Systems", url: "/systems", icon: Layers },
  { title: "Chat", action: "openChat", icon: MessageCircle },
  { title: "Maint.", url: "/maintenance", icon: Wrench },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function BottomNavigation({ onChatOpen }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (item: NavItem) => {
    if ('url' in item && item.url) {
      if (item.url === '/dashboard') {
        return location.pathname === item.url;
      }
      if (item.url === '/systems') {
        return location.pathname === '/systems' || location.pathname.startsWith('/systems/');
      }
      return location.pathname === item.url;
    }
    return false;
  };

  const handleNavClick = (item: NavItem) => {
    if ('action' in item && item.action === 'openChat') {
      onChatOpen?.();
    } else if ('url' in item && item.url) {
      navigate(item.url);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {bottomNavItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            size="sm"
            onClick={() => handleNavClick(item)}
            className={`flex flex-col items-center gap-1 h-12 px-4 ${
              isActive(item) 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.title}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
