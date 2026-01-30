/**
 * AI Home Assistant Hook
 * 
 * ARTIFACT BEHAVIORAL CONTRACT:
 * Messages may have attached artifacts (only if chat earned it).
 * Artifacts are coupled to specific messages via anchorMessageId.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdvisorState, RiskLevel } from '@/types/advisorState';
import type { ChatMode, BaselineSource, VisibleBaselineSystem } from '@/types/chatMode';
import type { ChatArtifact } from '@/types/chatArtifact';

const CHAT_MESSAGES_KEY = 'habitta_chat_messages_v2';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  functionCall?: any;
  suggestions?: string[];
  /** Attached artifact (only if chat earned it) */
  attachedArtifact?: ChatArtifact;
}

interface AssistantResponse {
  message: string;
  functionCall?: any;
  functionResult?: string;
  suggestions?: string[];
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
  } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  
  // Track previous propertyId to detect switches
  const prevPropertyIdRef = useRef(propertyId);

  // Restore messages from sessionStorage when propertyId becomes available
  useEffect(() => {
    if (!propertyId) {
      setIsRestoring(false);
      return;
    }
    
    try {
      const stored = sessionStorage.getItem(`${CHAT_MESSAGES_KEY}_${propertyId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to restore chat history:', e);
    } finally {
      setIsRestoring(false);
    }
  }, [propertyId]);

  // Clear messages when property changes (prevents cross-property pollution)
  useEffect(() => {
    if (prevPropertyIdRef.current && propertyId && prevPropertyIdRef.current !== propertyId) {
      setMessages([]);
      setIsRestoring(true); // Will re-trigger restoration for new property
    }
    prevPropertyIdRef.current = propertyId;
  }, [propertyId]);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (!propertyId || isRestoring) return;
    
    try {
      if (messages.length > 0) {
        const serialized = JSON.stringify(messages);
        
        // Safety check: ~4MB limit
        if (serialized.length > 4_000_000) {
          console.warn('Chat history too large, truncating');
          sessionStorage.setItem(
            `${CHAT_MESSAGES_KEY}_${propertyId}`,
            JSON.stringify(messages.slice(-50))
          );
          return;
        }
        
        sessionStorage.setItem(`${CHAT_MESSAGES_KEY}_${propertyId}`, serialized);
      } else {
        // Explicitly clear on empty (handles clearConversation)
        sessionStorage.removeItem(`${CHAT_MESSAGES_KEY}_${propertyId}`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        // Fallback: keep only last 50 messages
        try {
          sessionStorage.setItem(
            `${CHAT_MESSAGES_KEY}_${propertyId}`,
            JSON.stringify(messages.slice(-50))
          );
        } catch {
          // Silent failure
        }
      }
    }
  }, [messages, propertyId, isRestoring]);

  const sendMessage = async (message: string): Promise<void> => {
    if (!propertyId || !message.trim()) return;

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
          }
        }
      );

      if (assistantError) {
        throw new Error(assistantError.message);
      }

      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        functionCall: data.functionCall,
        suggestions: data.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);

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

  const clearConversation = useCallback(() => {
    setMessages([]); // useEffect will handle storage removal
    setError(null);
  }, []);

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
