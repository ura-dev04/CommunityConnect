import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

// Ensure DOM is loaded before accessing elements
document.addEventListener("DOMContentLoaded", function() {
    // Get form and UI elements
    const form = document.getElementById('residentForm');
    const formContainer = document.getElementById('registration-form');
    const addResidentBtn = document.getElementById('addResidentBtn');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const overlay = document.getElementById('overlay');
    const residentsGrid = document.getElementById('residents-grid');
    const loadingIndicator = document.getElementById('loading');
    const welcomeMessage = document.getElementById('welcome-message');
    const userRoleDisplay = document.getElementById('user-role');
    const logoutBtn = document.querySelector('.logout-btn');
    const roleSelect = document.getElementById('role');
    const subRoleGroup = document.getElementById('sub-role-group');
    const addParkingBtn = document.getElementById('add-parking-btn');
    const parkingContainer = document.getElementById('parking-container');
    const messageElement = document.getElementById('message');
    let parkingCounter = 1; // Start from 1 since we already have slot 0

    // Show/hide sub-role dropdown based on role selection
    roleSelect.addEventListener('change', function() {
        if (this.value === 'MC') {
            subRoleGroup.style.display = 'block';
        } else {
            subRoleGroup.style.display = 'none';
        }
    });

    // Add event listener for adding more parking slots
    addParkingBtn.addEventListener('click', addParkingSlot);

    // Event delegation for removing parking slots
    parkingContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-parking-btn')) {
            const parkingGroup = e.target.parentElement;
            parkingGroup.remove();
            
            // If there's only one parking slot left, hide its remove button
            if (parkingContainer.querySelectorAll('.parking-form-group').length <= 1) {
                parkingContainer.querySelector('.remove-parking-btn').style.display = 'none';
            }
        }
    });

    // Function to add a new parking slot
    function addParkingSlot() {
        // Show all remove buttons when we're adding more than one slot
        const removeButtons = parkingContainer.querySelectorAll('.remove-parking-btn');
        removeButtons.forEach(btn => btn.style.display = 'block');
        
        const newParkingGroup = document.createElement('div');
        newParkingGroup.className = 'parking-form-group';
        newParkingGroup.dataset.index = parkingCounter;
        
        newParkingGroup.innerHTML = `
            <div class="parking-inputs">
                <div class="form-group">
                    <label for="parkingId-${parkingCounter}">Parking ID:</label>
                    <input type="text" id="parkingId-${parkingCounter}" placeholder="e.g. F1" required>
                </div>
                <div class="form-group">
                    <label for="vehicleType-${parkingCounter}">Vehicle Type:</label>
                    <select id="vehicleType-${parkingCounter}">
                        <option value="2">2-Wheeler</option>
                        <option value="4">4-Wheeler</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="slotStatus-${parkingCounter}">Status:</label>
                    <select id="slotStatus-${parkingCounter}">
                        <option value="available">Available</option>
                        <option value="full">Full</select>
                </div>
            </div>
            <button type="button" class="remove-parking-btn">&times;</button>
        `;
        
        parkingContainer.appendChild(newParkingGroup);
        parkingCounter++;
        
        // Scroll to show the newly added parking slot
        setTimeout(() => {
            newParkingGroup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    // Check if user is logged in
    const loggedInUser = sessionStorage.getItem('loggedInUser');

    if (!loggedInUser) {
        // User is not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }

    // Get user data
    const userData = JSON.parse(loggedInUser);
    
    // Display user info in navbar
    welcomeMessage.textContent = `Hi ${userData.name}`;
    let roleText = `${userData.role}`;
    if (userData.sub_role) {
        roleText += ` (${userData.sub_role})`;
    }
    userRoleDisplay.textContent = roleText;
    
    // Apply role-based access control
    applyRoleBasedAccess(userData.sub_role || userData.role);

    // Load residents data when page loads
    loadResidents();

    // Toggle form visibility 
    addResidentBtn.addEventListener('click', () => {
        formContainer.style.display = 'block';
        overlay.style.display = 'block';
    });

    closeFormBtn.addEventListener('click', () => {
        formContainer.style.display = 'none';
        overlay.style.display = 'none';
        messageElement.textContent = '';
        messageElement.style.display = 'none';
        form.reset();
        subRoleGroup.style.display = 'none';
    });

    overlay.addEventListener('click', () => {
        formContainer.style.display = 'none';
        overlay.style.display = 'none';
        messageElement.textContent = '';
        messageElement.style.display = 'none';
    });

    // Handle logout button click
    logoutBtn.addEventListener('click', () => {
        // Remove user data from session storage
        sessionStorage.removeItem('loggedInUser');
        // Redirect to homepage after logout
        window.location.href = 'homepage.html';
    });

    // Handle form submission
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Get input values
            const name = document.getElementById('Owner_Name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const flatNumber = document.getElementById('flatNumber').value;
            const floor = document.getElementById('floor').value;
            const wing = document.getElementById('wing').value;
            const role = document.getElementById('role').value;
            const subRole = role === 'MC' ? document.getElementById('sub_role').value : null;

            // Check if all fields are filled
            if (!name || !email || !phone || !flatNumber || !floor || !wing) {
                messageElement.textContent = "Please fill in all fields.";
                messageElement.style.display = 'block';
                // Ensure message is visible by scrolling to it
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
            }

            // Prepare resident data
            const residentData = {
                Owner_Name: name,
                email: email,
                phone: phone,
                flatNumber: flatNumber,
                floor: floor,
                wing: wing,
                role: role,
                password: "123456",
                notification_viewed: "false"
            };

            // Add sub_role if applicable
            if (subRole) {
                residentData.sub_role = subRole;
            }

            // Collect parking data
            const parkingSlots = parkingContainer.querySelectorAll('.parking-form-group');
            if (parkingSlots.length > 0) {
                residentData.parking = {};
                
                parkingSlots.forEach((slot, index) => {
                    const slotIndex = slot.dataset.index;
                    const parkingId = document.getElementById(`parkingId-${slotIndex}`).value;
                    const vehicleType = document.getElementById(`vehicleType-${slotIndex}`).value;
                    const slotStatus = document.getElementById(`slotStatus-${slotIndex}`).value;
                    
                    if (parkingId) {
                        residentData.parking[index + 1] = {
                            parkingId: parkingId,
                            vehicleType: vehicleType,
                            slot_status: slotStatus
                        };
                    }
                });
            }

            // Save data to Firebase Realtime Database
            set(ref(database, 'residents/' + flatNumber), residentData)
            .then(() => {
                messageElement.textContent = "Data saved successfully!";
                messageElement.style.display = 'block';
                // Scroll to see the success message
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                form.reset();
                subRoleGroup.style.display = 'none';
                
                // Reset parking slots to just one
                parkingContainer.innerHTML = `
                    <div class="parking-form-group" data-index="0">
                        <div class="parking-inputs">
                            <div class="form-group">
                                <label for="parkingId-0">Parking ID:</label>
                                <input type="text" id="parkingId-0" placeholder="e.g. F1" required>
                            </div>
                            <div class="form-group">
                                <label for="vehicleType-0">Vehicle Type:</label>
                                <select id="vehicleType-0">
                                    <option value="2">2-Wheeler</option>
                                    <option value="4">4-Wheeler</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="slotStatus-0">Status:</label>
                                <select id="slotStatus-0">
                                    <option value="available">Available</option>
                                    <option value="full">Full</option>
                                </select>
                            </div>
                        </div>
                        <button type="button" class="remove-parking-btn" style="display:none;">&times;</button>
                    </div>
                `;
                parkingCounter = 1;
                
                // Reload the residents list
                loadResidents();
                
                // Close the form after a short delay
                setTimeout(() => {
                    formContainer.style.display = 'none';
                    overlay.style.display = 'none';
                    messageElement.textContent = '';
                    messageElement.style.display = 'none';
                }, 1500);
            })
            .catch((error) => {
                messageElement.textContent = "Error: " + error.message;
                messageElement.style.display = 'block';
                // Scroll to see the error message
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });
    }

    // Function to load and display residents
    function loadResidents() {
        loadingIndicator.style.display = 'block';
        residentsGrid.innerHTML = ''; // Clear previous content
        
        const dbRef = ref(database);
        get(child(dbRef, 'residents')).then((snapshot) => {
            loadingIndicator.style.display = 'none';
            
            if (snapshot.exists()) {
                const residents = snapshot.val();
                
                // Sort residents by flat number
                const sortedResidents = Object.values(residents).sort((a, b) => 
                    a.flatNumber.localeCompare(b.flatNumber, undefined, {numeric: true})
                );
                
                if (sortedResidents.length === 0) {
                    residentsGrid.innerHTML = '<div class="loading">No residents found.</div>';
                    return;
                }
                
                sortedResidents.forEach(resident => {
                    const residentCard = document.createElement('div');
                    residentCard.className = 'resident-card';
                    
                    // Create basic resident info HTML without parking information
                    const cardHTML = `
                        <h3>Flat ${resident.flatNumber}</h3>
                        <p><strong>Name:</strong> ${resident.Owner_Name}</p>
                        <p><strong>Email:</strong> ${resident.email || 'Not provided'}</p>
                        <p><strong>Phone:</strong> ${resident.phone || 'Not provided'}</p>
                        <p><strong>Wing:</strong> ${resident.wing}</p>
                        <p><strong>Floor:</strong> ${resident.floor}</p>
                        <p><strong>Role:</strong> ${resident.role}${resident.sub_role ? ' (' + resident.sub_role + ')' : ''}</p>
                    `;
                    
                    residentCard.innerHTML = cardHTML;
                    residentsGrid.appendChild(residentCard);
                });
            } else {
                residentsGrid.innerHTML = '<div class="loading">No residents found.</div>';
            }
        }).catch((error) => {
            loadingIndicator.style.display = 'none';
            residentsGrid.innerHTML = `<div class="loading">Error loading residents: ${error.message}</div>`;
            console.error(error);
        });
    }
    
    // Function to apply role-based access control
    function applyRoleBasedAccess(role) {
        // Define roles that can add new residents
        const permittedRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
        
        // Hide the add resident button if user doesn't have permission
        if (!permittedRoles.includes(role)) {
            addResidentBtn.style.display = 'none';
        }
    }
});
