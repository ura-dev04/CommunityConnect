import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
    authDomain: "societymanagement-df579.firebaseapp.com",
    projectId: "societymanagement-df579",
    storageBucket: "societymanagement-df579.appspot.com",
    messagingSenderId: "526280568230",
    appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
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
