import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SolarPotentialCard } from "@/components/SolarPotentialCard";
import { SolarSavingsEstimator } from "@/components/SolarSavingsEstimator";
import { SolarRoofVisualizer } from "@/components/SolarRoofVisualizer";
import { HomePulse } from "@/components/HomePulse";
import { SmartToDoEngine } from "@/components/SmartToDoEngine";
import { FinancialInsights } from "@/components/FinancialInsights";
import { HomeHealthSnapshot } from "@/components/HomeHealthSnapshot";
import { SupportLayer } from "@/components/SupportLayer";
import { PredictiveCostDashboard } from '@/components/PredictiveCostDashboard';
import { HyperlocalIntelligence } from '@/components/HyperlocalIntelligence';
import { AILifecycleDashboard } from '@/components/AILifecycleDashboard';
import { AIHomeAssistant } from '@/components/AIHomeAssistant';
import { PermitBasedSuggestions } from '@/components/PermitBasedSuggestions';
import { useSolarInsights } from "@/hooks/useSolarInsights";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// New HVAC Feature Components
import { HomeHealthCard } from "@/components/HomeHealthCard";
import { SystemStatusCard } from "@/components/SystemStatusCard";
import { MaintenanceTimeline } from "@/components/MaintenanceTimeline";
import { FinancialOutlookCard } from "@/components/FinancialOutlookCard";
import { HomeValueImpact } from "@/components/HomeValueImpact";
import { ChatDIYBanner } from "@/components/ChatDIYBanner";
import { SystemDetailView } from "@/components/SystemDetailView";
import { SystemPrediction } from "@/types/systemPrediction";
import { useToast } from "@/hooks/use-toast";

interface UserHome {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_id?: string;
  latitude?: number;
  longitude?: number;
  user_id: string;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  
  // Use real home coordinates when available
  const homeLatitude = userHome?.latitude || 37.7749; // fallback to SF
  const homeLongitude = userHome?.longitude || -122.4194;
  const { data: solarData, loading: solarLoading } = useSolarInsights(homeLatitude, homeLongitude);

  // HVAC Feature State
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [hvacPrediction, setHvacPrediction] = useState<SystemPrediction | null>(null);
  const [hvacLoading, setHvacLoading] = useState(false);
  const { toast } = useToast();

  // Avoid inaccurate location in Home Pulse if coordinates are unknown
  const pulseLatitude = userHome?.latitude;
  const pulseLongitude = userHome?.longitude;

