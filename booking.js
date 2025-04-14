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
const TOTAL_ROOMS = 8;

// DOM Elements
const guestroomForm = document.getElementById('guestroomForm');
const guestroomMessage = document.getElementById('guestroom-message');
const bookedList = document.getElementById('bookedList');
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

  // Availability section toggle
  document.getElementById('checkAvailability').addEventListener('click', function() {
    document.getElementById('availability-section').style.display = 'block';
    
    // Force refresh calendar size
    if (window.calendar) {
      setTimeout(() => window.calendar.updateSize(), 10);
    }
  });

  document.getElementById('hideAvailability').addEventListener('click', function() {
    document.getElementById('availability-section').style.display = 'none';
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

// Update guest count display and calculate required rooms
function updateGuestRoomCount() {
  const guestCount = parseInt(document.getElementById("guestroom-guests").value);
  document.getElementById("guests-value").textContent = guestCount;
  
  // Calculate rooms needed (3 guests per room, rounded up)
  const roomsNeeded = Math.ceil(guestCount / 3);
  document.getElementById("roomCount").value = roomsNeeded;
  document.getElementById("roomCount-value").textContent = roomsNeeded;
}

// Generate dates array for multi-day guest room booking
function generateGuestroomDates(startDateStr, duration) {
  const startDate = new Date(startDateStr);
  const days = [];
  
  for (let i = 0; i < duration; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const checkInDate = new Date(currentDate);
    checkInDate.setHours(11, 30, 0); // 11:30 AM check-in
    
    const checkOutDate = new Date(currentDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    checkOutDate.setHours(10, 30, 0); // 10:30 AM check-out next day
    
    days.push({
      date: currentDate.toISOString().split("T")[0],
      startTime: "11:30",
      endTime: "10:30", // Next day
      isOvernight: true
    });
  }
  
  return days;
}

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
        
        // Handle multi-day bookings
        if (b.days && b.days.length > 0) {
          li.innerHTML = `${b.name} | ${b.flat} | ${b.days.length} day(s) from ${b.startDate} | 
                         ${b.type === 'room' ? `Room${b.roomCount > 1 ? 's: ' + b.roomCount : ''}` : 'Lobby'} | 
                         ${b.guests} guest(s) | ${b.status}`;
        } else {
          // Handle legacy single-day bookings
          li.textContent = `${b.date} | ${formatTime(b.startTime)} - ${formatTime(b.endTime)} | 
                          ${b.type.toUpperCase()}${b.roomCount ? ' x' + b.roomCount : ''} | ${b.flat} | ${b.status}`;
        }
        
        // Add color coding based on status
        if (b.status === 'Pending') {
          li.style.borderColor = '#FFD700'; // Yellow for pending
        } else if (b.status === 'Confirmed') {
          li.style.borderColor = '#64ffda'; // Default teal for confirmed
        } else if (b.status === 'Rejected') {
          li.style.borderColor = '#FF0000'; // Red for rejected
        }
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

  // Get form values
  const startDate = document.getElementById("guestroom-start-date").value;
  const duration = parseInt(document.getElementById("guestroom-duration").value);
  const guests = parseInt(document.getElementById("guestroom-guests").value);
  const roomCount = parseInt(document.getElementById("roomCount").value);

  // Generate days array
  const days = generateGuestroomDates(startDate, duration);

  // Get user data from session storage
  const name = userData.name;
  const flat = userData.apartment;

  // Check availability
  checkGuestroomAvailability(days, "room", roomCount)
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
        startDate,
        duration,
        days,
        guests,
        type: "room",
        roomCount: roomCount,
        status: "Pending",
        timestamp: new Date().toISOString()
      };

      set(bookingRef, bookingData)
        .then(() => {
          guestroomMessage.textContent = "Booking request submitted! Status: Pending";
          guestroomMessage.style.color = "#FFD700"; // Yellow color for pending status
          loadGuestroomBookings();
          guestroomForm.reset();
          
          // Refresh calendar
          if (window.calendar) {
            window.calendar.refetchEvents();
          }
        })
        .catch(error => {
          console.error("Firebase error:", error);
          guestroomMessage.textContent = "Failed to book. Please try again.";
          guestroomMessage.style.color = "red";
        });
    });
}

