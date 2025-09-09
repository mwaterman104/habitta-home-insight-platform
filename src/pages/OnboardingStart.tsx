import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";
import { AutocompleteInput } from "@/components/AutocompleteInput";

export default function OnboardingStart() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    zip_code: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAddressVerified, setIsAddressVerified] = useState(false);

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

  const handleAddressSelect = (suggestion: any) => {
    setFormData({
      address: suggestion.street_line,
      city: suggestion.city,
      state: suggestion.state,
      zip_code: suggestion.zipcode
    });
    setIsAddressVerified(true);
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
              <Label htmlFor="address">Property Address</Label>
              <AutocompleteInput
                placeholder="Start typing your address..."
                onSelect={handleAddressSelect}
                displayValue={formData.address ? `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}` : ""}
              />
            </div>
            
            {isAddressVerified && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <strong>Selected Address:</strong><br />
                {formData.address}<br />
                {formData.city}, {formData.state} {formData.zip_code}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !isAddressVerified}>
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