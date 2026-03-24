import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { JSONPreview } from "./JSONPreview";
import { Info } from "lucide-react";

interface ProvenancePopoverProps {
  provenance?: Record<string, any>;
}

export function ProvenancePopover({ provenance }: ProvenancePopoverProps) {
  if (!provenance) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-6 w-6 p-0">
        <Info className="h-3 w-3 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Info className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <JSONPreview 
          data={provenance} 
          title="Data Provenance" 
          collapsible={false}
        />
      </PopoverContent>
    </Popover>
  );
}