import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

// Complaint Form Submission
const complaintForm = document.getElementById('complaintForm');
complaintForm.addEventListener('submit', (e) => {
    e.preventDefault();  // Prevent form reload

    const flatNumber = document.getElementById('flatNumber').value;
    const complaintText = document.getElementById('complaint').value;

    // Save complaint in Firebase under the flat number with status
    push(ref(database, `complaints/${flatNumber}`), {
        complaint: complaintText,
        status: "Pending",  // Default status when submitted
        timestamp: new Date().toISOString()
    })
    .then(() => {
        document.getElementById('complaintMessage').innerText = "Complaint submitted successfully!";
        complaintForm.reset();  // Clear form
    })
    .catch((error) => {
        document.getElementById('complaintMessage').innerText = "Error: " + error.message;
    });
});
