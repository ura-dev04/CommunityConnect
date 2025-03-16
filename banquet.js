import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// 🔹 Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
    authDomain: "societymanagement-df579.firebaseapp.com",
    projectId: "societymanagement-df579",
    storageBucket: "societymanagement-df579.firebasestorage.app",
    messagingSenderId: "526280568230",
    appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

//  Show Calendar Section
document.getElementById("showCalendar").addEventListener("click", function () {
    document.getElementById("bookingSection").style.display = "none";
    document.getElementById("calendarSection").style.display = "block";
});

//  Handle Booking Submission
document.getElementById("bookingForm").addEventListener("submit", function (e) {
    e.preventDefault();

    let bookingData = {
        date: document.getElementById("date").value,
        time: document.getElementById("time").value,
        name: document.getElementById("name").value,
        flatNumber: document.getElementById("flatNumber").value,
        purpose: document.getElementById("purpose").value,
        guests: document.getElementById("guests").value,
        status: "Pending" // Default status when booking is made
    };

    // 🔹 Push booking to Firebase
    const bookingsRef = ref(database, "bookings");
    const newBookingRef = push(bookingsRef);
    set(newBookingRef, bookingData)
        .then(() => {
            alert("Booking submitted! Status: Pending");
            document.getElementById("bookingForm").reset();
        })
        .catch((error) => {
            console.error("Error adding booking:", error);
        });
});

// 📌 Initialize FullCalendar with real-time updates
document.addEventListener("DOMContentLoaded", function () {
    var calendarEl = document.getElementById("calendar");

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth", // Ensures month view
        initialDate: new Date(), // Sets the calendar to today's date
        headerToolbar: {
            left: "prev,next",
            center: "title",
            right: "dayGridMonth"
        },
        locale: "en", //  Ensures day names appear correctly

        events: function (fetchInfo, successCallback, failureCallback) {
            const bookingsRef = ref(database, "bookings");

            //  Real-time Firestore updates for bookings
            onValue(bookingsRef, (snapshot) => {
                let events = [];
                snapshot.forEach((childSnapshot) => {
                    let booking = childSnapshot.val();

                    // Set color based on status
                    let status = booking.status.toLowerCase(); // Case-insensitive
                    let color = "#FFD700"; // Default: Yellow (Pending)
                    if (status === "approved") color = "#008000"; // Green (Approved)
                    if (status === "rejected") color = "#FF0000"; // Red (Rejected)
                    if (status === "cancelled") color = "#808080"; // Grey (Cancelled)

                    events.push({
                        title: `(${booking.status})`, // Show status & name
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

                successCallback(events); r
            });
        },

        //  Show booking details on click
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

    calendar.render();
});
