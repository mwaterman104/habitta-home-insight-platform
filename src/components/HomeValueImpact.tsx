import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface HomeValueImpactProps {
  isVerified: boolean;
}

/**
 * HomeValueImpact - Shows Habitta Verified status and home value impact
 */
export function HomeValueImpact({ isVerified }: HomeValueImpactProps) {
  if (!isVerified) {
    return (
      <div className="py-3">
        <p className="text-sm text-muted-foreground">
          Complete maintenance tasks to earn Habitta Verified status.
        </p>
      </div>
    );
  }

  return (
    <div className="py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className="text-green-700 border-green-200 bg-green-50 flex items-center gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          Maintenance Status: Habitta Verified
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Homes with documented maintenance typically sell for <strong className="text-gray-700">1–3% more</strong>.
      </p>
    </div>
  );
}
