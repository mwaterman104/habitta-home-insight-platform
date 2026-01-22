import { CheckCircle2, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CapitalOutlookCard } from "@/components/CapitalOutlookCard";
import { PerformanceGlance } from "./PerformanceGlance";
import type { SystemPrediction, HomeForecast } from "@/types/systemPrediction";
import type { HomeCapitalTimeline } from "@/types/capitalTimeline";

interface RightColumnProps {
  homeForecast: HomeForecast | null;
  hvacPrediction: SystemPrediction | null;
  capitalTimeline: HomeCapitalTimeline | null;
  loading: boolean;
}

/**
 * RightColumn - "Am I okay?" Performance at a Glance
 * 
 * Since chat is latent, the right column must:
 * - Carry reassurance
 * - Show system status clearly
 * - Answer "Am I okay?" at a glance
 * 
 * This is where green/yellow/red and "Nothing urgent" do the emotional work.
 */
export function RightColumn({
  homeForecast,
  hvacPrediction,
  capitalTimeline,
  loading,
}: RightColumnProps) {
  // Get current quarter
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance at a Glance */}
      <PerformanceGlance
        homeForecast={homeForecast}
        hvacPrediction={hvacPrediction}
        capitalTimeline={capitalTimeline}
        quarter={currentQuarter}
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Total Home Health
            </p>
            <p className="text-3xl font-bold text-foreground">
              {homeForecast?.currentScore || 82}
            </p>
            {homeForecast && homeForecast.currentScore > homeForecast.ifLeftUntracked.score12mo && (
              <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>Protected</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Projected Capital
            </p>
            <p className="text-2xl font-bold text-foreground">
              {capitalTimeline?.capitalOutlook?.horizons?.find(h => h.yearsAhead === 10)?.lowEstimate 
                ? `$${Math.round((capitalTimeline.capitalOutlook.horizons.find(h => h.yearsAhead === 10)?.lowEstimate || 0) / 1000)}k`
                : '$25k'}
            </p>
            <p className="text-xs text-muted-foreground">over 10 years</p>
          </CardContent>
        </Card>
      </div>

      {/* Capital Outlook Card */}
      {capitalTimeline?.capitalOutlook && (
        <CapitalOutlookCard outlook={capitalTimeline.capitalOutlook} />
      )}

      {/* Location/Weather Summary (placeholder for map) */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Local Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Weather & climate monitoring active
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Habitta continuously monitors local conditions that affect your home systems.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
