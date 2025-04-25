import { initializeFirebase } from './firebase-init.js';
import { ref, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase
    const { database } = await initializeFirebase();
    
    const guestsList = document.getElementById('guests-list');
    const addGuestBtn = document.getElementById('add-guest-btn');
    const verifyBtn = document.getElementById('verify-guest-btn');
    const viewEntriesBtn = document.getElementById('view-entries-btn');
    
    // Get the logged-in user's apartment from session storage
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
    const userApartment = loggedInUser.apartment || 'unknown';
    const userSubRole = loggedInUser.sub_role || 'resident';
    
    // Check if user has permission to view entries based on role
    const higherRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
    if (higherRoles.includes(userSubRole)) {
        // User has permission to view entries
        viewEntriesBtn.style.display = 'block';
    }
    
    // Add apartment display in the guests list header
    const apartmentDisplay = document.createElement('div');
    apartmentDisplay.className = 'apartment-display';
    apartmentDisplay.textContent = `Guests for Apartment: ${userApartment}`;
    const headerElement = document.querySelector('.guests-container h1');
    if (headerElement && headerElement.nextSibling) {
        headerElement.parentNode.insertBefore(apartmentDisplay, headerElement.nextSibling);
    }

    // Navigate to add guest page
    addGuestBtn.addEventListener('click', () => {
        window.location.href = 'add-guest.html';
    });

    // Navigate to verify guest page
    verifyBtn.addEventListener('click', () => {
        window.location.href = 'verify-guest.html';
    });
    
    // Navigate to view entries page (new)
    viewEntriesBtn.addEventListener('click', () => {
        window.location.href = 'view-entries.html';
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
                }))
                // Filter guests to only show ones from the current user's apartment
                .filter(guest => guest.apartment === userApartment);
                
                // Sort guests alphabetically by name
                guestArray.sort((a, b) => a.name.localeCompare(b.name));
                
                if (guestArray.length === 0) {
                    guestsList.innerHTML = '<p class="loading-text">No guests found for your apartment. Add your first guest!</p>';
                    return;
                }
                
                // Create a card for each guest
                guestArray.forEach(guest => {
                    const guestCard = document.createElement('div');
                    guestCard.className = 'guest-card';
                    
                    guestCard.innerHTML = `
                        <img src="${guest.imageUrl}" alt="${guest.name}" class="guest-photo">
                        <div class="guest-info">
                            <div class="guest-name" title="${guest.name}">${guest.name}</div>
                            <div class="guest-phone" title="${guest.phone}">${guest.phone}</div>
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
