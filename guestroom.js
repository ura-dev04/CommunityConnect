import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, set, get, child } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
  authDomain: "societymanagement-df579.firebaseapp.com",
  projectId: "societymanagement-df579",
  storageBucket: "societymanagement-df579.appspot.com",
  messagingSenderId: "526280568230",
  appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const form = document.getElementById('bookingForm');
const message = document.getElementById('message');
const bookedList = document.getElementById('bookedList');
const typeSelect = document.getElementById('type');
const roomCountDiv = document.getElementById('roomCountDiv');
const roomCountInput = document.getElementById('roomCount');

// Constants
const TOTAL_ROOMS = 5;

// Flatpickr init for 12-hour format time
flatpickr("#startTime", {
  enableTime: true,
  noCalendar: true,
  dateFormat: "h:i K",
  time_24hr: false
});

flatpickr("#endTime", {
  enableTime: true,
  noCalendar: true,
  dateFormat: "h:i K",
  time_24hr: false
});

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

// Load bookings
function loadBookings() {
  const dbRef = ref(db, 'guestroomBookings');
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
loadBookings();

// Show/hide room count input
typeSelect.addEventListener('change', () => {
  roomCountDiv.style.display = typeSelect.value === 'room' ? 'block' : 'none';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = form.name.value.trim();
  const flat = form.flat.value.trim();
  const date = form.date.value;
  const rawStart = form.startTime.value;
  const rawEnd = form.endTime.value;
  const startTime = convertTo24Hour(rawStart);
  const endTime = convertTo24Hour(rawEnd);
  const guests = form.guests.value;
  const type = form.type.value;
  const roomCount = type === 'room' ? parseInt(roomCountInput.value) : null;

  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, 'guestroomBookings'));

  let isAvailable = true;
  let roomsBooked = 0;

  if (snapshot.exists()) {
    const bookings = snapshot.val();
    for (let key in bookings) {
      const b = bookings[key];
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
          isAvailable = false;
          break;
        }
      }
    }
  }

  // Check for valid room count and if rooms are available
  if (type === 'room') {
    if (!roomCount || roomCount <= 0 || roomCount > TOTAL_ROOMS) {
      message.textContent = "Invalid number of rooms selected.";
      message.style.color = "var(--accent)";
      return;
    }
    // Extra check: reject if no rooms are available
    if (roomsBooked >= TOTAL_ROOMS) {
      message.textContent = "No rooms available for the selected time slot.";
      message.style.color = "var(--accent)";
      return;
    }
    if (roomsBooked + roomCount > TOTAL_ROOMS) {
      message.textContent = `Only ${TOTAL_ROOMS - roomsBooked} room(s) left for the selected time slot.`;
      message.style.color = "var(--accent)";
      return;
    }
  }

  if (startTime >= endTime) {
    message.textContent = "End time must be after start time.";
    message.style.color = "var(--accent)";
    return;
  }

  try {
    const bookingRef = push(ref(db, "guestroomBookings"));
    const bookingData = {
      name,
      flat,
      date,
      startTime,
      endTime,
      guests,
      type,
      timestamp: new Date().toISOString()
    };
    if (type === 'room') {
      bookingData.roomCount = roomCount;
    }

    await set(bookingRef, bookingData);
    message.textContent = "Booking confirmed!";
    message.style.color = "var(--accent)";
    loadBookings();
    form.reset();
    roomCountDiv.style.display = 'none';
  } catch (error) {
    console.error("Firebase error:", error);
    message.textContent = "Failed to book. Please try again.";
    message.style.color = "var(--accent)";
  }
});
