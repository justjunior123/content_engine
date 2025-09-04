import React from 'react';
import { SuggestedPromptProps } from '@/types/ui.types';

export function SuggestedPrompt({ text, onClick }: SuggestedPromptProps) {
  return (
    <button
      onClick={() => onClick(text)}
      className="w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded border border-blue-200 hover:border-blue-300 transition-colors"
    >
      {text}
    </button>
  );
}