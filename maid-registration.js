// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
    authDomain: "societymanagement-df579.firebaseapp.com",
    projectId: "societymanagement-df579",
    databaseURL: "https://societymanagement-df579-default-rtdb.firebaseio.com",
    storageBucket: "societymanagement-df579.appspot.com",
    messagingSenderId: "526280568230",
    appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();

// Form submission handler
document.getElementById('maidRegistrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    try {
        loadingIndicator.classList.add('active');

        // Prepare data - simpler structure
        const formData = {
            maidId: this.maidId.value.trim(),
            name: this.name.value.trim(),
            mobile: this.mobile.value.trim(),
            wing: this.wing.value,
            flatNumber: this.flatNumber.value.trim(),
            timeSlots: Array.from(this.querySelectorAll('input[name="timeSlot"]:checked')).map(cb => cb.value),
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        // Save to Realtime Database
        await database.ref('maids/' + formData.maidId).set(formData);
        
        console.log('Data saved successfully');
        alert('Registration successful!');
        this.reset();
        window.location.href = 'homepage.html';

    } catch (error) {
        console.error('Error:', error);
        alert('Registration failed: ' + error.message);
    } finally {
        loadingIndicator.classList.remove('active');
    }
});

// Test database connection
database.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        console.log('Connected to Firebase Realtime Database');
    } else {
        console.log('Not connected to Firebase Realtime Database');
    }
});
