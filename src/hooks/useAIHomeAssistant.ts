import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  functionCall?: any;
  suggestions?: string[];
}

interface AssistantResponse {
  message: string;
  functionCall?: any;
  functionResult?: string;
  suggestions?: string[];
}

export const useAIHomeAssistant = (propertyId?: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Get AI response
      const { data, error: assistantError } = await supabase.functions.invoke(
        'ai-home-assistant',
        {
          body: {
            message,
            propertyId,
            conversationHistory
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

  const clearConversation = () => {
    setMessages([]);
    setError(null);
  };

  const sendSuggestion = async (suggestion: string) => {
    await sendMessage(suggestion);
  };

  const getInitialGreeting = (): ChatMessage => {
    return {
      id: 'greeting',
      role: 'assistant',
      content: 'Hi! I\'m your AI home maintenance assistant. I can help you with maintenance planning, cost estimates, contractor recommendations, and answer questions about your home systems. What would you like to know?',
      timestamp: new Date().toISOString(),
      suggestions: [
        'What maintenance should I prioritize this season?',
        'Show me my system health overview',
        'Help me plan my maintenance budget'
      ]
    };
  };

  // Initialize with greeting if no messages
  if (messages.length === 0 && propertyId) {
    setMessages([getInitialGreeting()]);
  }

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendSuggestion,
    clearConversation
  };
};