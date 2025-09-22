import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useNeighborhoodBenchmarks } from "../../src/hooks/useBenchmarkData";
import { Users } from "lucide-react";

export default function NeighborhoodPeerBenchmark() {
  const { benchmarks: benchmarkData, loading } = useNeighborhoodBenchmarks();

  if (loading || !benchmarkData) return <div>Loading...</div>;

  const formatTooltipValue = (value: any, name: string, props: any) => {
    const metric = benchmarkData.find(item => item.metric === props.payload.metric);
    if (!metric) return value;

    if (metric.unit === "usd") {
      return [`$${value}`, name];
    }
    if (metric.unit === "gallons") {
      return [`${value.toLocaleString()} gal`, name];
    }
    if (metric.unit === "years") {
      return [`${value} years`, name];
    }
    return [value, name];
  };

  const formatYAxisTick = (value: any, index: number) => {
    if (!benchmarkData[index]) return '';
    const metric = benchmarkData[index];
    
    if (metric.unit === "usd") return `$${value}`;
    if (metric.unit === "gallons") return `${(value / 1000).toFixed(1)}k`;
    return value;
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Neighborhood Benchmark <span className="text-sm font-normal text-muted-foreground">(estimated)</span>
          </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={benchmarkData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="metric"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatYAxisTick} />
              <Tooltip
                formatter={formatTooltipValue}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="yours" 
                name="Your Home" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="neighborhood_avg" 
                name="Neighborhood Avg" 
                fill="hsl(var(--muted-foreground))"
                opacity={0.7}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
          {benchmarkData.slice(0, 4).map((item) => {
            const isYoursBetter = item.lower_is_better ? 
              item.yours < item.neighborhood_avg : 
              item.yours > item.neighborhood_avg;
            
            return (
              <div key={item.metric} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <span className="font-medium truncate">{item.metric}</span>
                <span className={isYoursBetter ? "text-green-600" : "text-yellow-600"}>
                  {isYoursBetter ? "↗ Better" : "→ Average"}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}