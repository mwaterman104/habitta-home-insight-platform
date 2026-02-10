import { format, parseISO } from 'date-fns';

interface SaleRecord {
  date: string;
  price: number;
  type: string;
}

interface SaleHistorySectionProps {
  saleHistory: SaleRecord[];
}

export function SaleHistorySection({ saleHistory }: SaleHistorySectionProps) {
  // Only render if data exists — no empty states
  if (!saleHistory || saleHistory.length === 0) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="heading-h3 text-foreground">Ownership &amp; Purchase History</h2>
      <div className="bg-card rounded-lg border border-border p-4 space-y-0">
        {saleHistory.map((sale, idx) => (
          <div
            key={`${sale.date}-${idx}`}
            className="flex justify-between items-center py-2 border-b border-border last:border-0"
          >
            <div className="space-y-0.5">
              <p className="text-sm text-foreground">{formatDate(sale.date)}</p>
              {sale.type && (
                <p className="text-xs text-muted-foreground capitalize">
                  {sale.type.replace(/_/g, ' ')}
                </p>
              )}
            </div>
            <span className="text-sm font-medium text-foreground">
              {sale.price > 0 ? formatCurrency(sale.price) : 'Undisclosed'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
