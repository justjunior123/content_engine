import React, { useState } from 'react';
import { ProviderConfig } from './ProviderConfig';
import { KnowledgeBase } from './KnowledgeBase';
import { SuggestedPrompts } from './SuggestedPrompts';
import { SidebarProps } from '@/types/provider.types';

export function Sidebar({
  appFactory,
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  isConnected,
  isLoading,
  onProviderSwitch,
  onSuggestedPrompt
}: SidebarProps) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <ProviderConfig
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          isLoading={isLoading}
          isConnected={isConnected}
          onProviderSwitch={onProviderSwitch}
        />
        
        <KnowledgeBase
          appFactory={appFactory}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
        />
        
        <SuggestedPrompts
          isConnected={isConnected}
          onSuggestedPrompt={onSuggestedPrompt}
        />
      </div>
    </div>
  );
}