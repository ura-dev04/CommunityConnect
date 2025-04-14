// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, push, update, remove, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Firebase configuration (copied from dashboard.js)
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

// DOM Elements
const welcomeMessage = document.getElementById('welcome-message');
const userRoleElement = document.getElementById('user-role');
const logoutBtn = document.querySelector('.logout-btn');
const notificationsList = document.getElementById('notificationsList');
const notificationForm = document.getElementById('notificationForm');
const notificationTitle = document.getElementById('notificationTitle');
const notificationBody = document.getElementById('notificationBody');
const notificationId = document.getElementById('notificationId');
const saveButton = document.getElementById('saveButton');
const cancelEdit = document.getElementById('cancelEdit');
const statusMessage = document.getElementById('statusMessage');
const notificationTemplate = document.getElementById('notificationTemplate');

// Current user data
let userData = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (!loggedInUser) {
    // User is not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
  
  // Parse user data
  userData = JSON.parse(loggedInUser);
  
  // Update welcome message and role
  welcomeMessage.textContent = `Hi ${userData.name}`;
  
  let roleText = `${userData.role}`;
  if (userData.sub_role) {
    roleText += ` (${userData.sub_role})`;
  }
  
  userRoleElement.textContent = roleText;
  
  // Check if user has permission to manage notifications
  const canManageNotifications = hasNotificationPermission(userData);
  
  if (!canManageNotifications) {
    document.querySelector('.form-container').style.display = 'none';
    showStatusMessage('You do not have permission to manage notifications.', 'error');
  }
  
  // Load existing notifications
  loadNotifications();
  
  // Form submission handler
  notificationForm.addEventListener('submit', handleFormSubmit);
  
  // Cancel edit handler
  cancelEdit.addEventListener('click', resetForm);
  
  // Logout handler
  logoutBtn.addEventListener('click', () => {
    logout();
  });
});

// Function to logout
function logout() {
  // Remove user data from session storage
  sessionStorage.removeItem('loggedInUser');
  // Redirect to homepage after logout
  window.location.href = 'homepage.html';
}

// Function to check if user has permission to manage notifications
function hasNotificationPermission(user) {
  // Define roles that can manage notifications
  const allowedRoles = ['admin', 'president', 'secretary'];
  return allowedRoles.includes(user.sub_role) || user.role === 'admin';
}

// Function to load all notifications
async function loadNotifications() {
  try {
    notificationsList.innerHTML = '<p>Loading notifications...</p>';
    
    const dbRef = ref(database);
    const notificationsSnapshot = await get(child(dbRef, 'notifications'));
    
    notificationsList.innerHTML = '';
    
    if (notificationsSnapshot.exists()) {
      // Convert to array and sort by timestamp (newest first)
      const notifications = notificationsSnapshot.val();
      const notificationsArray = Object.entries(notifications)
        .map(([id, data]) => ({id, ...data}))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
      // Render each notification
      notificationsArray.forEach(renderNotification);
    } else {
      notificationsList.innerHTML = '<p>No notifications available.</p>';
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
    notificationsList.innerHTML = '<p>Error loading notifications. Please try again later.</p>';
  }
}

// Function to render a notification item
function renderNotification(notification) {
  // Clone the template
  const notificationItem = notificationTemplate.content.cloneNode(true);
  
  // Fill in the notification data
  notificationItem.querySelector('.notification-title').textContent = notification.title;
  notificationItem.querySelector('.notification-body').textContent = notification.body;
  
  // Format and set the timestamp
  const formattedDate = new Date(notification.timestamp).toLocaleString();
  notificationItem.querySelector('.notification-timestamp').textContent = `Posted: ${formattedDate}`;
  
  // Set up edit button functionality
  const editButton = notificationItem.querySelector('.edit-btn');
  if (editButton && hasNotificationPermission(userData)) {
    editButton.addEventListener('click', () => {
      prepareEdit(notification);
    });
  } else if (editButton) {
    editButton.style.display = 'none';
  }
  
  // Set up delete button functionality
  const deleteButton = notificationItem.querySelector('.delete-btn');
  if (deleteButton && hasNotificationPermission(userData)) {
    deleteButton.addEventListener('click', () => {
      deleteNotification(notification.id);
    });
  } else if (deleteButton) {
    deleteButton.style.display = 'none';
  }
  
  // Add to the notifications list
  const listItem = notificationItem.querySelector('li');
  listItem.setAttribute('data-id', notification.id);
  notificationsList.appendChild(listItem);
}

// Function to handle form submission (add or update notification)
async function handleFormSubmit(event) {
  event.preventDefault();
  
  if (!hasNotificationPermission(userData)) {
    showStatusMessage('You do not have permission to perform this action.', 'error');
    return;
  }
  
  const title = notificationTitle.value.trim();
  const body = notificationBody.value.trim();
  const timestamp = new Date().toISOString();
  const id = notificationId.value;
  
  // Validate form
  if (!title || !body) {
    showStatusMessage('Please fill in all fields.', 'error');
    return;
  }
  
  try {
    // If we have an ID, we're updating an existing notification
    if (id) {
      const updates = {};
      updates[`notifications/${id}/title`] = title;
      updates[`notifications/${id}/body`] = body;
      
      await update(ref(database), updates);
      showStatusMessage('Notification updated successfully!', 'success');
    } 
    // Otherwise, we're adding a new notification
    else {
      const newNotification = {
        title,
        body,
        timestamp
      };
      
      await push(ref(database, 'notifications'), newNotification);
      showStatusMessage('Notification added successfully!', 'success');
    }
    
    // Reset the form
    resetForm();
    
    // Reload notifications to show the updated list
    await loadNotifications();
    
  } catch (error) {
    console.error('Error saving notification:', error);
    showStatusMessage('Error saving notification. Please try again.', 'error');
  }
}

// Function to prepare form for editing a notification
function prepareEdit(notification) {
  notificationId.value = notification.id;
  notificationTitle.value = notification.title;
  notificationBody.value = notification.body;
  
  saveButton.textContent = 'Update Notification';
  cancelEdit.style.display = 'block';
  
  // Scroll to the form
  document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
}

// Function to delete a notification
async function deleteNotification(id) {
  if (!hasNotificationPermission(userData)) {
    showStatusMessage('You do not have permission to perform this action.', 'error');
    return;
  }
  
  if (confirm('Are you sure you want to delete this notification?')) {
    try {
      await remove(ref(database, `notifications/${id}`));
      showStatusMessage('Notification deleted successfully!', 'success');
      
      // Remove the notification from the UI
      const notificationElement = notificationsList.querySelector(`li[data-id="${id}"]`);
      if (notificationElement) {
        notificationElement.remove();
      }
      
      // If the list is now empty, show a message
      if (notificationsList.children.length === 0) {
        notificationsList.innerHTML = '<p>No notifications available.</p>';
      }
      
    } catch (error) {
      console.error('Error deleting notification:', error);
      showStatusMessage('Error deleting notification. Please try again.', 'error');
    }
  }
}

// Function to reset the form
function resetForm() {
  notificationForm.reset();
  notificationId.value = '';
  saveButton.textContent = 'Save Notification';
  cancelEdit.style.display = 'none';
}

// Function to show status messages
function showStatusMessage(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = type === 'success' ? 'success-message' : 'error-message';
  
  // Auto-hide the message after 5 seconds
  setTimeout(() => {
    statusMessage.className = '';
  }, 5000);
}
