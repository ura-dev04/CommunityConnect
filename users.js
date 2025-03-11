import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
    authDomain: "societymanagement-df579.firebaseapp.com",
    projectId: "societymanagement-df579",
    storageBucket: "societymanagement-df579.appspot.com",  // FIXED storageBucket
    messagingSenderId: "526280568230",
    appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Ensure DOM is loaded before accessing elements
document.addEventListener("DOMContentLoaded", function() {
    // Check if form exists before adding event listener
    const form = document.getElementById('residentForm');
    if (!form) {
        console.error("Form element not found! Check your HTML.");
        return;
    }

    // Form submission event listener
    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent form from refreshing

        // Get input values
        const name = document.getElementById('name').value;
        const flatNumber = document.getElementById('flatNumber').value;
        const floor = document.getElementById('floor').value;
        const wing = document.getElementById('wing').value;
        const role = document.getElementById('role').value;

        // Check if all fields are filled
        if (!name || !flatNumber || !floor || !wing) {
            document.getElementById('message').innerText = "Please fill in all fields.";
            return;
        }

        // Save data to Firebase Realtime Database
        set(ref(database, 'residents/' + flatNumber), {
            name: name,
            flatNumber: flatNumber,
            floor: floor,
            wing: wing,
            role: role
        })
        .then(() => {
            document.getElementById('message').innerText = "Data saved successfully!";
            form.reset();
        })
        .catch((error) => {
            document.getElementById('message').innerText = "Error: " + error.message;
        });
    });
});
