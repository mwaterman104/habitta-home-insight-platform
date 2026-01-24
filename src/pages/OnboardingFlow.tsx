import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GooglePlacesAutocomplete } from "@/components/onboarding/GooglePlacesAutocomplete";
import { InstantSnapshot } from "@/components/onboarding/InstantSnapshot";
import { CriticalSystemsStep } from "@/components/onboarding/CriticalSystemsStep";
import { HomeHandshake } from "@/components/onboarding/HomeHandshake";
import { OnboardingComplete } from "@/components/onboarding/OnboardingComplete";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  county: string;
  country: string;
  lat: number;
  lng: number;
  components: any[];
  geometry: any;
}

interface SnapshotData {
  city: string;
  state: string;
  roof_type: string;
  roof_age_band: string;
  cooling_type: string;
  climate_stress: string;
  year_built?: number | null;
  hvac_permit_year?: number | null;
}

interface OnboardingState {
  home_id: string | null;
  hvac_system_id: string | null;
  snapshot: SnapshotData | null;
  confidence: number;
  selectedAddress: PlaceDetails | null;
  isEnriching: boolean;
}

// Updated step flow: address → handshake → snapshot → systems → complete
type Step = 'address' | 'handshake' | 'snapshot' | 'systems' | 'complete';

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('address');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstHome, setIsFirstHome] = useState(true); // Risk 6: Branch headline
  const [state, setState] = useState<OnboardingState>({
    home_id: null,
    hvac_system_id: null,
    snapshot: null,
    confidence: 0,
    selectedAddress: null,
    isEnriching: false,
  });

  // Check for existing homes and set isFirstHome flag
  useEffect(() => {
    const checkExistingHome = async () => {
      if (!user) return;
      
      const { data: homes, count } = await supabase
        .from('homes')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .limit(1);

      // Set isFirstHome based on count
      setIsFirstHome((count || 0) === 0);

      // Redirect if already has a home (keep existing behavior)
      if (homes && homes.length > 0) {
        navigate('/dashboard', { replace: true });
      }
    };

    checkExistingHome();
  }, [user, navigate]);

  // Subscribe to real-time updates for confidence changes during enrichment
  useEffect(() => {
    if (!state.home_id) return;

    // Mark as enriching initially
    setState(prev => ({ ...prev, isEnriching: true }));

    const channel = supabase
      .channel(`home-enrichment-${state.home_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'homes',
          filter: `id=eq.${state.home_id}`,
        },
        async (payload) => {
          const newConfidence = payload.new.confidence as number;
          const pulseStatus = payload.new.pulse_status as string;
          const yearBuilt = payload.new.year_built as number | null;

          console.log('[OnboardingFlow] Home update received:', { newConfidence, pulseStatus, yearBuilt });

          // Update confidence if it increased
          if (newConfidence > state.confidence) {
            setState(prev => ({
              ...prev,
              confidence: newConfidence,
              snapshot: prev.snapshot ? {
                ...prev.snapshot,
                year_built: yearBuilt,
              } : null,
            }));
          }

          // Check if enrichment is complete
          if (pulseStatus === 'live') {
            // Also fetch any HVAC permit data
            const { data: hvacSystem } = await supabase
              .from('systems')
              .select('install_year, install_source')
              .eq('home_id', state.home_id)
              .eq('kind', 'hvac')
              .single();

            if (hvacSystem?.install_source === 'permit' && hvacSystem?.install_year) {
              setState(prev => ({
                ...prev,
                isEnriching: false,
                snapshot: prev.snapshot ? {
                  ...prev.snapshot,
                  hvac_permit_year: hvacSystem.install_year,
                } : null,
              }));
            } else {
              setState(prev => ({ ...prev, isEnriching: false }));
            }
          }
        }
      )
      .subscribe();

    // Auto-stop enriching indicator after 10 seconds regardless
    const timeout = setTimeout(() => {
      setState(prev => ({ ...prev, isEnriching: false }));
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeout);
    };
  }, [state.home_id]);

  // Handle address selection - creates home and transitions to handshake
  const handleAddressSelect = async (details: PlaceDetails) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-home', {
        body: {
          address_line1: details.address_line1,
          city: details.city,
          state: details.state,
          postal_code: details.postal_code,
          place_id: details.place_id,
          lat: details.lat,
          lng: details.lng,
          formatted_address: details.formatted_address,
          components: details.components,
          geometry: details.geometry,
        },
      });

      if (error) throw error;

      setState({
        home_id: data.home_id,
        hvac_system_id: data.hvac_system_id,
        snapshot: data.snapshot,
        confidence: data.confidence,
        selectedAddress: details,
        isEnriching: true, // Start enriching indicator
      });

      // Navigate to handshake step (not directly to snapshot)
      setStep('handshake');
    } catch (err: any) {
      console.error('[OnboardingFlow] Create home error:', err);
      toast.error('Unable to verify address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle handshake completion with perceptual causality delay (Risk 2 Fix)
  const handleHandshakeComplete = useCallback(() => {
    // Add 400ms delay to preserve perceived causality
    // Prevents "wait, this was already there" feeling
    setTimeout(() => {
      setStep('snapshot');
    }, 400);
  }, []);

  // Handle systems step completion → navigate to complete step
  const handleSystemsComplete = async (systems: Record<string, any>) => {
    setIsLoading(true);
    try {
      // Call update-system-install for each answered system
      const updatePromises = Object.entries(systems).map(async ([key, answer]) => {
        if (!answer || answer.choice === null) return;
        
        const payload: Record<string, any> = {
          homeId: state.home_id,
          systemKey: key,
          replacementStatus: answer.choice,
        };
        
        if (answer.choice === 'replaced' && answer.year) {
          payload.installYear = answer.year;
          payload.installSource = 'owner_reported';
        }
        
        if (answer.choice === 'unknown') {
          payload.installMetadata = { user_acknowledged_unknown: true };
        }
        
        return supabase.functions.invoke('update-system-install', {
          body: payload,
        });
      });
      
      await Promise.all(updatePromises);
      setStep('complete'); // Navigate to complete step, not dashboard
    } catch (error) {
      console.error('[OnboardingFlow] Systems update error:', error);
      setStep('complete'); // Still proceed to complete even on error
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skip → also goes to complete step
  const handleSkip = () => {
    setStep('complete');
  };

  // Handle final navigation to dashboard
  const handleContinueToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Step: Address Lookup */}
        {step === 'address' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome to Habitta
              </h1>
              <p className="text-muted-foreground">
                We quietly monitor the systems that keep your home running.
              </p>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <GooglePlacesAutocomplete
                  onSelect={handleAddressSelect}
                  placeholder="Enter your address..."
                  disabled={isLoading}
                />
                {isLoading && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Setting up your home...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground max-w-sm mx-auto">
              We'll use public records, climate data, and regional patterns to build your home's baseline.
            </p>
          </div>
        )}

        {/* Step: Handshake — The soul of onboarding */}
        {step === 'handshake' && state.snapshot && (
          <HomeHandshake
            city={state.snapshot.city}
            state={state.snapshot.state}
            isFirstHome={isFirstHome}
            onComplete={handleHandshakeComplete}
          />
        )}

        {/* Step: Discovery Reveal (Snapshot) */}
        {step === 'snapshot' && state.snapshot && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Here's what we found so far
              </h1>
              <p className="text-muted-foreground">
                Based on public data and homes like yours in {state.snapshot.city}, {state.snapshot.state}
              </p>
            </div>

            <InstantSnapshot
              snapshot={state.snapshot}
              confidence={state.confidence}
              isEnriching={state.isEnriching}
            />

            <Button
              onClick={() => setStep('systems')}
              className="w-full h-12 text-base"
              size="lg"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step: Systems Lock-In */}
        {step === 'systems' && state.home_id && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <button
              onClick={() => setStep('snapshot')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <CriticalSystemsStep
              yearBuilt={state.snapshot?.year_built ?? undefined}
              city={state.snapshot?.city}
              state={state.snapshot?.state}
              onComplete={handleSystemsComplete}
              onSkip={handleSkip}
              isSubmitting={isLoading}
            />
          </div>
        )}

        {/* Step: Completion — Closure screen */}
        {step === 'complete' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <OnboardingComplete onContinue={handleContinueToDashboard} />
          </div>
        )}
      </div>
    </div>
  );
}