  // Fetch user home
  useEffect(() => {
    if (!user) return;

    const fetchUserHome = async () => {
      try {
        const { data, error } = await supabase
          .from('homes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setUserHome(data);
        }
      } catch (error) {
        console.error('Error fetching user home:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserHome();
  }, [user]);

  // Fetch HVAC prediction when HVAC Health tab is active
  useEffect(() => {
    if (activeTab !== 'hvac-health' || !userHome?.id) return;

    const fetchHvacPrediction = async () => {
      setHvacLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('intelligence-engine', {
          body: { 
            action: 'hvac-prediction', 
            property_id: userHome.id 
          }
        });

        if (error) throw error;
        if (data) {
          setHvacPrediction(data);
        }
      } catch (error) {
        console.error('Error fetching HVAC prediction:', error);
        toast({
          title: 'Unable to load HVAC data',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setHvacLoading(false);
      }
    };

    fetchHvacPrediction();
  }, [activeTab, userHome?.id]);

  const handleHvacActionComplete = async () => {
    // Refresh HVAC prediction after action completion
    if (userHome?.id) {
      try {
        const { data, error } = await supabase.functions.invoke('intelligence-engine', {
          body: { 
            action: 'hvac-prediction', 
            property_id: userHome.id,
            forceRefresh: true
          }
        });

        if (error) throw error;
        if (data) {
          setHvacPrediction(data);
          toast({
            title: 'Maintenance logged',
            description: 'Your HVAC outlook has improved.',
          });
        }
      } catch (error) {
        console.error('Error refreshing HVAC prediction:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const OverviewContent = () => (
    <div className="space-y-6">
      {/* Home Pulse - Living Greeting */}
      <HomePulse 
        latitude={pulseLatitude}
        longitude={pulseLongitude}
        homeAddress={userHome ? `${userHome.address}, ${userHome.city}, ${userHome.state} ${userHome.zip_code}` : undefined}
      />

      {/* Main Dashboard Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SmartToDoEngine />
        <HomeHealthSnapshot />
      </div>

      {/* Permit-Based Personalized Suggestions */}
      {userHome?.id && <PermitBasedSuggestions homeId={userHome.id} />}
      
      {/* Financial Insights */}
      <FinancialInsights />
      
      {/* Support Layer */}
      <SupportLayer />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 rounded-2xl bg-muted/50">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Home Pulse
          </TabsTrigger>
          <TabsTrigger value="hvac-health" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            HVAC Health
          </TabsTrigger>
          <TabsTrigger value="energy" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Energy
          </TabsTrigger>
          <TabsTrigger value="costs" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Costs
          </TabsTrigger>
          <TabsTrigger value="local" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Local
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Financial
          </TabsTrigger>
          <TabsTrigger value="ai-predictions" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            AI Predictions
          </TabsTrigger>
          <TabsTrigger value="ai-assistant" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            AI Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewContent />
        </TabsContent>

        {/* New HVAC Health Tab with State-Based Drill-Down */}
        <TabsContent value="hvac-health" className="space-y-6">
          {selectedSystem === 'hvac' && hvacPrediction ? (
            <SystemDetailView 
              prediction={hvacPrediction}
              onBack={() => setSelectedSystem(null)}
              onActionComplete={handleHvacActionComplete}
            />
          ) : (
            <div className="space-y-6">
              {/* Home Health Score */}
              <HomeHealthCard 
                overallScore={hvacPrediction ? (hvacPrediction.status === 'low' ? 85 : hvacPrediction.status === 'moderate' ? 70 : 55) : 82}
                systemsNeedingAttention={hvacPrediction?.status !== 'low' ? 1 : 0}
                lastUpdated="today"
              />

              {/* Coming Up Section */}
              <section>
                <h2 className="text-xs uppercase text-muted-foreground mb-3 font-medium tracking-wider">Coming Up</h2>
                <div className="space-y-3">
                  {hvacLoading ? (
                    <>
                      <Skeleton className="h-24 rounded-xl" />
                      <Skeleton className="h-24 rounded-xl" />
                    </>
                  ) : hvacPrediction ? (
                    <SystemStatusCard
                      systemName={hvacPrediction.header.name}
                      summary={hvacPrediction.forecast.summary}
                      recommendation={hvacPrediction.actions[0]?.title ? `Recommended: ${hvacPrediction.actions[0].title}` : undefined}
                      status={hvacPrediction.status}
                      onClick={() => setSelectedSystem('hvac')}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No HVAC data available yet.</p>
                      <p className="text-sm">Add your home systems to see predictions.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Maintenance Timeline */}
              <MaintenanceTimeline
                nowTasks={hvacPrediction?.actions.filter(a => a.priority === 'high').map((a, i) => ({
                  id: `now-${i}`,
                  title: a.title,
                  metaLine: a.metaLine,
                  completed: false,
                })) || []}
                thisYearTasks={hvacPrediction?.actions.filter(a => a.priority === 'standard').map((a, i) => ({
                  id: `year-${i}`,
                  title: a.title,
                  metaLine: a.metaLine,
                  completed: false,
                })) || []}
                futureYearsTasks={hvacPrediction?.planning ? [{
                  id: 'planning-1',
                  title: 'Consider HVAC replacement planning',
                  metaLine: '$6,000–$12,000',
                  completed: false,
                }] : []}
              />

              {/* Financial Outlook */}
              <FinancialOutlookCard
                estimatedCosts={hvacPrediction?.status === 'high' ? '$300–$500' : '$100–$200'}
                avoidedRepairs="~$1,200"
                riskReduced="18%"
              />

              {/* Home Value Impact */}
              <HomeValueImpact isVerified={hvacPrediction?.status === 'low'} />

              {/* ChatDIY Banner */}
              <ChatDIYBanner topic={hvacPrediction?.actions[0]?.chatdiySlug} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="energy" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <SolarPotentialCard solarData={solarData} loading={solarLoading} />
            <SolarSavingsEstimator solarData={solarData} loading={solarLoading} />
          </div>
          
          <SolarRoofVisualizer solarData={solarData} loading={solarLoading} />
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <PredictiveCostDashboard propertyId={userHome?.property_id} />
        </TabsContent>

        <TabsContent value="local" className="space-y-6">
          <HyperlocalIntelligence 
            propertyId={userHome?.property_id}
            zipCode={userHome?.zip_code}
            address={userHome?.address}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <FinancialInsights />
        </TabsContent>

        <TabsContent value="ai-predictions" className="space-y-6">
          <AILifecycleDashboard homeId={userHome?.id} />
        </TabsContent>

        <TabsContent value="ai-assistant" className="space-y-6">
          <AIHomeAssistant propertyId={userHome?.property_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}