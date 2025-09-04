import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { readFileContent } from '@/utils/file-helpers';
import { AIAppFactory } from '@/lib/ai-app-factory';

interface KnowledgeBaseProps {
  appFactory: AIAppFactory;
  uploadedFiles: string[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<string[]>>;
}

export function KnowledgeBase({ 
  appFactory, 
  uploadedFiles, 
  setUploadedFiles 
}: KnowledgeBaseProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      if (file.type === 'application/pdf' || file.type === 'text/plain') {
        const content = await readFileContent(file);
        await appFactory.addDocument(content, file.name);
        setUploadedFiles(prev => [...prev, file.name]);
        toast.success(`Added ${file.name} to knowledge base`);
      } else {
        toast.error(`Unsupported file type: ${file.type}`);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const clearKnowledge = () => {
    appFactory.clearKnowledge();
    setUploadedFiles([]);
    toast.success('Knowledge base cleared');
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        📚 Knowledge Base
      </label>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt"
        onChange={handleFileUpload}
        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      <p className="text-xs text-gray-500 mt-1">
        Upload PDF or TXT files to add to knowledge base
      </p>
      
      {uploadedFiles.length > 0 && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Uploaded Files ({uploadedFiles.length})
            </span>
            <button
              onClick={clearKnowledge}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                📄 {file}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}