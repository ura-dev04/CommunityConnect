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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const loadingIndicator = document.getElementById('loadingIndicator');
const searchResults = document.getElementById('searchResults');

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
            maid.timeSlots.includes(timeSlot));

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
                                `<span class="time-slot-tag">${formatTimeSlot(slot)}</span>`
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
