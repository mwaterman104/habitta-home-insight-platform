import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Calendar, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  getApplianceTier, 
  calculateApplianceStatus,
  APPLIANCE_ICONS
} from "@/lib/applianceTiers";

interface SystemCatalogData {
  key: string;
  display_name: string;
  typical_lifespan_years: number;
  appliance_tier: number;
  maintenance_checks?: string[];
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
  images?: string[] | unknown;
  notes?: string;
  system_catalog: SystemCatalogData | null;
}

interface ApplianceDetailViewProps {
  appliance: ApplianceData;
  onBack?: () => void;
}

/**
 * ApplianceDetailView - Detail page for tracked appliances
 * 
 * Tier-aware rendering:
 * - Tier 1: Shows full planning outlook with remaining years
 * - Tier 2: Shows muted disclaimer, no health impact messaging
 */
export function ApplianceDetailView({ appliance, onBack }: ApplianceDetailViewProps) {
  const navigate = useNavigate();
  const tier = appliance.system_catalog?.appliance_tier ?? getApplianceTier(appliance.system_key);
  const typicalLifespan = appliance.system_catalog?.typical_lifespan_years ?? 12;
  
  // Safely extract first image
  const firstImage = Array.isArray(appliance.images) && appliance.images.length > 0 
    ? appliance.images[0] as string 
    : null;
  
  const currentYear = new Date().getFullYear();
  const ageYears = appliance.manufacture_year 
    ? currentYear - appliance.manufacture_year 
    : null;
  const remainingYears = ageYears !== null 
    ? Math.max(0, typicalLifespan - ageYears) 
    : null;
  
  const status = calculateApplianceStatus(ageYears, typicalLifespan);
  
  // Get base key for icon lookup (strip unique suffix)
  const baseKey = appliance.system_key.split('_')[0];
  const fullBaseKey = appliance.system_key.includes('oven') ? 'oven_range' : baseKey;
  const icon = APPLIANCE_ICONS[fullBaseKey as keyof typeof APPLIANCE_ICONS] || '🔧';
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/systems');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'healthy':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Healthy
          </Badge>
        );
      case 'planning':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Planning
          </Badge>
        );
      case 'attention':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Attention
          </Badge>
        );
    }
  };

  // Parse maintenance checks from system catalog
  const maintenanceChecks: string[] = (() => {
    const checks = appliance.system_catalog?.maintenance_checks;
    if (!checks) return [];
    if (Array.isArray(checks)) return checks;
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

      {/* Header with photo */}
      <div className="flex gap-4 mb-6">
        {firstImage ? (
          <img 
            src={firstImage} 
            alt={appliance.system_catalog?.display_name || 'Appliance'} 
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
              <h1 className="text-xl font-semibold">
                {appliance.brand ? `${appliance.brand} ` : ''}
                {appliance.system_catalog?.display_name || 'Appliance'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {appliance.model || 'Model unknown'}
              </p>
            </div>
            {tier === 1 && getStatusBadge()}
          </div>
          {tier === 2 && (
            <Badge variant="outline" className="mt-2 text-muted-foreground">
              Tracked (low-impact)
            </Badge>
          )}
        </div>
      </div>

      {/* Tier 1: Planning Outlook Card */}
      {tier === 1 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Planning Outlook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-bold">
                  {remainingYears !== null ? `~${remainingYears} years` : 'Unknown'}
                </p>
                <p className="text-sm text-muted-foreground">
                  estimated remaining
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg">
                  {ageYears !== null ? `${ageYears} years old` : 'Age unknown'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Typical lifespan: {typicalLifespan} years
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier 2: Disclaimer Card */}
      {tier === 2 && (
        <Card className="mb-6 border-dashed">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              I'll keep an eye on this, but it won't affect your home's outlook.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Details</CardTitle>
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
          {appliance.manufacture_year && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Manufacture Year</span>
              <span className="text-sm font-medium">{appliance.manufacture_year}</span>
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
        </CardContent>
      </Card>

      {/* Maintenance Tips */}
      {maintenanceChecks.length > 0 && (
        <Card>
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
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{appliance.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
