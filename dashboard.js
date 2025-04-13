// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, update, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
  const notificationsPanel = document.querySelector('.notifications-panel');
  const notificationToggle = document.querySelector('.notification-toggle');
  const closeNotifications = document.querySelector('.close-notifications');
  const notificationsList = document.querySelector('.notifications-list');
  const notificationBadge = document.querySelector('.notification-badge');
  
  let userData;
  
  // Check if user is logged in
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (!loggedInUser) {
    // User is not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
  
  // User is logged in, display welcome message and role
  userData = JSON.parse(loggedInUser);
  welcomeMessage.textContent = `Hi ${userData.name}`;
  
  let roleText = `${userData.role}`;
  if (userData.sub_role) {
    roleText += ` (${userData.sub_role})`;
  }
  
  userRole.textContent = roleText;

  // Apply sub-role-based access controls to feature boxes
  applySubRoleBasedAccess(userData.sub_role);

  // Load and display notifications
  loadNotifications();

  // Toggle notifications panel
  notificationToggle.addEventListener('click', () => {
    notificationsPanel.classList.toggle('show');
    if (notificationsPanel.classList.contains('show')) {
      // Mark notifications as viewed when opened
      markNotificationsAsViewed(userData.apartment);
    }
  });

  // Close notifications panel
  closeNotifications.addEventListener('click', () => {
    notificationsPanel.classList.remove('show');
  });
  
  // Handle feature box navigation
  document.querySelectorAll('.feature-box').forEach(box => {
    box.addEventListener('click', () => {
      const target = box.getAttribute('data-target');
      if (target) {
        window.location.href = target;
      }
    });
  });
  
  // Handle logout button click
  document.querySelector('.logout-btn').addEventListener('click', () => {
    // Remove user data from session storage
    sessionStorage.removeItem('loggedInUser');
    // Redirect to homepage after logout
    window.location.href = 'homepage.html';
  });

  // Function to load notifications
  async function loadNotifications() {
    try {
      // Get notification_viewed status for current user
      const dbRef = ref(database);
      
      // First, check if user has viewed notifications
      const userSnapshot = await get(child(dbRef, `logins/${userData.apartment}`));
      const notificationViewed = userSnapshot.exists() ? 
        userSnapshot.val().notification_viewed || false : false;
      
      // Get all notifications from database
      const notificationsSnapshot = await get(child(dbRef, 'notifications'));
      
      if (notificationsSnapshot.exists()) {
        const notifications = notificationsSnapshot.val();
        
        // Convert to array and sort by timestamp (newest first)
        const notificationsArray = Object.entries(notifications).map(([id, data]) => {
          return { id, ...data };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Update notification badge count
        notificationBadge.textContent = notificationsArray.length;
        
        // Clear existing notifications
        notificationsList.innerHTML = '';
        
        // Add notifications to panel
        notificationsArray.forEach(notification => {
          const notificationItem = document.createElement('div');
          notificationItem.className = 'notification-item';
          
          const formattedDate = new Date(notification.timestamp).toLocaleString();
          
          notificationItem.innerHTML = `
            <div class="notification-title">${notification.title}</div>
            <div class="notification-body">${notification.body}</div>
            <div class="notification-time">${formattedDate}</div>
          `;
          
          notificationsList.appendChild(notificationItem);
        });
        
        // Show notifications panel automatically if not viewed before
        if (!notificationViewed && notificationsArray.length > 0) {
          notificationsPanel.classList.add('show');
        }
      } else {
        // No notifications
        notificationsList.innerHTML = '<p>No notifications at this time.</p>';
        notificationBadge.textContent = '0';
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      notificationsList.innerHTML = '<p>Error loading notifications. Please try again later.</p>';
    }
  }
  
  // Function to mark notifications as viewed
  async function markNotificationsAsViewed(apartment) {
    try {
      // Update the notification_viewed field for the user
      const updates = {};
      updates[`logins/${apartment}/notification_viewed`] = true;
      await update(ref(database), updates);
      
      // Also update the sessionStorage data
      if (userData) {
        userData.notification_viewed = true;
        sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error marking notifications as viewed:', error);
    }
  }

  // Function to apply sub-role-based access control to feature boxes
  function applySubRoleBasedAccess(subRole) {
    // Define permissions for each feature based on sub-role
    const subRolePermissions = {
      'admin': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notices.html', 'contact.html', 'maid-services.html', 'banquet-hall.html'],
      'president': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notices.html', 'contact.html', 'maid-services.html', 'banquet-hall.html'],
      'secretary': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notices.html', 'contact.html', 'maid-services.html', 'banquet-hall.html'],
      'treasurer': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notices.html', 'contact.html', 'maid-services.html', 'banquet-hall.html'],
      'member': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notices.html', 'contact.html', 'maid-services.html', 'banquet-hall.html'],
      'building-manager': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notices.html', 'contact.html', 'maid-services.html', 'banquet-hall.html'],
    };

    // Get all feature boxes
    const featureBoxes = document.querySelectorAll('.feature-box');
    
    featureBoxes.forEach(box => {
      const target = box.getAttribute('data-target');
      
      // Check if the user has permission to access this feature based on sub-role
      let hasPermission = false;
      
      // If user has a defined sub-role, check permissions
      if (subRole && subRolePermissions[subRole] && subRolePermissions[subRole].includes(target)) {
        hasPermission = true;
      } 
      // If no sub-role is defined, default to resident permissions
      else if (!subRole && subRolePermissions['resident'] && subRolePermissions['resident'].includes(target)) {
        hasPermission = true;
      }
      
      // Hide the feature if the user doesn't have permission
      if (!hasPermission) {
        box.style.display = 'none';
      }
    });
  }
});
