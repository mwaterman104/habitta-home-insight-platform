import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Tab {
  value: string;
  label: string;
}

interface MobileTabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function MobileTabNavigation({ 
  tabs, 
  activeTab, 
  onTabChange 
}: MobileTabNavigationProps) {
  const currentTab = tabs.find(tab => tab.value === activeTab);

  return (
    <div className="md:hidden mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
          >
            {currentTab?.label || "Select Tab"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full">
          {tabs.map((tab) => (
            <DropdownMenuItem
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={activeTab === tab.value ? "bg-primary/10 text-primary" : ""}
            >
              {tab.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}