import React from 'react';
import { UploadedImage } from '@/types/chat.types';

interface ChatInputProps {
  currentInput: string;
  setCurrentInput: (input: string) => void;
  isConnected: boolean;
  isProcessingMessage: boolean;
  isImageModel: boolean;
  chatMode: 'chat' | 'image';
  uploadedImages: UploadedImage[];
  onSendMessage: () => void;
  onGenerateImage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export function ChatInput({
  currentInput,
  setCurrentInput,
  isConnected,
  isProcessingMessage,
  isImageModel,
  chatMode,
  uploadedImages,
  onSendMessage,
  onGenerateImage,
  onKeyPress
}: ChatInputProps) {
  const getPlaceholder = () => {
    if (!isConnected) return "Please connect to a provider first";
    
    if (isImageModel && chatMode === 'image') {
      return uploadedImages.length > 0
        ? `Describe how to modify/combine these ${uploadedImages.length} images...`
        : "Describe the image you want to generate, or upload images to modify...";
    }
    
    return "Type your message...";
  };

  const handleAction = () => {
    if (isImageModel && chatMode === 'image') {
      onGenerateImage();
    } else {
      onSendMessage();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex space-x-2">
        <textarea
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={getPlaceholder()}
          disabled={!isConnected || isProcessingMessage}
          className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          rows={2}
        />
        <button
          onClick={handleAction}
          disabled={!isConnected || isProcessingMessage || !currentInput.trim()}
          className={`px-6 py-2 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed ${
            isImageModel && chatMode === 'image' 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isProcessingMessage 
            ? '⏳ Processing...' 
            : isImageModel && chatMode === 'image' 
              ? '🎨 Generate' 
              : 'Send'
          }
        </button>
      </div>
    </div>
  );
}