import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { MapPin, Home, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [address, setAddress] = useState("");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);

  function isValidAddress(a: string) {
    return a.length > 5 && /[0-9]/.test(a) && /[a-zA-Z]/.test(a);
  }

  async function startOnboarding() {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    setLoading(true);
    try {
      console.log('Starting onboarding for address:', address);
      
      const { data, error } = await supabase.functions.invoke('onboarding-start', {
        body: { 
          address,
          city: "",
          state: "",
          zip_code: ""
        }
      });

      if (error) {
        console.error('Onboarding start error:', error);
        throw error;
      }

      console.log('Onboarding response:', data);
      
      if (data?.success && data?.home?.id) {
        setPropertyId(data.home.id);
        setStep(1);
        
        // Start progress simulation
        simulateEnrichmentProgress();
        
        toast.success("Property analysis started!");
      } else {
        throw new Error(data?.error || "Failed to start onboarding");
      }
    } catch (e: any) {
      console.error('Error starting onboarding:', e);
      toast.error(e.message || "Could not start onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function simulateEnrichmentProgress() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setStep(2), 500);
      }
      setEnrichmentProgress(Math.min(progress, 100));
    }, 800);
  }

  async function submitUnknowns(values: { waterHeater?: string; hvac?: string; roof?: string }) {
    if (!propertyId) return;
    
    setLoading(true);
    try {
      console.log('Submitting unknowns:', values);
      
      // Create simple labels for the confirmations
      const labelData = [];
      if (values.waterHeater) {
        labelData.push({
          property_id: propertyId,
          field: 'water_heater_type',
          value: values.waterHeater,
          confidence: 0.9
        });
      }
      if (values.hvac) {
        labelData.push({
          property_id: propertyId,
          field: 'hvac_type', 
          value: values.hvac,
          confidence: 0.9
        });
      }
      if (values.roof) {
        labelData.push({
          property_id: propertyId,
          field: 'roof_material',
          value: values.roof,
          confidence: 0.9
        });
      }

      // Save labels if any provided
      if (labelData.length > 0) {
        const { error: labelError } = await supabase
          .from('systems')
          .upsert(labelData.map(label => ({
            user_id: user?.id,
            home_id: propertyId,
            kind: label.field.split('_')[0], // water, hvac, roof
            material: label.value,
            confidence: label.confidence,
            status: 'ACTIVE',
            install_year: new Date().getFullYear() - 5 // default to 5 years old
          })), { onConflict: 'home_id,kind' });

        if (labelError) {
          console.error('Error saving labels:', labelError);
        }
      }

      // Promote validation data to production
      const { error: promoteError } = await supabase.functions.invoke('promote-validation', {
        body: { propertyId }
      });

      if (promoteError) {
        console.error('Error promoting validation:', promoteError);
        // Don't fail the flow, just log the error
      }

      setStep(3);
      toast.success("Your home profile is ready!");
    } catch (e: any) {
      console.error('Error submitting unknowns:', e);
      toast.error("We saved your inputs. You can continue to your dashboard.");
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  function goToDashboard() {
    if (propertyId) {
      navigate(`/dashboard?propertyId=${propertyId}`);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Progress indicator */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            {[0, 1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle className="w-4 h-4" /> : s + 1}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of 4
          </p>
        </div>

        {/* Step 0: Address Entry */}
        {step === 0 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Habitta</CardTitle>
              <p className="text-muted-foreground">
                Let's start by adding your home address
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="123 Main St, City, ST 00000"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="text-center"
              />
              <Button
                onClick={startOnboarding}
                disabled={!isValidAddress(address) || loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Analysis...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Background Enrichment */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Home className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <CardTitle className="text-2xl">Building Your Profile</CardTitle>
              <p className="text-muted-foreground">
                Analyzing permits, structure data, and creating predictions...
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(enrichmentProgress)}%</span>
                </div>
                <Progress value={enrichmentProgress} className="h-2" />
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                  Property data retrieved
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                  Permits analyzed
                </div>
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating predictions...
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Quick Confirmations */}
        {step === 2 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Quick Confirmations</CardTitle>
              <p className="text-muted-foreground">
                Help us fill in the details (optional but recommended)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Water Heater
                  </label>
                  <Input
                    placeholder="e.g., Gas Tank, Electric, Tankless"
                    id="waterHeater"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">HVAC System</label>
                  <Input
                    placeholder="e.g., Central Air, Heat Pump, Split System"
                    id="hvac"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Roof Material</label>
                  <Input
                    placeholder="e.g., Asphalt Shingle, Tile, Metal"
                    id="roof"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    const waterHeater = (document.getElementById("waterHeater") as HTMLInputElement)?.value;
                    const hvac = (document.getElementById("hvac") as HTMLInputElement)?.value;
                    const roof = (document.getElementById("roof") as HTMLInputElement)?.value;
                    submitUnknowns({ waterHeater, hvac, roof });
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => submitUnknowns({})}
                  disabled={loading}
                >
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Your Plan is Ready!</CardTitle>
              <p className="text-muted-foreground">
                We've analyzed your home and created a personalized maintenance plan
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Next Steps:</span>
                </div>
                <ul className="text-sm space-y-1">
                  <li>• View your personalized dashboard</li>
                  <li>• Check today's priorities</li>
                  <li>• Review system health status</li>
                  <li>• Explore predictive insights</li>
                </ul>
              </div>
              
              <Button onClick={goToDashboard} className="w-full" size="lg">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}