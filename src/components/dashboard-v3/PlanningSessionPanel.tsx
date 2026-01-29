/**
 * PlanningSessionPanel - Full Planning Session UI
 * 
 * SESSION PERSISTENCE CONTRACT:
 * - User can leave and return to same briefing
 * - Messages stored in interventions table, not regenerated
 * - 24hr timeout on stale sessions
 * 
 * SESSION EXIT CONTRACT:
 * - Transaction must succeed before closing
 * - If write fails → show error, keep session open
 * - NO comforting language without successful save
 */

import { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePlanningSession } from '@/hooks/usePlanningSession';
import { getSessionOpeningLine } from '@/lib/sessionCopy';
import type { DecisionType, TriggerReason } from '@/types/intervention';

interface PlanningSessionPanelProps {
  interventionId?: string;
  homeId: string;
  systemId: string;
  systemName: string;
  triggerReason: TriggerReason;
  onClose: () => void;
  onDecisionMade?: (decision: DecisionType) => void;
}

export function PlanningSessionPanel({
  interventionId,
  homeId,
  systemId,
  systemName,
  triggerReason,
  onClose,
  onDecisionMade,
}: PlanningSessionPanelProps) {
  const [input, setInput] = useState('');
  
  const {
    intervention,
    messages,
    loading,
    error,
    sendMessage,
    recordDecision,
    closeSession,
  } = usePlanningSession({ interventionId, autoLoad: true });

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDecision = async (decisionType: DecisionType) => {
    const result = await recordDecision(decisionType, {
      assumptionsJson: { homeId, systemId },
    });
    
    if (result) {
      onDecisionMade?.(decisionType);
      onClose();
    }
    // Error handling is done by the hook - keeps session open on failure
  };

  const handleClose = async () => {
    // Close without decision - this is tracked separately
    await closeSession('closed_without_decision');
    onClose();
  };

  // Opening line based on trigger reason
  const openingLine = getSessionOpeningLine(triggerReason, systemName);

  return (
    <Card className="flex flex-col h-full border-l border-border/40 shadow-lg">
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Planning Session — {systemName}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Error state */}
        {error && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {/* Opening message (always shown first) */}
            {messages.length === 0 && (
              <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-foreground">
                {openingLine}
              </div>
            )}

            {/* Persisted messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-4 py-2.5 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-foreground"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/40 rounded-lg px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Decision Actions */}
        <div className="px-4 py-3 border-t space-y-3 shrink-0">
          <div className="text-xs text-muted-foreground mb-2">
            When you're ready:
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDecision('get_quotes')}
              disabled={loading}
            >
              Get quotes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDecision('schedule_inspection')}
              disabled={loading}
            >
              Schedule inspection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDecision('defer_with_date')}
              disabled={loading}
            >
              Defer for now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => handleDecision('no_action')}
              disabled={loading}
            >
              I'll handle this
            </Button>
          </div>
        </div>

        {/* Chat Input */}
        <div className="px-4 py-3 border-t shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about this..."
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
