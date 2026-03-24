import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAIHomeAssistant } from '@/hooks/useAIHomeAssistant';
import { MessageCircle, Send, Loader2, Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIHomeAssistantProps {
  propertyId?: string;
  className?: string;
}

export const AIHomeAssistant: React.FC<AIHomeAssistantProps> = ({ 
  propertyId, 
  className 
}) => {
  const { messages, loading, error, sendMessage, sendSuggestion, clearConversation } = useAIHomeAssistant(propertyId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    await sendSuggestion(suggestion);
  };

  if (!propertyId) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">AI Assistant Ready</h3>
              <p className="text-muted-foreground">
                Select a property to start chatting with your AI home maintenance assistant.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col h-[600px]", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Home Assistant
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by AI
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col space-y-2",
                message.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2 text-sm",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.role === 'assistant' && message.functionCall && (
                  <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                    <Badge variant="outline" className="text-xs">
                      Function: {message.functionCall.name}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Suggestions */}
              {message.role === 'assistant' && message.suggestions && (
                <div className="flex flex-wrap gap-2 mt-2 max-w-[85%]">
                  {message.suggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1 px-2"
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={loading}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="text-sm text-destructive font-medium">Error</div>
              <div className="text-sm text-destructive/80">{error}</div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about maintenance, costs, contractors, or anything about your home..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          
          {messages.length > 2 && (
            <div className="flex justify-center mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="text-xs text-muted-foreground"
              >
                Clear Conversation
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};