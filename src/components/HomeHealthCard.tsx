import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HomeHealthCardProps {
  overallScore: number;
  systemsNeedingAttention: number;
  lastUpdated?: string;
  scoreDrivers?: string;
  whyExpanded?: boolean;
  onToggleWhy?: () => void;
  whyBullets?: string[];
}

/**
 * HomeHealthCard - Main home health score display
 * Based on mockup "HOME HEALTH 82" section
 */
export function HomeHealthCard({ 
  overallScore, 
  systemsNeedingAttention,
  lastUpdated,
  scoreDrivers,
  whyExpanded = false,
  onToggleWhy,
  whyBullets = []
}: HomeHealthCardProps) {
  const navigate = useNavigate();
  
  // Determine score color based on value
  const getScoreColor = () => {
    if (overallScore >= 80) return 'text-green-700';
    if (overallScore >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  // Generate contextual message
  const getMessage = () => {
    if (systemsNeedingAttention === 0) {
      return "Your home is in great shape. No systems need immediate attention.";
    }
    if (systemsNeedingAttention === 1) {
      return "Your home is in good shape. One system needs attention this year.";
    }
    return `Your home is in good shape. ${systemsNeedingAttention} systems need attention this year.`;
  };

  return (
    <Card className="rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-medium">
          Home Health
        </div>
        <div className={`text-5xl font-bold mb-3 ${getScoreColor()}`}>
          {overallScore}
        </div>
        <p className="text-gray-700 mb-3 leading-relaxed">
          {getMessage()}
        </p>
        {onToggleWhy && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto font-medium"
            onClick={onToggleWhy}
          >
            See why your home is doing well 
            {whyExpanded ? (
              <ChevronDown className="h-4 w-4 ml-1" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-1" />
            )}
          </Button>
        )}
        
        {/* Expandable "Why" section */}
        {whyExpanded && whyBullets.length > 0 && (
          <div className="mb-3 pt-3 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
            <ul className="space-y-1.5 text-sm text-gray-600">
              {whyBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto mt-2 text-xs text-muted-foreground"
              onClick={() => navigate('/system/hvac')}
            >
              View full HVAC details →
            </Button>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          {lastUpdated ? `Updated ${lastUpdated}` : 'Updated today'} · Based on permits, maintenance, and local conditions
        </p>
        {scoreDrivers && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Driven primarily by {scoreDrivers}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
