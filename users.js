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

    // Show/hide sub-role dropdown based on role selection
    roleSelect.addEventListener('change', function() {
        if (this.value === 'MC') {
            subRoleGroup.style.display = 'block';
        } else {
            subRoleGroup.style.display = 'none';
        }
    });

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
        document.getElementById('message').innerText = '';
        form.reset();
        subRoleGroup.style.display = 'none';
    });

    overlay.addEventListener('click', () => {
        formContainer.style.display = 'none';
        overlay.style.display = 'none';
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
            const flatNumber = document.getElementById('flatNumber').value;
            const floor = document.getElementById('floor').value;
            const wing = document.getElementById('wing').value;
            const role = document.getElementById('role').value;
            const subRole = role === 'MC' ? document.getElementById('sub_role').value : null;

            // Check if all fields are filled
            if (!name || !flatNumber || !floor || !wing) {
                document.getElementById('message').innerText = "Please fill in all fields.";
                return;
            }

            // Prepare resident data
            const residentData = {
                Owner_Name: name,
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

            // Save data to Firebase Realtime Database
            set(ref(database, 'residents/' + flatNumber), residentData)
            .then(() => {
                document.getElementById('message').innerText = "Data saved successfully!";
                form.reset();
                subRoleGroup.style.display = 'none';
                // Reload the residents list
                loadResidents();
                
                // Close the form after a short delay
                setTimeout(() => {
                    formContainer.style.display = 'none';
                    overlay.style.display = 'none';
                    document.getElementById('message').innerText = '';
                }, 1500);
            })
            .catch((error) => {
                document.getElementById('message').innerText = "Error: " + error.message;
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
                    residentsGrid.innerHTML = '<p>No residents found.</p>';
                    return;
                }
                
                sortedResidents.forEach(resident => {
                    const residentCard = document.createElement('div');
                    residentCard.className = 'resident-card';
                    
                    let roleDisplay = resident.role;
                    if (resident.sub_role) {
                        roleDisplay += ` (${resident.sub_role})`;
                    }
                    
                    residentCard.innerHTML = `
                        <h3>Flat ${resident.flatNumber}</h3>
                        <p><strong>Name:</strong> ${resident.Owner_Name}</p>
                        <p><strong>Wing:</strong> ${resident.wing}</p>
                        <p><strong>Floor:</strong> ${resident.floor}</p>
                        <p><strong>Role:</strong> ${roleDisplay}</p>
                    `;
                    
                    residentsGrid.appendChild(residentCard);
                });
            } else {
                residentsGrid.innerHTML = '<p>No residents found.</p>';
            }
        }).catch((error) => {
            loadingIndicator.style.display = 'none';
            residentsGrid.innerHTML = `<p>Error loading residents: ${error.message}</p>`;
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
