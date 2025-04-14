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
  const changePasswordBtn = document.querySelector('.change-password-btn');
  const changePasswordModal = document.getElementById('change-password-modal');
  const changePasswordForm = document.getElementById('change-password-form');
  const cancelChangePasswordBtn = document.getElementById('cancel-change-password');
  
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
  
  // Check if the user has set a password
  checkPasswordSetup(userData);
  
  // Display welcome message and role
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
  
  // Handle change password button click
  changePasswordBtn.addEventListener('click', () => {
    showChangePasswordModal();
  });

  // Handle cancel button in change password modal
  cancelChangePasswordBtn.addEventListener('click', () => {
    hideChangePasswordModal();
  });

  // Handle change password form submission
  changePasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    updatePassword();
  });
  
  // Handle logout button click
  document.querySelector('.logout-btn').addEventListener('click', () => {
    logout();
  });

  // Function to check if user has set a password
  async function checkPasswordSetup(user) {
    try {
      const dbRef = ref(database);
      const userSnapshot = await get(child(dbRef, `residents/${user.apartment}`));
      
      if (userSnapshot.exists()) {
        const userDbData = userSnapshot.val();
        
        // Check if password_set attribute exists and is true
        if (!userDbData.password_set) {
          // Password not set, show password setup modal
          showPasswordSetupModal();
        }
      }
    } catch (error) {
      console.error('Error checking password setup:', error);
      // If there's an error, it's safer to assume the password hasn't been set
      showPasswordSetupModal();
    }
  }

  // Function to show password setup modal
  function showPasswordSetupModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'password-modal-overlay';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'password-modal-content';
    modalContent.innerHTML = `
      <h2>Set Your Password</h2>
      <p>Please set a new password to continue.</p>
      <form id="password-setup-form">
        <div class="form-group">
          <label for="new-password">New Password</label>
          <input type="password" id="new-password" required>
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirm Password</label>
          <input type="password" id="confirm-password" required>
        </div>
        <div class="error-message" id="password-error"></div>
        <div class="button-group">
          <button type="submit" class="save-btn">Save Password</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    `;
    
    // Add modal to body
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Handle form submission
    const passwordForm = document.getElementById('password-setup-form');
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const errorElement = document.getElementById('password-error');
      
      // Validate password
      if (newPassword !== confirmPassword) {
        errorElement.textContent = 'Passwords do not match';
        return;
      }
      
      if (newPassword.length < 6) {
        errorElement.textContent = 'Password must be at least 6 characters';
        return;
      }
      
      try {
        // Update password in database
        const updates = {};
        updates[`residents/${userData.apartment}/password`] = newPassword;
        updates[`residents/${userData.apartment}/password_set`] = true;
        
        await update(ref(database), updates);
        
        // Update session storage
        userData.password_set = true;
        sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
        
        // Remove modal
        document.body.removeChild(modalOverlay);
      } catch (error) {
        console.error('Error setting password:', error);
        errorElement.textContent = 'Error setting password. Please try again.';
      }
    });
    
    // Handle cancel button click
    const cancelButton = modalContent.querySelector('.cancel-btn');
    cancelButton.addEventListener('click', () => {
      logout();
    });
  }
  
  // Function to show change password modal
  function showChangePasswordModal() {
    // Clear previous inputs and errors
    document.getElementById('current-password').value = '';
    document.getElementById('new-password-change').value = '';
    document.getElementById('confirm-password-change').value = '';
    document.getElementById('change-password-error').textContent = '';
    
    // Show modal
    changePasswordModal.style.display = 'flex';
  }

  // Function to hide change password modal
  function hideChangePasswordModal() {
    changePasswordModal.style.display = 'none';
  }

  // Function to update password
  async function updatePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password-change').value;
    const confirmPassword = document.getElementById('confirm-password-change').value;
    const errorElement = document.getElementById('change-password-error');
    
    // Clear previous error
    errorElement.textContent = '';
    
    try {
      // Verify current password
      const dbRef = ref(database);
      const userSnapshot = await get(child(dbRef, `residents/${userData.apartment}`));
      
      if (!userSnapshot.exists()) {
        errorElement.textContent = 'User data not found';
        return;
      }
      
      const userDbData = userSnapshot.val();
      
      if (userDbData.password !== currentPassword) {
        errorElement.textContent = 'Current password is incorrect';
        return;
      }
      
      // Validate new password
      if (newPassword !== confirmPassword) {
        errorElement.textContent = 'New passwords do not match';
        return;
      }
      
      if (newPassword.length < 6) {
        errorElement.textContent = 'New password must be at least 6 characters';
        return;
      }
      
      // Update password in database
      const updates = {};
      updates[`residents/${userData.apartment}/password`] = newPassword;
      
      await update(ref(database), updates);
      
      // Close modal and logout
      hideChangePasswordModal();
      alert('Password updated successfully. Please login with your new password.');
      logout();
      
    } catch (error) {
      console.error('Error updating password:', error);
      errorElement.textContent = 'Error updating password. Please try again.';
    }
  }

  // Function to logout
  function logout() {
    // Remove user data from session storage
    sessionStorage.removeItem('loggedInUser');
    // Redirect to homepage after logout
    window.location.href = 'homepage.html';
  }

  // Function to load notifications
  async function loadNotifications() {
    try {
      // Get notification_viewed status for current user
      const dbRef = ref(database);
      
      // First, check if user has viewed notifications
      const userSnapshot = await get(child(dbRef, `residents/${userData.apartment}`));
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
      updates[`residents/${apartment}/notification_viewed`] = true;
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
      'admin': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notice.html', 'contact.html', 'maid-services.html', 'booking.html', 'maintenance.html'],
      'president': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notice.html', 'contact.html', 'maid-services.html', 'booking.html', 'maintenance.html'],
      'secretary': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notice.html', 'contact.html', 'maid-services.html', 'booking.html', 'maintenance.html'],
      'treasurer': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notice.html', 'contact.html', 'maid-services.html', 'booking.html', 'maintenance.html'],
      'resident': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notice.html', 'contact.html', 'maid-services.html', 'booking.html', 'maintenance.html'],
      'building-manager': ['users.html', 'complaint.html', 'parking.html', 'events.html', 'notice.html', 'contact.html', 'maid-services.html', 'booking.html', 'maintenance.html'],
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
