import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Home, Cpu, FileText, MapPin, Settings, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import { getPlanningStatus, PLANNING_STATUS, getSystemDisplayName } from "@/lib/mobileCopy";
interface MobileSystemDrawerProps {
  open: boolean;
  onClose: () => void;
  systems: SystemTimelineEntry[];
  activeSystemKey?: string;
  address: string;
  onNavigate: (path: string) => void;
}

/**
 * MobileSystemDrawer - Left-side navigation drawer for mobile
 * 
 * Provides global navigation including:
 * - Home Pulse (dashboard)
 * - Systems list with status badges
 * - Documents
 * - Home Profile
 * - Settings
 * 
 * Rule 3: Active system must be highlighted to prevent disorientation.
 */
export function MobileSystemDrawer({
  open,
  onClose,
  systems,
  activeSystemKey,
  address,
  onNavigate
}: MobileSystemDrawerProps) {
  const currentYear = new Date().getFullYear();

  // Helper to get status for a system
  const getSystemStatus = (system: SystemTimelineEntry) => {
    const likelyYear = system.replacementWindow?.likelyYear;
    const remainingYears = likelyYear ? likelyYear - currentYear : null;
    const installYear = system.installYear;
    const age = installYear ? currentYear - installYear : null;
    const expectedLifespan = likelyYear && installYear ? likelyYear - installYear : 15;
    return getPlanningStatus(remainingYears, age, expectedLifespan);
  };
  const handleNavigate = (path: string) => {
    onNavigate(path);
    onClose();
  };

  // Extract street address for display
  const streetAddress = address.split(',')[0];
  return <Sheet open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left text-base font-semibold">
            {streetAddress}
          </SheetTitle>
        </SheetHeader>
        
        {/* Navigation Items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {/* Home Pulse */}
          <button onClick={() => handleNavigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Home Pulse</span>
          </button>
          
          {/* Systems Section */}
          <div className="mt-2">
            <div className="px-4 py-2 flex items-center gap-3">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Systems</span>
            </div>
            
            {/* System List */}
            <div className="pl-7">
              {systems.map(system => {
              const statusKey = getSystemStatus(system);
              const status = PLANNING_STATUS[statusKey];
              const isActive = activeSystemKey === system.systemId;
              const displayName = system.systemLabel || getSystemDisplayName(system.systemId);
              return <button key={system.systemId} onClick={() => handleNavigate(`/systems/${system.systemId}/plan`)} className={cn("w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors", isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-muted-foreground")}>
                    <div className="flex items-center gap-2">
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      <span className={cn(isActive && "font-medium")}>
                        {displayName}
                      </span>
                    </div>
                    <span className={cn("text-xs", status.colorClass)}>
                      {status.text}
                    </span>
                  </button>;
            })}
              
              {systems.length === 0 && <p className="px-4 py-2 text-xs text-muted-foreground">
                  No systems detected yet
                </p>}
            </div>
          </div>
          
          {/* Documents */}
          
          
          {/* Home Profile */}
          <button onClick={() => handleNavigate('/home-profile')} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Home Profile</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
        </nav>
        
        {/* Footer - Settings */}
        <div className="border-t p-2">
          <button onClick={() => handleNavigate('/settings')} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors rounded-lg">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Settings</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>;
}