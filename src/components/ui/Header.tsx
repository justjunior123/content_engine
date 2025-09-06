import React from 'react';
import { CampaignProgress } from '@/types/campaign.types';

interface HeaderProps {
  isConnected: boolean;
  selectedProvider: string;
  selectedModel: string;
  isImageModel: boolean;
  chatMode: 'chat' | 'image' | 'campaign';
  setChatMode: (mode: 'chat' | 'image' | 'campaign') => void;
  isLoading: boolean;
  isProcessingMessage: boolean;
  isCampaignModeAvailable?: boolean;
  campaignProgress?: CampaignProgress;
}

export const Header = React.memo(function Header({
  isConnected,
  selectedProvider,
  selectedModel,
  isImageModel,
  chatMode,
  setChatMode,
  isLoading,
  isProcessingMessage,
  isCampaignModeAvailable = false,
  campaignProgress
}: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <h1 className="text-2xl font-bold text-gray-900">Content Engine</h1>
      <p className="text-gray-600">🔒 Secure RAG with Environment-Only Configuration (Google AI)</p>
      {isConnected && (
        <div className="mt-2">
          <div className="text-sm text-green-600">
            ✅ Connected to {selectedProvider} {selectedModel}
          </div>
          {selectedModel === 'gemini-2.5-flash-image-preview' && (
            <div className="text-xs text-blue-600 mt-1">
              🎨 Multimodal model: Supports both chat and image generation with proper response modalities
            </div>
          )}
          {selectedModel === 'gemini-2.0-flash-preview-image-generation' && (
            <div className="text-xs text-blue-600 mt-1">
              🎨 Multimodal model: Supports both chat and image generation with enhanced visual capabilities
            </div>
          )}
        </div>
      )}
      
      {/* Mode Toggle for Image Models */}
      {isImageModel && (
        <div className="mt-3">
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setChatMode('chat')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                chatMode === 'chat'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setChatMode('image')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                chatMode === 'image'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎨 Image
            </button>
            {isCampaignModeAvailable && (
              <button
                onClick={() => setChatMode('campaign')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  chatMode === 'campaign'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🚀 Campaign
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {chatMode === 'chat' 
              ? 'Chat with text-only responses using proper response modalities'
              : chatMode === 'image'
              ? 'Generate and edit images with text prompts'
              : 'Upload campaign brief and generate multiple social media assets'
            }
          </p>
        </div>
      )}
      
      {/* Debug Information */}
      <div className="mt-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded">
        🐛 Debug: Model="{selectedModel}" | Mode={chatMode} | IsImageModel={isImageModel.toString()} | IsConnected={isConnected.toString()} | IsLoading={isLoading.toString()} | IsProcessing={isProcessingMessage.toString()}
      </div>
    </div>
  );
});