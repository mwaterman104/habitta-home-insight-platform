import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Bot, User, Download, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantTabProps {
  projectId: string;
}

const AIAssistantTab: React.FC<AIAssistantTabProps> = ({ projectId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      // Try to find existing chat session
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError;
      }

      if (existingSession) {
        setSessionId(existingSession.id);
        // Parse existing messages
        const messagesArray = Array.isArray(existingSession.messages) ? existingSession.messages : [];
        const existingMessages = messagesArray.map((msg: any, index: number) => ({
          id: `${existingSession.id}-${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(existingMessages);
      } else {
        // Create new chat session
        const user = await supabase.auth.getUser();
        if (!user.data.user) throw new Error('No authenticated user');

        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            project_id: projectId,
            user_id: user.data.user.id,
            messages: []
          })
          .select()
          .single();

        if (createError) throw createError;
        setSessionId(newSession.id);

        // Add welcome message
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm your AI assistant for this home improvement project. I can help you with planning, materials, techniques, measurements, and troubleshooting. What would you like to know?",
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Here you would integrate with ChatDIY and OpenAI APIs
      // For now, we'll simulate an AI response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `I understand you're asking about "${userMessage.content}". This is a simulated response. In the full implementation, this would be powered by ChatDIY's home improvement LLM for specialized knowledge, with OpenAI as a fallback for general queries.

Here are some suggestions:
• Consider the specific requirements for your project type
• Check local building codes and permits if needed  
• Plan your materials and tools ahead of time
• Take safety precautions for your project phase

Would you like me to help you create specific tasks or a materials list based on this discussion?`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update chat session in database
      const updatedMessages = [...messages, userMessage, assistantMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));

      await supabase
        .from('chat_sessions')
        .update({ 
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportChat = () => {
    const chatText = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}\n`)
      .join('\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-chat-${projectId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">AI Project Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Get expert guidance powered by ChatDIY and OpenAI
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportChat} className="gap-2">
            <Download className="w-4 h-4" />
            Export Chat
          </Button>
          <Badge variant="secondary" className="gap-1">
            <Bot className="w-3 h-3" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Project Chat
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-last' : ''}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("What materials do I need for this project?")}
              className="text-xs"
            >
              Materials List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("What are the next steps I should take?")}
              className="text-xs"
            >
              Next Steps
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("How do I estimate costs for this project?")}
              className="text-xs"
            >
              Cost Estimate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("What tools do I need?")}
              className="text-xs"
            >
              Tool List
            </Button>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your project... (e.g., 'How do I frame a deck?')"
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!input.trim() || isLoading}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Features Info */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">AI Assistant Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-primary mb-1">ChatDIY LLM (Primary)</h5>
              <ul className="text-muted-foreground space-y-1">
                <li>• Home improvement expertise</li>
                <li>• Material recommendations</li>
                <li>• Tool and technique guidance</li>
                <li>• Safety best practices</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-secondary mb-1">OpenAI GPT-4 (Fallback)</h5>
              <ul className="text-muted-foreground space-y-1">
                <li>• General project planning</li>
                <li>• Text formatting and lists</li>
                <li>• Task organization</li>
                <li>• Documentation help</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistantTab;