import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Firebase Configuration
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
const db = getDatabase(app);

// Constants
const TOTAL_ROOMS = 5;

// DOM Elements
const guestroomForm = document.getElementById('guestroomForm');
const guestroomMessage = document.getElementById('guestroom-message');
const bookedList = document.getElementById('bookedList');
const typeSelect = document.getElementById('guestroom-type');
const roomCountDiv = document.getElementById('roomCountDiv');
const roomCountInput = document.getElementById('roomCount');

const banquetForm = document.getElementById('banquetForm');
const banquetMessage = document.getElementById('banquet-message');
const banquetBookedList = document.getElementById('banquetBookedList');

// User data from session storage
let userData = null;

// Check if user is logged in
function getUserData() {
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  if (!loggedInUser) {
    window.location.href = 'login.html'; // Redirect to login if not logged in
    return null;
  }
  return JSON.parse(loggedInUser);
}

// =================
// COMMON UTILITIES
// =================

// Convert 12-hour time to 24-hour format
function convertTo24Hour(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Format 24-hour to AM/PM for display
function formatTime(timeStr) {
  const [hour, minute] = timeStr.split(":");
  let h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
}

// UI Initialization
function initializeUI() {
  // Tab functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active tab content
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });

  // Show/Hide Calendar functionality
  document.getElementById('showCalendar').addEventListener('click', function() {
    document.getElementById('banquet-booking-section').style.display = 'none';
    document.getElementById('calendar-section').style.display = 'block';
    
    // Force refresh calendar size
    if (window.calendar) {
      setTimeout(() => window.calendar.updateSize(), 10);
    }
  });

  document.getElementById('hideCalendar').addEventListener('click', function() {
    document.getElementById('calendar-section').style.display = 'none';
    document.getElementById('banquet-booking-section').style.display = 'block';
  });

  // Show/hide room count input
  typeSelect.addEventListener('change', () => {
    roomCountDiv.style.display = typeSelect.value === 'room' ? 'block' : 'none';
  });

  // Initialize flatpickr for time selection
  flatpickr("#guestroom-startTime", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "h:i K",
    time_24hr: false
  });

  flatpickr("#guestroom-endTime", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "h:i K",
    time_24hr: false
  });
}

// =================
// GUESTROOM BOOKING
// =================

// Load guest room bookings
function loadGuestroomBookings() {
  const dbRef = ref(db, 'bookings/guestroom');
  get(dbRef).then((snapshot) => {
    bookedList.innerHTML = '';
    if (snapshot.exists()) {
      const bookings = snapshot.val();
      for (let key in bookings) {
        const b = bookings[key];
        const li = document.createElement('li');
        li.textContent = `${b.date} | ${formatTime(b.startTime)} - ${formatTime(b.endTime)} | ${b.type.toUpperCase()}${b.roomCount ? ' x' + b.roomCount : ''} | ${b.flat}`;
        bookedList.appendChild(li);
      }
    }
  });
}

// Guest room booking form submission
function handleGuestroomBooking(e) {
  e.preventDefault();

  if (!userData) {
    guestroomMessage.textContent = "You need to be logged in to make a booking.";
    guestroomMessage.style.color = "red";
    return;
  }

  const date = document.getElementById("guestroom-date").value;
  const rawStart = document.getElementById("guestroom-startTime").value;
  const rawEnd = document.getElementById("guestroom-endTime").value;
  const startTime = convertTo24Hour(rawStart);
  const endTime = convertTo24Hour(rawEnd);
  const guests = document.getElementById("guestroom-guests").value;
  const type = document.getElementById("guestroom-type").value;
  const roomCount = type === 'room' ? parseInt(roomCountInput.value) : null;

  // Get user data from session storage
  const name = userData.name;
  const flat = userData.apartment;

  // Validation
  if (startTime >= endTime) {
    guestroomMessage.textContent = "End time must be after start time.";
    guestroomMessage.style.color = "red";
    return;
  }

  // Check availability
  checkGuestroomAvailability(date, startTime, endTime, type, roomCount)
    .then(availabilityResult => {
      if (!availabilityResult.isAvailable) {
        guestroomMessage.textContent = availabilityResult.message;
        guestroomMessage.style.color = "red";
        return;
      }

      // Proceed with booking
      const bookingRef = push(ref(db, "bookings/guestroom"));
      const bookingData = {
        name,
        flat,
        date,
        startTime,
        endTime,
        guests,
        type,
        status: "Confirmed",
        timestamp: new Date().toISOString()
      };

      if (type === 'room') {
        bookingData.roomCount = roomCount;
      }

      set(bookingRef, bookingData)
        .then(() => {
          guestroomMessage.textContent = "Booking confirmed!";
          guestroomMessage.style.color = "lightgreen";
          loadGuestroomBookings();
          guestroomForm.reset();
          roomCountDiv.style.display = 'none';
        })
        .catch(error => {
          console.error("Firebase error:", error);
          guestroomMessage.textContent = "Failed to book. Please try again.";
          guestroomMessage.style.color = "red";
        });
    });
}

