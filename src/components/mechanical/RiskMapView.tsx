import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, Info } from 'lucide-react';
import { type PermitRecord } from '@/lib/mechanicalIntelligence';
import { cn } from '@/lib/utils';

interface RiskMapViewProps {
  records: PermitRecord[];
  className?: string;
}

// Simulated geocoding based on address patterns (for demo)
// In production, this would use Google Maps Geocoding API
function simulateCoordinates(address: string, index: number): { lat: number; lng: number } {
  // Miami-Dade approximate bounds
  const baseLat = 25.7617;
  const baseLng = -80.1918;
  
  // Create pseudo-random but deterministic offsets based on address
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 100) - 50) * 0.002;
  const lngOffset = ((hash % 73) - 36) * 0.003;
  
  return {
    lat: baseLat + latOffset + (index * 0.001),
    lng: baseLng + lngOffset + (index * 0.0015),
  };
}

const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export function RiskMapView({ records, className }: RiskMapViewProps) {
  const recordsWithCoords = useMemo(() => 
    records.map((record, i) => ({
      ...record,
      coords: record.latitude && record.longitude 
        ? { lat: record.latitude, lng: record.longitude }
        : simulateCoordinates(record.address, i),
    })),
    [records]
  );

  const clusters = useMemo(() => {
    // Group high-risk records into clusters
    const highRisk = recordsWithCoords.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high');
    
    // Simple grid-based clustering
    const gridSize = 0.01; // ~1km
    const clusterMap = new Map<string, typeof highRisk>();
    
    highRisk.forEach(record => {
      const key = `${Math.floor(record.coords.lat / gridSize)},${Math.floor(record.coords.lng / gridSize)}`;
      if (!clusterMap.has(key)) clusterMap.set(key, []);
      clusterMap.get(key)!.push(record);
    });
    
    return Array.from(clusterMap.entries())
      .filter(([, recs]) => recs.length >= 2)
      .map(([key, recs]) => ({
        id: key,
        count: recs.length,
        lat: recs.reduce((sum, r) => sum + r.coords.lat, 0) / recs.length,
        lng: recs.reduce((sum, r) => sum + r.coords.lng, 0) / recs.length,
        records: recs,
      }));
  }, [recordsWithCoords]);

  const stats = useMemo(() => ({
    critical: records.filter(r => r.riskLevel === 'critical').length,
    high: records.filter(r => r.riskLevel === 'high').length,
    clusters: clusters.length,
  }), [records, clusters]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    if (recordsWithCoords.length === 0) return { minLat: 25.7, maxLat: 25.85, minLng: -80.3, maxLng: -80.1 };
    
    const lats = recordsWithCoords.map(r => r.coords.lat);
    const lngs = recordsWithCoords.map(r => r.coords.lng);
    
    return {
      minLat: Math.min(...lats) - 0.01,
      maxLat: Math.max(...lats) + 0.01,
      minLng: Math.min(...lngs) - 0.01,
      maxLng: Math.max(...lngs) + 0.01,
    };
  }, [recordsWithCoords]);

  // Convert coordinates to SVG positions
  const coordToPos = (lat: number, lng: number) => ({
    x: ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100,
    y: ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100,
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Risk Cluster Map
          </CardTitle>
          
          <div className="flex flex-wrap gap-2">
            {stats.clusters > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stats.clusters} High-Risk Clusters
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {records.length === 0 ? (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Upload permit data to see risk clusters</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple SVG Map Visualization */}
            <div className="relative aspect-video bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg overflow-hidden border">
              {/* Grid lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {[20, 40, 60, 80].map(v => (
                  <g key={v}>
                    <line x1={v} y1={0} x2={v} y2={100} stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.2} />
                    <line x1={0} y1={v} x2={100} y2={v} stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.2} />
                  </g>
                ))}
              </svg>
              
              {/* Plot points */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {recordsWithCoords.map(record => {
                  const pos = coordToPos(record.coords.lat, record.coords.lng);
                  const size = record.riskLevel === 'critical' ? 2.5 : record.riskLevel === 'high' ? 2 : 1.5;
                  return (
                    <circle
                      key={record.id}
                      cx={pos.x}
                      cy={pos.y}
                      r={size}
                      fill={RISK_COLORS[record.riskLevel]}
                      opacity={0.7}
                      className="transition-all hover:opacity-100"
                    />
                  );
                })}
                
                {/* Cluster indicators */}
                {clusters.map(cluster => {
                  const pos = coordToPos(cluster.lat, cluster.lng);
                  return (
                    <g key={cluster.id}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={6}
                        fill="none"
                        stroke={RISK_COLORS.critical}
                        strokeWidth={0.5}
                        strokeDasharray="1,1"
                        className="animate-pulse"
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 0.8}
                        textAnchor="middle"
                        fontSize={3}
                        fill={RISK_COLORS.critical}
                        fontWeight="bold"
                      >
                        {cluster.count}
                      </text>
                    </g>
                  );
                })}
              </svg>
              
              {/* Map label */}
              <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
                Miami-Dade County • {records.length} permits
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              {Object.entries(RISK_COLORS).map(([level, color]) => (
                <div key={level} className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="capitalize">{level}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-red-500 flex items-center justify-center text-[8px] text-red-500 font-bold">
                  N
                </div>
                <span>Cluster (N units)</span>
              </div>
            </div>
            
            {/* Cluster details */}
            {clusters.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800 dark:text-red-200">
                      {clusters.length} High-Risk Cluster{clusters.length > 1 ? 's' : ''} Detected
                    </p>
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                      {clusters.reduce((sum, c) => sum + c.count, 0)} properties with elevated failure risk 
                      are geographically concentrated. Consider targeted outreach campaigns.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Info note about map */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Map coordinates are approximated from address data. For precise geolocation, 
                integrate with Google Maps Geocoding API using folio numbers.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
