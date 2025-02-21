import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Firebase configuration (use your actual values)
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

// Form submission
const form = document.getElementById('residentForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();  // Prevent form reload

  const name = document.getElementById('name').value;
  const flatNumber = document.getElementById('flatNumber').value;
  const floor = document.getElementById('floor').value;
  const wing = document.getElementById('wing').value;

  // Save data to Firebase
  set(ref(database, 'residents/' + flatNumber), {
    name,
    flatNumber,
    floor,
    wing
  })
  .then(() => {
    document.getElementById('message').innerText = "Data saved successfully!";
    form.reset();  // Clear form
  })
  .catch((error) => {
    document.getElementById('message').innerText = "Error: " + error.message;
  });
});

