/**
 * SystemPanel - 3-tab system detail container.
 * Header + Radix Tabs (Overview, Evidence, Timeline).
 */

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFocusState } from "@/contexts/FocusStateContext";
import { SystemPanelOverview } from "./SystemPanelOverview";
import { SystemPanelEvidence } from "./SystemPanelEvidence";
import { SystemPanelTimeline } from "./SystemPanelTimeline";
import type { SystemTimelineEntry } from "@/types/capitalTimeline";
import type { SystemTab } from "@/types/focusState";
import { useState } from "react";

interface SystemPanelProps {
  systemId: string;
  system?: SystemTimelineEntry;
  initialTab?: SystemTab;
}

function getStatusBadge(system?: SystemTimelineEntry) {
  if (!system) return { label: 'Unknown', variant: 'secondary' as const };
  const currentYear = new Date().getFullYear();
  const likelyYear = system.replacementWindow?.likelyYear;
  const remaining = likelyYear ? likelyYear - currentYear : undefined;

  if (remaining === undefined || remaining > 5) return { label: 'OK', variant: 'secondary' as const };
  if (remaining > 2) return { label: 'Watch', variant: 'outline' as const };
  return { label: 'Plan', variant: 'destructive' as const };
}

function getConfidenceBadge(system?: SystemTimelineEntry) {
  if (!system) return 'Unknown';
  switch (system.dataQuality) {
    case 'high': return 'High confidence';
    case 'medium': return 'Moderate confidence';
    case 'low': return 'Low confidence';
    default: return 'Unknown';
  }
}

// Tab persistence: remembers last-viewed tab per systemId (module-level, not a hook)
const tabMemory = new Map<string, SystemTab>();

export function SystemPanel({ systemId, system, initialTab = 'overview' }: SystemPanelProps) {
   const { clearFocus } = useFocusState();
   const [activeTab, setActiveTab] = useState<SystemTab>(() => {
     return tabMemory.get(systemId) ?? initialTab;
   });

   const status = getStatusBadge(system);
   const currentYear = new Date().getFullYear();
   const age = system?.installYear ? currentYear - system.installYear : undefined;

   const handleTabChange = (tab: string) => {
     const newTab = tab as SystemTab;
     setActiveTab(newTab);
     tabMemory.set(systemId, newTab);
   };

   return (
     <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">
            {system?.systemLabel ?? systemId}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-xs text-muted-foreground">{getConfidenceBadge(system)}</span>
            {system?.installYear && (
              <span className="text-xs text-muted-foreground">
                Installed {system.installYear} · {age}yr
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearFocus}>
          <X className="h-4 w-4" />
        </Button>
      </div>

       {/* Tabs */}
       <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
         <TabsList className="w-full">
           <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
           <TabsTrigger value="evidence" className="flex-1">Evidence</TabsTrigger>
           <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
         </TabsList>

         <TabsContent value="overview" className="animate-in fade-in duration-150">
           <SystemPanelOverview system={system} />
         </TabsContent>
         <TabsContent value="evidence" className="animate-in fade-in duration-150">
           <SystemPanelEvidence system={system} />
         </TabsContent>
         <TabsContent value="timeline" className="animate-in fade-in duration-150">
           <SystemPanelTimeline system={system} />
         </TabsContent>
       </Tabs>
    </div>
  );
}
