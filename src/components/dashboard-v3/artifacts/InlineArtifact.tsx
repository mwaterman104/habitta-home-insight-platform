/**
 * Inline Artifact Container
 * 
 * CANONICAL DOCTRINE:
 * - Artifacts are subordinate to language
 * - They must be collapsible
 * - They must be dismissible
 * - They have calm styling (no shadows, no urgency)
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatArtifact } from '@/types/chatArtifact';
import { SystemTimelineArtifact } from './SystemTimelineArtifact';

interface InlineArtifactProps {
  artifact: ChatArtifact;
  /** REQUIRED: Artifact must be tied to a message */
  anchorMessageId: string;
  onCollapse: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function InlineArtifact({ 
  artifact, 
  anchorMessageId,
  onCollapse, 
  onDismiss 
}: InlineArtifactProps) {
  const [isCollapsed, setIsCollapsed] = useState(artifact.collapsed ?? false);
  
  // Verify anchor relationship (defensive)
  if (artifact.anchorMessageId !== anchorMessageId) {
    console.warn('Artifact anchor mismatch', { artifact, anchorMessageId });
    return null;
  }
  
  const handleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    onCollapse(artifact.id);
  };
  
  return (
    <div className={cn(
      "my-2 rounded-lg border border-border/30 bg-muted/10 overflow-hidden",
      "transition-all duration-200"
    )}>
      {/* Header - always visible */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
        <button 
          onClick={handleCollapse}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          <span>{getArtifactLabel(artifact.type)}</span>
        </button>
        <button 
          onClick={() => onDismiss(artifact.id)}
          className="hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      
      {/* Content - collapsible */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          {renderArtifactContent(artifact)}
        </div>
      )}
    </div>
  );
}

function getArtifactLabel(type: string): string {
  switch (type) {
    case 'system_timeline': return 'System Timeline';
    case 'comparison_table': return 'Options';
    case 'cost_range': return 'Cost Range';
    case 'confidence_explainer': return 'Confidence Detail';
    case 'local_context': return 'Local Context';
    default: return 'Detail';
  }
}

function renderArtifactContent(artifact: ChatArtifact) {
  switch (artifact.type) {
    case 'system_timeline':
      return <SystemTimelineArtifact data={artifact.data} />;
    case 'confidence_explainer':
      return <ConfidenceExplainerArtifact data={artifact.data} />;
    default:
      return <div className="text-sm text-muted-foreground">Content</div>;
  }
}

/** Simple confidence explainer */
function ConfidenceExplainerArtifact({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="text-sm space-y-1">
      <p className="text-muted-foreground">
        Based on: <span className="text-foreground">{String(data.source ?? 'available data')}</span>
      </p>
      {data.lastConfirmed && (
        <p className="text-muted-foreground text-xs">
          Last confirmed: {String(data.lastConfirmed)}
        </p>
      )}
    </div>
  );
}