// Check if guestroom is available
async function checkGuestroomAvailability(date, startTime, endTime, type, roomCount) {
  const result = { 
    isAvailable: true, 
    message: "" 
  };

  // Check for valid room count
  if (type === 'room') {
    if (!roomCount || roomCount <= 0 || roomCount > TOTAL_ROOMS) {
      result.isAvailable = false;
      result.message = "Invalid number of rooms selected.";
      return result;
    }
  }

  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, 'bookings/guestroom'));

  let roomsBooked = 0;

  if (snapshot.exists()) {
    const bookings = snapshot.val();
    for (let key in bookings) {
      const b = bookings[key];
      // Check for time conflicts
      if (
        b.date === date &&
        b.type === type &&
        (
          (startTime >= b.startTime && startTime < b.endTime) ||
          (endTime > b.startTime && endTime <= b.endTime) ||
          (startTime <= b.startTime && endTime >= b.endTime)
        )
      ) {
        if (type === 'room') {
          roomsBooked += b.roomCount ? parseInt(b.roomCount) : 1;
        } else {
          result.isAvailable = false;
          result.message = "The lobby is already booked for this time slot.";
          return result;
        }
      }
    }
  }

  // Check if enough rooms are available
  if (type === 'room' && roomsBooked > 0) {
    if (roomsBooked >= TOTAL_ROOMS) {
      result.isAvailable = false;
      result.message = "No rooms available for the selected time slot.";
    } else if (roomsBooked + roomCount > TOTAL_ROOMS) {
      result.isAvailable = false;
      result.message = `Only ${TOTAL_ROOMS - roomsBooked} room(s) left for the selected time slot.`;
    }
  }

  return result;
}

// =================
// BANQUET HALL BOOKING
// =================

// Load banquet bookings
function loadBanquetBookings() {
  const bookingsRef = ref(db, "bookings/banquet");
  onValue(bookingsRef, (snapshot) => {
    banquetBookedList.innerHTML = '';
    if (snapshot.exists()) {
      const bookings = snapshot.val();
      for (let key in bookings) {
        const booking = bookings[key];
        const li = document.createElement('li');
        li.textContent = `${booking.date} | ${booking.time} | ${booking.name} | ${booking.flatNumber} | ${booking.status}`;
        banquetBookedList.appendChild(li);
      }
    }
  });
}

// Banquet booking form submission
function handleBanquetBooking(e) {
  e.preventDefault();

  if (!userData) {
    banquetMessage.textContent = "You need to be logged in to make a booking.";
    banquetMessage.style.color = "red";
    return;
  }

  // Get user data from session storage
  const name = userData.name;
  const flatNumber = userData.apartment;

  let bookingData = {
    date: document.getElementById("banquet-date").value,
    time: document.getElementById("banquet-time").value,
    name: name,
    flatNumber: flatNumber,
    purpose: document.getElementById("banquet-purpose").value,
    guests: document.getElementById("banquet-guests").value,
    status: "Pending", // Default status when booking is made
    timestamp: new Date().toISOString()
  };

  // Push booking to Firebase
  const bookingsRef = ref(db, "bookings/banquet");
  const newBookingRef = push(bookingsRef);
  set(newBookingRef, bookingData)
    .then(() => {
      banquetMessage.textContent = "Booking submitted! Status: Pending";
      banquetMessage.style.color = "lightgreen";
      banquetForm.reset();
      loadBanquetBookings();
      
      // Refresh calendar
      if (window.calendar) {
        window.calendar.refetchEvents();
      }
    })
    .catch((error) => {
      console.error("Error adding booking:", error);
      banquetMessage.textContent = "Failed to book. Please try again.";
      banquetMessage.style.color = "red";
    });
}

// Initialize FullCalendar for banquet availability
function initializeCalendar() {
  var calendarEl = document.getElementById("calendar");

  window.calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth", 
    initialDate: new Date(),
    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: "dayGridMonth"
    },
    locale: "en",

    events: function (fetchInfo, successCallback, failureCallback) {
      const bookingsRef = ref(db, "bookings/banquet");

      onValue(bookingsRef, (snapshot) => {
        let events = [];
        snapshot.forEach((childSnapshot) => {
          let booking = childSnapshot.val();

          let status = booking.status.toLowerCase();
          let color = "#FFD700"; // Default: Yellow (Pending)
          if (status === "approved") color = "#008000"; // Green (Approved)
          if (status === "rejected") color = "#FF0000"; // Red (Rejected)
          if (status === "cancelled") color = "#808080"; // Grey (Cancelled)

          events.push({
            title: `(${booking.status})`,
            start: booking.date,
            backgroundColor: color,
            borderColor: color,
            extendedProps: {
              name: booking.name,
              flatNumber: booking.flatNumber,
              time: booking.time,
              guests: booking.guests,
              purpose: booking.purpose,
              status: booking.status
            }
          });
        });

        successCallback(events);
      });
    },

    eventClick: function (info) {
      let event = info.event.extendedProps;
      alert(
        `Booking Details:\n\n` +
        `🔹 Name: ${event.name}\n` +
        `🏠 Flat: ${event.flatNumber}\n` +
        `📅 Date: ${info.event.start.toISOString().split("T")[0]}\n` +
        `⏰ Time: ${event.time}\n` +
        `👥 Guests: ${event.guests}\n` +
        `🎉 Purpose: ${event.purpose}\n` +
        `📌 Status: ${event.status}`
      );
    }
  });

  window.calendar.render();
}

// =================
// INITIALIZATION
// =================
document.addEventListener("DOMContentLoaded", function () {
  // Get user data from session storage
  userData = getUserData();
  
  // Initialize UI components
  initializeUI();
  
  // Initialize calendar
  initializeCalendar();
  
  // Event listeners for form submissions
  guestroomForm.addEventListener('submit', handleGuestroomBooking);
  banquetForm.addEventListener('submit', handleBanquetBooking);

  // Load data
  loadGuestroomBookings();
  loadBanquetBookings();
});
