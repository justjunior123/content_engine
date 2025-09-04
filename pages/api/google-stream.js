// API route for secure server-side Google AI streaming operations
// Handles streaming chat requests with server-sent events

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

    // Set up Server-Sent Events headers
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Initialize Google AI SDK
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    
    console.log(`🔄 GoogleProvider: Starting native SDK streaming with model ${model}...`);
    
    // Build the conversation history for Google SDK format
    let conversationHistory = '';
    
    // Add context if provided
    if (context && context.length > 0) {
      conversationHistory += `Context: ${context.join('\n\n')}\n\n`;
    }
    
    // Add message history (skip the last message as it will be the prompt)
    const historyMessages = messages.slice(0, -1);
    for (const msg of historyMessages) {
      conversationHistory += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
    }
    
    // Get the current user message
    const currentMessage = messages[messages.length - 1];
    const fullPrompt = conversationHistory + `Human: ${currentMessage.content}\nAssistant:`;
    
    try {
      console.log('📤 GoogleProvider: Sending prompt to model...');
      console.log('🔄 GoogleProvider: Calling generateContentStream for chat...');
      
      // Add timeout wrapper to prevent hanging
      const STREAM_TIMEOUT_MS = 30000; // 30 seconds
      
      let streamPromise;
      if (model === 'gemini-2.0-flash-preview-image-generation') {
        // 2.0 model REQUIRES response modalities configuration even for streaming
        const { Modality } = await import('@google/genai');
        console.log('🔄 Using 2.0 model with required response modalities [TEXT, IMAGE]');
        streamPromise = genAI.models.generateContentStream({
          model: model,
          contents: fullPrompt,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
          }
        });
      } else {
        // 2.5 and other models work without response modalities config
        console.log('🔄 Using standard model with simplified configuration');
        streamPromise = genAI.models.generateContentStream({
          model: model,
          contents: fullPrompt
        });
      }
      
      let result;
      try {
        result = await Promise.race([
          streamPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stream timeout after 30 seconds')), STREAM_TIMEOUT_MS)
          )
        ]);
      } catch (timeoutError) {
        console.error('⏰ GoogleProvider: Stream timed out, falling back to non-streaming chat');
        // Fallback to non-streaming response with model-specific configuration
        let chatResult;
        if (model === 'gemini-2.0-flash-preview-image-generation') {
          const { Modality } = await import('@google/genai');
          chatResult = await genAI.models.generateContent({
            model: model,
            contents: fullPrompt,
            config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE]
            }
          });
        } else {
          chatResult = await genAI.models.generateContent({
            model: model,
            contents: fullPrompt
          });
        }
        const text = chatResult.text;
        res.write(text);
        res.end();
        return;
      }
      
      console.log('📡 GoogleProvider: Streaming response started...');
      
      let totalChunks = 0;
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          totalChunks++;
          console.log(`📦 GoogleProvider: Chunk ${totalChunks} received (${chunkText.length} chars)`);
          res.write(chunkText);
        }
      }
      
      console.log(`✅ GoogleProvider: Streaming completed. Total chunks: ${totalChunks}`);
      res.end();
      
    } catch (streamError) {
      console.error('❌ GoogleProvider: Stream error:', streamError);
      
      // Handle quota exceeded errors
      if (streamError.status === 429 || 
          (streamError.message && streamError.message.includes('quota')) ||
          (streamError.message && streamError.message.includes('429'))) {
        res.write('Error: API quota exceeded. Please wait a moment and try again.');
        res.end();
        return;
      }
      
      res.write('Error: Stream failed - ' + (streamError.message || 'Unknown error'));
      res.end();
    }
    
  } catch (error) {
    console.error('Google AI stream setup error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Google AI stream request failed: ' + (error.message || 'Unknown error')
      });
    }
    
    res.write('Error: Stream setup failed - ' + (error.message || 'Unknown error'));
    res.end();
  }
}