import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useSeasonalChecklist } from "../hooks/useHabittaLocal";
import { Season } from "../types/habitta";
import { Leaf, Zap, Shield, Printer, Check } from "lucide-react";

const seasonIcons = {
  Maintenance: Leaf,
  Energy: Zap,
  Safety: Shield,
};

export default function SeasonalPlan() {
  const [selectedSeason, setSelectedSeason] = useState<Season | undefined>(undefined);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const checklist = useSeasonalChecklist(selectedSeason);

  const handlePrint = () => {
    window.print();
  };

  const toggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  return (
    <div className="space-y-6">
      {/* Header with Print Button */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Seasonal Maintenance Plan</h1>
          <p className="text-muted-foreground mt-1">
            Keep your home in perfect condition year-round
          </p>
        </div>
        <Button onClick={handlePrint} variant="outline" size="lg">
          <Printer className="mr-2 h-4 w-4" />
          Print Checklist
        </Button>
      </div>

      {/* Season Filter */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Filter by Season</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={selectedSeason === undefined ? "default" : "outline"}
              onClick={() => setSelectedSeason(undefined)}
            >
              All Year
            </Button>
            {(["Spring", "Summer", "Fall", "Winter"] as Season[]).map((season) => (
              <Button
                key={season}
                variant={selectedSeason === season ? "default" : "outline"}
                onClick={() => setSelectedSeason(season)}
              >
                {season}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {checklist.map(({ category, items }) => {
        const Icon = seasonIcons[category];
        
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {category}
                <span className="text-sm font-normal text-muted-foreground">
                  ({items.length} items)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                        checkedItems.has(item.id) 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-muted-foreground"
                      }`}>
                        {checkedItems.has(item.id) && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${checkedItems.has(item.id) ? 'line-through text-muted-foreground' : ''}`}>
                        {item.name}
                      </h4>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {item.planned && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Planned
                          </span>
                        )}
                        {item.labels?.map((label) => (
                          <span key={label} className="text-xs bg-muted px-2 py-1 rounded">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Print Styles - removed jsx attribute */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            font-size: 12pt;
            line-height: 1.4;
          }
          h1 {
            font-size: 24pt;
            margin-bottom: 12pt;
          }
          h3 {
            font-size: 16pt;
            margin-top: 16pt;
            margin-bottom: 8pt;
          }
          .space-y-6 > * + * {
            margin-top: 16pt;
          }
          .space-y-3 > * + * {
            margin-top: 8pt;
          }
        }
      `}</style>
    </div>
  );
}