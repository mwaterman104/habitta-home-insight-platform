import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Home, Plus, MapPin, Calendar, Square, Bed, Bath, Settings, User, Loader2 } from 'lucide-react';

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [homes, setHomes] = useState<HomeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHomes = async () => {
      try {
        const { data, error } = await supabase
          .from('homes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHomes(data || []);
      } catch (error: any) {
        toast({
          title: "Error Loading Homes",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHomes();
  }, [user, toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error Signing Out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Home className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Habitta Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/demo')}
              className="text-sm"
            >
              View Demo
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className="text-sm"
            >
              Admin
            </Button>
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4 mr-2" />
              {user?.email}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Your Properties</h2>
          <p className="text-muted-foreground">
            Manage your homes and track maintenance insights
          </p>
        </div>

        {homes.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>No Properties Added</CardTitle>
              <CardDescription>
                Add your first property to get started with personalized maintenance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/home/new')}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Home
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {homes.length} {homes.length === 1 ? 'Property' : 'Properties'}
              </h3>
              <Button onClick={() => navigate('/home/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {homes.map((home) => (
                <Card key={home.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {home.address}
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {home.city}, {home.state} {home.zip_code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {home.property_type && (
                        <div className="col-span-2">
                          <Badge variant="secondary" className="text-xs">
                            {home.property_type.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      )}
                      
                      {home.year_built && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{home.year_built}</span>
                        </div>
                      )}
                      
                      {home.square_feet && (
                        <div className="flex items-center">
                          <Square className="h-3 w-3 mr-1" />
                          <span>{home.square_feet.toLocaleString()} sq ft</span>
                        </div>
                      )}
                      
                      {home.bedrooms && (
                        <div className="flex items-center">
                          <Bed className="h-3 w-3 mr-1" />
                          <span>{home.bedrooms} bed</span>
                        </div>
                      )}
                      
                      {home.bathrooms && (
                        <div className="flex items-center">
                          <Bath className="h-3 w-3 mr-1" />
                          <span>{home.bathrooms} bath</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => navigate(`/home/${home.id}`)}
                        className="flex-1"
                      >
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;