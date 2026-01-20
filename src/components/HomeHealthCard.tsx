import { Card, CardContent } from "@/components/ui/card";

interface HomeHealthCardProps {
  overallScore: number;
  systemsNeedingAttention: number;
  lastUpdated?: string;
}

/**
 * HomeHealthCard - Main home health score display
 * Based on mockup "HOME HEALTH 82" section
 */
export function HomeHealthCard({ 
  overallScore, 
  systemsNeedingAttention,
  lastUpdated 
}: HomeHealthCardProps) {
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
        <p className="text-xs text-muted-foreground">
          {lastUpdated ? `Updated ${lastUpdated}` : 'Updated today'} · Based on permits, maintenance, and local conditions
        </p>
      </CardContent>
    </Card>
  );
}
