import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Check, Circle, HelpCircle } from 'lucide-react';
import { SystemData } from '@/hooks/useSystemsData';
import {
  InstallSource,
  ConfidenceLevel,
  normalizeInstallSource,
  getSourceLabel,
  formatInstallYearCell,
  confidenceLevelFromScore,
} from '@/lib/systemConfidence';

interface SystemProvenanceProps {
  systems: SystemData[];
  yearBuilt?: number;
  onEditSystem?: (systemId: string) => void;
}

/**
 * Get confidence badge styling (neutral colors, NOT risk colors)
 */
function getConfidenceBadgeClass(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'medium':
      return 'bg-slate-50 text-slate-600 border border-slate-200';
    case 'low':
      return 'bg-slate-50 text-slate-500 border border-dashed border-slate-300';
  }
}

/**
 * Get confidence icon
 */
function getConfidenceIcon(level: ConfidenceLevel): React.ReactNode {
  switch (level) {
    case 'high':
      return <Check className="h-3 w-3" />;
    case 'medium':
      return <Circle className="h-3 w-3" />;
    case 'low':
      return <HelpCircle className="h-3 w-3" />;
  }
}

/**
 * Format system kind to display name
 */
function formatSystemKind(kind: string): string {
  const displayNames: Record<string, string> = {
    hvac: 'HVAC',
    roof: 'Roof',
    water_heater: 'Water Heater',
    electrical: 'Electrical Panel',
    plumbing: 'Plumbing',
    foundation: 'Foundation',
    exterior: 'Exterior',
  };
  
  return displayNames[kind.toLowerCase()] || kind.charAt(0).toUpperCase() + kind.slice(1);
}

/**
 * SystemProvenance - Trust engine table showing system data sources
 * 
 * This is the credibility engine of the Home Profile.
 * Shows where Habitta's knowledge comes from and builds trust.
 * 
 * Design decisions:
 * - Neutral badge colors (slate), NOT traffic light colors
 * - Clear source labels (never raw DB values)
 * - Edit affordance for corrections
 * - No forecast language
 */
export const SystemProvenance: React.FC<SystemProvenanceProps> = ({
  systems,
  yearBuilt,
  onEditSystem,
}) => {
  if (!systems.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="heading-h3">System sources & confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No systems recorded yet</p>
            <p className="text-sm mt-1">Systems will appear here as Habitta learns about your home.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="heading-h3">System sources & confidence</CardTitle>
          <p className="text-meta text-muted-foreground">
            Habitta weighs source quality when generating forecasts and alerts.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>System</TableHead>
              <TableHead>Install Year</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="text-right">Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {systems.map((system) => {
              // Normalize source from DB value to canonical enum
              const source: InstallSource = normalizeInstallSource(
                (system as any).install_source || null
              );
              
              // Get replacement status
              const replacementStatus = (system as any).replacement_status || 'unknown';
              
              // Calculate confidence level from score
              const confidenceLevel = confidenceLevelFromScore(system.confidence);
              
              // Format install year with proper edge cases
              const { display: yearDisplay, tooltip: yearTooltip } = formatInstallYearCell(
                system.install_year || null,
                source,
                replacementStatus
              );
              
              return (
                <TableRow key={system.id}>
                  {/* System Name - Serif emphasis */}
                  <TableCell className="system-name font-medium">
                    {formatSystemKind(system.kind)}
                  </TableCell>
                  
                  {/* Install Year with tooltip for conflicts */}
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={yearTooltip ? 'cursor-help border-b border-dashed border-muted-foreground' : ''}>
                            {yearDisplay}
                          </span>
                        </TooltipTrigger>
                        {yearTooltip && (
                          <TooltipContent>
                            <p>{yearTooltip}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  
                  {/* Source - Human readable label, never raw DB value */}
                  <TableCell>
                    <span className="text-muted-foreground">
                      {getSourceLabel(source)}
                    </span>
                  </TableCell>
                  
                  {/* Confidence - Neutral styling, not risk colors */}
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`gap-1 ${getConfidenceBadgeClass(confidenceLevel)}`}
                    >
                      {getConfidenceIcon(confidenceLevel)}
                      {confidenceLevel === 'high' ? 'High' : 
                       confidenceLevel === 'medium' ? 'Moderate' : 'Low'}
                    </Badge>
                  </TableCell>
                  
                  {/* Edit affordance */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditSystem?.(system.id)}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit {formatSystemKind(system.kind)}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
