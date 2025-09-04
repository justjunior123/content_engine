// Chat-related type definitions

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  uploadedImages?: UploadedImage[];
}

export interface UploadedImage {
  id: string;
  file: File;
  base64Data: string;
  mimeType: string;
  preview: string;
}