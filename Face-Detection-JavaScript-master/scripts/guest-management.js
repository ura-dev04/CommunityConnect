import { initializeFirebase } from './firebase-init.js';
import { ref as dbRef, push, set, get, remove, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// DOM Elements
const addGuestBtn = document.getElementById('add-guest-btn');
const addGuestModal = document.getElementById('add-guest-modal');
const closeModalBtn = document.querySelector('.close-modal');
const addGuestForm = document.getElementById('add-guest-form');
const guestsList = document.getElementById('guests-list');
const searchInput = document.getElementById('search-guests');

// Camera elements
const video = document.getElementById('camera');
const captureBtn = document.getElementById('capture-btn');
const retakeBtn = document.getElementById('retake-btn');
const photoCanvas = document.getElementById('photo-canvas');

let photoTaken = false;
let stream = null;
let database;
let storage;

// Initialize Firebase when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const result = await initializeFirebase();
    database = result.database;
    storage = result.storage;
});

// Event Listeners
addGuestBtn.addEventListener('click', openAddGuestModal);
closeModalBtn.addEventListener('click', closeAddGuestModal);
addGuestForm.addEventListener('submit', handleAddGuest);
captureBtn.addEventListener('click', capturePhoto);
retakeBtn.addEventListener('click', retakePhoto);
searchInput.addEventListener('input', handleSearch);

// Load guests when page loads
document.addEventListener('DOMContentLoaded', loadGuests);

// Functions
function openAddGuestModal() {
  addGuestModal.style.display = 'block';
  startCamera();
}

function closeAddGuestModal() {
  addGuestModal.style.display = 'none';
  stopCamera();
  resetForm();
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    alert('Unable to access camera. Please grant permission.');
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
}

function capturePhoto() {
  const context = photoCanvas.getContext('2d');
  
  // Set canvas dimensions to match video
  photoCanvas.width = video.videoWidth;
  photoCanvas.height = video.videoHeight;
  
  // Draw current video frame to canvas
  context.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);
  
  // Show canvas and retake button, hide video and capture button
  photoCanvas.style.display = 'block';
  retakeBtn.style.display = 'inline-block';
  video.style.display = 'none';
  captureBtn.style.display = 'none';
  
  photoTaken = true;
}

function retakePhoto() {
  // Hide canvas and retake button, show video and capture button
  photoCanvas.style.display = 'none';
  retakeBtn.style.display = 'none';
  video.style.display = 'block';
  captureBtn.style.display = 'inline-block';
  
  photoTaken = false;
}

function resetForm() {
  addGuestForm.reset();
  retakePhoto();
  photoTaken = false;
}

async function handleAddGuest(e) {
  e.preventDefault();
  
  if (!photoTaken) {
    alert('Please take a photo before saving');
    return;
  }
  
  // Get form values
  const name = document.getElementById('guest-name').value;
  const dob = document.getElementById('guest-dob').value;
  const phone = document.getElementById('guest-phone').value;
  
  try {
    // Convert canvas to blob
    const imageBlob = await new Promise(resolve => {
      photoCanvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
    });
    
    // Create unique filename
    const filename = `guest_${Date.now()}.jpg`;
    
    // Upload to Firebase Storage
    const imageRef = storageRef(storage, `guests/${filename}`);
    const uploadResult = await uploadBytes(imageRef, imageBlob);
    const photoURL = await getDownloadURL(uploadResult.ref);
    
    // Save guest data to Firebase Realtime Database
    const guestRef = push(dbRef(database, 'guests'));
    await set(guestRef, {
      name,
      dob,
      phone,
      photoURL,
      timestamp: new Date().toISOString()
    });
    
    // Close modal and reset form
    closeAddGuestModal();
    
    // Reload guests list
    loadGuests();
    
    alert('Guest added successfully!');
  } catch (error) {
    console.error('Error adding guest:', error);
    alert('Failed to add guest. Please try again.');
  }
}

async function loadGuests() {
  try {
    const guestsQuery = query(dbRef(database, 'guests'), orderByChild('name'));
    const snapshot = await get(guestsQuery);
    
    guestsList.innerHTML = '';
    
    if (!snapshot.exists()) {
      guestsList.innerHTML = '<div class="loading">No guests found</div>';
      return;
    }
    
    // Convert to array and sort by name
    let guests = [];
    snapshot.forEach(childSnapshot => {
      guests.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    // Display guests
    guests.forEach(guest => {
      addGuestToUI(guest);
    });
  } catch (error) {
    console.error('Error loading guests:', error);
    guestsList.innerHTML = '<div class="loading">Error loading guests</div>';
  }
}

function addGuestToUI(guest) {
  const guestCard = document.createElement('div');
  guestCard.className = 'guest-card';
  
  // Format date for display
  const dobDate = new Date(guest.dob);
  const formattedDate = `${dobDate.getDate()}/${dobDate.getMonth() + 1}/${dobDate.getFullYear()}`;
  
  guestCard.innerHTML = `
    <img src="${guest.photoURL}" alt="${guest.name}" class="guest-photo">
    <div class="guest-details">
      <h3 class="guest-name">${guest.name}</h3>
      <div class="guest-info">
        <span class="info-label">DOB:</span>
        <span>${formattedDate}</span>
      </div>
      <div class="guest-info">
        <span class="info-label">Phone:</span>
        <span>${guest.phone}</span>
      </div>
    </div>
    <div class="guest-actions">
      <button class="verify-btn" data-id="${guest.id}" data-photo="${guest.photoURL}">Verify Entry</button>
      <button class="delete-btn" data-id="${guest.id}">Delete</button>
    </div>
  `;
  
  guestsList.appendChild(guestCard);
  
  // Add event listeners for buttons
  guestCard.querySelector('.verify-btn').addEventListener('click', () => {
    window.location.href = `verify-guest.html?id=${guest.id}`;
  });
  
  guestCard.querySelector('.delete-btn').addEventListener('click', () => deleteGuest(guest.id));
}

async function deleteGuest(guestId) {
  if (confirm('Are you sure you want to delete this guest?')) {
    try {
      await remove(dbRef(database, `guests/${guestId}`));
      loadGuests(); // Reload the list
    } catch (error) {
      console.error('Error deleting guest:', error);
      alert('Failed to delete guest. Please try again.');
    }
  }
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  // Get all guest cards
  const guestCards = document.querySelectorAll('.guest-card');
  
  guestCards.forEach(card => {
    const name = card.querySelector('.guest-name').textContent.toLowerCase();
    const phone = card.querySelector('.guest-info:nth-child(3) span:last-child').textContent.toLowerCase();
    
    // Show/hide based on search term
    if (name.includes(searchTerm) || phone.includes(searchTerm)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}
