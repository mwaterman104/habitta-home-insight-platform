import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
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
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  const [loading, setLoading] = useState(true);

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
        setUserHome(data);
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

  // User has a home, show the full dashboard
  return <DashboardOverview />;
}