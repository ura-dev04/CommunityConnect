import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, update, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
    authDomain: "societymanagement-df579.firebaseapp.com",
    projectId: "societymanagement-df579",
    storageBucket: "societymanagement-df579.firebasestorage.app",
    messagingSenderId: "526280568230",
    appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        // Redirect to login if not logged in
        window.location.href = 'login.html';
        return;
    }
});

// Complaint Form Submission
const complaintForm = document.getElementById('complaintForm');
complaintForm.addEventListener('submit', async (e) => {
    e.preventDefault();  // Prevent form reload

    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (!loggedInUser || !loggedInUser.apartment) {
        document.getElementById('complaintMessage').innerText = "Error: You need to be logged in to submit a complaint.";
        return;
    }

    const flatNumber = loggedInUser.apartment;
    const complaintType = document.getElementById('complaintType').value;
    const complaintText = document.getElementById('complaint').value;
    
    try {
        // Create new complaint entry under the resident
        const complaintData = {
            complaint_type: complaintType,
            complaint_content: complaintText,
            status: "Pending",
            timestamp: new Date().toISOString()
        };
        
        // Get reference to the complaints node under the resident
        const newComplaintKey = push(ref(database, `residents/${flatNumber}/complaints`)).key;
        
        // Update the database with the new complaint
        const updates = {};
        updates[`residents/${flatNumber}/complaints/${newComplaintKey}`] = complaintData;
        
        await update(ref(database), updates);
        
        document.getElementById('complaintMessage').innerText = "Complaint submitted successfully!";
        complaintForm.reset();  // Clear form
    } catch (error) {
        document.getElementById('complaintMessage').innerText = "Error: " + error.message;
        console.error("Error submitting complaint:", error);
    }
});
