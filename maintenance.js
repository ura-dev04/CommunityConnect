const firebaseConfig = {
    apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
    authDomain: "societymanagement-df579.firebaseapp.com",
    projectId: "societymanagement-df579",
    databaseURL: "https://societymanagement-df579-default-rtdb.firebaseio.com",
    storageBucket: "societymanagement-df579.appspot.com",
    messagingSenderId: "526280568230",
    appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Check user authentication and role
document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }

    // Update welcome message and role
    document.getElementById('welcome-message').textContent = `Hi ${loggedInUser.name}`;
    
    let roleText = `${loggedInUser.role}`;
    if (loggedInUser.sub_role) {
        roleText += ` (${loggedInUser.sub_role})`;
    }
    
    document.getElementById('user-role').textContent = roleText;

    // Define higher-level roles that can generate bills
    const higherRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
    
    // Show appropriate view based on role/sub-role
    const userSubRole = loggedInUser.sub_role || 'resident';
    
    // Everyone can see their own bills
    document.getElementById('residentView').classList.remove('hidden');
    loadResidentBills(loggedInUser.apartment);
    
    // Only higher roles can generate bills
    if (higherRoles.includes(userSubRole)) {
        document.getElementById('mcView').classList.remove('hidden');
        loadAllBills();
        
        // Setup modal for bill generation
        setupBillModal();
    }
    
    // Setup logout button event
    document.querySelector('.logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'homepage.html';
    });
});

// Setup modal functionality
function setupBillModal() {
    const modal = document.getElementById('billModal');
    const openModalBtn = document.getElementById('openBillModal');
    const closeBtn = document.querySelector('.close-modal');
    
    // Open modal
    openModalBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('billDate').value = today;
        
        // Set default due date (30 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
    });
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Add input event listeners to initial breakdown item
    document.querySelector('.breakdown-amount')?.addEventListener('input', updateTotal);
    
    // Add breakdown item button
    document.getElementById('addBreakdownItem').addEventListener('click', () => {
        const container = document.querySelector('.bill-breakdown');
        const newItem = document.createElement('div');
        newItem.className = 'breakdown-item';
        newItem.innerHTML = `
            <input type="text" class="breakdown-desc" placeholder="Description" required>
            <input type="number" class="breakdown-amount" placeholder="Amount" required>
            <button type="button" class="remove-item" onclick="this.parentElement.remove(); updateTotal();">×</button>
        `;
        
        // Insert before the Add Item button
        container.insertBefore(newItem, document.getElementById('addBreakdownItem'));
        
        // Add event listeners to new amount input
        newItem.querySelector('.breakdown-amount').addEventListener('input', updateTotal);
    });
}

// MC Functions
document.getElementById('generateBillForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Verify user has permission before proceeding
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    const higherRoles = ['admin', 'president', 'secretary', 'treasurer', 'building-manager'];
    const userSubRole = loggedInUser.sub_role || 'resident';
    
    if (!higherRoles.includes(userSubRole)) {
        alert('You do not have permission to generate bills.');
        return;
    }
    
    try {
        const flatNumber = document.getElementById('flatNumber').value;
        const billDate = document.getElementById('billDate').value;
        const dueDate = document.getElementById('dueDate').value;
        
        // Validate flat number exists
        const flatSnapshot = await database.ref(`residents/${flatNumber}`).once('value');
        if (!flatSnapshot.exists()) {
            throw new Error('Flat number does not exist. Please check and try again.');
        }
        
        const breakdownItems = Array.from(document.querySelectorAll('.breakdown-item')).map(item => ({
            description: item.querySelector('.breakdown-desc').value.trim(),
            amount: parseFloat(item.querySelector('.breakdown-amount').value) || 0
        })).filter(item => item.description && item.amount > 0);

        if (breakdownItems.length === 0) {
            throw new Error('Please add at least one breakdown item');
        }

        const totalAmount = breakdownItems.reduce((sum, item) => sum + item.amount, 0);

        const billData = {
            billDate,
            dueDate,
            breakdown: breakdownItems,
            totalAmount,
            generatedAt: firebase.database.ServerValue.TIMESTAMP,
            generatedBy: loggedInUser.name,
            status: 'unpaid'
        };

        // Generate a bill ID
        const billRef = await database.ref(`residents/${flatNumber}/maintenance`).push(billData);

        // Create a notification for the resident
        const notificationData = {
            title: "New Maintenance Bill",
            body: `A new maintenance bill of ₹${totalAmount} has been generated. Due date: ${dueDate}`,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref(`residents/${flatNumber}/notifications`).push(notificationData);
        
        alert('Bill generated successfully!');
        e.target.reset();
        
        // Close modal after successful submission
        document.getElementById('billModal').style.display = 'none';
        
        // Reset breakdown items
        const container = document.querySelector('.bill-breakdown');
        container.innerHTML = `
            <h3>Breakdown of Amount</h3>
            <div class="breakdown-item">
                <input type="text" class="breakdown-desc" placeholder="Description" required>
                <input type="number" class="breakdown-amount" placeholder="Amount" required>
                <button type="button" class="remove-item" onclick="this.parentElement.remove(); updateTotal();">×</button>
            </div>
            <button type="button" id="addBreakdownItem" class="add-btn">+ Add Item</button>
        `;
        
        // Reload bills after adding a new one
        loadAllBills();
        
        // Reinitialize event listeners
        document.querySelector('.breakdown-amount').addEventListener('input', updateTotal);
        updateTotal();
        
    } catch (error) {
        console.error('Error generating bill:', error);
        alert(error.message || 'Failed to generate bill. Please try again.');
    }
});

