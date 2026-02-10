import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const SYSTEM_TYPES = [
  { key: "all", label: "All" },
  { key: "hvac", label: "HVAC" },
  { key: "roof", label: "Roof" },
  { key: "plumbing", label: "Plumbing" },
  { key: "electrical", label: "Electrical" },
  { key: "water_heater", label: "Water Heater" },
  { key: "exterior", label: "Exterior" },
  { key: "pool", label: "Pool" },
  { key: "safety", label: "Safety" },
  { key: "appliance", label: "Appliances" },
];

interface SystemFilterChipsProps {
  selected: string;
  onSelect: (key: string) => void;
  /** Only show chips for system types that exist in tasks */
  availableTypes?: string[];
}

export function SystemFilterChips({ selected, onSelect, availableTypes }: SystemFilterChipsProps) {
  const chips = availableTypes
    ? SYSTEM_TYPES.filter(t => t.key === "all" || availableTypes.includes(t.key))
    : SYSTEM_TYPES;

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {chips.map((type) => (
          <Button
            key={type.key}
            variant={selected === type.key ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(type.key)}
            className="shrink-0 rounded-full text-xs h-8"
          >
            {type.label}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
