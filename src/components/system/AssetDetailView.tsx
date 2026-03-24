import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { APPLIANCE_ICONS, type ApplianceKey } from "@/lib/applianceTiers";

interface HomeAsset {
  id: string;
  kind: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  confidence: number;
  source: string;
  status: string;
  install_date: string | null;
  created_at: string;
}

interface AssetDetailViewProps {
  asset: HomeAsset;
  onBack?: () => void;
}

function getAssetIcon(kind: string, category: string): string {
  const normalized = kind.toLowerCase();
  if (APPLIANCE_ICONS[normalized as ApplianceKey]) {
    return APPLIANCE_ICONS[normalized as ApplianceKey];
  }
  if (category === 'appliance') return '🔌';
  if (category === 'system' || category === 'structural') return '🏠';
  return '❓';
}

function formatKind(kind: string): string {
  return kind
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getSourceLabel(source: string): string {
  if (source.includes('chat')) return 'Via chat';
  if (source.includes('photo')) return 'Via photo';
  return 'Discovered';
}

/**
 * AssetDetailView - Detail page for discovered assets (from home_assets).
 * Simplified view compared to ApplianceDetailView since these have less data.
 */
export function AssetDetailView({ asset, onBack }: AssetDetailViewProps) {
  const navigate = useNavigate();
  const icon = getAssetIcon(asset.kind, asset.category);
  const title = formatKind(asset.kind);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/systems');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground"
        onClick={handleBack}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Header */}
      <div className="flex gap-4 mb-6">
        <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center text-3xl border-dashed border-2">
          {icon}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{title}</h1>
          {asset.manufacturer && (
            <p className="text-muted-foreground text-sm">{asset.manufacturer}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <ConfidenceBadge confidence={asset.confidence} source={asset.source} />
            <span className="text-xs text-muted-foreground">{getSourceLabel(asset.source)}</span>
          </div>
        </div>
      </div>

      {/* What I know */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What I know about this</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Category</span>
            <span className="text-sm font-medium capitalize">{asset.category}</span>
          </div>
          {asset.manufacturer && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Manufacturer</span>
              <span className="text-sm font-medium">{asset.manufacturer}</span>
            </div>
          )}
          {asset.model && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Model</span>
              <span className="text-sm font-medium">{asset.model}</span>
            </div>
          )}
          {asset.install_date && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Installed</span>
              <span className="text-sm font-medium">
                {new Date(asset.install_date).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Discovered</span>
            <span className="text-sm font-medium">
              {new Date(asset.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Enrich CTA */}
      <Card className="mb-6 border-dashed">
        <CardContent className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            I discovered this recently but don't have all the details yet. Help me learn more so I can track it better.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/systems')}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Help Habitta learn more
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
