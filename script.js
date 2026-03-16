// Calculate subtotal for a row
function calculateRow(element) {
    const row = element.closest("tr");
    const qty = Number(row.querySelector(".qty").value) || 0;
    const rate = Number(row.querySelector(".rate").value) || 0;

    const subtotal = qty * rate;
    row.querySelector(".subtotal").innerText = subtotal.toFixed(2);

    calculateTotal();
}

// Calculate grand total
function calculateTotal() {
    let total = 0;
    document.querySelectorAll(".subtotal").forEach(cell => {
        total += Number(cell.innerText);
    });
    document.getElementById("grandTotal").innerText = total.toFixed(2);
}

// Add a new row
function addRow() {
    const table = document.getElementById("table-body");
    const rowCount = table.rows.length + 1;

    const row = `
        <tr>
            <td>${rowCount}</td>
            <td><input type="text"></td>
            <td><input type="text" class="bag" maxlength="6"></td>
            <td><input type="number" class="qty" maxlength="4" oninput="calculateRow(this)"></td>
            <td><input type="number" class="rate" maxlength="5" oninput="calculateRow(this)"></td>
            <td class="subtotal">0.00</td>
        </tr>
    `;

    table.insertAdjacentHTML("beforeend", row);
}

// IMPORTANT: This function replaces inputs with text for PDF generation
function prepareForPrint() {
    // Save all inputs for restoration later
    window.originalInputs = [];
    
    document.querySelectorAll("#invoice input").forEach((input, index) => {
        // Create span element for all inputs
        const span = document.createElement("span");
        span.textContent = input.value || "";
        
        // Apply different styling for different input types
        if (input.id === "invoiceDate") {
            // Date input styling
            span.style.display = "inline";
            span.style.marginLeft = "5px";
            span.style.fontWeight = "bold";
            span.style.letterSpacing = "0.5px";
            span.style.minWidth = "120px";
            span.style.textAlign = "center";
        } else if (input.id === "clientName") {
            // Client name input styling
            span.style.display = "inline";
            span.style.marginLeft = "10px";
            span.style.padding = "0 10px";
            span.style.textAlign = "left";
        } else if (input.className.includes("qty") || input.className.includes("rate")) {
            // Table input styling
            span.style.display = "inline-block";
            span.style.width = "100%";
            span.style.textAlign = "center";
            span.style.padding = "2px 0";
        } else {
            // Default styling for other inputs
            span.style.display = "inline-block";
            span.style.width = "100%";
            span.style.padding = "2px 0";
            span.style.minHeight = "20px";
            span.style.verticalAlign = "middle";
        }
        
        // Store the original input
        window.originalInputs.push({
            element: input,
            parent: input.parentNode,
            nextSibling: input.nextSibling,
            value: input.value
        });
        
        // Replace input with span
        input.parentNode.replaceChild(span, input);
    });
}

// Restore inputs after print
function restoreAfterPrint() {
    if (!window.originalInputs) return;
    
    window.originalInputs.forEach(item => {
        if (item.parent) {
            // Create new input element
            const input = document.createElement("input");
            input.type = item.element.type;
            input.className = item.element.className;
            input.value = item.value;
            input.style.width = "100%";
            
            // Copy other attributes
            Array.from(item.element.attributes).forEach(attr => {
                if (attr.name !== 'value' && attr.name !== 'type' && attr.name !== 'class') {
                    input.setAttribute(attr.name, attr.value);
                }
            });
            
            // Add event listeners back
            if (item.element.className.includes('qty') || item.element.className.includes('rate')) {
                input.addEventListener('input', function() {
                    calculateRow(this);
                });
            }
            
            // Replace span with input
            const span = item.parent.querySelector('span');
            if (span) {
                span.parentNode.replaceChild(input, span);
            }
        }
    });
    
    // Recalculate totals
    calculateTotal();
}

// Current user state
let currentUser = null;

// Helper: Show Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Download invoice as PDF preserving exactly original print layouts
function downloadPDF() {
    // Prepare the invoice for printing
    prepareForPrint();
    
    // Set document title
    const invoiceNameInput = document.getElementById("draftName");
    const fileName = invoiceNameInput && invoiceNameInput.value.trim()
        ? invoiceNameInput.value.trim()
        : "Invoice_" + new Date().toISOString().split('T')[0];
    
    document.title = fileName;
    
    // Print the document
    window.print();
    
    // Restore inputs after a short delay
    setTimeout(() => {
        restoreAfterPrint();
        document.title = "Sri Raja Rajeswari Nursery";
    }, 500);
}

