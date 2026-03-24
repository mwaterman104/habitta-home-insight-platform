import { format, parseISO } from 'date-fns';

interface SaleRecord {
  date: string;
  price: number;
  type: string;
}

interface LastSale {
  amount: number | null;
  date: string | null;
  pricePerSqft: number | null;
}

interface SaleHistorySectionProps {
  saleHistory: SaleRecord[];
  lastSale?: LastSale | null;
}

export function SaleHistorySection({ saleHistory, lastSale }: SaleHistorySectionProps) {
  const hasLastSale = lastSale && lastSale.amount && lastSale.amount > 0 && lastSale.date;
  // Only render if we have some data
  if ((!saleHistory || saleHistory.length === 0) && !hasLastSale) return null;

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

      {/* Purchase Context card — last sale summary */}
      {hasLastSale && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-2">
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-muted-foreground">Last Sale Price</span>
            <span className="text-sm font-medium text-foreground">{formatCurrency(lastSale!.amount!)}</span>
          </div>
          {lastSale!.pricePerSqft && lastSale!.pricePerSqft > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">Price per Sq Ft</span>
              <span className="text-sm font-medium text-foreground">{formatCurrency(lastSale!.pricePerSqft)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-muted-foreground">Purchase Date</span>
            <span className="text-sm font-medium text-foreground">{formatDate(lastSale!.date!)}</span>
          </div>
        </div>
      )}

      {saleHistory.length > 0 && (
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
      )}
    </section>
  );
}
