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
import { useSolarInsights } from "@/hooks/useSolarInsights";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

  // Avoid inaccurate location in Home Pulse if coordinates are unknown
  const pulseLatitude = userHome?.latitude;
  const pulseLongitude = userHome?.longitude;

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

      {/* Financial Insights */}
      <FinancialInsights />
      
      {/* Support Layer */}
      <SupportLayer />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 rounded-2xl bg-muted/50">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Home Pulse
          </TabsTrigger>
          <TabsTrigger value="energy" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Energy Intelligence
          </TabsTrigger>
          <TabsTrigger value="costs" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Cost Planning
          </TabsTrigger>
          <TabsTrigger value="local" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Local Intelligence
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Financial Intelligence
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