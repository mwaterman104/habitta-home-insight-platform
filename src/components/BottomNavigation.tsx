import { Home, Building, Brain, Calendar, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const bottomNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Home", url: "/home-profile", icon: Building },
  { title: "Intelligence", url: "/property-intelligence", icon: Brain },
  { title: "Tasks", url: "/maintenance-planner", icon: Calendar },
  { title: "Chat", url: "/chatdiy", icon: MessageCircle },
];

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {bottomNavItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.url)}
            className={`flex flex-col items-center gap-1 h-12 px-2 ${
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