// Add breakdown item
document.getElementById('addBreakdownItem')?.addEventListener('click', () => {
    const container = document.querySelector('.bill-breakdown');
    const newItem = document.createElement('div');
    newItem.className = 'breakdown-item';
    newItem.innerHTML = `
        <input type="text" class="breakdown-desc" placeholder="Description" required>
        <input type="number" class="breakdown-amount" placeholder="Amount" required>
        <button type="button" class="remove-item" onclick="this.parentElement.remove(); updateTotal();">×</button>
    `;
    
    // Insert before the Add Item button
    container.insertBefore(newItem, document.getElementById('addBreakdownItem'));
    
    // Add event listeners to new amount input
    newItem.querySelector('.breakdown-amount').addEventListener('input', updateTotal);
});

// Update total amount
function updateTotal() {
    const amounts = Array.from(document.querySelectorAll('.breakdown-amount'))
        .map(input => parseFloat(input.value) || 0);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    document.getElementById('totalAmount').value = total.toFixed(2);
}

// Load bills for resident
async function loadResidentBills(apartmentNumber) {
    try {
        const billsContainer = document.getElementById('residentBillsList');
        billsContainer.innerHTML = '<p>Loading your bills...</p>';
        
        const snapshot = await database.ref(`residents/${apartmentNumber}/maintenance`).once('value');
        const bills = snapshot.val();
        
        if (!bills) {
            billsContainer.innerHTML = '<p>No maintenance bills found.</p>';
            return;
        }
        
        displayBills(bills, 'residentBillsList');
    } catch (error) {
        console.error('Error loading bills:', error);
        document.getElementById('residentBillsList').innerHTML = 
            '<p>Error loading bills. Please refresh the page and try again.</p>';
    }
}

// Load all bills for MC
async function loadAllBills() {
    try {
        const billsContainer = document.getElementById('allBillsList');
        billsContainer.innerHTML = '<p>Loading all bills...</p>';
        
        const snapshot = await database.ref('residents').once('value');
        const residents = snapshot.val() || {};
        let allBills = {};
        
        // Collect all maintenance bills from all apartments
        Object.entries(residents).forEach(([apartment, data]) => {
            if (data.maintenance) {
                allBills[apartment] = data.maintenance;
            }
        });
        
        if (Object.keys(allBills).length === 0) {
            billsContainer.innerHTML = '<p>No maintenance bills generated yet.</p>';
            return;
        }
        
        displayBills(allBills, 'allBillsList', true);
    } catch (error) {
        console.error('Error loading all bills:', error);
        document.getElementById('allBillsList').innerHTML = 
            '<p>Error loading bills. Please refresh the page and try again.</p>';
    }
}

// Display bills
function displayBills(bills, containerId, showApartment = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (typeof bills !== 'object' || bills === null) {
        container.innerHTML = '<p>No bills available.</p>';
        return;
    }

    Object.entries(bills).forEach(([id, billData]) => {
        // Handle nested apartment objects when showing all bills
        if (showApartment && typeof billData === 'object') {
            // This is an apartment object with multiple bills
            const apartmentNumber = id;
            Object.entries(billData).forEach(([billId, bill]) => {
                createBillCard(container, bill, apartmentNumber, billId);
            });
        } else {
            // This is a single bill for the resident view
            createBillCard(container, billData, null, id);
        }
    });
}

// Create a bill card element
function createBillCard(container, bill, apartmentNumber = null, billId = null) {
    if (!bill || !bill.totalAmount) return; // Skip invalid bills
    
    const billElement = document.createElement('div');
    billElement.className = 'bill-card';
    
    // Format dates
    const billDate = bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'Not specified';
    const dueDate = bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'Not specified';
    
    const status = bill.status || 'unpaid';
    const statusClass = status === 'paid' ? 'status-paid' : 'status-unpaid';
    
    billElement.innerHTML = `
        ${apartmentNumber ? `<h3>Apartment: ${apartmentNumber}</h3>` : ''}
        <p>Bill Date: ${billDate}</p>
        <p>Due Date: ${dueDate}</p>
        <p>Total Amount: ₹${bill.totalAmount.toFixed(2)}</p>
        <p class="${statusClass}">Status: ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
        ${bill.generatedBy ? `<p>Generated By: ${bill.generatedBy}</p>` : ''}
        <div class="breakdown">
            <h4>Breakdown:</h4>
            ${Array.isArray(bill.breakdown) ? 
                bill.breakdown.map(item => 
                    `<p>${item.description}: ₹${item.amount.toFixed(2)}</p>`
                ).join('') : '<p>No breakdown details available</p>'
            }
        </div>
    `;
    container.appendChild(billElement);
}
