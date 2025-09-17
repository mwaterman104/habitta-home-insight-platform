import { Badge } from "@/components/ui/badge";

export type Status = 'pending' | 'enriched' | 'predicted' | 'labeled' | 'scored';

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    pending: { variant: "secondary" as const, label: "Pending" },
    enriched: { variant: "outline" as const, label: "Enriched" },
    predicted: { variant: "default" as const, label: "Predicted" },
    labeled: { variant: "default" as const, label: "Labeled" },
    scored: { variant: "default" as const, label: "Scored" },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}