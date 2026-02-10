import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

interface PurchaseContextProps {
  lastSale?: {
    amount: number | null;
    date: string | null;
    pricePerSqft: number | null;
  };
}

export const PurchaseContext: React.FC<PurchaseContextProps> = ({ lastSale }) => {
  // Only render when we have meaningful sale data
  if (!lastSale || !lastSale.amount || lastSale.amount <= 0 || !lastSale.date) {
    return null;
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Purchase Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-muted-foreground">Last Sale Price</span>
          <span className="font-medium">{formatCurrency(lastSale.amount)}</span>
        </div>
        {lastSale.pricePerSqft && lastSale.pricePerSqft > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Price per Sq Ft</span>
            <span className="font-medium">{formatCurrency(lastSale.pricePerSqft)}</span>
          </div>
        )}
        <div className="flex justify-between items-center py-2">
          <span className="text-muted-foreground">Purchase Date</span>
          <span className="font-medium">{formatDate(lastSale.date)}</span>
        </div>
      </CardContent>
    </Card>
  );
};
