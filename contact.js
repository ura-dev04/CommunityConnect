// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, child, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

document.addEventListener('DOMContentLoaded', () => {
  const welcomeMessage = document.getElementById('welcome-message');
  const userRole = document.getElementById('user-role');
  const contactsGrid = document.getElementById('contacts-grid');
  
  let userData;
  
  // Check if user is logged in
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (!loggedInUser) {
    // User is not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
  
  // User is logged in
  userData = JSON.parse(loggedInUser);
  
  // Display welcome message and role
  welcomeMessage.textContent = `Hi ${userData.name}`;
  
  let roleText = `${userData.role}`;
  if (userData.sub_role) {
    roleText += ` (${userData.sub_role})`;
  }
  
  userRole.textContent = roleText;

  // Load contacts
  loadContacts();

  
  // Handle logout button click
  document.querySelector('.logout-btn').addEventListener('click', () => {
    logout();
  });

  // Function to load contacts
  async function loadContacts() {
    try {
      const dbRef = ref(database);
      const residentsSnapshot = await get(child(dbRef, 'residents'));
      
      if (residentsSnapshot.exists()) {
        const residents = residentsSnapshot.val();
        
        // Clear loading indicator
        contactsGrid.innerHTML = '';
        
        // Find residents with specific roles
        const keyRoles = ['president', 'secretary', 'treasurer', 'building-manager'];
        let contactCards = [];
        
        // Process all residents to find those with key roles
        Object.entries(residents).forEach(([apartmentId, resident]) => {
          if (resident.sub_role && keyRoles.includes(resident.sub_role)) {
            contactCards.push(createContactCard(resident, apartmentId));
          }
        });

        // If no contacts found, display a message
        if (contactCards.length === 0) {
          contactsGrid.innerHTML = `
            <div class="no-contacts-message" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
              <p>No contact information available at this time.</p>
            </div>
          `;
        } else {
          // Sort contact cards by role importance
          contactCards.sort((a, b) => {
            const roleOrder = {
              'president': 1,
              'secretary': 2,
              'treasurer': 3,
              'building-manager': 4
            };
            return roleOrder[a.role] - roleOrder[b.role];
          });
          
          // Add sorted cards to the grid
          contactCards.forEach(card => {
            contactsGrid.appendChild(card.element);
          });
        }
      } else {
        contactsGrid.innerHTML = `
          <div class="no-contacts-message" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
            <p>No contact information available at this time.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      contactsGrid.innerHTML = `
        <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #ff6464;">
          <p>Error loading contact information. Please try again later.</p>
        </div>
      `;
    }
  }

  // Function to create a contact card
  function createContactCard(resident, apartmentId) {
    const card = document.createElement('div');
    card.className = 'contact-card';
    
    // Get initials for avatar
    const initials = getInitials(resident.Owner_Name);
    
    // Format role title
    const roleTitle = formatRoleTitle(resident.sub_role);

    // Get role-specific avatar color
    const avatarColor = getRoleColor(resident.sub_role);
    
    card.innerHTML = `
      <div class="contact-avatar" style="background-color: ${avatarColor}">${initials}</div>
      <h3 class="contact-name">${resident.Owner_Name}</h3>
      <div class="contact-role">${roleTitle}</div>
      <div class="contact-info">
        <div class="info-item">
          <div class="info-label">Phone:</div>
          <div class="info-value">${resident.phone || 'Not available'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Email:</div>
          <div class="info-value contact-email">${resident.email || 'Not available'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Flat:</div>
          <div class="info-value">${apartmentId}</div>
        </div>
      </div>
    `;
    
    return {
      element: card,
      role: resident.sub_role
    };
  }

  // Function to get initials from a name
  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Function to format role title
  function formatRoleTitle(role) {
    if (!role) return 'Resident';
    
    // Convert from kebab-case to Title Case
    return role
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Function to get role-specific color
  function getRoleColor(role) {
    const roleColors = {
      'president': 'var(--primary-dark)',
      'secretary': 'var(--primary)',
      'treasurer': 'var(--accent)',
      'building-manager': 'var(--text-muted)'
    };
    
    return roleColors[role] || 'var(--primary)';
  }

  // Function to logout
  function logout() {
    // Remove user data from session storage
    sessionStorage.removeItem('loggedInUser');
    // Redirect to homepage after logout
    window.location.href = 'homepage.html';
  }
});
