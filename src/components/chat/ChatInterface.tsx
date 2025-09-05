import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Message, UploadedImage } from '@/types/chat.types';

interface ChatInterfaceProps {
  messages: Message[];
  currentInput: string;
  setCurrentInput: (input: string) => void;
  isConnected: boolean;
  isProcessingMessage: boolean;
  selectedProvider: string;
  selectedModel: string;
  isImageModel: boolean;
  chatMode: 'chat' | 'image';
  uploadedImages: UploadedImage[];
  onSendMessage: () => void;
  onGenerateImage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export const ChatInterface = React.memo(function ChatInterface({
  messages,
  currentInput,
  setCurrentInput,
  isConnected,
  isProcessingMessage,
  selectedProvider,
  selectedModel,
  isImageModel,
  chatMode,
  uploadedImages,
  onSendMessage,
  onGenerateImage,
  onKeyPress
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <h3 className="text-lg font-medium mb-2">Welcome to AI App Factory!</h3>
            <p>🔒 Secure environment-only configuration</p>
            <p>1. Google AI provider is pre-configured with environment variables</p>
            <p>2. Upload documents (optional)</p>
            <p>3. Start chatting!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput
        currentInput={currentInput}
        setCurrentInput={setCurrentInput}
        isConnected={isConnected}
        isProcessingMessage={isProcessingMessage}
        isImageModel={isImageModel}
        chatMode={chatMode}
        uploadedImages={uploadedImages}
        onSendMessage={onSendMessage}
        onGenerateImage={onGenerateImage}
        onKeyPress={onKeyPress}
      />
    </div>
  );
});