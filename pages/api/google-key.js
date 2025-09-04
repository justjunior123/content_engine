// API route to securely serve Google API key from environment variables
export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Google API key from environment variables
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (googleApiKey) {
      // Return the key (server-side only, not exposed to client bundle)
      res.status(200).json({ 
        hasKey: true, 
        key: googleApiKey,
        source: 'environment' 
      });
    } else {
      // No key found in environment
      res.status(200).json({ 
        hasKey: false, 
        key: null,
        source: 'none' 
      });
    }
  } catch (error) {
    console.error('Error accessing Google API key:', error);
    res.status(500).json({ 
      error: 'Failed to access API key',
      hasKey: false,
      key: null 
    });
  }
}