// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, query, orderByChild, equalTo, push, set, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

// Current user data
let currentUser = null;

// DOM elements
const welcomeMessage = document.getElementById('welcome-message');
const userRole = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');
const parkingSpotsContainer = document.getElementById('parking-spots-container');
const spotCountDisplay = document.getElementById('spot-count');
const vehicleTypeFilter = document.getElementById('vehicle-type');
const wingFilter = document.getElementById('wing-filter');
const applyFiltersBtn = document.getElementById('apply-filters');
const requestModal = document.getElementById('request-modal');
const confirmationModal = document.getElementById('confirmation-modal');
const closeModalBtn = document.querySelector('.close-btn');
const cancelRequestBtn = document.getElementById('cancel-request');
const confirmOkBtn = document.getElementById('confirm-ok');
const parkingRequestForm = document.getElementById('parking-request-form');
const selectedSpotInfo = document.getElementById('selected-spot-info');

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (!loggedInUser) {
    // Redirect to login page if not logged in
    window.location.href = 'login.html';
    return;
  }
  
  // Parse user data
  currentUser = JSON.parse(loggedInUser);
  
  // Update welcome message and role
  welcomeMessage.textContent = `Hi ${currentUser.name || 'there'}`;
  
  let roleText = `${currentUser.role}`;
  if (currentUser.sub_role) {
    roleText += ` (${currentUser.sub_role})`;
  }
  
  userRole.textContent = roleText;
  
  // Load available wings for filter
  loadWings();
  
  // Load available parking spots (with default filters)
  loadAvailableParkingSpots();
  
  // Add event listeners
  applyFiltersBtn.addEventListener('click', loadAvailableParkingSpots);
  logoutBtn.addEventListener('click', logout);
  closeModalBtn.addEventListener('click', closeModals);
  cancelRequestBtn.addEventListener('click', closeModals);
  confirmOkBtn.addEventListener('click', closeModals);
  
  // Handle parking request form submission
  parkingRequestForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitParkingRequest();
  });
  
  // Close modals when clicking outside of modal content
  window.addEventListener('click', (e) => {
    if (e.target === requestModal || e.target === confirmationModal) {
      closeModals();
    }
  });
  
  // Set min date for request date input to today
  const dateInput = document.getElementById('request-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
});

