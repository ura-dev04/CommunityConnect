import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, update, get, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
    authDomain: "societymanagement-df579.firebaseapp.com",
    projectId: "societymanagement-df579",
    storageBucket: "societymanagement-df579.firebasestorage.app",
    messagingSenderId: "526280568230",
    appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Roles that can access admin features
const ADMIN_ROLES = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];

// Global variables for modal handling
let currentActionData = null;

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the navbar to be loaded completely
    document.addEventListener('navbarLoaded', initializeComplaintPage);
    
    // If for some reason the navbar loading event doesn't fire, initialize after a short delay
    setTimeout(() => {
        if (!window.navbarInitialized) {
            console.log('Navbar loading timed out, initializing complaint page');
            initializeComplaintPage();
        }
    }, 1000);
});

function initializeComplaintPage() {
    window.complaintPageInitialized = true;
    
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        // Redirect to login if not logged in
        window.location.href = 'login.html';
        return;
    }
    
    const userData = JSON.parse(loggedInUser);
    
    // Apply role-based access control
    applyRoleBasedAccess(userData);
    
    // Move form event handler inside DOMContentLoaded to ensure elements exist
    const complaintForm = document.getElementById('complaintForm');
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();  // Prevent form reload

            const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
            if (!loggedInUser || !loggedInUser.apartment) {
                document.getElementById('complaintMessage').innerText = "Error: You need to be logged in to submit a complaint.";
                return;
            }

            const flatNumber = loggedInUser.apartment;
            const complaintTypeElement = document.getElementById('complaintType');
            const complaintTextElement = document.getElementById('complaint');
            
            if (!complaintTypeElement || !complaintTextElement) {
                console.error("Form elements not found");
                document.getElementById('complaintMessage').innerText = "Error: Form elements not found";
                return;
            }

            const complaintType = complaintTypeElement.value;
            const complaintText = complaintTextElement.value;
            
            try {
                // Create new complaint entry under the resident
                const complaintData = {
                    complaint_type: complaintType,
                    complaint_content: complaintText,
                    status: "Pending",
                    timestamp: new Date().toISOString(),
                    resident_name: loggedInUser.name || loggedInUser.Owner_Name || 'Unknown'
                };
                
                // Get reference to the complaints node under the resident
                const newComplaintKey = push(ref(database, `residents/${flatNumber}/complaints`)).key;
                
                // Update the database with the new complaint
                const updates = {};
                updates[`residents/${flatNumber}/complaints/${newComplaintKey}`] = complaintData;
                
                await update(ref(database), updates);
                
                document.getElementById('complaintMessage').innerText = "Complaint submitted successfully!";
                complaintForm.reset();  // Clear form
            } catch (error) {
                document.getElementById('complaintMessage').innerText = "Error: " + error.message;
                console.error("Error submitting complaint:", error);
            }
        });
    } else {
        console.error("Complaint form not found in the document");
    }

    // Add event listener for the View Complaints button
    const viewComplaintsBtn = document.getElementById('viewComplaintsBtn');
    const complaintsContainer = document.getElementById('complaintsContainer');
    
    if (viewComplaintsBtn) {
        viewComplaintsBtn.addEventListener('click', async () => {
            const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
            if (!loggedInUser || !loggedInUser.apartment) {
                document.getElementById('complaintMessage').innerText = "Error: User information not found.";
                return;
            }

            const flatNumber = loggedInUser.apartment;
            
            if (complaintsContainer.classList.contains('hidden')) {
                // Show and load complaints
                complaintsContainer.classList.remove('hidden');
                
                try {
                    // Fetch complaints for the current user
                    const complaintsRef = ref(database, `residents/${flatNumber}/complaints`);
                    const snapshot = await get(complaintsRef);
                    
                    const complaintsList = document.getElementById('complaintsList');
                    complaintsList.innerHTML = ''; // Clear previous content
                    
                    if (snapshot.exists()) {
                        const complaints = snapshot.val();
                        
                        // Check if complaints is empty
                        if (!complaints || Object.keys(complaints).length === 0) {
                            complaintsList.innerHTML = '<p>You have not submitted any complaints yet.</p>';
                            return;
                        }
                        
                        // Sort complaints by timestamp (newest first)
                        const sortedComplaints = Object.entries(complaints).sort(([, a], [, b]) => {
                            return new Date(b.timestamp) - new Date(a.timestamp);
                        });
                        
                        // Display each complaint
                        sortedComplaints.forEach(([complaintId, complaint]) => {
                            const date = new Date(complaint.timestamp).toLocaleString();
                            const statusClass = `status-${complaint.status.toLowerCase()}`;
                            
                            const complaintCard = document.createElement('div');
                            complaintCard.className = 'complaint-card';
                            
                            let closingReasonHtml = '';
                            if (complaint.status !== 'Pending' && complaint.closingReason) {
                                closingReasonHtml = `
                                    <div class="complaint-closing-reason">
                                        <span class="closing-reason-label">Closing Reason:</span>
                                        ${complaint.closingReason}
                                    </div>
                                `;
                            }
                            
                            complaintCard.innerHTML = `
                                <div class="complaint-header">
                                    <div class="complaint-type">${formatComplaintType(complaint.complaint_type)}</div>
                                    <div class="complaint-date">${date}</div>
                                </div>
                                <div class="complaint-status ${statusClass}">${complaint.status}</div>
                                <div class="complaint-content">${complaint.complaint_content}</div>
                                ${closingReasonHtml}
                            `;
                            complaintsList.appendChild(complaintCard);
                        });
                        
                    } else {
                        complaintsList.innerHTML = '<p>You have not submitted any complaints yet.</p>';
                    }
                    
                } catch (error) {
                    console.error("Error fetching complaints:", error);
                    complaintsList.innerHTML = `<p>Error loading complaints: ${error.message}</p>`;
                }
                
                // Change button text
                viewComplaintsBtn.textContent = "Hide My Complaints";
                
            } else {
                // Hide complaints
                complaintsContainer.classList.add('hidden');
                viewComplaintsBtn.textContent = "View My Complaints";
            }
        });
    }
    
    // Add event listener for the View All Complaints button
    const viewAllComplaintsBtn = document.getElementById('viewAllComplaintsBtn');
    const allComplaintsContainer = document.getElementById('allComplaintsContainer');
    
    if (viewAllComplaintsBtn) {
        viewAllComplaintsBtn.addEventListener('click', async () => {
            if (allComplaintsContainer.classList.contains('hidden')) {
                // Show container
                allComplaintsContainer.classList.remove('hidden');
                
                // Add loading spinner
                const allComplaintsList = document.getElementById('allComplaintsList');
                allComplaintsList.innerHTML = '<div class="loading-spinner"></div>';
                
                try {
                    // Fetch all residents
                    const residentsRef = ref(database, 'residents');
                    const residentsSnapshot = await get(residentsRef);
                    
                    if (residentsSnapshot.exists()) {
                        const residents = residentsSnapshot.val();
                        
                        // Fetch pending complaints from all residents
                        const pendingComplaints = [];
                        
                        // Process each resident
                        for (const [apartment, residentData] of Object.entries(residents)) {
                            // Skip if no complaints
                            if (!residentData.complaints) continue;
                            
                            // Process each complaint for this resident
                            for (const [complaintId, complaint] of Object.entries(residentData.complaints)) {
                                // Only include pending complaints
                                if (complaint.status === 'Pending') {
                                    pendingComplaints.push({
                                        apartmentId: apartment,
                                        complaintId: complaintId,
                                        residentName: residentData.Owner_Name || 'Unknown', // Use Owner_Name from resident data
                                        ...complaint
                                    });
                                }
                            }
                        }
                        
                        // Sort pending complaints by timestamp (newest first)
                        pendingComplaints.sort((a, b) => {
                            return new Date(b.timestamp) - new Date(a.timestamp);
                        });
                        
                        // Clear loading spinner
                        allComplaintsList.innerHTML = '';
                        
                        // Check if we found any pending complaints
                        if (pendingComplaints.length === 0) {
                            allComplaintsList.innerHTML = '<p>No pending complaints found.</p>';
                            return;
                        }
                        
                        // Display each pending complaint
                        pendingComplaints.forEach(complaint => {
                            const date = new Date(complaint.timestamp).toLocaleString();
                            
                            const complaintItem = document.createElement('div');
                            complaintItem.className = 'complaint-item';
                            complaintItem.innerHTML = `
                                <div class="complaint-resident">Flat: ${complaint.apartmentId} - ${complaint.residentName}</div>
                                <div class="complaint-header">
                                    <div class="complaint-type">${formatComplaintType(complaint.complaint_type)}</div>
                                    <div class="complaint-date">${date}</div>
                                </div>
                                <div class="complaint-content">${complaint.complaint_content}</div>
                                <div class="complaint-actions">
                                    <button class="resolve-btn" data-apartment="${complaint.apartmentId}" data-complaint="${complaint.complaintId}" data-action="Resolved">Resolve</button>
                                    <button class="reject-btn" data-apartment="${complaint.apartmentId}" data-complaint="${complaint.complaintId}" data-action="Rejected">Reject</button>
                                </div>
                            `;
                            allComplaintsList.appendChild(complaintItem);
                        });
                        
                        // Add event listeners to resolve and reject buttons
                        document.querySelectorAll('.resolve-btn, .reject-btn').forEach(button => {
                            button.addEventListener('click', (e) => {
                                const apartment = e.target.getAttribute('data-apartment');
                                const complaintId = e.target.getAttribute('data-complaint');
                                const action = e.target.getAttribute('data-action');
                                
                                // Store current action data for modal
                                currentActionData = {
                                    apartment,
                                    complaintId,
                                    action
                                };
                                
                                // Show the modal to enter closing reason
                                const modal = document.getElementById('closingReasonModal');
                                modal.style.display = 'block';
                            });
                        });
                        
                    } else {
                        allComplaintsList.innerHTML = '<p>No residents found.</p>';
                    }
                    
                } catch (error) {
                    console.error("Error fetching all complaints:", error);
                    allComplaintsList.innerHTML = `<p>Error loading complaints: ${error.message}</p>`;
                }
                
                // Change button text
                viewAllComplaintsBtn.textContent = "Hide All Complaints";
                
            } else {
                // Hide complaints
                allComplaintsContainer.classList.add('hidden');
                viewAllComplaintsBtn.textContent = "View All Pending Complaints";
            }
        });
    }

    // Modal event listeners
    setupModalEventHandlers();
}

