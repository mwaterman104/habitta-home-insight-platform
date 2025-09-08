import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Home, MapPin, Calendar, Square, Bed, Bath, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface HomeData {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  year_built: number;
  square_feet: number;
  bedrooms: number;
  bathrooms: number;
  created_at: string;
}

const HomeProfilePage = () => {
  const { homeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [home, setHome] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !homeId) return;

    const fetchHome = async () => {
      try {
        const { data, error } = await supabase
          .from('homes')
          .select('*')
          .eq('id', homeId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setHome(data);
      } catch (error: any) {
        toast({
          title: "Error Loading Home",
          description: error.message,
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, [user, homeId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!home) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Home Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested home could not be found.</p>
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center">
              <Home className="h-6 w-6 mr-2 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Home Profile</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Home Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                {home.address}
              </CardTitle>
              <CardDescription>
                {home.city}, {home.state} {home.zip_code}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {home.property_type && (
                  <div className="text-center">
                    <Badge variant="secondary" className="mb-2">
                      {home.property_type.replace('-', ' ').toUpperCase()}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Property Type</p>
                  </div>
                )}
                
                {home.year_built && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="font-semibold">{home.year_built}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Year Built</p>
                  </div>
                )}
                
                {home.square_feet && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-1">
                      <Square className="h-4 w-4 mr-1" />
                      <span className="font-semibold">{home.square_feet.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Square Feet</p>
                  </div>
                )}
                
                {(home.bedrooms || home.bathrooms) && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-2 mb-1">
                      {home.bedrooms && (
                        <div className="flex items-center">
                          <Bed className="h-4 w-4 mr-1" />
                          <span className="font-semibold">{home.bedrooms}</span>
                        </div>
                      )}
                      {home.bathrooms && (
                        <div className="flex items-center">
                          <Bath className="h-4 w-4 mr-1" />
                          <span className="font-semibold">{home.bathrooms}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Bed/Bath</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Maintenance Tasks</h3>
                <p className="text-sm text-muted-foreground">
                  View and manage your home maintenance schedule
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Property Value</h3>
                <p className="text-sm text-muted-foreground">
                  Track your home's estimated value and trends
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Permits & History</h3>
                <p className="text-sm text-muted-foreground">
                  View permits and maintenance history
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Placeholder for future dashboard content */}
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Coming Soon</CardTitle>
              <CardDescription>
                Your personalized home dashboard will show maintenance insights, alerts, and recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We're working on bringing you personalized insights for your home at {home.address}.
                Check back soon for maintenance schedules, property analytics, and more.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HomeProfilePage;