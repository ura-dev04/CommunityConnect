// This file creates a standalone API endpoint for Vercel
module.exports = (req, res) => {
  try {
    // Check if environment variables are set
    const requiredEnvVars = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID',
      'FIREBASE_DATABASE_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`Missing environment variables: ${missingVars.join(', ')}`);
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Missing required environment variables'
      });
    }
    
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return res.status(200).json({ firebaseConfig });
  } catch (error) {
    console.error('Error serving config:', error);
    return res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
};
