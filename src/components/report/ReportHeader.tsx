import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReportProperty } from '@/hooks/useHomeReport';

interface ReportHeaderProps {
  property: ReportProperty | null;
  onDownloadPdf: () => void;
}

export function ReportHeader({ property, onDownloadPdf }: ReportHeaderProps) {
  const addressLine = property
    ? `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
    : '';
  const yearLine = property?.yearBuilt ? `Built ${property.yearBuilt}` : '';
  const subtitle = [addressLine, yearLine].filter(Boolean).join(' · ');

  return (
    <div className="flex items-start justify-between gap-4 print:block">
      <div className="space-y-1">
        <h1 className="heading-h1 text-foreground">Home Report</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
        <p className="text-sm text-muted-foreground max-w-lg">
          A running record of the systems, appliances, issues, and work
          associated with this property. This report updates automatically as
          you use Habitta.
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onDownloadPdf}
        className="shrink-0 gap-2 print:hidden"
      >
        <FileDown className="h-4 w-4" />
        Download PDF
      </Button>
    </div>
  );
}
