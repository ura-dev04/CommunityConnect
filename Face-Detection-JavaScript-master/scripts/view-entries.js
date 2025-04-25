import { ref, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { initializeFirebase } from './firebase-init.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase
    const { database } = await initializeFirebase();

    // Check if user is logged in with appropriate role
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
    const userSubRole = loggedInUser.sub_role || 'resident';
    
    // Display user role
    document.getElementById('user-role').textContent = `Role: ${userSubRole}`;
    
    // Define higher roles that can access this page
    const higherRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
    
    // If user doesn't have appropriate role, redirect to index.html
    if (!higherRoles.includes(userSubRole)) {
        alert('You do not have permission to view this page.');
        window.location.href = 'index.html';
        return;
    }
    
    // Elements
    const entriesTableBody = document.getElementById('entries-table-body');
    const noEntriesMessage = document.getElementById('no-entries-message');
    const totalEntriesElement = document.getElementById('total-entries');
    const todayEntriesElement = document.getElementById('today-entries');
    const dateFilter = document.getElementById('date-filter');
    const apartmentFilter = document.getElementById('apartment-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfoElement = document.getElementById('page-info');
    
    // Pagination state
    let currentPage = 1;
    const entriesPerPage = 20;
    let totalPages = 1;
    let allEntries = [];
    let filteredEntries = [];
    
    // Load entries
    await loadEntries();
    
    // Set up event listeners
    dateFilter.addEventListener('change', applyFilters);
    apartmentFilter.addEventListener('input', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
    prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    
    // Function to load entries from database
    async function loadEntries() {
        try {
            const entriesRef = ref(database, 'entries');
            const entriesSnapshot = await get(query(entriesRef, orderByChild('timestamp')));
            
            if (!entriesSnapshot.exists()) {
                showNoEntries();
                return;
            }
            
            // Convert to array and sort by timestamp (newest first)
            allEntries = [];
            entriesSnapshot.forEach(childSnapshot => {
                allEntries.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by timestamp (newest first)
            allEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Calculate stats
            updateStats(allEntries);
            
            // Apply any existing filters
            applyFilters();
        } catch (error) {
            console.error('Error loading entries:', error);
            entriesTableBody.innerHTML = '<tr><td colspan="5">Error loading entries. Please try again later.</td></tr>';
        }
    }
    
    // Function to apply filters
    function applyFilters() {
        const dateValue = dateFilter.value;
        const apartmentValue = apartmentFilter.value.toLowerCase();
        
        filteredEntries = allEntries.filter(entry => {
            let matchesDate = true;
            let matchesApartment = true;
            
            // Apply date filter if selected
            if (dateValue) {
                const entryDate = new Date(entry.timestamp);
                const filterDate = new Date(dateValue);
                matchesDate = entryDate.toDateString() === filterDate.toDateString();
            }
            
            // Apply apartment filter if entered
            if (apartmentValue) {
                matchesApartment = entry.apartment && 
                    entry.apartment.toLowerCase().includes(apartmentValue);
            }
            
            return matchesDate && matchesApartment;
        });
        
        // Update pagination and display
        totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
        if (totalPages === 0) totalPages = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        displayEntries();
        updatePaginationControls();
    }
    
    // Function to clear filters
    function clearFilters() {
        dateFilter.value = '';
        apartmentFilter.value = '';
        filteredEntries = allEntries;
        currentPage = 1;
        totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
        if (totalPages === 0) totalPages = 1;
        displayEntries();
        updatePaginationControls();
    }
    
    // Function to display entries for the current page
    function displayEntries() {
        entriesTableBody.innerHTML = '';
        
        if (filteredEntries.length === 0) {
            showNoEntries();
            return;
        }
        
        const startIndex = (currentPage - 1) * entriesPerPage;
        const endIndex = Math.min(startIndex + entriesPerPage, filteredEntries.length);
        const entriesToDisplay = filteredEntries.slice(startIndex, endIndex);
        
        noEntriesMessage.style.display = 'none';
        
        entriesToDisplay.forEach(entry => {
            const row = document.createElement('tr');
            
            // Format date and time
            const entryDate = new Date(entry.timestamp);
            const formattedDate = entryDate.toLocaleString();
            
            // Determine entry type and mode display
            const entryTypeClass = entry.type === 'entry' ? 'entry-type-entry' : 'entry-type-exit';
            const modeClass = entry.mode === 'apartment' ? 'mode-apartment' : 'mode-public';
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${entry.guestName || 'Unknown'}</td>
                <td>${entry.apartment || 'N/A'}</td>
                <td><span class="entry-badge ${entryTypeClass}">${capitalizeFirstLetter(entry.type || 'entry')}</span></td>
                <td><span class="entry-badge ${modeClass}">${capitalizeFirstLetter(entry.mode || 'unknown')}</span></td>
            `;
            
            entriesTableBody.appendChild(row);
        });
    }
    
    // Function to update pagination controls
    function updatePaginationControls() {
        pageInfoElement.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }
    
    // Function to go to a specific page
    function goToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        
        currentPage = pageNumber;
        displayEntries();
        updatePaginationControls();
    }
    
    // Function to update statistics
    function updateStats(entries) {
        totalEntriesElement.textContent = entries.length;
        
        // Count today's entries
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayEntries = entries.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === today.getTime();
        });
        
        todayEntriesElement.textContent = todayEntries.length;
    }
    
    // Function to show no entries message
    function showNoEntries() {
        entriesTableBody.innerHTML = '';
        noEntriesMessage.style.display = 'block';
    }
    
    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
});
