import React from 'react';
import { MessageBubbleProps } from '@/types/ui.types';
import { UploadedImage } from '@/types/chat.types';

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl rounded-lg px-4 py-2 ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900 border border-gray-200'
      }`}>
        <div className="flex items-start space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            isUser ? 'bg-blue-700' : 'bg-gray-300'
          }`}>
            {isUser ? '👤' : '🤖'}
          </div>
          <div className="flex-1">
            {/* Show uploaded images for user messages */}
            {isUser && message.uploadedImages && message.uploadedImages.length > 0 && (
              <div className="space-y-2 mb-2">
                <div className="grid grid-cols-2 gap-2">
                  {message.uploadedImages.map((image: UploadedImage) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.preview}
                        alt={image.file.name}
                        className="w-full h-16 object-cover rounded border border-blue-300"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b truncate">
                        {image.file.name}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs opacity-75">Uploaded images</p>
              </div>
            )}
            
            {/* Show generated image for assistant messages */}
            {!isUser && message.content.startsWith('data:image/') ? (
              <div className="space-y-2">
                <img 
                  src={message.content} 
                  alt="Generated image" 
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                  style={{ maxHeight: '400px' }}
                />
                <p className="text-sm opacity-75">Generated image</p>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}
            <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}