import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useMaintenanceHistory } from "../hooks/useHabittaLocal";
import { History, TrendingUp, Home } from "lucide-react";

export default function MaintenanceHistory() {
  const history = useMaintenanceHistory().slice(0, 6); // Show last 6 items

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "hvac": return "bg-blue-100 text-blue-700";
      case "plumbing": return "bg-green-100 text-green-700";
      case "exterior": return "bg-yellow-100 text-yellow-700";
      case "safety": return "bg-red-100 text-red-700";
      case "electrical": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getLifestyleBenefit = (category: string, title: string) => {
    const lowerCategory = category.toLowerCase();
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('gutter')) {
      return { icon: "🌿", text: "Outdoor Living: Storm protection + entertaining ready" };
    }
    if (lowerCategory.includes('hvac') && lowerTitle.includes('filter')) {
      return { icon: "💨", text: "Air Quality: Perfect for home workouts + office productivity" };
    }
    if (lowerCategory.includes('plumbing') && lowerTitle.includes('water')) {
      return { icon: "🚿", text: "Guest Confidence: Reliable hot water for hosting" };
    }
    if (lowerCategory.includes('safety')) {
      return { icon: "🔒", text: "Peace of Mind: Full safety confidence" };
    }
    if (lowerCategory.includes('exterior')) {
      return { icon: "🏡", text: "Curb Appeal: Home value protection" };
    }
    
    return { icon: "✨", text: "Home Excellence: System optimized" };
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Maintenance History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No maintenance history found
          </p>
        ) : (
          <>
            {history.map((item, index) => (
              <div key={item.id} className="flex gap-3">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  {index < history.length - 1 && (
                    <div className="w-px h-6 bg-border mt-1" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    
                    {/* Impact indicators */}
                    <div className="flex items-center gap-3 text-xs">
                      {item.impact.condition > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Home className="h-3 w-3" />
                          +{item.impact.condition}%
                        </span>
                      )}
                      {item.impact.value > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <TrendingUp className="h-3 w-3" />
                          {formatCurrency(item.impact.value)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lifestyle Benefit */}
                  <div className="mt-2">
                    {(() => {
                      const benefit = getLifestyleBenefit(item.category, item.title);
                      return (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{benefit.icon}</span>
                          <span>→ {benefit.text}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-2 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Showing recent maintenance activities
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}