// Check if guestroom is available
async function checkGuestroomAvailability(days, type, roomCount) {
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

  // Check each requested day against existing bookings
  for (const requestedDay of days) {
    const requestedDate = requestedDay.date;
    let roomsAvailable = TOTAL_ROOMS;
    let lobbyBooked = false;

    if (snapshot.exists()) {
      const bookings = snapshot.val();
      
      for (let key in bookings) {
        const booking = bookings[key];
        
        // Skip rejected bookings
        if (booking.status === "Rejected") continue;
        
        // Check for new multi-day booking format
        if (booking.days && booking.days.length > 0) {
          for (const bookedDay of booking.days) {
            if (bookedDay.date === requestedDate) {
              if (booking.type === 'lobby') {
                lobbyBooked = true;
              } else if (booking.type === 'room') {
                roomsAvailable -= booking.roomCount || 1;
              }
            }
          }
        } 
        // Check legacy format
        else if (booking.date === requestedDate) {
          if (booking.type === 'lobby') {
            lobbyBooked = true;
          } else if (booking.type === 'room') {
            roomsAvailable -= booking.roomCount || 1;
          }
        }
      }
    }

    // Check availability based on booking type
    if (type === 'lobby' && lobbyBooked) {
      result.isAvailable = false;
      result.message = `The lobby is already booked for ${requestedDate}.`;
      return result;
    } else if (type === 'room' && roomsAvailable < roomCount) {
      result.isAvailable = false;
      result.message = `Only ${roomsAvailable} room(s) available for ${requestedDate}.`;
      return result;
    }
  }

  return result;
}

// =================
// BANQUET HALL BOOKING
// =================

// Initialize banquet form with dynamic day inputs
function initializeBanquetForm() {
  const durationSelect = document.getElementById('banquet-duration');
  const daysContainer = document.getElementById('banquet-days-container');
  
  // Generate time input fields based on selected duration
  function updateDayFields() {
    daysContainer.innerHTML = '';
    const startDate = new Date(document.getElementById('banquet-start-date').value);
    const numDays = parseInt(durationSelect.value);
    
    if (isNaN(startDate.getTime())) {
      daysContainer.innerHTML = '<p style="color: #ffcc70;">Please select a start date first</p>';
      return;
    }
    
    for (let i = 0; i < numDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dateString = currentDate.toISOString().split('T')[0];
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(currentDate);
      
      const dayContainer = document.createElement('div');
      dayContainer.classList.add('day-container');
      dayContainer.innerHTML = `
        <h3>Day ${i + 1}: ${formattedDate}</h3>
        <div class="day-time-input">
          <label for="banquet-start-time-${i}">Start Time for ${formattedDate}:</label>
          <input type="time" id="banquet-start-time-${i}" class="banquet-day-start-time" data-date="${dateString}" required>
        </div>
        <div class="day-time-input">
          <label for="banquet-end-time-${i}">End Time for ${formattedDate}:</label>
          <input type="time" id="banquet-end-time-${i}" class="banquet-day-end-time" data-date="${dateString}" required>
        </div>
      `;
      daysContainer.appendChild(dayContainer);
    }
  }
  
  // Event listeners
  durationSelect.addEventListener('change', updateDayFields);
  document.getElementById('banquet-start-date').addEventListener('change', updateDayFields);
}

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
        
        // Format multi-day booking display
        if (booking.days && booking.days.length > 1) {
          li.classList.add('banquet-multi-day');
          let daysInfo = '';
          booking.days.forEach((day, index) => {
            // Check for both startTime and endTime
            const timeDisplay = day.startTime && day.endTime ? 
              `${day.startTime} - ${day.endTime}` : 
              (day.time || 'Time not specified');
            daysInfo += `<div>${day.date} at ${timeDisplay}</div>`;
          });
          
          li.innerHTML = `
            <strong>${booking.name} (${booking.flatNumber})</strong><br>
            Multi-day booking (${booking.days.length} days)<br>
            <div class="multi-day-info">${daysInfo}</div>
            Purpose: ${booking.purpose} | Guests: ${booking.guests} | Status: ${booking.status}
          `;
        } else if (booking.days && booking.days.length === 1) {
          // Single day booking with new structure
          const day = booking.days[0];
          const timeDisplay = day.startTime && day.endTime ? 
            `${day.startTime} - ${day.endTime}` : 
            (day.time || 'Time not specified');
          li.textContent = `${day.date} | ${timeDisplay} | ${booking.name} | ${booking.flatNumber} | ${booking.status}`;
        } else {
          // Legacy format support
          li.textContent = `${booking.date || 'N/A'} | ${booking.time || 'N/A'} | ${booking.name} | ${booking.flatNumber} | ${booking.status}`;
        }
        
        banquetBookedList.appendChild(li);
      }
    }
  });
}

