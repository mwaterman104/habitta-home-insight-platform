import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GooglePlacesAutocomplete } from "@/components/onboarding/GooglePlacesAutocomplete";
import { InstantSnapshot } from "@/components/onboarding/InstantSnapshot";
import { HVACAgePicker } from "@/components/onboarding/HVACAgePicker";
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
  hvacAgeBand: string | null;
  isEnriching: boolean;
}

type Step = 'address' | 'snapshot' | 'hvac';

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('address');
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    home_id: null,
    hvac_system_id: null,
    snapshot: null,
    confidence: 0,
    selectedAddress: null,
    hvacAgeBand: null,
    isEnriching: false,
  });

  // Redirect to dashboard if already has a home
  useEffect(() => {
    const checkExistingHome = async () => {
      if (!user) return;
      
      const { data: homes } = await supabase
        .from('homes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

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

  // Handle address selection - immediately creates home
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
        hvacAgeBand: null,
        isEnriching: true, // Start enriching indicator
      });

      // Immediately move to snapshot (no loading spinner between)
      setStep('snapshot');
    } catch (err: any) {
      console.error('[OnboardingFlow] Create home error:', err);
      toast.error('Unable to verify address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle HVAC age answer
  const handleHVACAnswer = async (ageBand: string | null) => {
    setState(prev => ({ ...prev, hvacAgeBand: ageBand }));
  };

  // Continue from HVAC question to Home Pulse
  const handleContinueToHomePulse = async () => {
    setIsLoading(true);

    try {
      // Update HVAC system with user input if provided
      if (state.hvacAgeBand && state.hvac_system_id) {
        // Calculate approximate install year from age band
        const currentYear = new Date().getFullYear();
        const ageMapping: Record<string, number> = {
          '0-5': 2,
          '5-10': 7,
          '10-15': 12,
          '15+': 18,
        };
        const estimatedAge = ageMapping[state.hvacAgeBand] || 10;
        const installYear = currentYear - estimatedAge;

        await supabase
          .from('systems')
          .update({
            install_year: installYear,
            install_source: 'user',
            confidence: 0.7, // Increased confidence with user input
          })
          .eq('id', state.hvac_system_id);

        // Update home confidence
        const newConfidence = Math.min(65, state.confidence + 25);
        await supabase
          .from('homes')
          .update({ confidence: newConfidence })
          .eq('id', state.home_id);

        // Update snapshot confidence
        await supabase
          .from('property_snapshot')
          .update({ confidence_score: newConfidence })
          .eq('home_id', state.home_id);
      }

      // Navigate to Home Pulse
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('[OnboardingFlow] Update error:', err);
      // Still navigate even if update fails
      navigate('/dashboard', { replace: true });
    }
  };

  // Skip HVAC question
  const handleSkip = () => {
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
                Let's pull up your home
              </h1>
              <p className="text-muted-foreground">
                Start typing your address below
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

            <p className="text-xs text-center text-muted-foreground">
              We'll use this to find information about your home's systems
            </p>
          </div>
        )}

        {/* Step: Instant Snapshot */}
        {step === 'snapshot' && state.snapshot && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Here's what we know
              </h1>
              <p className="text-muted-foreground">
                This is based on available public data
              </p>
            </div>

            <InstantSnapshot
              snapshot={state.snapshot}
              confidence={state.confidence}
              isEnriching={state.isEnriching}
            />

            <Button
              onClick={() => setStep('hvac')}
              className="w-full h-12 text-base"
              size="lg"
            >
              One quick question
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step: HVAC Age Question */}
        {step === 'hvac' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <button
              onClick={() => setStep('snapshot')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                How old is your A/C?
              </h1>
              <p className="text-muted-foreground">
                This helps us estimate your A/C health
              </p>
            </div>

            <HVACAgePicker
              onSelect={handleHVACAnswer}
              selectedValue={state.hvacAgeBand}
            />

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="flex-1 h-12"
                disabled={isLoading}
              >
                Skip
              </Button>
              <Button
                onClick={handleContinueToHomePulse}
                className="flex-1 h-12"
                disabled={isLoading || !state.hvacAgeBand}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Continue'
                )}
              </Button>
            </div>

            {state.hvacAgeBand && state.hvacAgeBand !== 'unknown' && (
              <p className="text-xs text-center text-muted-foreground">
                Your confidence score will increase to ~{Math.min(65, state.confidence + 25)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
