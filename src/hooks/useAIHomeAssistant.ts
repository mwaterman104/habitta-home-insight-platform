/**
 * AI Home Assistant Hook
 * 
 * ARTIFACT BEHAVIORAL CONTRACT:
 * Messages may have attached artifacts (only if chat earned it).
 * Artifacts are coupled to specific messages via anchorMessageId.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AdvisorState, RiskLevel } from '@/types/advisorState';
import type { ChatMode, BaselineSource, VisibleBaselineSystem } from '@/types/chatMode';
import type { ChatArtifact } from '@/types/chatArtifact';

const MAX_PERSISTED_MESSAGES = 200;
const PERSIST_DEBOUNCE_MS = 500;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  functionCall?: any;
  /** Raw function result for UI refresh detection */
  functionResult?: string;
  suggestions?: string[];
  /** Attached artifact (only if chat earned it) */
  attachedArtifact?: ChatArtifact;
}

export interface AssistantResponse {
  message: string;
  functionCall?: any;
  functionResult?: string;
  suggestions?: string[];
  focus?: any; // FocusState metadata from AI response
}

interface UseAIHomeAssistantOptions {
  advisorState?: AdvisorState;
  confidence?: number;
  risk?: RiskLevel;
  focusSystem?: string;
  /** Chat mode for epistemic-aware responses */
  chatMode?: ChatMode;
  /** Baseline source for epistemic coherence */
  baselineSource?: BaselineSource;
  /** Visible baseline systems for AI context */
  visibleBaseline?: VisibleBaselineSystem[];
  /** Current right-column focus state (for focus continuity) */
  activeFocus?: any;
}