// Check if banquet hall is available for the requested dates and times
async function checkBanquetAvailability(days) {
  const result = {
    isAvailable: true,
    message: ""
  };

  try {
    // Query Firebase for conflicting bookings
    const bookingsRef = ref(db, "bookings/banquet");
    const snapshot = await get(bookingsRef);
    
    if (!snapshot.exists()) {
      return result; // No bookings exist yet
    }
    
    const bookings = snapshot.val();
    
    // Check each requested day against existing bookings
    for (const requestedDay of days) {
      const requestedDate = requestedDay.date;
      const requestedStartTime = requestedDay.startTime;
      const requestedEndTime = requestedDay.endTime;
      
      for (const key in bookings) {
        const booking = bookings[key];
        
        // Skip bookings that are not confirmed
        if (booking.status !== "Confirmed") continue;
        
        // Check if booking has days array (new format)
        if (booking.days && booking.days.length > 0) {
          for (const bookedDay of booking.days) {
            if (bookedDay.date === requestedDate) {
              // Check for time overlap on the same day
              const bookedStartTime = bookedDay.startTime;
              const bookedEndTime = bookedDay.endTime;
              
              if (
                (requestedStartTime >= bookedStartTime && requestedStartTime < bookedEndTime) ||
                (requestedEndTime > bookedStartTime && requestedEndTime <= bookedEndTime) ||
                (requestedStartTime <= bookedStartTime && requestedEndTime >= bookedEndTime)
              ) {
                result.isAvailable = false;
                result.message = `There is a confirmed booking conflict on ${requestedDate} between ${bookedStartTime} and ${bookedEndTime}. Please check availability calendar and select a different time.`;
                return result;
              }
            }
          }
        } 
        // Check legacy format support
        else if (booking.date === requestedDate) {
          const bookedTime = booking.time || "00:00";
          // For legacy bookings without end time, assume it's a 2-hour booking
          const bookedStartTime = bookedTime;
          const bookedEndTimeParts = bookedTime.split(':');
          let bookedEndHour = parseInt(bookedEndTimeParts[0]) + 2;
          const bookedEndTime = `${bookedEndHour.toString().padStart(2, '0')}:${bookedEndTimeParts[1]}`;
          
          if (
            (requestedStartTime >= bookedStartTime && requestedStartTime < bookedEndTime) ||
            (requestedEndTime > bookedStartTime && requestedEndTime <= bookedEndTime) ||
            (requestedStartTime <= bookedStartTime && requestedEndTime >= bookedEndTime)
          ) {
            result.isAvailable = false;
            result.message = `There is a confirmed booking conflict on ${requestedDate} around ${bookedStartTime}. Please check availability calendar and select a different time.`;
            return result;
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error checking banquet availability:", error);
    result.isAvailable = false;
    result.message = "An error occurred while checking availability. Please try again.";
    return result;
  }
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
  
  // Get form values
  const startDate = document.getElementById("banquet-start-date").value;
  const duration = parseInt(document.getElementById("banquet-duration").value);
  const guests = document.getElementById("banquet-guests").value;
  const purpose = document.getElementById("banquet-purpose").value;
  
  // Collect day-specific information
  const days = [];
  const startTimeInputs = document.querySelectorAll('.banquet-day-start-time');
  const endTimeInputs = document.querySelectorAll('.banquet-day-end-time');
  
  for (let i = 0; i < startTimeInputs.length; i++) {
    const startTimeInput = startTimeInputs[i];
    const endTimeInput = endTimeInputs[i];
    const date = startTimeInput.getAttribute('data-date');
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    
    days.push({
      date: date,
      startTime: startTime,
      endTime: endTime
    });
  }
  
  // Validate all times are filled
  const allTimesFilled = days.every(day => day.startTime && day.endTime);
  if (!allTimesFilled) {
    banquetMessage.textContent = "Please provide both start and end times for all selected days.";
    banquetMessage.style.color = "red";
    return;
  }
  
  // Validate that end time is after start time for each day
  const validTimes = days.every(day => day.startTime < day.endTime);
  if (!validTimes) {
    banquetMessage.textContent = "End time must be after start time for all days.";
    banquetMessage.style.color = "red";
    return;
  }

  // Check for availability/conflicts
  banquetMessage.textContent = "Checking availability...";
  banquetMessage.style.color = "white";
  
  checkBanquetAvailability(days)
    .then(availabilityResult => {
      if (!availabilityResult.isAvailable) {
        banquetMessage.textContent = availabilityResult.message;
        banquetMessage.style.color = "red";
        return;
      }
      
      // Create booking object
      let bookingData = {
        name: name,
        flatNumber: flatNumber,
        startDate: startDate,
        duration: duration,
        days: days,
        guests: guests,
        purpose: purpose,
        status: "Pending",
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
          document.getElementById('banquet-days-container').innerHTML = '';
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
    })
    .catch(error => {
      console.error("Error checking availability:", error);
      banquetMessage.textContent = "An error occurred while checking availability. Please try again.";
      banquetMessage.style.color = "red";
    });
}

// Initialize FullCalendar for facility availability
function initializeCalendar() {
  var calendarEl = document.getElementById("calendar");

  window.calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth", 
    initialDate: new Date(),
    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    locale: "en",

    events: function (fetchInfo, successCallback, failureCallback) {
      const events = [];
      
      // Fetch banquet hall bookings
      const banquetRef = ref(db, "bookings/banquet");
      get(banquetRef).then((banquetSnapshot) => {
        if (banquetSnapshot.exists()) {
          banquetSnapshot.forEach((childSnapshot) => {
            let booking = childSnapshot.val();
            
            let status = (booking.status || "pending").toLowerCase();
            let color = "#FFD700"; // Default: Yellow (Pending)
            if (status === "approved" || status === "confirmed") color = "#4ec0b7"; // Teal (Confirmed)
            if (status === "rejected") color = "#FF0000"; // Red (Rejected)
            if (status === "cancelled") color = "#808080"; // Grey (Cancelled)
            
            // Handle multi-day bookings
            if (booking.days && booking.days.length > 0) {
              // Add individual event for each day
              booking.days.forEach((day, index) => {
                events.push({
                  title: `Banquet: ${booking.name}${booking.days.length > 1 ? ` (${index+1}/${booking.days.length})` : ''}`,
                  start: `${day.date}T${day.startTime || day.time || '00:00'}`,
                  end: day.endTime ? `${day.date}T${day.endTime}` : null,
                  backgroundColor: color,
                  borderColor: color,
                  extendedProps: {
                    type: "banquet",
                    name: booking.name,
                    flatNumber: booking.flatNumber,
                    startTime: day.startTime || day.time,
                    endTime: day.endTime,
                    date: day.date,
                    dayInfo: `Day ${index+1} of ${booking.days.length}`,
                    guests: booking.guests,
                    purpose: booking.purpose,
                    status: booking.status,
                    isMultiDay: booking.days.length > 1,
                    totalDays: booking.days.length,
                    allDays: booking.days
                  }
                });
              });
            } else if (booking.date && booking.time) {
              // Support for legacy format
              events.push({
                title: `Banquet: ${booking.name}`,
                start: `${booking.date}T${booking.time}`,
                backgroundColor: color,
                borderColor: color,
                extendedProps: {
                  type: "banquet",
                  name: booking.name,
                  flatNumber: booking.flatNumber,
                  time: booking.time,
                  date: booking.date,
                  guests: booking.guests,
                  purpose: booking.purpose,
                  status: booking.status,
                  isMultiDay: false
                }
              });
            }
          });
        }
        
        // Fetch guestroom bookings
        const guestroomRef = ref(db, "bookings/guestroom");
        get(guestroomRef).then((guestroomSnapshot) => {
          if (guestroomSnapshot.exists()) {
            guestroomSnapshot.forEach((childSnapshot) => {
              let booking = childSnapshot.val();
              
              // Set color based on status
              let color = '#4ec0b7'; // Default color
              if (booking.status === 'Pending') color = "#FFD700"; // Yellow for pending
              if (booking.status === 'Confirmed') color = "#4ec0b7"; // Teal for confirmed
              if (booking.status === 'Rejected') color = "#FF0000"; // Red for rejected
              
              // Handle multi-day bookings
              if (booking.days && booking.days.length > 0) {
                booking.days.forEach((day, index) => {
                  const nextDay = new Date(day.date);
                  nextDay.setDate(nextDay.getDate() + 1);
                  const nextDayStr = nextDay.toISOString().split('T')[0];
                  
                  events.push({
                    title: `${booking.type === 'room' ? 'Room' : 'Lobby'}: ${booking.name}${booking.days.length > 1 ? ` (${index+1}/${booking.days.length})` : ''}`,
                    start: `${day.date}T11:30:00`,
                    end: `${nextDayStr}T10:30:00`,
                    backgroundColor: color,
                    borderColor: color,
                    extendedProps: {
                      type: "guestroom",
                      bookingType: booking.type,
                      name: booking.name,
                      flat: booking.flat,
                      roomCount: booking.roomCount || 1,
                      guests: booking.guests,
                      status: booking.status,
                      isOvernight: true,
                      dayNumber: index + 1,
                      totalDays: booking.days.length,
                      checkIn: "11:30 AM",
                      checkOut: "10:30 AM",
                      allDays: booking.days
                    }
                  });
                });
              } 
              // Handle legacy bookings
              else {
                events.push({
                  title: `${booking.type === 'room' ? 'Room' : 'Lobby'}: ${booking.name}`,
                  start: `${booking.date}T${booking.startTime}`,
                  end: `${booking.date}T${booking.endTime}`,
                  backgroundColor: color,
                  borderColor: color,
                  extendedProps: {
                    type: "guestroom",
                    bookingType: booking.type,
                    name: booking.name,
                    flat: booking.flat,
                    roomCount: booking.roomCount || 1,
                    guests: booking.guests,
                    status: booking.status
                  }
                });
              }
            });
          }
          
          successCallback(events);
        }).catch((error) => {
          console.error("Error fetching guestroom bookings:", error);
          failureCallback(error);
        });
      }).catch((error) => {
        console.error("Error fetching banquet bookings:", error);
        failureCallback(error);
      });
    },

    eventClick: function (info) {
      let event = info.event.extendedProps;
      
      if (event.type === "banquet") {
        if (event.isMultiDay) {
          // Format for multi-day booking
          let daysInfo = '';
          event.allDays.forEach((day, i) => {
            // Check for both startTime and endTime
            const timeDisplay = day.startTime && day.endTime ? 
              `${day.startTime} - ${day.endTime}` : 
              (day.time || 'Time not specified');
            daysInfo += `📅 Day ${i+1}: ${day.date} at ${timeDisplay}\n`;
          });
          
          alert(
            `Banquet Hall Booking (Multi-day):\n\n` +
            `🔹 Name: ${event.name}\n` +
            `🏠 Flat: ${event.flatNumber}\n` +
            `${daysInfo}` +
            `👥 Guests: ${event.guests}\n` +
            `🎉 Purpose: ${event.purpose}\n` +
            `📌 Status: ${event.status}`
          );
        } else {
          // Format for single-day booking
          const timeDisplay = event.startTime && event.endTime ? 
            `${event.startTime} - ${event.endTime}` : 
            (event.time || 'Time not specified');
          
          alert(
            `Banquet Hall Booking:\n\n` +
            `🔹 Name: ${event.name}\n` +
            `🏠 Flat: ${event.flatNumber}\n` +
            `📅 Date: ${event.date || info.event.start.toISOString().split("T")[0]}\n` +
            `⏰ Time: ${timeDisplay}\n` +
            `👥 Guests: ${event.guests}\n` +
            `🎉 Purpose: ${event.purpose}\n` +
            `📌 Status: ${event.status}`
          );
        }
      } else if (event.type === "guestroom") {
        if (event.isOvernight) {
          // Format for multi-day booking
          alert(
            `Guest Room Booking (Multi-day):\n\n` +
            `🔹 Name: ${event.name}\n` +
            `🏠 Flat: ${event.flat}\n` +
            `📅 Day: ${event.dayNumber} of ${event.totalDays}\n` +
            `🏨 Type: ${event.bookingType === 'room' ? 'Room' + (event.roomCount > 1 ? 's (' + event.roomCount + ')' : '') : 'Full Lobby'}\n` +
            `👥 Guests: ${event.guests}\n` +
            `⏰ Check-in: ${event.checkIn}\n` +
            `⏰ Check-out: ${event.checkOut} (next day)\n` +
            `📌 Status: ${event.status}`
          );
        } else {
          // Format for legacy booking
          alert(
            `Guest Room Booking:\n\n` +
            `🔹 Name: ${event.name}\n` +
            `🏠 Flat: ${event.flat}\n` +
            `📅 Date: ${info.event.start.toISOString().split("T")[0]}\n` +
            `⏰ Time: ${formatTime(info.event.start.toISOString().split("T")[1].substring(0,5))} - ` +
                   `${formatTime(info.event.end.toISOString().split("T")[1].substring(0,5))}\n` +
            `🏨 Type: ${event.bookingType === 'room' ? 'Room' + (event.roomCount > 1 ? 's (' + event.roomCount + ')' : '') : 'Full Lobby'}\n` +
            `👥 Guests: ${event.guests}\n` +
            `📌 Status: ${event.status}`
          );
        }
      }
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
  initializeBanquetForm();
  
  // Initialize calendar
  initializeCalendar();
  
  // Event listeners for form submissions
  guestroomForm.addEventListener('submit', handleGuestroomBooking);
  banquetForm.addEventListener('submit', handleBanquetBooking);

  // Guest room specific event listeners - Fix slider functionality
  const guestSlider = document.getElementById("guestroom-guests");
  if (guestSlider) {
    // Remove any existing listeners first to avoid duplicates
    guestSlider.removeEventListener('input', updateGuestRoomCount);
    // Add the input event listener with proper binding
    guestSlider.addEventListener('input', updateGuestRoomCount);
    // Initialize the room count display
    updateGuestRoomCount();
  }
  
  // Always show roomCountDiv
  if (roomCountDiv) {
    roomCountDiv.style.display = 'block';
  }

  // Load data
  loadGuestroomBookings();
  loadBanquetBookings();
});
