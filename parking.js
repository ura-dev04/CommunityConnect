import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, push, get, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

const TOTAL_SLOTS = 50;
let availableSlots = TOTAL_SLOTS;

function generateParkingId(wing, slotNumber) {
    return `${wing}${slotNumber}`;
}

function updateAvailableSlots() {
    document.querySelector('.stats').innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${TOTAL_SLOTS}</div>
            <div class="stat-label">Total Slots</div>
        </div>
        <div class="stat-card">
            <div class="stat-value ${availableSlots < 10 ? 'low-availability' : ''}">${availableSlots}</div>
            <div class="stat-label">Available</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${TOTAL_SLOTS - availableSlots}</div>
            <div class="stat-label">Occupied</div>
        </div>
    `;
}

function displayBookedSlot(parkingData) {
    const parkingId = generateParkingId(parkingData.wing, parkingData.slotNumber);
    document.getElementById('parkingDetails').innerHTML = `
        <div class="parking-id">${parkingId}</div>
        <p><strong>Flat:</strong> ${parkingData.flatNumber}</p>
        <p><strong>Wing:</strong> ${parkingData.wing}</p>
        <p><strong>Slot Number:</strong> ${parkingData.slotNumber}</p>
        <p><strong>Vehicle Type:</strong> ${parkingData.vehicleType} Wheeler</p>
    `;
}

// Handle parking form submission
document.getElementById('parkingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const flatNumber = document.getElementById('flatNumber').value;
    const wing = document.getElementById('wing').value.toUpperCase();
    const buildingName = document.getElementById('buildingName').value;
    const vehicleType = document.getElementById('vehicleType').value;

    try {
        // Check existing parking in Firebase
        const parkingRef = ref(database, 'parkings');
        const snapshot = await get(parkingRef);
        const parkings = snapshot.val() || {};
        
        const hasParking = Object.values(parkings).some(p => p.flatNumber === flatNumber);
        
        if (hasParking) {
            alert('This flat already has a parking assignment!');
            return;
        }

        if (availableSlots > 0) {
            const parkingSlot = TOTAL_SLOTS - availableSlots + 1;
            
            const parkingData = {
                flatNumber,
                wing,
                buildingName,
                vehicleType,
                slotNumber: parkingSlot,
                parkingId: generateParkingId(wing, parkingSlot),
                timestamp: Date.now()
            };
            
            // Save to Firebase
            const newParkingRef = push(ref(database, 'parkings'));
            await set(newParkingRef, parkingData);

            availableSlots--;
            
            updateAvailableSlots();
            displayBookedSlot(parkingData);
            
            alert(`Parking ID ${parkingData.parkingId} assigned successfully!`);
        } else {
            alert(`Sorry, no parking slots available in Wing ${wing}!`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while assigning parking.');
    }
});

document.getElementById('showBookedSlots').addEventListener('click', async () => {
    const bookedSlotsList = document.getElementById('bookedSlotsList');
    bookedSlotsList.innerHTML = '<p>Loading...</p>';
    
    try {
        const parkingRef = ref(database, 'parkings');
        const snapshot = await get(parkingRef);
        const parkings = snapshot.val() || {};
        
        bookedSlotsList.innerHTML = '';
        Object.values(parkings).forEach(parking => {
            const parkingId = generateParkingId(parking.wing, parking.slotNumber);
            const slotCard = document.createElement('div');
            slotCard.className = 'booked-slot-card';
            slotCard.innerHTML = `
                <div class="slot-id">${parkingId}</div>
                <p><strong>Flat:</strong> ${parking.flatNumber}</p>
                <p><strong>Building:</strong> ${parking.buildingName}</p>
                <p><strong>Vehicle Type:</strong> ${parking.vehicleType} Wheeler</p>
                <p><strong>Booked On:</strong> ${new Date(parking.timestamp).toLocaleDateString()}</p>
            `;
            bookedSlotsList.appendChild(slotCard);
        });
        
        if (Object.keys(parkings).length === 0) {
            bookedSlotsList.innerHTML = '<p>No booked parking slots found.</p>';
        }
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        bookedSlotsList.innerHTML = '<p>Error loading booked slots.</p>';
    }
});

// Update initial load function
window.addEventListener('load', async () => {
    try {
        const parkingRef = ref(database, 'parkings');
        const snapshot = await get(parkingRef);
        const parkings = snapshot.val() || {};
        
        Object.values(parkings).forEach(parking => {
            availableSlots--;
        });
        
        updateAvailableSlots();
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
});
