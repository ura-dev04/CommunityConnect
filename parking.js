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

// Global variables
let currentUser = null;
let isHigherRole = false; // Flag to track if user has higher-level permissions

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
const requestsContainer = document.getElementById('pending-requests-container');
const pendingRequestsSection = document.getElementById('pending-requests-section');

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
  
  // Check if user has higher-level access
  isHigherRole = checkIfHigherRole(currentUser.sub_role);
  
  // Update welcome message and role
  welcomeMessage.textContent = `Hi ${currentUser.name || 'there'}`;
  
  let roleText = `${currentUser.role}`;
  if (currentUser.sub_role) {
    roleText += ` (${currentUser.sub_role})`;
  }
  
  userRole.textContent = roleText;
  
  // Show or hide admin functions based on role
  toggleAdminFunctions();
  
  // Load available wings for filter
  loadWings();
  
  // Load available parking spots (with default filters)
  loadAvailableParkingSpots();
  
  // Load pending requests if user has higher role
  if (isHigherRole) {
    loadPendingRequests();
  }
  
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

// Function to check if user has higher role permissions
function checkIfHigherRole(subRole) {
  const higherRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
  return higherRoles.includes(subRole);
}

// Function to toggle admin functions visibility based on role
function toggleAdminFunctions() {
  if (pendingRequestsSection) {
    pendingRequestsSection.style.display = isHigherRole ? 'block' : 'none';
  }
}

