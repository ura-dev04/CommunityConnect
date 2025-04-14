import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, update, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        // Redirect to login if not logged in
        window.location.href = 'login.html';
        return;
    }
    
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
                    timestamp: new Date().toISOString()
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
                            complaintCard.innerHTML = `
                                <div class="complaint-header">
                                    <div class="complaint-type">${formatComplaintType(complaint.complaint_type)}</div>
                                    <div class="complaint-date">${date}</div>
                                </div>
                                <div class="complaint-status ${statusClass}">${complaint.status}</div>
                                <div class="complaint-content">${complaint.complaint_content}</div>
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
});

// Helper function to format complaint type for display
function formatComplaintType(type) {
    if (type === "society_related") return "Society Related";
    if (type === "member_related") return "Member Related";
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}
