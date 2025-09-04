import React from 'react';
import { SuggestedPrompt } from '@/components/ui/SuggestedPrompt';

interface SuggestedPromptsProps {
  isConnected: boolean;
  onSuggestedPrompt: (prompt: string) => void;
}

export function SuggestedPrompts({ isConnected, onSuggestedPrompt }: SuggestedPromptsProps) {
  if (!isConnected) return null;

  return (
    <div className="border-t border-gray-200 pt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        💡 Try These Prompts
      </label>
      <div className="space-y-2">
        <SuggestedPrompt 
          text="What can you help me with?" 
          onClick={onSuggestedPrompt}
        />
        <SuggestedPrompt 
          text="Summarize the uploaded documents" 
          onClick={onSuggestedPrompt}
        />
        <SuggestedPrompt 
          text="What are the key insights from the knowledge base?" 
          onClick={onSuggestedPrompt}
        />
      </div>
    </div>
  );
}