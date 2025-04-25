import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Firebase configuration from .env (via server)
let app;
let database;
let storage;

// Function to initialize Firebase
export async function initializeFirebase() {
    if (app) return { app, database, storage }; // Return if already initialized
    
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        
        // Initialize Firebase with the config from server
        app = initializeApp(data.firebaseConfig);
        database = getDatabase(app);
        storage = getStorage(app);
        
        console.log("Firebase initialized successfully.");
        return { app, database, storage };
    } catch (error) {
        console.error('Error fetching Firebase config:', error);
        throw error;
    }
}

// Export getters to ensure initialization happened
export async function getDatabasess() {
    const result = await initializeFirebase();
    return result.database;
}

export async function getStoragess() {
    const result = await initializeFirebase();
    return result.storage;
}
