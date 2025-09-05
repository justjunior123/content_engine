// AI Provider related types
import { ContentEngine } from '@/lib/content-engine';

export interface ProviderInfo {
  name: string;
  models: string[];
  keyPlaceholder: string;
}

export interface SidebarProps {
  appFactory: ContentEngine;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void | Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  onProviderSwitch: () => void;
  onSuggestedPrompt: (prompt: string) => void;
}