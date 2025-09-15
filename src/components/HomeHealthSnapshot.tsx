import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Thermometer, 
  Zap, 
  Home, 
  Droplets,
  Shield,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  HelpCircle
} from "lucide-react";
import { useIntelligencePredictions } from "@/hooks/useIntelligenceEngine";
import { useUserHome } from "@/hooks/useUserHome";

interface SystemHealth {
  system: 'hvac' | 'electrical' | 'plumbing' | 'roof' | 'energy';
  score: number;
  status: 'excellent' | 'good' | 'attention' | 'urgent';
  nextAction?: string;
  nextActionDate?: string;
  lastService?: string;
  quickFix?: {
    title: string;
    time: string;
    impact: string;
  };
}

interface HomeHealthSnapshotProps {
  systems?: SystemHealth[];
}

const mockSystems: SystemHealth[] = [
  {
    system: 'hvac',
    score: 85,
    status: 'good',
    nextAction: 'Replace air filter',
    nextActionDate: '2024-01-15',
    lastService: '2024-03-20',
    quickFix: {
      title: 'Replace air filter',
      time: '5 min',
      impact: '+8% efficiency'
    }
  },
  {
    system: 'electrical',
    score: 92,
    status: 'excellent',
    lastService: '2024-08-12',
    nextAction: 'Annual inspection',
    nextActionDate: '2026-01-15'
  },
  {
    system: 'plumbing',
    score: 78,
    status: 'attention',
    nextAction: 'Check pipe insulation',
    nextActionDate: '2024-01-20',
    quickFix: {
      title: 'Insulate exposed pipes',
      time: '30 min',
      impact: 'Prevents freezing'
    }
  },
  {
    system: 'roof',
    score: 94,
    status: 'excellent',
    lastService: '2024-09-10',
    nextAction: 'Spring inspection',
    nextActionDate: '2025-04-01'
  },
  {
    system: 'energy',
    score: 88,
    status: 'good',
    nextAction: 'Seal window gaps',
    nextActionDate: '2024-01-18',
    quickFix: {
      title: 'Weatherstrip windows',
      time: '2 hours',
      impact: 'Save $200/year'
    }
  }
];

export const HomeHealthSnapshot: React.FC<HomeHealthSnapshotProps> = ({ 
  systems
}) => {
  const { userHome } = useUserHome();
  const propertyId = userHome?.property_id;
  
  // Use Intelligence Engine for real data
  const { data: intelligenceData, loading, error } = useIntelligencePredictions(propertyId);
  
  // Use real data if available, fallback to props, then mock data
  const actualSystems = intelligenceData?.systems || systems || mockSystems;
  const overallScore = intelligenceData?.overallHealth || 
    Math.round(actualSystems.reduce((acc, sys) => acc + sys.score, 0) / actualSystems.length);
  
  const getSystemIcon = (system: string) => {
    switch (system) {
      case 'hvac': return <Thermometer className="h-4 w-4" />;
      case 'electrical': return <Zap className="h-4 w-4" />;
      case 'plumbing': return <Droplets className="h-4 w-4" />;
      case 'roof': return <Home className="h-4 w-4" />;
      case 'energy': return <Shield className="h-4 w-4" />;
      default: return <Home className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-accent';
      case 'good': return 'text-primary';
      case 'attention': return 'text-warning';
      case 'urgent': return 'text-danger';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-4 w-4 text-accent" />;
      case 'attention':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-danger" />;
      default:
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const systemsNeedingAttention = actualSystems.filter(s => s.status === 'attention' || s.status === 'urgent');
  const systemsWithQuickFixes = actualSystems.filter(s => s.quickFix);

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Home Health Score
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {intelligenceData && (
                <Badge variant="outline" className="text-xs">
                  AI-Powered
                </Badge>
              )}
            </CardTitle>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{overallScore}</div>
              <div className="text-sm text-muted-foreground">Overall Health</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallScore} className="h-3 mb-4" />
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-accent/5 rounded-lg">
                <div className="text-lg font-bold text-accent">
                  {actualSystems.filter(s => s.status === 'excellent' || s.status === 'good').length}
                </div>
                <div className="text-xs text-muted-foreground">Systems Healthy</div>
              </div>
              <div className="p-3 bg-warning/5 rounded-lg">
                <div className="text-lg font-bold text-warning">
                  {systemsNeedingAttention.length}
                </div>
                <div className="text-xs text-muted-foreground">Need Attention</div>
              </div>
            </div>
            {intelligenceData?.confidence && (
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>AI Confidence: {Math.round(intelligenceData.confidence * 100)}%</span>
                  <span>Updated: {new Date(intelligenceData.lastUpdated).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            {error && (
              <div className="pt-3 border-t">
                <p className="text-xs text-warning">Using backup health data</p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* System Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>System Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actualSystems.map((system) => (
            <div key={system.system} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-muted ${getStatusColor(system.status)}`}>
                  {getSystemIcon(system.system)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm capitalize">{system.system}</h4>
                    {getStatusIcon(system.status)}
                    {system.confidence && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(system.confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {system.nextAction} • {system.nextActionDate && new Date(system.nextActionDate).toLocaleDateString()}
                    {system.yearsRemaining && (
                      <span className="ml-2 text-primary">
                        ~{system.yearsRemaining} years left
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold">{system.score}%</div>
                  <div className="text-xs text-muted-foreground capitalize">{system.status}</div>
                </div>
                <Progress value={system.score} className="w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Fixes */}
      {systemsWithQuickFixes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Wins Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemsWithQuickFixes.map((system) => (
              <div key={system.system} className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{system.quickFix!.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {system.quickFix!.time}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {system.quickFix!.impact}
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Start Quick Fix
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};