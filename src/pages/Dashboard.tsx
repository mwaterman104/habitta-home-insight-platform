import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardOverview from "./DashboardOverview";

interface UserHome {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_id?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  const fetchUserHome = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('homes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setUserHome(data);
    } catch (error) {
      console.error('Error fetching user home:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserHome();
  }, [user]);

  const handleLinkValidationData = async () => {
    if (!user || !userHome) return;

    setLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-home-validation', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your home has been connected to validation data. The dashboard should now show live data.",
      });

      // Refresh the home data
      await fetchUserHome();
      
    } catch (error) {
      console.error('Error linking validation data:', error);
      toast({
        title: "Error",
        description: "Failed to connect validation data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  // If user has no home, show add home prompt
  if (!userHome) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Home className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to your Home Intelligence Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              To get started with live data and personalized insights, please add your home address.
            </p>
            <Button 
              onClick={() => navigate('/onboarding')} 
              className="w-full"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user has home but no property_id, show connection prompt
  if (userHome && !userHome.property_id) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <RefreshCw className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Connect Your Home Data</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your home address: <strong>{userHome.address}, {userHome.city}, {userHome.state} {userHome.zip_code}</strong>
            </p>
            <p className="text-muted-foreground">
              Connect your home to our validation data to see live insights, system health, and maintenance recommendations.
            </p>
            <Button 
              onClick={handleLinkValidationData}
              disabled={linking}
              className="w-full"
              size="lg"
            >
              {linking ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {linking ? 'Connecting...' : 'Connect Validation Data'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has a home with property_id, show the full dashboard
  return <DashboardOverview />;
}