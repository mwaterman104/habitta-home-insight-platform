import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Target, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function LifestyleTimeline() {
  const timelineData = [
    {
      season: "Spring 2025 (March-May)",
      items: [
        { status: "completed", text: "Outdoor entertaining optimized" },
        { status: "completed", text: "Energy costs 23% below neighbors" },
        { status: "completed", text: "Perfect climate control for WFH" }
      ]
    },
    {
      season: "Summer 2025 (June-August)",
      items: [
        { status: "completed", text: "Cooling efficiency maximized" },
        { status: "progress", text: "Pool/patio systems (if exterior paint completed)" },
        { status: "pending", text: "Smart home upgrades available" }
      ]
    },
    {
      season: "Fall 2025 (September-November)",
      items: [
        { status: "completed", text: "Storm season protected" },
        { status: "completed", text: "Heating optimization ready" },
        { status: "progress", text: "Holiday hosting prep (if kitchen refresh funded)" }
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "progress": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "pending": return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-100 text-green-700 border-green-200">✅</Badge>;
      case "progress": return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">🔄</Badge>;
      case "pending": return <Badge className="bg-blue-100 text-blue-700 border-blue-200">⏳</Badge>;
      default: return null;
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          🎯 What Your Home Enables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {timelineData.map((period, index) => (
          <div key={index} className="space-y-3">
            <h4 className="font-semibold text-base">{period.season}</h4>
            <div className="space-y-2">
              {period.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center gap-3">
                  {getStatusBadge(item.status)}
                  <span className="text-sm flex-1">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}