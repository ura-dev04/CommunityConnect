import { database } from './firebase-config.js';
import { ref, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    const guestsList = document.getElementById('guests-list');
    const addGuestBtn = document.getElementById('add-guest-btn');
    const verifyBtn = document.getElementById('verify-guest-btn');

    // Navigate to add guest page
    addGuestBtn.addEventListener('click', () => {
        window.location.href = 'add-guest.html';
    });

    // Navigate to verify guest page
    verifyBtn.addEventListener('click', () => {
        window.location.href = 'verify-guest.html';
    });

    // Load all guests from the database
    loadGuests();

    // Function to load all guests
    function loadGuests() {
        const guestsRef = ref(database, 'guests');
        
        onValue(guestsRef, (snapshot) => {
            const guests = snapshot.val();
            
            // Clear the guests list
            guestsList.innerHTML = '';
            
            if (guests) {
                // Convert object to array for easier manipulation
                const guestArray = Object.entries(guests).map(([id, data]) => ({
                    id,
                    ...data
                }));
                
                // Sort guests alphabetically by name
                guestArray.sort((a, b) => a.name.localeCompare(b.name));
                
                // Create a card for each guest
                guestArray.forEach(guest => {
                    const guestCard = document.createElement('div');
                    guestCard.className = 'guest-card';
                    
                    guestCard.innerHTML = `
                        <img src="${guest.imageUrl}" alt="${guest.name}" class="guest-photo">
                        <div class="guest-info">
                            <div class="guest-name">${guest.name}</div>
                            <div class="guest-phone">${guest.phone}</div>
                        </div>
                        <div class="guest-actions">
                            <button class="action-btn delete" data-id="${guest.id}">Delete</button>
                        </div>
                    `;
                    
                    // Add card to the list
                    guestsList.appendChild(guestCard);
                    
                    // Add event listener for delete button
                    const deleteBtn = guestCard.querySelector('.action-btn.delete');
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteGuest(guest.id, guest.name);
                    });
                });
            } else {
                guestsList.innerHTML = '<p class="loading-text">No guests found. Add your first guest!</p>';
            }
        });
    }

    // Function to delete a guest
    function deleteGuest(guestId, guestName) {
        if (confirm(`Are you sure you want to delete ${guestName}?`)) {
            const guestRef = ref(database, `guests/${guestId}`);
            
            remove(guestRef)
                .then(() => {
                    console.log(`Guest ${guestName} deleted successfully`);
                })
                .catch((error) => {
                    console.error("Error deleting guest:", error);
                    alert(`Error deleting guest: ${error.message}`);
                });
        }
    }
});
