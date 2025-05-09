// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  push, 
  update, 
  remove, 
  child 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
    } catch (error) {
        console.error('Error fetching Firebase config:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Firebase first
  await initializeFirebase();
  
  // DOM Elements
  const eventsContainer = document.querySelector('.events-list');
  const adminControls = document.querySelector('.admin-controls');
  const eventModal = document.getElementById('event-modal');
  const eventForm = document.getElementById('event-form');
  const modalTitle = document.getElementById('modal-title');
  const eventIdInput = document.getElementById('event-id');
  const eventNameInput = document.getElementById('event-name');
  const eventDescriptionInput = document.getElementById('event-description');
  const eventDateInput = document.getElementById('event-date');
  const eventTimeInput = document.getElementById('event-time');
  const eventLocationInput = document.getElementById('event-location');
  const cancelEventBtn = document.getElementById('cancel-event-btn');
  const confirmModal = document.getElementById('confirm-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  // Store the ID of the event to be deleted
  let eventToDelete = null;
  
  // Check if user is logged in
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  if (!loggedInUser) {
    // User is not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
  
  // User is logged in
  const userData = JSON.parse(loggedInUser);

  // Check if user has admin privileges
  const isAdmin = checkAdminPrivileges(userData.sub_role);
  
  // Set up admin controls if user has privileges
  if (isAdmin) {
    setupAdminControls();
  }

  // Load events
  loadEvents();

  // Function to check if user has admin privileges
  function checkAdminPrivileges(subRole) {
    const adminRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
    return adminRoles.includes(subRole);
  }

  // Function to set up admin controls
  function setupAdminControls() {
    const addEventButton = document.createElement('button');
    addEventButton.textContent = 'Add New Event';
    addEventButton.addEventListener('click', () => {
      openAddEventModal();
    });
    
    adminControls.appendChild(addEventButton);

    // Set up event form submission handler
    eventForm.addEventListener('submit', handleEventFormSubmit);
    
    // Set up cancel button handler
    cancelEventBtn.addEventListener('click', () => {
      hideModal(eventModal);
    });
    
    // Set up delete confirmation handlers
    confirmDeleteBtn.addEventListener('click', confirmDelete);
    cancelDeleteBtn.addEventListener('click', cancelDelete);
  }

  // Function to load events from Firebase
  async function loadEvents() {
    try {
      eventsContainer.innerHTML = '<div class="loading-spinner">Loading events...</div>';
      
      const eventsRef = ref(database, 'events');
      const snapshot = await get(eventsRef);
      
      if (snapshot.exists()) {
        const events = snapshot.val();
        displayEvents(events);
      } else {
        eventsContainer.innerHTML = '<div class="no-events">No events scheduled at this time.</div>';
      }
    } catch (error) {
      console.error('Error loading events:', error);
      eventsContainer.innerHTML = '<div class="no-events">Error loading events. Please try again later.</div>';
    }
  }

  // Function to display events
  function displayEvents(events) {
    eventsContainer.innerHTML = '';
    
    // Convert to array and sort by date (soonest first)
    const eventsArray = Object.entries(events).map(([id, data]) => {
      return { id, ...data };
    }).sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
    
    if (eventsArray.length === 0) {
      eventsContainer.innerHTML = '<div class="no-events">No events scheduled at this time.</div>';
      return;
    }
    
    eventsArray.forEach(event => {
      const eventDate = new Date(event.date + 'T' + event.time);
      const formattedDate = eventDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = eventDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
      
      const eventCard = document.createElement('div');
      eventCard.className = 'event-card';
      
      let actionButtons = '';
      if (checkAdminPrivileges(userData.sub_role)) {
        actionButtons = `
          <div class="event-actions">
            <button class="edit-btn" data-id="${event.id}">Edit</button>
            <button class="delete-btn" data-id="${event.id}">Delete</button>
          </div>
        `;
      }
      
      eventCard.innerHTML = `
        <h3>${event.name}</h3>
        <div class="event-description">${event.description}</div>
        <div class="event-details">
          <div class="label">Date:</div>
          <div class="value">${formattedDate}</div>
          <div class="label">Time:</div>
          <div class="value">${formattedTime}</div>
          <div class="label">Location:</div>
          <div class="value">${event.location}</div>
        </div>
        ${actionButtons}
      `;
      
      eventsContainer.appendChild(eventCard);
      
      // Add event listeners for edit and delete buttons if they exist
      if (checkAdminPrivileges(userData.sub_role)) {
        const editBtn = eventCard.querySelector('.edit-btn');
        const deleteBtn = eventCard.querySelector('.delete-btn');
        
        editBtn.addEventListener('click', () => {
          openEditEventModal(event);
        });
        
        deleteBtn.addEventListener('click', () => {
          showDeleteConfirmation(event.id);
        });
      }
    });
  }

  // Function to open the add event modal
  function openAddEventModal() {
    modalTitle.textContent = 'Add New Event';
    eventForm.reset();
    eventIdInput.value = '';
    
    // Set default date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    eventDateInput.value = formattedDate;
    
    showModal(eventModal);
  }

  // Function to open the edit event modal
  function openEditEventModal(event) {
    modalTitle.textContent = 'Edit Event';
    
    eventIdInput.value = event.id;
    eventNameInput.value = event.name;
    eventDescriptionInput.value = event.description;
    eventDateInput.value = event.date;
    eventTimeInput.value = event.time;
    eventLocationInput.value = event.location;
    
    showModal(eventModal);
  }

  // Function to show delete confirmation
  function showDeleteConfirmation(eventId) {
    eventToDelete = eventId;
    showModal(confirmModal);
  }

  // Function to confirm delete
  async function confirmDelete() {
    if (!eventToDelete) return;
    
    try {
      await remove(ref(database, `events/${eventToDelete}`));
      hideModal(confirmModal);
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
    }
  }

  // Function to cancel delete
  function cancelDelete() {
    eventToDelete = null;
    hideModal(confirmModal);
  }

  // Function to handle event form submission
  async function handleEventFormSubmit(e) {
    e.preventDefault();
    
    const eventId = eventIdInput.value;
    const name = eventNameInput.value;
    const description = eventDescriptionInput.value;
    const date = eventDateInput.value;
    const time = eventTimeInput.value;
    const location = eventLocationInput.value;
    
    try {
      let eventRef;
      
      const eventData = {
        name,
        description,
        date,
        time,
        location,
        createdBy: userData.name,
        createdAt: new Date().toISOString()
      };
      
      if (eventId) {
        // Update existing event
        eventRef = ref(database, `events/${eventId}`);
        await update(eventRef, eventData);
      } else {
        // Add new event
        eventRef = push(ref(database, 'events'));
        await set(eventRef, eventData);
        
        // Create notification for the new event
        await createEventNotification(name, description, date, time, location);
      }
      
      hideModal(eventModal);
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      document.getElementById('event-form-error').textContent = 'Error saving event. Please try again.';
    }
  }
  
  // Function to create a notification for a new event
  async function createEventNotification(eventName, description, eventDate, eventTime, location) {
    try {
      const date = new Date(eventDate + 'T' + eventTime);
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
      
      // Create notification content
      const title = `New Event: ${eventName}`;
      const body = `A new event has been scheduled: "${eventName}" on ${formattedDate} at ${formattedTime}, location: ${location}. ${description}`;
      
      // Add notification to database
      const newNotification = {
        title,
        body,
        timestamp: new Date().toISOString()
      };
      
      await push(ref(database, 'notifications'), newNotification);
      console.log('Event notification created successfully');
    } catch (error) {
      console.error('Error creating event notification:', error);
    }
  }

  // Function to show a modal
  function showModal(modal) {
    modal.style.display = 'flex';
  }

  // Function to hide a modal
  function hideModal(modal) {
    modal.style.display = 'none';
  }
});
