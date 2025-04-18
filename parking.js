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
let activeTab = 'all'; // Default active tab for requests

// DOM elements
const parkingSpotsContainer = document.getElementById('parking-spots-container');
const spotCountDisplay = document.getElementById('spot-count');
const vehicleTypeFilter = document.getElementById('vehicle-type');
const wingFilter = document.getElementById('wing-filter');
const applyFiltersBtn = document.getElementById('apply-filters');
const requestModal = document.getElementById('request-modal');
const confirmationModal = document.getElementById('confirmation-modal');
const myRequestsModal = document.getElementById('my-requests-modal');
const allRequestsModal = document.getElementById('all-requests-modal');
const myRequestsBtn = document.getElementById('my-requests-btn');
const allRequestsBtn = document.getElementById('all-requests-btn');
const closeModalBtns = document.querySelectorAll('.close-btn');
const cancelRequestBtn = document.getElementById('cancel-request');
const confirmOkBtn = document.getElementById('confirm-ok');
const parkingRequestForm = document.getElementById('parking-request-form');
const selectedSpotInfo = document.getElementById('selected-spot-info');
const myRequestsContainer = document.getElementById('my-requests-container');
const allRequestsContainer = document.getElementById('all-requests-container');
const pendingCountBadge = document.getElementById('pending-count');

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
  
  // Show or hide admin functions based on role
  toggleAdminFunctions();
  
  // Load available wings for filter
  loadWings();
  
  // Load available parking spots (with default filters)
  loadAvailableParkingSpots();
  
  // Initialize tab events for request modals
  initTabButtons();
  
  // Add event listeners
  applyFiltersBtn.addEventListener('click', loadAvailableParkingSpots);
  myRequestsBtn.addEventListener('click', openMyRequestsModal);
  
  if (isHigherRole && allRequestsBtn) {
    allRequestsBtn.addEventListener('click', openAllRequestsModal);
  }
  
  // Close modal buttons
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      closeAllModals();
    });
  });
  
  cancelRequestBtn.addEventListener('click', closeAllModals);
  confirmOkBtn.addEventListener('click', closeAllModals);
  
  // Handle parking request form submission
  parkingRequestForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitParkingRequest();
  });
  
  // Close modals when clicking outside of modal content
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeAllModals();
    }
  });
  
  // Set min date for request date input to today
  const dateInput = document.getElementById('request-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
  
  // Count pending requests if admin
  if (isHigherRole) {
    countPendingRequests();
  }
});

// Function to check if user has higher role permissions
function checkIfHigherRole(subRole) {
  const higherRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
  return higherRoles.includes(subRole);
}

// Function to toggle admin functions visibility based on role
function toggleAdminFunctions() {
  if (allRequestsBtn) {
    allRequestsBtn.style.display = isHigherRole ? 'flex' : 'none';
  }
}

// Function to initialize tab buttons for requests modals
function initTabButtons() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Get the status filter from the button's data attribute
      const statusFilter = button.getAttribute('data-status');
      
      // Find the parent modal
      const parentModal = button.closest('.modal');
      
      // Update active tab in the parent modal
      const tabsInSameModal = parentModal.querySelectorAll('.tab-btn');
      tabsInSameModal.forEach(tab => tab.classList.remove('active'));
      button.classList.add('active');
      
      // Determine which container to update based on the parent modal
      if (parentModal.id === 'my-requests-modal') {
        loadMyRequests(statusFilter);
      } else if (parentModal.id === 'all-requests-modal') {
        loadAllRequests(statusFilter);
      }
    });
  });
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

// Function to open My Requests modal
function openMyRequestsModal() {
  // Reset active tab to 'all'
  const tabButtons = myRequestsModal.querySelectorAll('.tab-btn');
  tabButtons.forEach(tab => tab.classList.remove('active'));
  const allTab = myRequestsModal.querySelector('.tab-btn[data-status="all"]');
  if (allTab) allTab.classList.add('active');
  
  // Set active tab
  activeTab = 'all';
  
  // Load user's requests
  loadMyRequests('all');
  
  // Show modal
  myRequestsModal.style.display = 'block';
}

// Function to open All Requests modal (admin only)
function openAllRequestsModal() {
  // Only proceed if user has higher role permissions
  if (!isHigherRole) return;
  
  // Reset active tab to 'pending'
  const tabButtons = allRequestsModal.querySelectorAll('.tab-btn');
  tabButtons.forEach(tab => tab.classList.remove('active'));
  const pendingTab = allRequestsModal.querySelector('.tab-btn[data-status="pending"]');
  if (pendingTab) pendingTab.classList.add('active');
  
  // Load all requests
  loadAllRequests('pending');
  
  // Show modal
  allRequestsModal.style.display = 'block';
}

