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
      navigate('/auth');
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
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Properties</h1>
          <p className="text-muted-foreground">
            Manage your homes and track maintenance insights
          </p>
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

      {homes.length === 0 ? (
        <div className="text-center py-12">
          <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No homes added yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Get started by adding your first property to track maintenance and get AI insights.
          </p>
          <Button 
            onClick={() => navigate('/home/new')}
            className="inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Home
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Badge variant="secondary" className="text-sm">
              {homes.length} {homes.length === 1 ? 'Property' : 'Properties'}
            </Badge>
            <Button 
              onClick={() => navigate('/home/new')}
              className="inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Home
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {homes.map((home) => (
              <Card key={home.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Home className="h-5 w-5 mr-2 text-primary" />
                    {home.address}
                  </CardTitle>
                  <CardDescription className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {home.city}, {home.state} {home.zip_code}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Property Type:</span>
                      <Badge variant="outline">{home.property_type}</Badge>
                    </div>
                    
                    {home.year_built && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Built:</span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {home.year_built}
                        </span>
                      </div>
                    )}
                    
                    {home.square_feet && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="flex items-center">
                          <Square className="h-3 w-3 mr-1" />
                          {home.square_feet.toLocaleString()} sq ft
                        </span>
                      </div>
                    )}

                    <div className="flex space-x-4 text-sm text-muted-foreground">
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;