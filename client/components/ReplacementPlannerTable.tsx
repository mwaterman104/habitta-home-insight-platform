import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useLifecycle } from "../hooks/useHabittaLocal";
import { ArrowUpDown, Wrench } from "lucide-react";

type SortField = "name" | "nextReplacementYear" | "replacement_cost";
type SortDirection = "asc" | "desc";

export default function ReplacementPlannerTable() {
  const data = useLifecycle();
  const [sortField, setSortField] = useState<SortField>("nextReplacementYear");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === "asc" ? 1 : -1;
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * direction;
      }
      return ((aVal as number) - (bVal as number)) * direction;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Calculate annual totals for next 5 years
  const currentYear = new Date().getFullYear();
  const annualTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    
    for (let year = currentYear; year < currentYear + 5; year++) {
      totals[year] = sortedData
        .filter(item => item.nextReplacementYear === year)
        .reduce((sum, item) => sum + item.replacement_cost, 0);
    }
    
    return totals;
  }, [sortedData, currentYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Replacement Planner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <div className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("name")}
                      className="h-auto p-0 font-semibold"
                    >
                      Item <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-left p-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("nextReplacementYear")}
                      className="h-auto p-0 font-semibold"
                    >
                      Replace Year <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-right p-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort("replacement_cost")}
                      className="h-auto p-0 font-semibold"
                    >
                      Cost <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">
                      <span className={
                        item.nextReplacementYear <= currentYear + 2 
                          ? "text-destructive font-medium" 
                          : ""
                      }>
                        {item.nextReplacementYear}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium">
                      ${item.replacement_cost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Annual Budget Summary */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-semibold mb-3">5-Year Budget Planning</h4>
          <div className="grid grid-cols-5 gap-2 text-sm">
            {Object.entries(annualTotals).map(([year, total]) => (
              <div key={year} className="text-center p-2 border rounded">
                <div className="font-medium">{year}</div>
                <div className={total > 0 ? "text-primary font-semibold" : "text-muted-foreground"}>
                  ${total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}