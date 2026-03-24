import { Badge } from '@/components/ui/badge';
import type { ReportAsset } from '@/hooks/useHomeReport';
import { getConfidenceLabel, getConfidenceVariant } from '@/hooks/useHomeReport';
import { format, parseISO } from 'date-fns';

interface AssetInventorySectionProps {
  coreSystems: ReportAsset[];
  appliances: ReportAsset[];
}

function AssetRow({ asset }: { asset: ReportAsset }) {
  const installDisplay = asset.installDate
    ? format(parseISO(asset.installDate), 'yyyy')
    : null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium system-name text-foreground truncate">
          {asset.kind}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {[asset.manufacturer, asset.model].filter(Boolean).join(' · ') ||
            (asset.isSupplemental ? 'Estimated from public data' : 'Details not yet documented')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {installDisplay && (
          <span className="text-xs text-muted-foreground">~{installDisplay}</span>
        )}
        <Badge variant={getConfidenceVariant(asset.confidence)} className="text-xs whitespace-nowrap">
          {getConfidenceLabel(asset.confidence)}
        </Badge>
      </div>
    </div>
  );
}

export function AssetInventorySection({
  coreSystems,
  appliances,
}: AssetInventorySectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="heading-h3 text-foreground">Asset Inventory</h2>

      {/* Core Systems */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-label text-muted-foreground mb-2 uppercase tracking-wide">
          Core Systems
        </h3>
        {coreSystems.length > 0 ? (
          coreSystems.map((asset) => <AssetRow key={asset.id} asset={asset} />)
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No core systems documented yet. As you chat with Habitta, systems
            will be discovered and recorded here.
          </p>
        )}
      </div>

      {/* Appliances */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-label text-muted-foreground mb-2 uppercase tracking-wide">
          Appliances
        </h3>
        {appliances.length > 0 ? (
          appliances.map((asset) => <AssetRow key={asset.id} asset={asset} />)
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No appliances documented yet.
          </p>
        )}
      </div>
    </section>
  );
}