// Function to close all modals
function closeAllModals() {
  const allModals = document.querySelectorAll('.modal');
  allModals.forEach(modal => {
    modal.style.display = 'none';
  });
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
    
    // Create notification for the owner - MODIFIED to store under resident's notifications
    const ownerNotificationsRef = ref(database, `residents/${ownerFlat}/notifications`);
    const newNotificationRef = push(ownerNotificationsRef);
    
    await set(newNotificationRef, {
      title: "New Parking Request",
      body: `${currentUser.name || 'A resident'} has requested to use your parking spot (${parkingId}) on ${date} from ${startTime} to ${endTime}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: "parking_request"
    });
    
    // Close request modal and show confirmation
    requestModal.style.display = 'none';
    confirmationModal.style.display = 'block';
    
    // Reset form
    parkingRequestForm.reset();
    
    // Update pending count for admins
    if (isHigherRole) {
      countPendingRequests();
    }
    
  } catch (error) {
    console.error("Error submitting parking request:", error);
    alert("Error submitting request. Please try again later.");
  }
}

// Function to load all requests (for admins)
async function loadAllRequests(statusFilter = 'pending') {
  if (!allRequestsContainer) return;
  
  // Show loading state
  allRequestsContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading requests...</p>
    </div>
  `;
  
  try {
    // Get all residents data to find parking requests
    const residentsRef = ref(database, 'residents');
    const snapshot = await get(residentsRef);
    
    if (snapshot.exists()) {
      const residents = snapshot.val();
      const filteredRequests = [];
      
      // Iterate through all residents
      for (const [userId, userData] of Object.entries(residents)) {
        // Check if resident has parking requests
        if (userData.parkingrequests) {
          // Iterate through this resident's parking requests
          for (const [requestId, requestData] of Object.entries(userData.parkingrequests)) {
            // Apply status filter
            if (statusFilter === 'all' || requestData.status === statusFilter) {
              filteredRequests.push({
                id: requestId,
                userId: userId, // Store the user ID with the request for reference
                ...requestData
              });
            }
          }
        }
      }
      
      // Sort by date (newest first)
      filteredRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Display the filtered requests
      displayRequestsInContainer(filteredRequests, allRequestsContainer, true);
    } else {
      allRequestsContainer.innerHTML = '<div class="no-results"><p>No requests found.</p></div>';
    }
  } catch (error) {
    console.error("Error loading requests:", error);
    allRequestsContainer.innerHTML = `
      <div class="no-results">
        <p>Error loading requests. Please try again later.</p>
        <p class="error-details">${error.message}</p>
      </div>
    `;
  }
}

// Function to load user's own requests
async function loadMyRequests(statusFilter = 'all') {
  if (!myRequestsContainer) return;
  
  // Update active tab
  activeTab = statusFilter;
  
  // Show loading state
  myRequestsContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading your requests...</p>
    </div>
  `;
  
  try {
    // Get user ID (use flat number as user ID if no other ID available)
    const userId = currentUser.id || currentUser.flatNumber || currentUser.apartment;
    
    if (!userId) {
      throw new Error("Could not identify user ID");
    }
    
    // Reference to user's parking requests
    const userRequestsRef = ref(database, `residents/${userId}/parkingrequests`);
    const snapshot = await get(userRequestsRef);
    
    if (snapshot.exists()) {
      const requests = snapshot.val();
      const filteredRequests = [];
      
      // Filter and format requests
      for (const [requestId, requestData] of Object.entries(requests)) {
        // Apply status filter (include 'closed' status only in 'all' view)
        if (statusFilter === 'all' || requestData.status === statusFilter) {
          filteredRequests.push({
            id: requestId,
            userId: userId,
            ...requestData
          });
        }
      }
      
      // Sort by date (newest first)
      filteredRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Display the filtered requests
      displayRequestsInContainer(filteredRequests, myRequestsContainer, false);
    } else {
      myRequestsContainer.innerHTML = '<div class="no-results"><p>You have not made any parking requests yet.</p></div>';
    }
  } catch (error) {
    console.error("Error loading user requests:", error);
    myRequestsContainer.innerHTML = `
      <div class="no-results">
        <p>Error loading your requests. Please try again later.</p>
        <p class="error-details">${error.message}</p>
      </div>
    `;
  }
}

// Function to count pending requests for badge display
async function countPendingRequests() {
  try {
    // Get all residents data to count parking requests
    const residentsRef = ref(database, 'residents');
    const snapshot = await get(residentsRef);
    
    if (snapshot.exists()) {
      const residents = snapshot.val();
      let pendingCount = 0;
      
      // Iterate through all residents
      for (const [userId, userData] of Object.entries(residents)) {
        // Check if resident has parking requests
        if (userData.parkingrequests) {
          // Count pending requests
          for (const requestData of Object.values(userData.parkingrequests)) {
            if (requestData.status === 'pending') {
              pendingCount++;
            }
          }
        }
      }
      
      // Update the badge count
      if (pendingCountBadge) {
        pendingCountBadge.textContent = pendingCount;
        pendingCountBadge.style.display = pendingCount > 0 ? 'inline' : 'none';
      }
    }
  } catch (error) {
    console.error("Error counting pending requests:", error);
  }
}

// Function to display requests in a container (works for both my requests and all requests)
function displayRequestsInContainer(requests, container, isAdminView = false) {
  if (!container) return;
  
  if (requests.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <p>No requests found matching the selected filter.</p>
      </div>
    `;
    return;
  }
  
  // Clear current content
  container.innerHTML = '';
  
  // Create a request card for each request
  requests.forEach(request => {
    const statusClass = request.status;
    const statusText = request.status.charAt(0).toUpperCase() + request.status.slice(1);
    
    const requestCard = document.createElement('div');
    requestCard.className = 'request-card';
    
    // Common request details HTML
    let cardHTML = `
      <div class="request-header">
        <h3>Request #${request.id.slice(-6)}</h3>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="request-detail">
        <span class="label">Parking Spot:</span>
        <span class="value">${request.parkingId}</span>
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
    `;
    
    // Add additional details for admin view
    if (isAdminView) {
      cardHTML += `
        <div class="request-detail">
          <span class="label">Requested by:</span>
          <span class="value">${request.requesterName} (Flat ${request.requesterFlat})</span>
        </div>
        <div class="request-detail">
          <span class="label">Owner Flat:</span>
          <span class="value">${request.ownerFlat}</span>
        </div>
      `;
    } else {
      cardHTML += `
        <div class="request-detail">
          <span class="label">Owner Flat:</span>
          <span class="value">${request.ownerFlat}</span>
        </div>
      `;
    }
    
    // Add reason for the request
    cardHTML += `
      <div class="request-detail">
        <span class="label">Reason:</span>
        <span class="value reason-text">${request.reason}</span>
      </div>
    `;
    
    // Add action buttons for admin view and pending status
    if (isAdminView && request.status === 'pending') {
      cardHTML += `
        <div class="request-actions">
          <button class="btn approve-btn" data-request-id="${request.id}" data-user-id="${request.userId}" data-owner-flat="${request.ownerFlat}" data-parking-number="${request.parkingNumber}">
            Approve
          </button>
          <button class="btn reject-btn" data-request-id="${request.id}" data-user-id="${request.userId}">
            Reject
          </button>
        </div>
      `;
    }
    
    // Add action buttons for user's own requests based on status
    if (!isAdminView) {
      if (request.status === 'pending') {
        cardHTML += `
          <div class="request-actions">
            <button class="btn delete-btn" data-request-id="${request.id}" data-user-id="${request.userId}">
              Delete Request
            </button>
          </div>
        `;
      } else if (request.status === 'approved') {
        cardHTML += `
          <div class="request-actions">
            <button class="btn close-btn-request" data-request-id="${request.id}" data-user-id="${request.userId}" data-owner-flat="${request.ownerFlat}" data-parking-number="${request.parkingNumber}">
              Close Request
            </button>
          </div>
        `;
      }
    }
    
    // Set the card HTML
    requestCard.innerHTML = cardHTML;
    
    // Add the card to the container
    container.appendChild(requestCard);
    
    // Add event listeners to action buttons
    if (isAdminView && request.status === 'pending') {
      // Admin buttons for pending requests
      const approveBtn = requestCard.querySelector('.approve-btn');
      const rejectBtn = requestCard.querySelector('.reject-btn');
      
      if (approveBtn) {
        approveBtn.addEventListener('click', () => {
          approveRequest(request.userId, request.id, request.ownerFlat, request.parkingNumber, request);
        });
      }
      
      if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
          rejectRequest(request.userId, request.id, request);
        });
      }
    } else if (!isAdminView) {
      // User buttons for their own requests
      if (request.status === 'pending') {
        const deleteBtn = requestCard.querySelector('.delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => {
            deleteRequest(request.userId, request.id);
          });
        }
      } else if (request.status === 'approved') {
        const closeBtn = requestCard.querySelector('.close-btn-request');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            closeRequest(request.userId, request.id, request.ownerFlat, request.parkingNumber, request);
          });
        }
      }
    }
  });
}