// Function to load unique wings from residents data
async function loadWings() {
  try {
    // Show loading state in the wing filter dropdown
    wingFilter.innerHTML = '<option value="all">Loading wings...</option>';
    
    // Get all residents data
    const dbRef = ref(database, 'residents');
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      const residents = snapshot.val();
      const wings = new Set();
      
      // Extract unique wings from resident data
      for (const [flatNumber, resident] of Object.entries(residents)) {
        if (resident && resident.wing) {
          wings.add(resident.wing);
        }
      }
      
      // Sort wings alphabetically
      const sortedWings = Array.from(wings).sort((a, b) => {
        // Handle numeric and alphabetic wings properly
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        
        // If both are numbers, compare numerically
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        
        // Otherwise sort as strings
        return a.localeCompare(b);
      });
      
      // Clear current options
      wingFilter.innerHTML = '';
      
      // Add "All Wings" option
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'All Wings';
      wingFilter.appendChild(allOption);
      
      // Add wing options to select dropdown
      sortedWings.forEach(wing => {
        const option = document.createElement('option');
        option.value = wing;
        option.textContent = `Wing ${wing}`;
        wingFilter.appendChild(option);
      });
      
      console.log(`Successfully loaded ${sortedWings.length} wings for filtering`);
    } else {
      // If no data exists, reset to default option
      wingFilter.innerHTML = '<option value="all">All Wings</option>';
      console.log("No resident data found for wings");
    }
  } catch (error) {
    console.error("Error loading wings:", error);
    wingFilter.innerHTML = '<option value="all">All Wings</option>';
    alert("Error loading building wings. Please try again later.");
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
    
    // Get all residents data since we need to filter on multiple criteria
    // Note: We can't use the wing index directly because parking status is nested
    const dbRef = ref(database, 'residents');
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      const residents = snapshot.val();
      const availableSpots = [];
      
      // Extract all available parking spots
      for (const [flatNumber, resident] of Object.entries(residents)) {
        // Skip if resident has no parking or doesn't match wing filter
        if (!resident.parking || (wing !== 'all' && resident.wing !== wing)) {
          continue;
        }
        
        // Process each parking spot for this resident
        for (const [parkingNumber, parkingDetails] of Object.entries(resident.parking)) {
          // Only include spots that are available
          if (parkingDetails.slot_status === 'available') {
            // Apply vehicle type filter if selected
            if (vehicleType === 'all' || parkingDetails.vehicleType === vehicleType) {
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
    
    // Get requester's user ID (use flat number as user ID if no other ID available)
    const userId = currentUser.id || currentUser.flatNumber || currentUser.apartment;
    
    if (!userId) {
      throw new Error("Could not identify user ID for request");
    }
    
    // Create a new parking request under the resident's ID
    const userRequestsRef = ref(database, `residents/${userId}/parkingrequests`);
    const newRequestRef = push(userRequestsRef);
    
    await set(newRequestRef, {
      parkingId,
      ownerFlat,
      requesterFlat: currentUser.apartment || currentUser.flatNumber, // Get flat from user data
      requesterName: currentUser.name || 'Unknown',
      requesterUserId: userId,
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

// Function to load pending parking requests
async function loadPendingRequests() {
  // Show loading state
  if (requestsContainer) {
    requestsContainer.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading pending requests...</p>
      </div>
    `;
    
    try {
      // Get all residents data to find parking requests
      const residentsRef = ref(database, 'residents');
      const snapshot = await get(residentsRef);
      
      if (snapshot.exists()) {
        const residents = snapshot.val();
        const pendingRequests = [];
        
        // Iterate through all residents
        for (const [userId, userData] of Object.entries(residents)) {
          // Check if resident has parking requests
          if (userData.parkingrequests) {
            // Iterate through this resident's parking requests
            for (const [requestId, requestData] of Object.entries(userData.parkingrequests)) {
              if (requestData.status === 'pending') {
                pendingRequests.push({
                  id: requestId,
                  userId: userId, // Store the user ID with the request for reference
                  ...requestData
                });
              }
            }
          }
        }
        
        // Sort by date (newest first)
        pendingRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Update count display if it exists
        const requestCountDisplay = document.getElementById('request-count');
        if (requestCountDisplay) {
          requestCountDisplay.textContent = `${pendingRequests.length} pending requests`;
        }
        
        // Display the pending requests
        displayPendingRequests(pendingRequests);
      } else {
        requestsContainer.innerHTML = '<p>No pending requests found.</p>';
        
        // Update count display if it exists
        const requestCountDisplay = document.getElementById('request-count');
        if (requestCountDisplay) {
          requestCountDisplay.textContent = '0 pending requests';
        }
      }
    } catch (error) {
      console.error("Error loading pending requests:", error);
      requestsContainer.innerHTML = `
        <p>Error loading pending requests. Please try again later.</p>
        <p class="error-details">${error.message}</p>
      `;
    }
  }
}

// Function to display pending requests
function displayPendingRequests(requests) {
  if (!requestsContainer) return;
  
  if (requests.length === 0) {
    requestsContainer.innerHTML = `
      <div class="no-results">
        <p>No pending parking requests at this time.</p>
      </div>
    `;
    return;
  }
  
  // Clear current content
  requestsContainer.innerHTML = '';
  
  // Create a request card for each pending request
  requests.forEach(request => {
    const requestCard = document.createElement('div');
    requestCard.className = 'request-card';
    requestCard.innerHTML = `
      <div class="request-header">
        <h3>Request #${request.id.slice(-6)}</h3>
        <span class="status-badge pending">Pending</span>
      </div>
      <div class="request-detail">
        <span class="label">Requested by:</span>
        <span class="value">${request.requesterName} (Flat ${request.requesterFlat})</span>
      </div>
      <div class="request-detail">
        <span class="label">Parking Spot:</span>
        <span class="value">${request.parkingId}</span>
      </div>
      <div class="request-detail">
        <span class="label">Owner Flat:</span>
        <span class="value">${request.ownerFlat}</span>
      </div>
      <div class="request-detail">
        <span class="label">Date:</span>
        <span class="value">${request.date}</span>
      </div>
      <div class="request-detail">
        <span class="label">Time:</span>
        <span class="value">${request.startTime} - ${request.endTime}</span>
      </div>
      <div class="request-detail">
        <span class="label">Vehicle Number:</span>
        <span class="value">${request.vehicleNumber}</span>
      </div>
      <div class="request-detail">
        <span class="label">Reason:</span>
        <span class="value reason-text">${request.reason}</span>
      </div>
      <div class="request-actions">
        <button class="btn primary-btn approve-btn" data-request-id="${request.id}" data-user-id="${request.userId}" data-owner-flat="${request.ownerFlat}" data-parking-number="${request.parkingNumber}">
          Approve
        </button>
        <button class="btn secondary-btn reject-btn" data-request-id="${request.id}" data-user-id="${request.userId}">
          Reject
        </button>
      </div>
    `;
    
    // Add request card to container
    requestsContainer.appendChild(requestCard);
    
    // Add event listeners to approve/reject buttons
    const approveBtn = requestCard.querySelector('.approve-btn');
    const rejectBtn = requestCard.querySelector('.reject-btn');
    
    approveBtn.addEventListener('click', () => {
      approveRequest(request.userId, request.id, request.ownerFlat, request.parkingNumber, request);
    });
    
    rejectBtn.addEventListener('click', () => {
      rejectRequest(request.userId, request.id, request);
    });
  });
}

// Function to approve a parking request
async function approveRequest(userId, requestId, ownerFlat, parkingNumber, requestData) {
  try {
    // 1. Update the request status to approved
    const requestRef = ref(database, `residents/${userId}/parkingrequests/${requestId}`);
    await update(requestRef, { status: 'approved' });
    
    // 2. Change the parking spot status to temp_hold
    const parkingRef = ref(database, `residents/${ownerFlat}/parking/${parkingNumber}`);
    await update(parkingRef, { slot_status: 'temp_hold' });
    
    // 3. Create notification for the requester
    const notificationsRef = ref(database, 'notifications');
    const newNotificationRef = push(notificationsRef);
    
    await set(newNotificationRef, {
      title: "Parking Request Approved",
      body: `Your request to use parking spot ${requestData.parkingId} on ${requestData.date} from ${requestData.startTime} to ${requestData.endTime} has been approved.`,
      timestamp: new Date().toISOString(),
      targetUser: requestData.requesterFlat
    });
    
    // 4. Reload pending requests to refresh the list
    loadPendingRequests();
    
    // 5. Show success message
    alert('Request approved successfully!');
    
  } catch (error) {
    console.error("Error approving request:", error);
    alert("Error approving request. Please try again later.");
  }
}

// Function to reject a parking request
async function rejectRequest(userId, requestId, requestData) {
  try {
    // 1. Update the request status to rejected
    const requestRef = ref(database, `residents/${userId}/parkingrequests/${requestId}`);
    await update(requestRef, { status: 'rejected' });
    
    // 2. Create notification for the requester
    const notificationsRef = ref(database, 'notifications');
    const newNotificationRef = push(notificationsRef);
    
    await set(newNotificationRef, {
      title: "Parking Request Rejected",
      body: `Your request to use parking spot ${requestData.parkingId} on ${requestData.date} has been rejected.`,
      timestamp: new Date().toISOString(),
      targetUser: requestData.requesterFlat
    });
    
    // 3. Reload pending requests to refresh the list
    loadPendingRequests();
    
    // 4. Show success message
    alert('Request rejected successfully!');
    
  } catch (error) {
    console.error("Error rejecting request:", error);
    alert("Error rejecting request. Please try again later.");
  }
}

// Function for logging out
function logout() {
  sessionStorage.removeItem('loggedInUser');
  window.location.href = 'homepage.html';
}
