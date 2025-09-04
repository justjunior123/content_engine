// Image-related type definitions

export interface ImageUploadZoneProps {
  uploadedImages: UploadedImage[];
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (imageId: string) => void;
  onClearAll: () => void;
}

export interface UploadedImage {
  id: string;
  file: File;
  base64Data: string;
  mimeType: string;
  preview: string;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
}