// Function to delete a pending request
async function deleteRequest(userId, requestId) {
  try {
    // Ask for confirmation before deleting
    if (!confirm("Are you sure you want to delete this request?")) {
      return; // User cancelled the action
    }
    
    // Delete the request from the database
    const requestRef = ref(database, `residents/${userId}/parkingrequests/${requestId}`);
    await set(requestRef, null);
    
    // Reload the user's requests to refresh the list
    loadMyRequests(activeTab);
    
    // Update pending count badge if user is admin
    if (isHigherRole) {
      countPendingRequests();
    }
    
    // Show success message
    alert('Request deleted successfully!');
    
  } catch (error) {
    console.error("Error deleting request:", error);
    alert("Error deleting request. Please try again later.");
  }
}

// Function to close an approved request and free up the parking spot
async function closeRequest(userId, requestId, ownerFlat, parkingNumber, requestData) {
  try {
    // Ask for confirmation before closing
    if (!confirm("Are you sure you want to close this request? This will mark the parking spot as available again.")) {
      return; // User cancelled the action
    }
    
    // 1. Update the request status to closed
    const requestRef = ref(database, `residents/${userId}/parkingrequests/${requestId}`);
    await update(requestRef, { status: 'closed' });
    
    // 2. Change the parking spot status back to available
    const parkingRef = ref(database, `residents/${ownerFlat}/parking/${parkingNumber}`);
    await update(parkingRef, { slot_status: 'available' });
    
    // 3. Create notification for the owner - MODIFIED to store under owner's notifications
    const ownerNotificationsRef = ref(database, `residents/${ownerFlat}/notifications`);
    const newNotificationRef = push(ownerNotificationsRef);
    
    await set(newNotificationRef, {
      title: "Parking Spot Released",
      body: `${requestData.requesterName} has released your parking spot (${requestData.parkingId}) that was used on ${requestData.date}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: "parking_release"
    });
    
    // 4. Reload the user's requests to refresh the list
    loadMyRequests(activeTab);
    
    // 5. Update available parking spots if the current date matches the request date
    const today = new Date().toISOString().split('T')[0];
    if (today === requestData.date) {
      loadAvailableParkingSpots();
    }
    
    // 6. Show success message
    alert('Request closed successfully! The parking spot is now available again.');
    
  } catch (error) {
    console.error("Error closing request:", error);
    alert("Error closing request. Please try again later.");
  }
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
    
    // 3. Create notification for the requester - MODIFIED to store under requester's notifications
    const requesterNotificationsRef = ref(database, `residents/${requestData.requesterFlat}/notifications`);
    const newNotificationRef = push(requesterNotificationsRef);
    
    await set(newNotificationRef, {
      title: "Parking Request Approved",
      body: `Your request to use parking spot ${requestData.parkingId} on ${requestData.date} from ${requestData.startTime} to ${requestData.endTime} has been approved.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: "parking_approval"
    });
    
    // 4. Reload the requests to refresh the list
    loadAllRequests('pending');
    
    // 5. Update pending count badge
    countPendingRequests();
    
    // 6. Show success message
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
    
    // 2. Create notification for the requester - MODIFIED to store under requester's notifications
    const requesterNotificationsRef = ref(database, `residents/${requestData.requesterFlat}/notifications`);
    const newNotificationRef = push(requesterNotificationsRef);
    
    await set(newNotificationRef, {
      title: "Parking Request Rejected",
      body: `Your request to use parking spot ${requestData.parkingId} on ${requestData.date} has been rejected.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: "parking_rejection"
    });
    
    // 3. Reload the requests to refresh the list
    loadAllRequests('pending');
    
    // 4. Update pending count badge
    countPendingRequests();
    
    // 5. Show success message
    alert('Request rejected successfully!');
    
  } catch (error) {
    console.error("Error rejecting request:", error);
    alert("Error rejecting request. Please try again later.");
  }
}
