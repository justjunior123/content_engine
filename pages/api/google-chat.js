// API route for secure server-side Google AI chat operations
// Handles chat requests with full conversation context and model-specific configurations

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, context, model } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ 
      error: 'Messages array is required and must not be empty' 
    });
  }

  if (!model) {
    return res.status(400).json({ 
      error: 'Model parameter is required' 
    });
  }

  try {
    // Check if environment variable exists
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'GOOGLE_AI_API_KEY environment variable is not set' 
      });
    }

    // Initialize Google AI SDK
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    
    console.log(`💬 GoogleProvider: Starting chat with model ${model}`);
    
    // Build the conversation for native Google SDK
    let conversationHistory = '';
    
    if (context && context.length > 0) {
      conversationHistory += `Context: ${context.join('\n\n')}\n\n`;
    }
    
    const historyMessages = messages.slice(0, -1);
    for (const msg of historyMessages) {
      conversationHistory += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
    }
    
    const currentMessage = messages[messages.length - 1];
    const fullPrompt = conversationHistory + `Human: ${currentMessage.content}\nAssistant:`;
    
    // Use model-specific configuration for chat
    console.log('🔄 GoogleProvider: Calling generateContent for chat...');
    
    let result;
    if (model === 'gemini-2.0-flash-preview-image-generation') {
      // 2.0 model REQUIRES response modalities configuration
      const { Modality } = await import('@google/genai');
      console.log('🔄 Using 2.0 model with required response modalities [TEXT, IMAGE]');
      result = await genAI.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE]
        }
      });
    } else {
      // 2.5 and other models work without response modalities config
      console.log('🔄 Using standard model with simplified configuration');
      result = await genAI.models.generateContent({
        model: model,
        contents: fullPrompt
      });
    }
    
    const text = result.text;
    console.log(`✅ GoogleProvider: Chat completed. Response length: ${text.length} chars`);
    
    return res.status(200).json({ 
      success: true,
      response: text
    });
    
  } catch (error) {
    console.error('Google AI chat error:', error);
    
    // Handle quota exceeded errors
    if (error.status === 429 || 
        (error.message && error.message.includes('quota')) ||
        (error.message && error.message.includes('429'))) {
      return res.status(200).json({ 
        success: false,
        error: 'API quota exceeded. Please wait a moment and try again.'
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Google AI chat request failed: ' + (error.message || 'Unknown error')
    });
  }
}