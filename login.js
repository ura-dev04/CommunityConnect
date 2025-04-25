import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// We'll fetch Firebase config from the server
let app;
let database;

// Function to initialize Firebase
async function initializeFirebase() {
    try {
        // Try to get config from the server API
        const configEndpoint = window.location.hostname === 'localhost' ? '/api/config' : '/api/config';
        console.log('Fetching Firebase config from:', configEndpoint);
        
        const response = await fetch(configEndpoint);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.firebaseConfig) {
            throw new Error('Invalid configuration received from server');
        }
        
        console.log('Firebase config received successfully');
        
        // Initialize Firebase with the config from server
        app = initializeApp(data.firebaseConfig);
        database = getDatabase(app);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Error fetching Firebase config:', error);
        document.getElementById('error-message').textContent = 
            'Failed to connect to the server. Please try again later.';
        document.getElementById('error-message').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase first
    await initializeFirebase();
    
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const apartmentInput = document.getElementById('apartment');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.querySelector('.login-form');
    const welcomeContainer = document.getElementById('welcome-container');

    // Check if user is already logged in
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        // Instead of showing welcome message, redirect to dashboard
        window.location.href = 'dashboard.html';
        return; // Stop further execution
    }

    // Add event listener for Enter key press
    passwordInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            loginBtn.click();
        }
    });
    
    apartmentInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            loginBtn.click();
        }
    });

    // Login functionality
    loginBtn.addEventListener('click', async () => {
        const apartment = apartmentInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!apartment || !password) {
            showError('Please enter both apartment number and password');
            return;
        }
        
        try {
            const dbRef = ref(database);
            const snapshot = await get(child(dbRef, `residents/${apartment}`));
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                
                if (userData.password === password) {
                    // Login successful
                    // Store user data in session storage
                    sessionStorage.setItem('loggedInUser', JSON.stringify({
                        apartment: apartment,
                        name: userData.Owner_Name,
                        role: userData.role,
                        sub_role: userData.sub_role || ''
                    }));
                    
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                    
                    clearInputs();
                } else {
                    showError('Invalid password');
                }
            } else {
                showError('Apartment not found');
            }
        } catch (error) {
            console.error('Error during login:', error);
            showError('Error during login. Please try again.');
        }
    });
    
    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('loggedInUser');
        loginForm.classList.remove('hidden');
        welcomeContainer.classList.add('hidden');
        clearInputs();
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Hide error message after 3 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
    
    function clearInputs() {
        apartmentInput.value = '';
        passwordInput.value = '';
        errorMessage.style.display = 'none';
    }
});
