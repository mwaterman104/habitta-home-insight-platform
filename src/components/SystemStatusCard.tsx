import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface SystemStatusCardProps {
  systemName: string;
  summary: string;
  recommendation?: string;
  status: 'low' | 'moderate' | 'high';
  onClick?: () => void;
}

/**
 * SystemStatusCard - Individual system status display
 * Shows system name, forecast summary, and optional recommendation
 * Color-coded border based on status (low=green, moderate=amber, high=red)
 */
export function SystemStatusCard({ 
  systemName, 
  summary, 
  recommendation,
  status,
  onClick 
}: SystemStatusCardProps) {
  // Status to border color mapping (standardized vocabulary)
  const getBorderColor = () => {
    switch (status) {
      case 'low':
        return 'border-l-green-500';
      case 'moderate':
        return 'border-l-amber-500';
      case 'high':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  };

  // Status to label mapping
  const getStatusLabel = () => {
    switch (status) {
      case 'low':
        return { text: 'Low Risk', color: 'text-green-700 bg-green-50' };
      case 'moderate':
        return { text: 'Moderate', color: 'text-amber-700 bg-amber-50' };
      case 'high':
        return { text: 'High Risk', color: 'text-red-700 bg-red-50' };
      default:
        return { text: 'Unknown', color: 'text-gray-700 bg-gray-50' };
    }
  };

  const statusLabel = getStatusLabel();

  return (
    <Card 
      className={`rounded-xl border-l-4 ${getBorderColor()} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{systemName}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel.color}`}>
                {statusLabel.text}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{summary}</p>
            {recommendation && (
              <p className="text-xs text-muted-foreground">
                {recommendation}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}
