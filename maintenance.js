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

    // Display user info
    document.getElementById('userInfo').textContent = `${loggedInUser.name} (${loggedInUser.apartment})`;

    // Show appropriate view based on role
    if (loggedInUser.role === 'MC') {
        document.getElementById('mcView').classList.remove('hidden');
        loadAllBills();
    } else {
        document.getElementById('residentView').classList.remove('hidden');
        loadResidentBills(loggedInUser.apartment);
    }
});

// MC Functions
document.getElementById('generateBillForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const flatNumber = document.getElementById('flatNumber').value;
        const billDate = document.getElementById('billDate').value;
        const dueDate = document.getElementById('dueDate').value;
        
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
            generatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        await database.ref(`residents/${flatNumber}/maintenance`).push(billData);
        alert('Bill generated successfully!');
        e.target.reset();
        
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

// Add input event listeners to initial breakdown item
document.querySelector('.breakdown-amount')?.addEventListener('input', updateTotal);

// Load bills for resident
async function loadResidentBills(apartmentNumber) {
    try {
        const snapshot = await database.ref(`residents/${apartmentNumber}/maintenance`).once('value');
        const bills = snapshot.val() || {};
        displayBills(bills, 'residentBillsList');
    } catch (error) {
        console.error('Error loading bills:', error);
    }
}

// Load all bills for MC
async function loadAllBills() {
    try {
        const snapshot = await database.ref('residents').once('value');
        const residents = snapshot.val() || {};
        let allBills = {};
        
        Object.entries(residents).forEach(([apartment, data]) => {
            if (data.maintenance) {
                allBills[apartment] = data.maintenance;
            }
        });
        
        displayBills(allBills, 'allBillsList', true);
    } catch (error) {
        console.error('Error loading all bills:', error);
    }
}

// Display bills
function displayBills(bills, containerId, showApartment = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    Object.entries(bills).forEach(([id, bill]) => {
        const billElement = document.createElement('div');
        billElement.className = 'bill-card';
        billElement.innerHTML = `
            ${showApartment ? `<h3>Apartment: ${id}</h3>` : ''}
            <p>Bill Date: ${bill.billDate}</p>
            <p>Due Date: ${bill.dueDate}</p>
            <p>Total Amount: ₹${bill.totalAmount}</p>
            <div class="breakdown">
                <h4>Breakdown:</h4>
                ${bill.breakdown.map(item => 
                    `<p>${item.description}: ₹${item.amount}</p>`
                ).join('')}
            </div>
        `;
        container.appendChild(billElement);
    });
}

// Logout handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
});
