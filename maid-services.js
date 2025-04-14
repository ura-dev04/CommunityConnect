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
const loadingIndicator = document.getElementById('loadingIndicator');
const searchResults = document.getElementById('searchResults');

// User authentication check
document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessage = document.getElementById('welcome-message');
    const userRole = document.getElementById('user-role');
    const logoutBtn = document.querySelector('.logout-btn');
    const changePasswordBtn = document.querySelector('.change-password-btn');
    const registerTabButton = document.querySelector('.tab-btn[data-tab="register"]');
    const registerTabPane = document.getElementById('register-tab');
    
    // Check if user is logged in
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    
    if (!loggedInUser) {
        // User is not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }
    
    // User is logged in
    const userData = JSON.parse(loggedInUser);
    
    // Display welcome message and role
    welcomeMessage.textContent = `Hi ${userData.name}`;
    
    let roleText = `${userData.role}`;
    if (userData.sub_role) {
        roleText += ` (${userData.sub_role})`;
    }
    
    userRole.textContent = roleText;
    
    // Check if user has permission to register maids
    const allowedRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
    const hasPermission = userData.sub_role && allowedRoles.includes(userData.sub_role);
    
    // Hide register tab if user doesn't have permission
    if (!hasPermission) {
        // Hide the register tab button
        if (registerTabButton) {
            registerTabButton.style.display = 'none';
        }
        
        // Hide the register tab content
        if (registerTabPane) {
            registerTabPane.style.display = 'none';
        }
        
        // Ensure search tab is active
        document.querySelector('.tab-btn[data-tab="search"]').classList.add('active');
        document.getElementById('search-tab').classList.add('active');
    }
    
    // Handle logout button
    logoutBtn.addEventListener('click', () => {
        // Remove user data from session storage
        sessionStorage.removeItem('loggedInUser');
        // Redirect to homepage after logout
        window.location.href = 'homepage.html';
    });
    
});

// Tab functionality
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => 
            btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => 
            pane.classList.remove('active'));
        
        // Add active class to clicked tab
        button.classList.add('active');
        document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
    });
});

// ====== MAID REGISTRATION FUNCTIONALITY ======
document.getElementById('maidRegistrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        loadingIndicator.classList.add('active');

        // Prepare data
        const formData = {
            maidId: this.maidId.value.trim(),
            name: this.name.value.trim(),
            mobile: this.mobile.value.trim(),
            wing: this.wing.value,
            flatNumber: this.flatNumber.value.trim(),
            timeSlots: Array.from(this.querySelectorAll('input[name="timeSlot"]:checked')).map(cb => cb.value),
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        // Validate at least one time slot is selected
        if (formData.timeSlots.length === 0) {
            throw new Error('Please select at least one time slot');
        }

        // Save to Realtime Database
        await database.ref('maids/' + formData.maidId).set(formData);
        
        console.log('Data saved successfully');
        alert('Registration successful!');
        this.reset();

    } catch (error) {
        console.error('Error:', error);
        alert('Registration failed: ' + error.message);
    } finally {
        loadingIndicator.classList.remove('active');
    }
});

// ====== MAID SEARCH FUNCTIONALITY ======
// Add click handlers to time slot buttons
document.querySelectorAll('.time-slot-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.time-slot-btn').forEach(btn => 
            btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Search maids for selected time slot
        searchMaidsByTimeSlot(button.dataset.slot);
    });
});

async function searchMaidsByTimeSlot(timeSlot) {
    try {
        loadingIndicator.classList.add('active');
        searchResults.innerHTML = '';

        // Get all maids from database
        const snapshot = await database.ref('maids').once('value');
        const maids = snapshot.val();

        if (!maids) {
            searchResults.innerHTML = '<div class="no-results">No maids registered yet.</div>';
            return;
        }

        // Filter maids by time slot
        const availableMaids = Object.values(maids).filter(maid => 
            maid.timeSlots && maid.timeSlots.includes(timeSlot));

        if (availableMaids.length === 0) {
            searchResults.innerHTML = 
                `<div class="no-results">No maids available for ${formatTimeSlot(timeSlot)}</div>`;
            return;
        }

        // Display results
        const results = availableMaids.map(maid => `
            <div class="maid-card">
                <div class="maid-info">
                    <h3>${maid.name}</h3>
                    <div class="maid-details">
                        <p><strong>ID:</strong> ${maid.maidId}</p>
                        <p><strong>Contact:</strong> ${maid.mobile}</p>
                        <p><strong>Current Work Location:</strong> Wing ${maid.wing}, Flat ${maid.flatNumber}</p>
                        <p><strong>Available Time Slots:</strong></p>
                        <div class="time-slots-list">
                            ${maid.timeSlots.map(slot => 
                                `<span class="time-slot-tag ${slot === timeSlot ? 'highlighted' : ''}">${formatTimeSlot(slot)}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        searchResults.innerHTML = results;

    } catch (error) {
        console.error('Error searching maids:', error);
        searchResults.innerHTML = 
            '<div class="no-results">Error loading maid data. Please try again.</div>';
    } finally {
        loadingIndicator.classList.remove('active');
    }
}

function formatTimeSlot(slot) {
    const slots = {
        '6-8': '6 AM - 8 AM',
        '8-10': '8 AM - 10 AM',
        '10-12': '10 AM - 12 PM',
        '12-2': '12 PM - 2 PM',
        '2-4': '2 PM - 4 PM',
        '4-6': '4 PM - 6 PM'
    };
    return slots[slot] || slot;
}

// Test database connection
database.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        console.log('Connected to Firebase Realtime Database');
    } else {
        console.log('Not connected to Firebase Realtime Database');
    }
});
