/**
 * Inline Artifact Container
 * 
 * ARTIFACT BEHAVIORAL CONTRACT:
 * 1. "This artifact does not explain itself. The chat explains why it exists."
 * 2. "The artifact proves the chat earned the right to speak."
 * 3. "It doesn't live anywhere. It was brought here."
 * 
 * CANONICAL DOCTRINE:
 * - Artifacts are subordinate to language
 * - They must be collapsible
 * - They must be dismissible
 * - They have calm styling (no shadows, no urgency)
 * 
 * NO IMPLICIT AFFORDANCES:
 * - NO info icons
 * - NO question marks
 * - NO hover hints
 * - NO "Why?" buttons inside artifact
 * - Only collapse and dismiss are interactive
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatArtifact } from '@/types/chatArtifact';
import { SystemTimelineArtifact } from './SystemTimelineArtifact';
import { SystemAgingProfileArtifact } from './SystemAgingProfileArtifact';

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
      // Looks like "an inserted document" not a dashboard widget
      "my-2 ml-6 rounded-lg border border-border/30 bg-muted/10 overflow-hidden",
      "transition-all duration-200"
    )}>
      {/* Header - always visible, minimal interactivity */}
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
    case 'system_aging_profile': return 'System Aging Profile';
    case 'comparison_table': return 'Options';
    case 'cost_range': return 'Cost Range';
    case 'confidence_explainer': return 'Confidence Detail';
    case 'local_context': return 'Local Context';
    default: return 'Detail';
  }
}

function renderArtifactContent(artifact: ChatArtifact) {
  switch (artifact.type) {
    case 'system_aging_profile':
      return <SystemAgingProfileArtifact data={artifact.data as any} />;
    case 'system_timeline':
      return <SystemTimelineArtifact data={artifact.data} />;
    case 'confidence_explainer':
      return <ConfidenceExplainerArtifact data={artifact.data} />;
    default:
      return <div className="text-sm text-muted-foreground">Content</div>;
  }
}

/** Simple confidence explainer - NO interactive affordances */
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
