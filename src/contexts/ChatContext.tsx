import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ChatContextType {
  type: 'system' | 'maintenance' | 'activity_log' | 'supporting_record' | 'system_edit' | 'general';
  systemKey?: string;
  taskId?: string;
  taskTitle?: string;
  trigger?: string;
  metadata?: Record<string, any>;
}

interface ChatContextValue {
  chatContext: ChatContextType | null;
  isOpen: boolean;
  openChat: (context?: ChatContextType) => void;
  closeChat: () => void;
}

const DEFAULT_CONTEXT: ChatContextType = { type: 'general', trigger: 'ask_habitta' };

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [chatContext, setChatContext] = useState<ChatContextType | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback((context?: ChatContextType) => {
    setChatContext(context || DEFAULT_CONTEXT);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setChatContext(null);
  }, []);

  return (
    <ChatContext.Provider value={{ chatContext, isOpen, openChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    // Return a no-op version when used outside provider (e.g., demo routes)
    return {
      chatContext: null,
      isOpen: false,
      openChat: () => console.warn('[ChatContext] openChat called outside provider'),
      closeChat: () => {},
    };
  }
  return ctx;
}
