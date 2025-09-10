import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SolarPotentialCard } from "@/components/SolarPotentialCard";
import { SolarSavingsEstimator } from "@/components/SolarSavingsEstimator";
import { WeatherImpactCard } from "@/components/WeatherImpactCard";
import { useSolarInsights } from "@/hooks/useSolarInsights";
import { 
  Home, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign,
  Users,
  ArrowRight,
  Thermometer,
  Zap,
  Wrench
} from "lucide-react";

// Mock data interfaces
interface HomeScore {
  overall: number;
  systems: {
    hvac: number;
    plumbing: number;
    electrical: number;
    roof: number;
  };
}

interface NextAction {
  id: string;
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  category: string;
}

interface MaintenanceTask {
  id: string;
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  estimated_cost?: number;
  status: 'pending' | 'in_progress' | 'completed';
}

interface FinancialData {
  homeValue: number;
  valueChange: number;
  maintenanceBudget: number;
  spentThisYear: number;
  projectedSavings: number;
}

export default function DashboardOverview() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [homeScore, setHomeScore] = useState<HomeScore | null>(null);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  
  // Mock coordinates for solar analysis - replace with actual home coordinates
  const homeLatitude = 37.7749; // San Francisco example
  const homeLongitude = -122.4194;
  const { data: solarData, loading: solarLoading } = useSolarInsights(homeLatitude, homeLongitude);

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data
      setHomeScore({
        overall: 87,
        systems: {
          hvac: 85,
          plumbing: 92,
          electrical: 78,
          roof: 91
        }
      });
      
      setNextAction({
        id: '1',
        title: 'Replace HVAC Air Filter',
        priority: 'urgent',
        dueDate: '2024-01-15',
        category: 'HVAC'
      });
      
      setMaintenanceTasks([
        {
          id: '1',
          title: 'Replace HVAC Air Filter',
          priority: 'urgent',
          dueDate: '2024-01-15',
          estimated_cost: 25,
          status: 'pending'
        },
        {
          id: '2', 
          title: 'Clean Gutters',
          priority: 'high',
          dueDate: '2024-01-20',
          estimated_cost: 150,
          status: 'pending'
        },
        {
          id: '3',
          title: 'Test Smoke Detectors',
          priority: 'medium',
          dueDate: '2024-01-25',
          status: 'pending'
        }
      ]);
      
      setFinancialData({
        homeValue: 485000,
        valueChange: 3.2,
        maintenanceBudget: 5000,
        spentThisYear: 1850,
        projectedSavings: 2400
      });
      
      setLoading(false);
    };

    loadData();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-danger text-danger-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-secondary text-secondary-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const OverviewContent = () => (
    <>
      {/* Key Metrics Row */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
        {/* Home Score */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Home Score</p>
                <p className="text-2xl font-bold text-foreground">{homeScore?.overall}/100</p>
              </div>
            </div>
            <Progress value={homeScore?.overall} className="mt-3" />
          </CardContent>
        </Card>

        {/* Property Value */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Property Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ${financialData?.homeValue?.toLocaleString()}
                </p>
                <p className="text-sm text-accent">
                  +{financialData?.valueChange}% this year
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Due */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Due</p>
                <p className="text-2xl font-bold text-foreground">
                  {maintenanceTasks.filter(t => t.status === 'pending').length}
                </p>
                <p className="text-sm text-warning">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget Used</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round((financialData?.spentThisYear || 0) / (financialData?.maintenanceBudget || 1) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  ${financialData?.spentThisYear?.toLocaleString()} of ${financialData?.maintenanceBudget?.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Next Action */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Next Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextAction && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getPriorityColor(nextAction.priority)}>
                      {nextAction.priority.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Due: {new Date(nextAction.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold">{nextAction.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Category: {nextAction.category}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Mark Complete
                  </Button>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">HVAC</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={homeScore?.systems.hvac} className="w-16" />
                  <span className="text-sm font-medium">{homeScore?.systems.hvac}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Electrical</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={homeScore?.systems.electrical} className="w-16" />
                  <span className="text-sm font-medium">{homeScore?.systems.electrical}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Plumbing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={homeScore?.systems.plumbing} className="w-16" />
                  <span className="text-sm font-medium">{homeScore?.systems.plumbing}%</span>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="w-full mt-4">
                View Full Report
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weather Impact */}
        <WeatherImpactCard 
          latitude={homeLatitude} 
          longitude={homeLongitude}
        />
      </div>

      {/* Second row for additional cards */}  
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pro Help CTA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Get Expert Help
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect with vetted professionals for any task you can't handle yourself.
              </p>
              
              <div className="space-y-2">
                <Button className="w-full">
                  Book a Consultation
                </Button>
                <Button variant="outline" className="w-full">
                  Browse Contractors
                </Button>
                <Button variant="ghost" className="w-full text-primary">
                  Ask ChatDIY Assistant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future card */}
        <Card>
          <CardHeader>
            <CardTitle>Property Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Additional property intelligence coming soon.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks & Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {maintenanceTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                      {task.estimated_cost && ` • Est. Cost: $${task.estimated_cost}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(task.priority)} variant="outline">
                    {task.priority}
                  </Badge>
                  <Button size="sm" variant="ghost">
                    Complete
                  </Button>
                </div>
              </div>
            ))}
            
            <Button variant="outline" className="w-full mt-4">
              View All Tasks
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your home's health overview and what needs attention today
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="energy" className="rounded-xl">Energy</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-xl">Maintenance</TabsTrigger>
          <TabsTrigger value="financial" className="rounded-xl">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewContent />
        </TabsContent>

        <TabsContent value="energy" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <SolarPotentialCard solarData={solarData} loading={solarLoading} />
            <SolarSavingsEstimator solarData={solarData} loading={solarLoading} />
          </div>
          
          {/* Energy Efficiency Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Energy Efficiency Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold text-primary">A+</div>
                  <div className="text-sm text-muted-foreground">Energy Rating</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">23%</div>
                  <div className="text-sm text-muted-foreground">Below Avg Usage</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">$2,340</div>
                  <div className="text-sm text-muted-foreground">Annual Savings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detailed maintenance planning coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Financial analysis and projections coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
