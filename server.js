const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static files - updated to be more explicit
app.use(express.static(__dirname));

// Explicitly serve files from the images directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// API endpoint to serve Firebase config
app.get('/api/config', (req, res) => {
  try {
    console.log('API config endpoint accessed');
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
    
    console.log('Firebase config successfully generated');
    
    // Set CORS headers for API endpoint
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json({ firebaseConfig });
  } catch (error) {
    console.error('Error serving config:', error);
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'homepage.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Add routes for all sub-pages that might be used from the dashboard
app.get('/users.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'users.html'));
});

app.get('/complaint.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'complaint.html'));
});

app.get('/parking.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'parking.html'));
});

app.get('/events.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'events.html'));
});

app.get('/notice.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'notice.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/maintenance.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'maintenance.html'));
});

app.get('/maid-services.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'maid-services.html'));
});

app.get('/booking.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'booking.html'));
});

// Add a specific route to handle image requests
app.get('/images/:filename', (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, 'images', filename));
});

// Catch-all route to handle SPA routing and direct requests to CSS/JS files
app.get('*', (req, res) => {
  // Check if the request is for a CSS or JS file
  if (req.path.endsWith('.css') || req.path.endsWith('.js')) {
    res.sendFile(path.join(__dirname, req.path));
  } else if (req.path.startsWith('/images/') && (req.path.endsWith('.gif') || req.path.endsWith('.png') || req.path.endsWith('.jpg') || req.path.endsWith('.jpeg'))) {
    // Handle image files specifically
    res.sendFile(path.join(__dirname, req.path));
  } else {
    res.sendFile(path.join(__dirname, 'homepage.html'));
  }
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