export const useAIHomeAssistant = (propertyId?: string, options: UseAIHomeAssistantOptions = {}) => {
  const { 
    advisorState = 'ENGAGED', 
    confidence = 0.5, 
    risk = 'LOW', 
    focusSystem, 
    chatMode = 'observational',
    baselineSource,
    visibleBaseline,
    activeFocus,
  } = options;
  
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  
  // Track previous propertyId to detect switches
  const prevPropertyIdRef = useRef(propertyId);
  // Track last persisted count to avoid unnecessary writes
  const lastPersistedCountRef = useRef(0);
  // Debounce timer for persistence
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore messages from database when propertyId becomes available
  useEffect(() => {
    if (!propertyId || !user) {
      setIsRestoring(false);
      return;
    }
    
    let cancelled = false;
    
    const restore = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('home_chat_sessions')
          .select('messages, message_count')
          .eq('user_id', user.id)
          .eq('home_id', propertyId)
          .maybeSingle();
        
        if (cancelled) return;
        
        if (fetchError) {
          console.error('Failed to restore chat history:', fetchError);
        } else if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages as unknown as ChatMessage[]);
          lastPersistedCountRef.current = data.message_count || data.messages.length;
        }
      } catch (e) {
        console.error('Failed to restore chat history:', e);
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    };
    
    restore();
    
    return () => { cancelled = true; };
  }, [propertyId, user]);

  // Clear messages when property changes (prevents cross-property pollution)
  useEffect(() => {
    if (prevPropertyIdRef.current && propertyId && prevPropertyIdRef.current !== propertyId) {
      setMessages([]);
      lastPersistedCountRef.current = 0;
      setIsRestoring(true); // Will re-trigger restoration for new property
    }
    prevPropertyIdRef.current = propertyId;
  }, [propertyId]);

  // Persist messages to database (debounced, fire-and-forget)
  useEffect(() => {
    if (!propertyId || !user || isRestoring) return;
    
    // Only write if message count actually changed
    if (messages.length === lastPersistedCountRef.current) return;
    
    // Clear existing timer
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    
    persistTimerRef.current = setTimeout(async () => {
      try {
        // Cap at MAX_PERSISTED_MESSAGES (truncate oldest)
        const messagesToPersist = messages.length > MAX_PERSISTED_MESSAGES
          ? messages.slice(-MAX_PERSISTED_MESSAGES)
          : messages;
        
        if (messagesToPersist.length > 0) {
          const { error: upsertError } = await supabase
            .from('home_chat_sessions')
            .upsert({
              user_id: user.id,
              home_id: propertyId,
              messages: messagesToPersist as any,
              message_count: messagesToPersist.length,
            }, {
              onConflict: 'user_id,home_id',
            });
          
          if (upsertError) {
            console.error('Failed to persist chat history:', upsertError);
          } else {
            lastPersistedCountRef.current = messagesToPersist.length;
          }
        } else {
          // Empty messages = conversation cleared, handled by clearConversation
        }
      } catch (e) {
        console.error('Failed to persist chat history:', e);
      }
    }, PERSIST_DEBOUNCE_MS);
    
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [messages, propertyId, user, isRestoring]);

  const sendMessage = async (message: string): Promise<AssistantResponse | undefined> => {
    if (!propertyId || !message.trim()) return undefined;

    try {
      setLoading(true);
      setError(null);

      // Add user message to chat
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);

      // Prepare conversation history for context
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get AI response with advisor state context, chat mode, and baseline context
      const { data, error: assistantError } = await supabase.functions.invoke(
        'ai-home-assistant',
        {
          body: {
            message,
            propertyId,
            conversationHistory,
            advisorState,
            confidence,
            risk,
            focusSystem,
            chatMode,
            // Epistemic coherence: pass baseline context
            baselineSource,
            visibleBaseline,
            // Focus continuity: pass current right-column focus
            activeFocus,
          }
        }
      );

      if (assistantError) {
        throw new Error(assistantError.message);
      }

      // Inject domain artifact JSON so extractContractorData() can render ContractorCard
      let messageContent = data.message;
      if (data.functionResult && typeof data.functionResult === 'string') {
        try {
          const parsed = JSON.parse(data.functionResult);
          if (
            (parsed.type === 'contractor_recommendations' && Array.isArray(parsed.contractors)) ||
            parsed.type === 'home_event_recorded'
          ) {
            messageContent = data.functionResult + '\n\n' + data.message;
          }
        } catch { /* not JSON, skip */ }
      }

      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: messageContent,
        timestamp: new Date().toISOString(),
        functionCall: data.functionCall,
        functionResult: data.functionResult, // Include for UI refresh detection
        suggestions: data.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Return response with focus metadata if present
      const response: AssistantResponse = {
        message: data.message,
        functionCall: data.functionCall,
        functionResult: data.functionResult,
        suggestions: data.suggestions,
      };
      
      // Extract focus metadata from AI response
      if (data.focus) {
        response.focus = data.focus;
      }
      
      return response;

    } catch (err) {
      console.error('Error sending message to AI assistant:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  // Inject an assistant message (for opening messages from advisor state)
  const injectMessage = useCallback((content: string, attachedArtifact?: ChatArtifact) => {
    const message: ChatMessage = {
      id: `assistant-opening-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      attachedArtifact,
    };
    setMessages(prev => {
      // Don't inject if already present
      if (prev.some(m => m.content === content)) return prev;
      return [...prev, message];
    });
  }, []);

  // Inject a message with an attached artifact
  const injectMessageWithArtifact = useCallback((content: string, artifact: ChatArtifact) => {
    injectMessage(content, artifact);
  }, [injectMessage]);

  const clearConversation = useCallback(async () => {
    setMessages([]);
    lastPersistedCountRef.current = 0;
    setError(null);
    
    // Delete from database (fire-and-forget)
    if (propertyId && user) {
      try {
        await supabase
          .from('home_chat_sessions')
          .delete()
          .eq('user_id', user.id)
          .eq('home_id', propertyId);
      } catch (e) {
        console.error('Failed to delete chat session:', e);
      }
    }
  }, [propertyId, user]);

  const sendSuggestion = async (suggestion: string) => {
    await sendMessage(suggestion);
  };

  return {
    messages,
    loading,
    error,
    isRestoring,
    sendMessage,
    sendSuggestion,
    clearConversation,
    injectMessage,
    injectMessageWithArtifact,
  };
};
