// AI Provider related types
import { AIAppFactory } from '@/lib/ai-app-factory';

export interface ProviderInfo {
  name: string;
  models: string[];
  keyPlaceholder: string;
}

export interface SidebarProps {
  appFactory: AIAppFactory;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void | Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  onProviderSwitch: () => void;
  onSuggestedPrompt: (prompt: string) => void;
}