// Helper function to format complaint type for display
function formatComplaintType(type) {
    if (type === "society_related") return "Society Related";
    if (type === "member_related") return "Member Related";
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}

// Function to apply role-based access control
function applyRoleBasedAccess(userData) {
    // Check if user has admin role or sub-role
    const isAdmin = userData.role === 'admin' || 
                    (userData.sub_role && ADMIN_ROLES.includes(userData.sub_role.toLowerCase()));
    
    // Show or hide admin-only elements
    document.querySelectorAll('.admin-only').forEach(element => {
        if (isAdmin) {
            element.classList.remove('role-restricted');
        } else {
            element.classList.add('role-restricted');
        }
    });
}

// Setup event handlers for the closing reason modal
function setupModalEventHandlers() {
    const modal = document.getElementById('closingReasonModal');
    const closeBtn = document.querySelector('.close-modal');
    const submitBtn = document.getElementById('submitReasonBtn');
    const cancelBtn = document.getElementById('cancelReasonBtn');
    
    // Close modal when clicking X
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking cancel
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Handle form submission
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (!currentActionData) {
                console.error("No action data available");
                return;
            }
            
            const { apartment, complaintId, action } = currentActionData;
            const closingReason = document.getElementById('closingReasonText').value.trim();
            
            if (!closingReason) {
                alert("Please provide a reason for closing this complaint.");
                return;
            }
            
            try {
                // Update complaint status and add closing reason
                const updates = {};
                updates[`residents/${apartment}/complaints/${complaintId}/status`] = action;
                updates[`residents/${apartment}/complaints/${complaintId}/closingReason`] = closingReason;
                updates[`residents/${apartment}/complaints/${complaintId}/closedAt`] = new Date().toISOString();
                
                await update(ref(database), updates);
                
                // Find and update the complaint item in the UI
                const complaintItem = document.querySelector(`.complaint-item button[data-apartment="${apartment}"][data-complaint="${complaintId}"]`).closest('.complaint-item');
                
                if (complaintItem) {
                    complaintItem.style.opacity = '0.5';
                    
                    // Add a note that it was updated
                    const note = document.createElement('div');
                    note.style.color = '#64ffda';
                    note.style.marginTop = '10px';
                    note.innerHTML = `Status updated to <strong>${action}</strong>`;
                    
                    // Add the closing reason to the UI
                    const reasonDisplay = document.createElement('div');
                    reasonDisplay.className = 'complaint-closing-reason';
                    reasonDisplay.innerHTML = `
                        <span class="closing-reason-label">Closing Reason:</span>
                        ${closingReason}
                    `;
                    
                    complaintItem.appendChild(reasonDisplay);
                    complaintItem.appendChild(note);
                    
                    // Disable buttons
                    complaintItem.querySelectorAll('button').forEach(btn => {
                        btn.disabled = true;
                    });
                }
                
                // Reset and close the modal
                document.getElementById('closingReasonText').value = '';
                modal.style.display = 'none';
                currentActionData = null;
                
            } catch (error) {
                console.error("Error updating complaint status:", error);
                alert(`Error updating status: ${error.message}`);
            }
        });
    }
}