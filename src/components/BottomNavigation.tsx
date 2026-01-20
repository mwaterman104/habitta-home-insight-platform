import { Home, MessageCircle, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Phase 1: Simplified bottom navigation - 3 items only
const bottomNavItems = [
  { title: "Home Pulse", url: "/dashboard", icon: Home },
  { title: "Help", url: "/chatdiy", icon: MessageCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path || location.pathname.startsWith('/system');
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {bottomNavItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.url)}
            className={`flex flex-col items-center gap-1 h-12 px-4 ${
              isActive(item.url) 
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
