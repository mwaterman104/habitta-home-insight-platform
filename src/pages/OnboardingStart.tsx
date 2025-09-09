import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";

export default function OnboardingStart() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    zip_code: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('onboarding-start', {
        body: formData
      });

      if (error) {
        console.error('Onboarding start error:', error);
        toast.error('Failed to start onboarding');
        return;
      }

      if (data.success) {
        // Store the onboarding data in sessionStorage for the next steps
        sessionStorage.setItem('onboardingData', JSON.stringify(data));
        navigate('/onboarding/snapshot');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Habitta</CardTitle>
          <CardDescription>
            Let's start by verifying your property address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="CA"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                type="text"
                placeholder="12345"
                value={formData.zip_code}
                onChange={(e) => handleInputChange('zip_code', e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Address...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}