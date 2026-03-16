// DOM Elements
const userNameDisplay = document.getElementById('userNameDisplay');
const headerUserName = document.getElementById('headerUserName');
const logoutBtn = document.getElementById('logoutBtn');
const billsTableBody = document.getElementById('billsTableBody');
const toast = document.getElementById('toast');

// Current user state
let currentUser = null;

// Helper: Show Toast
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Ensure the user is logged in
function checkAuth() {
    const userStr = localStorage.getItem('srrn_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    userNameDisplay.textContent = currentUser.username;
    headerUserName.textContent = currentUser.username;
    
    // Load their bills
    fetchBills();
}

// Fetch and render bills from the backend
async function fetchBills() {
    try {
        const res = await fetch(`/api/bills/${currentUser.id}`);
        if (!res.ok) throw new Error('Failed to fetch bills');
        
        const bills = await res.json();
        renderBills(bills);
    } catch (err) {
        billsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: red;">Error: ${err.message}</td></tr>`;
        showToast(err.message, 'error');
    }
}

// Render the bills array into the table
function renderBills(bills) {
    if (!bills || bills.length === 0) {
        billsTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 40px; color: #64748b;">
                    No bills found. Create your first bill!
                </td>
            </tr>
        `;
        return;
    }

    billsTableBody.innerHTML = bills.map(bill => {
        const typeClass = bill.title && bill.title.toLowerCase().includes('invoice') ? 'type-invoice' : 'type-quotation';
        
        return `
            <tr>
                <td><strong>${bill.invoice_name}</strong></td>
                <td>${bill.date}</td>
                <td>${bill.client_name || '-'}</td>
                <td><span class="type-pill ${typeClass}">${bill.title || 'QUOTATION'}</span></td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn open" title="Open Bill" onclick="openBill('${bill.invoice_name}')">
                            <i class="fas fa-folder-open"></i>
                        </button>
                        <button class="icon-btn delete" title="Delete Bill" onclick="deleteBill('${bill.invoice_name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Open a bill (Stores target in localStorage and redirects to index.html)
function openBill(invoiceName) {
    localStorage.setItem('srrn_target_bill', invoiceName);
    window.location.href = 'index.html';
}

// Delete a bill
async function deleteBill(invoiceName) {
    if (!confirm(`Are you sure you want to delete "${invoiceName}"?`)) return;
    
    try {
        const res = await fetch(`/api/bills/${currentUser.id}/${encodeURIComponent(invoiceName)}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) throw new Error('Failed to delete bill');
        
        showToast('Bill deleted successfully');
        fetchBills(); // Refresh list
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('srrn_user');
    window.location.href = 'login.html';
});

// Init on load
window.addEventListener('load', checkAuth);
