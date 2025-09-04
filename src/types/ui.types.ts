// UI Component types
import { Message } from './chat.types';

export interface SuggestedPromptProps {
  text: string;
  onClick: (text: string) => void;
}

export interface MessageBubbleProps {
  message: Message;
}

// Re-export Message type for convenience
export type { Message } from './chat.types';