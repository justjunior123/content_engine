import React from 'react';

interface ProviderConfigProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void | Promise<void>;
  isLoading: boolean;
  isConnected: boolean;
  onProviderSwitch: () => void;
}

export function ProviderConfig({
  selectedModel,
  setSelectedModel,
  isLoading,
  isConnected,
  onProviderSwitch
}: ProviderConfigProps) {
  const providers = {
    google: {
      name: 'Google AI',
      models: ['gemini-2.5-flash-image-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-preview-image-generation'],
      keyPlaceholder: 'AIza...'
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection - Environment Only */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🤖 AI Provider
        </label>
        <div className="w-full border border-green-300 rounded-lg px-3 py-2 bg-green-50 text-green-800 font-medium">
          🔒 Google AI (Environment)
        </div>
        <p className="text-xs text-green-600 mt-1">
          Provider locked to Google AI for enhanced security
        </p>
      </div>
      
      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🧠 Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {providers.google.models.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>
      
      {/* Environment-Only Configuration */}
      <div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <span className="text-green-700 font-medium text-sm">🔑 Environment Configuration</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            API keys are loaded from environment variables (.env file) for enhanced security
          </p>
        </div>
      </div>
      
      {/* Connect Button */}
      {selectedModel && (
        <button
          onClick={onProviderSwitch}
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-lg font-medium ${
            isConnected 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:bg-gray-400 disabled:cursor-not-allowed`}
        >
          {isLoading ? 'Connecting...' : isConnected ? 'Connected ✅' : 'Connect'}
        </button>
      )}
    </div>
  );
}