// On page load
window.onload = function () {
    // Check Auth
    const userStr = localStorage.getItem('srrn_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = JSON.parse(userStr);
    
    // Set header info
    const userNameDisplay = document.getElementById('currentUserDisplay');
    if (userNameDisplay) userNameDisplay.textContent = currentUser.username;
    
    const logoutBtn = document.getElementById('mainLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('srrn_user');
            window.location.href = 'login.html';
        });
    }

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("invoiceDate").value = today;

    // Check if we need to load a specific bill from dashboard
    const targetBill = localStorage.getItem('srrn_target_bill');
    if (targetBill) {
        document.getElementById("draftName").value = targetBill;
        loadDraft(targetBill);
        localStorage.removeItem('srrn_target_bill');
    }

    // Add input event listeners to existing rows
    document.querySelectorAll('.qty, .rate').forEach(input => {
        input.addEventListener('input', function() {
            calculateRow(this);
        });
    });
    
    // Set up beforeprint and afterprint events
    window.addEventListener('beforeprint', () => {
        if (!window.originalInputs) {
            prepareForPrint();
        }
    });
    
    window.addEventListener('afterprint', () => {
        setTimeout(() => {
            restoreAfterPrint();
        }, 100);
    });
};

// Fixed formatDate function - CORRECTED
function formatDate(dateValue) {
    if (!dateValue) {
        // Set default to today if no date
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${day} - ${month} - ${year}`; // DD - MM - YYYY
    }
    
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Return in DD - MM - YYYY format (e.g., 06 - 01 - 2026)
    return `${day} - ${month} - ${year}`;
}

async function saveDraft() {
    if (!currentUser) {
        showToast("You must be logged in to save", "error");
        return;
    }

    const draftInput = document.getElementById("draftName");
    if (!draftInput || !draftInput.value.trim()) {
        alert("Please enter Invoice File Name");
        return;
    }

    const data = {
        userId: currentUser.id,
        invoiceName: draftInput.value.trim(),
        date: document.getElementById("invoiceDate").value,
        clientName: document.getElementById("clientName").value,
        title: document.getElementById("titleInput").value,
        rows: []
    };

    document.querySelectorAll("#table-body tr").forEach(row => {
        data.rows.push({
            plant: row.children[1].querySelector("input")?.value || "",
            bag: row.children[2].querySelector("input")?.value || "",
            qty: row.children[3].querySelector("input")?.value || "",
            rate: row.children[4].querySelector("input")?.value || ""
        });
    });

    try {
        const resetBtn = document.querySelector('button[onclick="saveDraft()"]');
        if (resetBtn) resetBtn.textContent = 'Saving...';

        const res = await fetch('/api/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Failed to save bill');
        
        showToast("Bill saved successfully ✅");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        const resetBtn = document.querySelector('button[onclick="saveDraft()"]');
        if (resetBtn) resetBtn.textContent = 'Save';
    }
}

async function loadDraft(forcedName = null) {
    if (!currentUser) return;

    let invoiceName = forcedName;
    
    if (!invoiceName) {
        const draftInput = document.getElementById("draftName");
        if (!draftInput || !draftInput.value.trim()) {
            alert("Please enter Invoice File Name to open");
            return;
        }
        invoiceName = draftInput.value.trim();
    }

    try {
        const res = await fetch(`/api/bills/${currentUser.id}/${encodeURIComponent(invoiceName)}`);
        
        if (!res.ok) {
            if (res.status === 404) throw new Error("No draft found ❌");
            throw new Error("Failed to load draft");
        }

        const data = await res.json();

        document.getElementById("invoiceDate").value = data.date || "";
        document.getElementById("clientName").value = data.client_name || "";
        document.getElementById("titleInput").value = data.title || "QUOTATION";

        const table = document.getElementById("table-body");
        table.innerHTML = "";

        data.rows.forEach((rowData, index) => {
            table.insertAdjacentHTML("beforeend", `
            <tr>
                <td>${index + 1}</td>
                <td><input type="text" value="${rowData.plant}"></td>
                <td><input type="text" class="bag" value="${rowData.bag}"></td>
                <td><input type="number" class="qty" value="${rowData.qty}" oninput="calculateRow(this)"></td>
                <td><input type="number" class="rate" value="${rowData.rate}" oninput="calculateRow(this)"></td>
                <td class="subtotal">0.00</td>
            </tr>
            `);
        });

        // Recalculate all subtotals
        document.querySelectorAll(".qty").forEach(input => {
            calculateRow(input);
        });

        if (!forcedName) {
            showToast("Draft loaded successfully ✅");
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}