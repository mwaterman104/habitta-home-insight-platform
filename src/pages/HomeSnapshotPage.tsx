/**
 * HomeSnapshotPage — Post-onboarding bridge & durable record snapshot
 * 
 * Route: /home-snapshot
 * Durable: re-viewable from Settings, not a throwaway artifact.
 * 
 * Sections:
 * 1. Header — "Your Home Profile Record has been created."
 * 2. Summary — HomeProfileRecordBar + explanatory copy
 * 3. Breakdown — What's Confirmed / What We're Estimating / What Strengthens the Record
 * 4. CTA — "Go to Home Pulse" (or "Back to Home Pulse" on revisit)
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserHome } from '@/hooks/useUserHome';
import { useCapitalTimeline } from '@/hooks/useCapitalTimeline';
import { useHomeConfidence } from '@/hooks/useHomeConfidence';
import { HomeProfileRecordBar, getStrengthLevel } from '@/components/home-profile/HomeProfileRecordBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, BarChart3, Plus, Loader2 } from 'lucide-react';

const SNAPSHOT_KEY = 'habitta_has_seen_snapshot';

export default function HomeSnapshotPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userHome: home, loading: homeLoading } = useUserHome();

  const { timeline, loading: timelineLoading } = useCapitalTimeline({
    homeId: home?.id,
    enabled: !!home?.id,
  });

  const { confidence, loading: confidenceLoading } = useHomeConfidence(
    home?.id,
    timeline?.systems || [],
    home?.year_built
  );

  const hasSeen = !!localStorage.getItem(SNAPSHOT_KEY);
  const loading = homeLoading || timelineLoading || confidenceLoading;

  const handleContinue = () => {
    localStorage.setItem(SNAPSHOT_KEY, 'true');
    navigate('/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const systems = timeline?.systems || [];
  const score = confidence?.score ?? 0;
  const strengthLevel = getStrengthLevel(score);

  // Provenance-based classification
  const yearBuilt = home?.year_built;
  const confirmedFacts: string[] = [];
  if (home?.address) confirmedFacts.push(`Address: ${home.address}, ${home.city}, ${home.state}`);
  if (yearBuilt) confirmedFacts.push(`Year built: ${yearBuilt}`);
  if (systems.length > 0) confirmedFacts.push(`${systems.length} system${systems.length === 1 ? '' : 's'} identified`);

  // Estimates — systems with inferred data
  const estimatedFacts: string[] = [];
  const inferredSystems = systems.filter(s => s.installSource === 'inferred' || !s.installSource);
  if (inferredSystems.length > 0) {
    estimatedFacts.push(`${inferredSystems.length} system${inferredSystems.length === 1 ? '' : 's'} with estimated service windows`);
  }
  const hasLifecycleModel = systems.length > 0;
  if (hasLifecycleModel) {
    estimatedFacts.push('Lifecycle estimates based on regional data and typical lifespans');
  }

  // What strengthens the record
  const missingInstallDates = systems.filter(s => !s.installYear).length;
  const missingPhotos = systems.length; // Conservative: assume no photo evidence until verified

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Your Home Profile Record has been created.
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            We established an initial baseline using public records and regional lifecycle data.
          </p>
        </div>

        {/* Summary */}
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-3">
            <HomeProfileRecordBar strengthScore={score} strengthLevel={strengthLevel} />
            <p className="text-sm text-muted-foreground">
              Strength increases as you confirm documentation (photos, install dates, service records).
            </p>
          </CardContent>
        </Card>

        {/* Breakdown */}
        <div className="space-y-8">
          {/* What's Confirmed */}
          {confirmedFacts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-habitta-olive" />
                What's Confirmed
              </h2>
              <ul className="space-y-2">
                {confirmedFacts.map((fact, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-habitta-olive mt-0.5">•</span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What We're Estimating */}
          {estimatedFacts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-habitta-slate" />
                What We're Estimating
              </h2>
              <ul className="space-y-2">
                {estimatedFacts.map((fact, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-habitta-slate mt-0.5">•</span>
                    {fact}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground/70 italic">
                Estimates are based on available public records and typical regional lifecycles.
              </p>
            </div>
          )}

          {/* What Strengthens the Record */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-habitta-clay" />
              What Strengthens the Record
            </h2>
            <ul className="space-y-2">
              {missingInstallDates > 0 && (
                <li className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-habitta-clay mt-0.5">•</span>
                  {missingInstallDates} system{missingInstallDates === 1 ? '' : 's'} missing install dates
                </li>
              )}
              {missingPhotos > 0 && (
                <li className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-habitta-clay mt-0.5">•</span>
                  {missingPhotos} system{missingPhotos === 1 ? '' : 's'} without photo documentation
                </li>
              )}
              <li className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-habitta-clay mt-0.5">•</span>
                Service records and permits strengthen planning accuracy
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Button size="lg" onClick={handleContinue} className="w-full sm:w-auto">
            {hasSeen ? 'Back to Home Pulse' : 'Go to Home Pulse'}
          </Button>
        </div>
      </div>
    </div>
  );
}