// Function to load unique wings from residents data
async function loadWings() {
  try {
    const dbRef = ref(database, 'residents');
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      const residents = snapshot.val();
      const wings = new Set();
      
      // Extract unique wings
      Object.values(residents).forEach(resident => {
        if (resident.wing) {
          wings.add(resident.wing);
        }
      });
      
      // Sort wings alphabetically
      const sortedWings = Array.from(wings).sort();
      
      // Clear current options except "All Wings"
      while (wingFilter.options.length > 1) {
        wingFilter.remove(1);
      }
      
      // Add wing options to select dropdown
      sortedWings.forEach(wing => {
        const option = document.createElement('option');
        option.value = wing;
        option.textContent = `Wing ${wing}`;
        wingFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading wings:", error);
  }
}

// Function to load available parking spots
async function loadAvailableParkingSpots() {
  // Show loading state
  parkingSpotsContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading available parking spots...</p>
    </div>
  `;
  
  try {
    // Get filter values
    const vehicleType = vehicleTypeFilter.value;
    const wing = wingFilter.value;
    
    const dbRef = ref(database, 'residents');
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      const residents = snapshot.val();
      const availableSpots = [];
      
      // Extract all available parking spots
      for (const [flatNumber, resident] of Object.entries(residents)) {
        if (resident.parking) {
          for (const [parkingNumber, parkingDetails] of Object.entries(resident.parking)) {
            // Only include spots that are available
            if (parkingDetails.slot_status === 'available') {
              // Apply vehicle type filter if selected
              if (vehicleType === 'all' || parkingDetails.vehicleType === vehicleType) {
                // Apply wing filter if selected
                if (wing === 'all' || resident.wing === wing) {
                  availableSpots.push({
                    id: parkingDetails.parkingId,
                    flatNumber,
                    wing: resident.wing,
                    ownerName: resident.Owner_Name || 'Unknown',
                    buildingName: resident.buildingName || 'Azziano',
                    vehicleType: parkingDetails.vehicleType,
                    parkingNumber
                  });
                }
              }
            }
          }
        }
      }
      
      // Update the spot count display
      spotCountDisplay.textContent = `${availableSpots.length} spots available`;
      
      // Display the available spots
      displayParkingSpots(availableSpots);
    } else {
      parkingSpotsContainer.innerHTML = '<p>No residents data found.</p>';
      spotCountDisplay.textContent = '0 spots available';
    }
  } catch (error) {
    console.error("Error loading parking spots:", error);
    parkingSpotsContainer.innerHTML = `
      <p>Error loading parking spots. Please try again later.</p>
      <p class="error-details">${error.message}</p>
    `;
    spotCountDisplay.textContent = '0 spots available';
  }
}

// Function to display parking spots
function displayParkingSpots(spots) {
  if (spots.length === 0) {
    parkingSpotsContainer.innerHTML = `
      <div class="no-results">
        <p>No available parking spots match your filters.</p>
        <p>Try changing your filter criteria.</p>
      </div>
    `;
    return;
  }
  
  // Clear current spots
  parkingSpotsContainer.innerHTML = '';
  
  // Create a spot card for each available spot
  spots.forEach(spot => {
    const spotCard = document.createElement('div');
    spotCard.className = 'parking-spot';
    spotCard.innerHTML = `
      <h3>Parking ID: ${spot.id}</h3>
      <div class="spot-detail">
        <span class="label">Wing:</span>
        <span class="value">${spot.wing}</span>
      </div>
      <div class="spot-detail">
        <span class="label">Flat Number:</span>
        <span class="value">${spot.flatNumber}</span>
      </div>
      <div class="spot-detail">
        <span class="label">Owner:</span>
        <span class="value">${spot.ownerName}</span>
      </div>
      <div class="spot-detail">
        <span class="label">Vehicle Type:</span>
        <span class="value">${spot.vehicleType === '2' ? 'Two Wheeler' : 'Four Wheeler'}</span>
      </div>
      <div class="spot-detail">
        <span class="label">Building:</span>
        <span class="value">${spot.buildingName}</span>
      </div>
      <div class="spot-actions">
        <button class="btn primary-btn request-spot-btn" data-spot-id="${spot.id}" data-flat="${spot.flatNumber}" data-parking-number="${spot.parkingNumber}">
          Request Spot
        </button>
      </div>
    `;
    
    // Add spot card to container
    parkingSpotsContainer.appendChild(spotCard);
    
    // Add event listener to request button
    const requestBtn = spotCard.querySelector('.request-spot-btn');
    requestBtn.addEventListener('click', () => {
      openRequestModal(spot);
    });
  });
}

// Function to open the request modal
function openRequestModal(spot) {
  // Set hidden parking ID field
  document.getElementById('parking-id').value = spot.id;
  
  // Display selected spot information
  selectedSpotInfo.innerHTML = `
    <p><strong>Selected Parking Spot: ${spot.id}</strong></p>
    <p>Wing ${spot.wing}, Flat ${spot.flatNumber}</p>
    <p>Vehicle Type: ${spot.vehicleType === '2' ? 'Two Wheeler' : 'Four Wheeler'}</p>
  `;
  
  // Store spot data in form for submission
  parkingRequestForm.dataset.spotId = spot.id;
  parkingRequestForm.dataset.ownerFlat = spot.flatNumber;
  parkingRequestForm.dataset.parkingNumber = spot.parkingNumber;
  
  // Show request modal
  requestModal.style.display = 'block';
}

// Function to submit parking request
async function submitParkingRequest() {
  try {
    const parkingId = parkingRequestForm.dataset.spotId;
    const ownerFlat = parkingRequestForm.dataset.ownerFlat;
    const parkingNumber = parkingRequestForm.dataset.parkingNumber;
    const date = document.getElementById('request-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const reason = document.getElementById('request-reason').value;
    const vehicleNumber = document.getElementById('vehicle-number').value;
    
    // Create a new parking request
    const parkingRequestsRef = ref(database, 'parkingRequests');
    const newRequestRef = push(parkingRequestsRef);
    
    await set(newRequestRef, {
      parkingId,
      ownerFlat,
      requesterFlat: currentUser.apartment,
      requesterName: currentUser.name || 'Unknown',
      date,
      startTime,
      endTime,
      reason,
      vehicleNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
      parkingNumber
    });
    
    // Create notification for the owner
    const notificationsRef = ref(database, 'notifications');
    const newNotificationRef = push(notificationsRef);
    
    await set(newNotificationRef, {
      title: "New Parking Request",
      body: `${currentUser.name || 'A resident'} has requested to use your parking spot (${parkingId}) on ${date} from ${startTime} to ${endTime}.`,
      timestamp: new Date().toISOString()
    });
    
    // Close request modal and show confirmation
    requestModal.style.display = 'none';
    confirmationModal.style.display = 'block';
    
    // Reset form
    parkingRequestForm.reset();
    
  } catch (error) {
    console.error("Error submitting parking request:", error);
    alert("Error submitting request. Please try again later.");
  }
}

// Function to close all modals
function closeModals() {
  requestModal.style.display = 'none';
  confirmationModal.style.display = 'none';
}

// Function for logging out
function logout() {
  sessionStorage.removeItem('loggedInUser');
  window.location.href = 'homepage.html';
}
