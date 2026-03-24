import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useNeighborhoodComparison } from "../hooks/useHabittaLocal";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingDown } from "lucide-react";

export default function NeighborhoodComparison() {
  const data = useNeighborhoodComparison();

  const formatMonth = (month: string) => {
    const date = new Date(month + "-01");
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  const chartData = data.map(point => ({
    ...point,
    monthLabel: formatMonth(point.month)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Energy Usage Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthLabel" 
                fontSize={12}
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value, name) => [`$${value}`, name === "yours" ? "Your Home" : "Neighborhood Avg"]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend 
                formatter={(value) => value === "yours" ? "Your Home" : "Neighborhood Avg"}
              />
              <Area
                type="monotone"
                dataKey="neighborhood_avg"
                stackId="1"
                stroke="hsl(var(--muted-foreground))"
                fill="hsl(var(--muted))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="yours"
                stackId="2"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-primary/10 rounded">
            <div className="font-medium text-primary">Your Savings</div>
            <div className="text-lg font-bold">23%</div>
            <div className="text-muted-foreground">vs. neighborhood</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium">Annual Savings</div>
            <div className="text-lg font-bold">$2,340</div>
            <div className="text-muted-foreground">estimated</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}