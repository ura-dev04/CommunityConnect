// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, child, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// We'll fetch Firebase config from the server
let app;
let database;

// Function to initialize Firebase
async function initializeFirebase() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    
    // Initialize Firebase with the config from server
    app = initializeApp(data.firebaseConfig);
    database = getDatabase(app);
    return true;
  } catch (error) {
    console.error('Error fetching Firebase config:', error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Firebase first
  const initialized = await initializeFirebase();
  
  if (!initialized) {
    const contactsGrid = document.getElementById('contacts-grid');
    contactsGrid.innerHTML = `
      <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #ff6464;">
        <p>Failed to initialize Firebase. Please refresh the page and try again.</p>
      </div>
    `;
    return;
  }
  
  const contactsGrid = document.getElementById('contacts-grid');
  
  let userData;
  
  // Check if user is logged in - this will be handled by navbar.js, 
  // but we still need the user data for our functionality
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (!loggedInUser) {
    // This redirect is now handled by navbar.js, but keeping as a fallback
    window.location.href = 'login.html';
    return;
  }
  
  // User is logged in
  userData = JSON.parse(loggedInUser);

  // Load contacts
  loadContacts();

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
});
