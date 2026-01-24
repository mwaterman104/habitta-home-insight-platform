import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Wrench, HelpCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  resolveApplianceIdentity,
  type ResolvedApplianceIdentity,
} from "@/lib/resolveApplianceIdentity";
import { 
  APPLIANCE_ICONS
} from "@/lib/applianceTiers";
import { Json } from "@/integrations/supabase/types";

interface SystemCatalogData {
  key: string;
  display_name: string;
  typical_lifespan_years: number;
  appliance_tier: number;
  maintenance_checks?: unknown; // Json type from Supabase, parsed safely at runtime
}

interface ApplianceData {
  id: string;
  home_id: string;
  system_key: string;
  brand?: string;
  model?: string;
  serial?: string;
  manufacture_year?: number;
  install_date?: string;
  last_service_date?: string;
  images?: Json | null;
  notes?: string;
  confidence_scores?: Json | null; // Json from Supabase, cast at runtime
  source?: Json | null;
  system_catalog: SystemCatalogData | null;
}

interface ApplianceDetailViewProps {
  appliance: ApplianceData;
  onBack?: () => void;
  onHelpHabittta?: () => void; // Opens TeachHabittaModal in correction mode
  onDelete?: (id: string) => Promise<void>; // Delete handler
}

/**
 * ApplianceDetailView - Detail page for tracked appliances
 * 
 * Uses resolveApplianceIdentity to compose raw data into meaning.
 * The UI never renders raw fields directly.
 * 
 * Tier-aware rendering:
 * - Tier 1: Shows Health & Planning with lifespan framing
 * - Tier 2: Shows muted disclaimer, no planning messaging
 */
export function ApplianceDetailView({ 
  appliance, 
  onBack,
  onHelpHabittta,
  onDelete,
}: ApplianceDetailViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  
  // Safely extract first image
  const firstImage = Array.isArray(appliance.images) && appliance.images.length > 0 
    ? appliance.images[0] as string 
    : null;
  
  // Get base key for icon lookup
  const baseKey = appliance.system_key.split('_')[0];
  const fullBaseKey = appliance.system_key.includes('oven') ? 'oven_range' : baseKey;
  const icon = APPLIANCE_ICONS[fullBaseKey as keyof typeof APPLIANCE_ICONS] || '🔧';
  
  // === RESOLVE IDENTITY (The Sacred Pattern) ===
  const catalogInput = appliance.system_catalog ? {
    key: appliance.system_catalog.key,
    display_name: appliance.system_catalog.display_name,
    typical_lifespan_years: appliance.system_catalog.typical_lifespan_years,
    appliance_tier: appliance.system_catalog.appliance_tier,
  } : null;
  
  // Safely parse confidence_scores from Json
  const confidenceScores = (
    appliance.confidence_scores && 
    typeof appliance.confidence_scores === 'object' &&
    !Array.isArray(appliance.confidence_scores)
  ) ? appliance.confidence_scores as Record<string, number> : null;
  
  // Safely parse source from Json
  const sourceData = (
    appliance.source && 
    typeof appliance.source === 'object' &&
    !Array.isArray(appliance.source)
  ) ? appliance.source as { install_source?: string } : null;
  
  const identity: ResolvedApplianceIdentity = resolveApplianceIdentity(
    {
      brand: appliance.brand,
      model: appliance.model,
      manufacture_year: appliance.manufacture_year,
      confidence_scores: confidenceScores,
      source: sourceData,
    },
    catalogInput
  );
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/systems');
    }
  };
  
  const handleHelpHabittta = () => {
    if (onHelpHabittta) {
      onHelpHabittta();
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(appliance.id);
      // Navigate back after successful deletion
      handleBack();
    } catch (error) {
      console.error('Failed to delete appliance:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Parse maintenance checks from system catalog
  const maintenanceChecks: string[] = (() => {
    const checks = appliance.system_catalog?.maintenance_checks;
    if (!checks) return [];
    if (Array.isArray(checks)) return checks as string[];
    if (typeof checks === 'string') {
      try {
        return JSON.parse(checks);
      } catch {
        return [];
      }
    }
    return [];
  })();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground"
        onClick={handleBack}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Header with photo - Uses Resolved Identity */}
      <div className="flex gap-4 mb-6">
        {firstImage ? (
          <img 
            src={firstImage} 
            alt={identity.title} 
            className="w-24 h-24 rounded-xl object-cover border"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center text-3xl">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              {/* Composed title with inline confidence label */}
              <h1 className="text-xl font-semibold">
                {identity.title}
                {identity.confidenceLabel && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    · {identity.confidenceLabel}
                  </span>
                )}
              </h1>
              {/* Subtitle (model) */}
              <p className="text-muted-foreground text-sm">
                {identity.subtitle}
              </p>
              {/* Age label */}
              {identity.ageLabel && (
                <p className="text-muted-foreground text-sm">
                  {identity.ageLabel}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tier 1: Health & Planning Card */}
      {identity.tier === 1 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Health & Planning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {identity.planningLabel && (
              <p className="text-lg font-medium">{identity.planningLabel}</p>
            )}
            {identity.lifespanLabel && (
              <p className="text-sm text-muted-foreground">
                {identity.lifespanLabel}
              </p>
            )}
            {!identity.planningLabel && !identity.lifespanLabel && (
              <p className="text-sm text-muted-foreground">
                Not enough information to estimate planning outlook yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tier 2: Disclaimer Card */}
      {identity.tier === 2 && (
        <Card className="mb-6 border-dashed">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              I'll keep an eye on this, but it won't affect your home's outlook.
            </p>
          </CardContent>
        </Card>
      )}

      {/* What I know about this appliance (renamed from "Details") */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What I know about this appliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appliance.brand && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Brand</span>
              <span className="text-sm font-medium">{appliance.brand}</span>
            </div>
          )}
          {appliance.model && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Model</span>
              <span className="text-sm font-medium">{appliance.model}</span>
            </div>
          )}
          {appliance.serial && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Serial</span>
              <span className="text-sm font-medium font-mono text-xs">{appliance.serial}</span>
            </div>
          )}
          {identity.ageLabel && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Estimated age</span>
              <span className="text-sm font-medium">{identity.ageLabel}</span>
            </div>
          )}
          {identity.lifespanLabel && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Typical lifespan</span>
              <span className="text-sm font-medium">{identity.lifespanLabel.replace('Typical lifespan: ', '')}</span>
            </div>
          )}
          {appliance.install_date && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Installed</span>
              <span className="text-sm font-medium">
                {new Date(appliance.install_date).toLocaleDateString()}
              </span>
            </div>
          )}
          {appliance.last_service_date && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Service</span>
              <span className="text-sm font-medium">
                {new Date(appliance.last_service_date).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {/* Sparse state message */}
          {!appliance.brand && !appliance.model && (
            <p className="text-sm text-muted-foreground pt-2 border-t">
              I'm still learning — rough details are okay.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confidence & Help CTA (only if not high confidence) */}
      {identity.showHelpCTA && (
        <Card className="mb-6 border-dashed">
          <CardContent className="py-4 space-y-3">
            {identity.helperMessage && (
              <p className="text-sm text-muted-foreground">
                {identity.helperMessage}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleHelpHabittta}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Help Habitta learn more
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Tips */}
      {maintenanceChecks.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Maintenance Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {maintenanceChecks.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {appliance.notes && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{appliance.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Action */}
      {onDelete && (
        <div className="pt-6 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove this appliance
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {identity.title}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will stop tracking this appliance. You can always add it again later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
