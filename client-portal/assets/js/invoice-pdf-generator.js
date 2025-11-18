/**
 * Invoice PDF Generator Module
 * Generates premium PDF invoices using html2pdf.js
 */

// Load html2pdf.js library dynamically
function loadHtml2PdfLibrary() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (typeof html2pdf !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load html2pdf.js'));
        document.head.appendChild(script);
    });
}

// Preload company logo
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(url);
        img.onerror = () => resolve(url); // Resolve anyway to not block PDF generation
        img.src = url;
    });
}

// Format currency
function formatCurrency(amount) {
    return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Escape HTML to prevent XSS and layout issues
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format date
function formatInvoiceDate(date) {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp
    if (date.toDate && typeof date.toDate === 'function') {
        date = date.toDate();
    } else if (date.seconds) {
        date = new Date(date.seconds * 1000);
    } else if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    // Use shorter month format to prevent cutoff
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
}

// Calculate due date (30 days from invoice date)
function calculateDueDate(invoiceDate) {
    if (!invoiceDate) return 'N/A';
    
    let date = invoiceDate;
    if (date.toDate && typeof date.toDate === 'function') {
        date = date.toDate();
    } else if (date.seconds) {
        date = new Date(date.seconds * 1000);
    } else if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + 30);
    
    // Use shorter month format
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[dueDate.getMonth()];
    const day = dueDate.getDate();
    const year = dueDate.getFullYear();
    
    return `${month} ${day}, ${year}`;
}

// Generate invoice HTML template
function generateInvoiceHTML(invoiceData) {
    console.log('📝 Generating HTML for invoice:', invoiceData);
    
    // Validate required data
    if (!invoiceData || typeof invoiceData !== 'object') {
        console.error('❌ Invalid invoice data:', invoiceData);
        throw new Error('Invalid invoice data provided');
    }
    
    const subtotal = parseFloat(invoiceData.amount) || 0;
    const tax = 0; // 0% tax as per requirements
    const total = subtotal + tax;
    
    console.log('💰 Amounts - Subtotal:', subtotal, 'Tax:', tax, 'Total:', total);
    
    // Validate amount
    if (subtotal === 0) {
        console.warn('⚠️ Invoice amount is 0 - PDF will show $0.00');
    }
    
    // Parse items if it's a JSON string
    let items = [];
    if (invoiceData.items) {
        if (typeof invoiceData.items === 'string') {
            try {
                items = JSON.parse(invoiceData.items);
                console.log('✅ Parsed items from JSON string:', items);
            } catch (e) {
                console.error('❌ Error parsing items JSON:', e);
            }
        } else if (Array.isArray(invoiceData.items)) {
            items = invoiceData.items;
            console.log('✅ Using items array:', items);
        }
    }
    
    // If no items, create a single item from invoice data
    if (items.length === 0) {
        // Use project name as item name
        // For description, use a short professional message
        let itemDescription = 'Service provided as per agreement';
        
        // Only use notes if it's a proper description (not a reference number)
        if (invoiceData.notes && 
            invoiceData.notes.length > 15 && 
            invoiceData.notes.length < 100 &&
            !invoiceData.notes.includes('/') &&
            !invoiceData.notes.match(/^\d+$/)) {
            itemDescription = invoiceData.notes.substring(0, 80);
        }
        
        items = [{
            name: (invoiceData.projectName || 'Professional Services').substring(0, 40),
            description: itemDescription,
            quantity: 1,
            unitPrice: subtotal
        }];
        console.log('📦 Created default item:', items[0]);
    }
    
    // Ensure we have client info with fallbacks
    const clientName = invoiceData.clientName || invoiceData.clientEmail || 'Valued Client';
    const clientEmail = invoiceData.clientEmail || '';
    const clientAddress = invoiceData.clientAddress || '';
    const clientPhone = invoiceData.clientPhone || '';
    
    console.log('👤 Client info - Name:', clientName, 'Email:', clientEmail);
    
    // Generate items table rows
    let itemsHTML = '';
    items.forEach((item, index) => {
        const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);
        const itemName = (item.name || 'Service').substring(0, 30);
        const itemDesc = (item.description || 'Service provided').substring(0, 50);
        
        itemsHTML += `
            <tr>
                <td>
                    <div class="item-name">${escapeHtml(itemName)}</div>
                </td>
                <td>
                    <div class="item-description">${escapeHtml(itemDesc)}</div>
                </td>
                <td style="text-align: center;">${item.quantity || 1}</td>
                <td style="text-align: right;">${formatCurrency(item.unitPrice || 0)}</td>
                <td style="text-align: right;">${formatCurrency(itemTotal)}</td>
            </tr>
        `;
    });
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Poppins', sans-serif;
            background: white;
            color: #2d3748;
            line-height: 1.6;
        }
        .invoice-container {
            width: 210mm;
            min-height: 297mm;
            max-height: 297mm;
            padding: 5mm;
            background: white;
            box-sizing: border-box;
            overflow: visible;
            margin: 0;
            position: relative;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 18px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
            gap: 8px;
            width: 100%;
            flex-wrap: nowrap;
        }
        .company-info {
            flex: 1;
            min-width: 0;
            max-width: 65%;
            overflow: visible;
        }
        .company-logo {
            width: 140px;
            height: auto;
            margin-bottom: 8px;
            max-width: 90%;
            object-fit: contain;
        }
        .company-name {
            font-size: 20px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 4px;
            word-wrap: break-word;
            white-space: normal;
            overflow-wrap: break-word;
            line-height: 1.1;
            max-width: 100%;
        }
        .company-email {
            font-size: 13px;
            color: #667eea;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .biller-info {
            font-size: 11px;
            color: #718096;
            line-height: 1.5;
            margin-top: 5px;
        }
        .biller-info p {
            margin: 3px 0;
            font-size: 11px;
        }
        .biller-info strong {
            color: #2d3748;
            font-weight: 600;
        }
        .invoice-title-section {
            flex-shrink: 0;
        }
        .invoice-title {
            font-size: 26px;
            font-weight: 700;
            color: #667eea;
            text-align: right;
            white-space: nowrap;
            flex-shrink: 0;
            margin: 0;
            line-height: 1;
            padding-left: 10px;
        }
        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
        }
        .detail-section {
            background: #f7fafc;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            overflow: visible;
        }
        .detail-section h3 {
            font-size: 12px;
            font-weight: 600;
            color: #667eea;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 11px;
            gap: 8px;
        }
        .detail-label {
            color: #718096;
            font-weight: 500;
            flex-shrink: 0;
            min-width: 80px;
        }
        .detail-value {
            color: #2d3748;
            font-weight: 600;
            text-align: right;
            word-wrap: break-word;
            white-space: normal;
            overflow-wrap: break-word;
            max-width: 45%;
            flex-shrink: 1;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .client-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px;
            border-radius: 8px;
            color: white;
            margin-bottom: 20px;
        }
        .client-section h3 {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            opacity: 0.9;
        }
        .client-section p {
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 4px;
        }
        .client-name {
            font-size: 16px !important;
            font-weight: 600;
            margin-bottom: 8px !important;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border-radius: 0;
            overflow: visible;
            table-layout: fixed;
            font-size: 11px;
        }
        .items-table thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .items-table th {
            padding: 8px 5px;
            text-align: left;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            word-wrap: break-word;
            white-space: normal;
            overflow-wrap: break-word;
            line-height: 1.2;
            overflow: visible;
        }
        .items-table th:nth-child(1) { 
            width: 20%; 
            min-width: 20%;
        }
        .items-table th:nth-child(2) { 
            width: 35%; 
            min-width: 35%;
        }
        .items-table th:nth-child(3) { 
            width: 8%; 
            min-width: 8%;
            text-align: center;
        }
        .items-table th:nth-child(4) { 
            width: 18.5%; 
            min-width: 18.5%;
            text-align: right;
        }
        .items-table th:nth-child(5) { 
            width: 18.5%; 
            min-width: 18.5%;
            text-align: right;
        }
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        .items-table td:nth-child(3) {
            text-align: center;
        }
        .items-table td:nth-child(4),
        .items-table td:nth-child(5) {
            text-align: right;
        }
        .items-table tbody tr {
            border-bottom: 1px solid #e2e8f0;
        }
        .items-table tbody tr:last-child {
            border-bottom: none;
        }
        .items-table td {
            padding: 10px 5px;
            font-size: 11px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            vertical-align: top;
            line-height: 1.4;
            overflow: visible;
        }
        .item-name {
            font-weight: 600;
            color: #2d3748;
            word-wrap: break-word;
            white-space: normal;
            overflow-wrap: break-word;
            font-size: 11px;
            line-height: 1.2;
        }
        .item-description {
            color: #718096;
            font-size: 9px;
            margin-top: 2px;
            word-wrap: break-word;
            white-space: normal;
            overflow-wrap: break-word;
            line-height: 1.2;
        }
        .totals-section {
            margin-left: auto;
            width: 280px;
            background: #f7fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .total-label {
            color: #718096;
            font-weight: 500;
        }
        .total-value {
            color: #2d3748;
            font-weight: 600;
        }
        .grand-total-row {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #667eea;
        }
        .grand-total-row .total-label {
            font-size: 16px;
            color: #2d3748;
            font-weight: 700;
        }
        .grand-total-row .total-value {
            font-size: 20px;
            color: #667eea;
            font-weight: 700;
        }
        .invoice-footer {
            text-align: left;
            padding-top: 12px;
            border-top: 2px solid #e2e8f0;
            margin-top: 12px;
            width: 100%;
            overflow: visible;
            max-width: 100%;
        }
        .footer-message {
            color: #718096;
            font-size: 11px;
            line-height: 1.5;
            margin-bottom: 8px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: normal;
            width: 100%;
            max-width: 100%;
        }
        .footer-contact {
            color: #667eea;
            font-weight: 600;
            font-size: 11px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            width: 100%;
            max-width: 100%;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                <img src="https://i.ibb.co/bgx4ddTy/Picsart-25-06-12-13-49-11-841.png" 
                     alt="Epplicon Technologies" 
                     class="company-logo"
                     crossorigin="anonymous">
                <div class="company-name">Epplicon Technologies</div>
                <div class="company-email"><a href="mailto:info@epplicon.net" style="color: #667eea; text-decoration: none;">info@epplicon.net</a></div>
                <div class="biller-info">
                    ${invoiceData.billerWhatsApp ? `<p><strong>WhatsApp:</strong> ${escapeHtml(invoiceData.billerWhatsApp)}</p>` : ''}
                    <p><strong>Website:</strong> <a href="https://www.epplicon.net" style="color: #667eea; text-decoration: none;">www.epplicon.net</a></p>
                </div>
            </div>
            <div class="invoice-title-section">
                <div class="invoice-title">INVOICE</div>
            </div>
        </div>

        <div class="invoice-details">
            <div class="detail-section">
                <h3>Invoice Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Invoice #:</span>
                    <span class="detail-value">${escapeHtml((invoiceData.invoiceNumber || 'N/A').substring(0, 12))}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invoice Date:</span>
                    <span class="detail-value">${formatInvoiceDate(invoiceData.date)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Due Date:</span>
                    <span class="detail-value">${calculateDueDate(invoiceData.date)}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Payment Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">${(invoiceData.status || 'pending').toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Project:</span>
                    <span class="detail-value">${escapeHtml((invoiceData.projectName || 'General').substring(0, 20))}</span>
                </div>
            </div>
        </div>

        <div class="client-section">
            <h3>Bill To</h3>
            <p class="client-name">${escapeHtml(clientName.substring(0, 40))}</p>
            ${clientAddress ? `<p>${escapeHtml(clientAddress.substring(0, 50))}</p>` : ''}
            ${clientEmail ? `<p>Email: ${escapeHtml(clientEmail.substring(0, 40))}</p>` : ''}
            ${clientPhone ? `<p>Phone: ${escapeHtml(clientPhone.substring(0, 25))}</p>` : ''}
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div class="totals-section">
            <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">${formatCurrency(subtotal)}</span>
            </div>
            <div class="total-row">
                <span class="total-label">Tax (0%):</span>
                <span class="total-value">${formatCurrency(tax)}</span>
            </div>
            <div class="total-row grand-total-row">
                <span class="total-label">Grand Total:</span>
                <span class="total-value">${formatCurrency(total)}</span>
            </div>
        </div>

        <div class="invoice-footer">
            <p class="footer-message">
                ${invoiceData.notes && invoiceData.notes.length > 20 && !invoiceData.notes.includes('/') 
                    ? escapeHtml(invoiceData.notes.substring(0, 150)) 
                    : 'Thank you for your business! Payment is due within 30 days. Please make checks payable to Epplicon Technologies and include the invoice number on your payment.'}
            </p>
            <p class="footer-contact">
                For any queries, contact us at info@epplicon.net
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

// Fetch any admin from 'authors' collection (for client portal)
async function fetchAnyAdmin() {
    try {
        console.log('🔍 Fetching any admin from authors collection...');
        
        // Get Firestore db instance - try multiple sources
        let firestoreDb = null;
        
        if (window.adminDB) {
            firestoreDb = window.adminDB;
        } else if (window.db) {
            firestoreDb = window.db;
        } else if (typeof db !== 'undefined' && db) {
            firestoreDb = db;
        }
        
        if (!firestoreDb) {
            console.warn('⚠️ Firebase db not available');
            return null;
        }
        
        // Try using modular SDK
        if (window.collection && window.getDocs && window.query && window.limit) {
            try {
                const { collection, getDocs, query, limit } = window;
                const authorsQuery = query(collection(firestoreDb, 'authors'), limit(1));
                const authorsSnapshot = await getDocs(authorsQuery);
                
                if (!authorsSnapshot.empty) {
                    const authorData = authorsSnapshot.docs[0].data();
                    console.log('✅ Found admin:', authorData);
                    return {
                        billerName: authorData.name || authorData.displayName || 'Epplicon Team',
                        billerEmail: authorData.email || 'info@epplicon.net',
                        billerWhatsApp: authorData.whatsappNumber || authorData.phone || authorData.whatsapp || ''
                    };
                }
            } catch (error) {
                console.warn('⚠️ Error fetching any admin (modular SDK):', error);
            }
        }
        
        // Try legacy SDK
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                const authorsRef = firebase.firestore().collection('authors').limit(1);
                const authorsSnapshot = await authorsRef.get();
                
                if (!authorsSnapshot.empty) {
                    const authorData = authorsSnapshot.docs[0].data();
                    console.log('✅ Found admin (legacy SDK):', authorData);
                    return {
                        billerName: authorData.name || authorData.displayName || 'Epplicon Team',
                        billerEmail: authorData.email || 'info@epplicon.net',
                        billerWhatsApp: authorData.whatsappNumber || authorData.phone || authorData.whatsapp || ''
                    };
                }
            } catch (error) {
                console.warn('⚠️ Error fetching any admin (legacy SDK):', error);
            }
        }
        
        console.warn('⚠️ No admin found in authors collection');
    } catch (error) {
        console.warn('⚠️ Could not fetch any admin:', error);
    }
    
    return null;
}

// Fetch biller details from Firestore (admin/company contact)
// Admin data is stored in 'authors' collection with UID as document ID
async function fetchBillerDetails(userUid = null, email = null) {
    try {
        console.log('🔍 Fetching biller details - UID:', userUid, 'Email:', email);
        
        // Get Firestore db instance - try multiple sources
        let firestoreDb = null;
        let getDoc = null;
        let doc = null;
        
        // Try window.adminDB first (from admin.html)
        if (window.adminDB) {
            firestoreDb = window.adminDB;
            console.log('✅ Using window.adminDB');
        }
        // Try window.db
        else if (window.db) {
            firestoreDb = window.db;
            console.log('✅ Using window.db');
        }
        // Try global db
        else if (typeof db !== 'undefined' && db) {
            firestoreDb = db;
            console.log('✅ Using global db');
        }
        
        if (!firestoreDb) {
            console.warn('⚠️ Firebase db not available, skipping biller fetch');
            return null;
        }
        
        // Get Firestore functions - try multiple sources
        // Check if modular SDK functions are available
        if (window.getDoc && window.doc) {
            getDoc = window.getDoc;
            doc = window.doc;
            console.log('✅ Using Firestore functions from window');
        }
        // Try importing from Firebase (if in module context)
        else if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Use legacy SDK
            console.log('✅ Using Firebase legacy SDK');
            
            // Try to get by UID first (most reliable)
            if (userUid) {
                try {
                    const authorRef = firebase.firestore().collection('authors').doc(userUid);
                    const authorSnap = await authorRef.get();
                    
                    if (authorSnap.exists) {
                        const authorData = authorSnap.data();
                        console.log('✅ Author data found by UID:', authorData);
                        return {
                            billerName: authorData.name || authorData.displayName || 'Epplicon Team',
                            billerEmail: authorData.email || email || 'info@epplicon.net',
                            billerWhatsApp: authorData.whatsappNumber || authorData.phone || authorData.whatsapp || ''
                        };
                    }
                } catch (uidError) {
                    console.warn('⚠️ Error fetching by UID:', uidError);
                }
            }
            
            // Fallback: query by email
            if (email) {
                try {
                    const authorsRef = firebase.firestore().collection('authors').where('email', '==', email);
                    const authorsSnapshot = await authorsRef.get();
                    
                    if (!authorsSnapshot.empty) {
                        const authorData = authorsSnapshot.docs[0].data();
                        console.log('✅ Author data found by email:', authorData);
                        return {
                            billerName: authorData.name || authorData.displayName || 'Epplicon Team',
                            billerEmail: authorData.email || email || 'info@epplicon.net',
                            billerWhatsApp: authorData.whatsappNumber || authorData.phone || authorData.whatsapp || ''
                        };
                    }
                } catch (emailError) {
                    console.warn('⚠️ Error fetching by email:', emailError);
                }
            }
        }
        
        // Use modular SDK functions if available
        if (getDoc && doc && userUid) {
            try {
                const authorRef = doc(firestoreDb, 'authors', userUid);
                const authorSnap = await getDoc(authorRef);
                
                if (authorSnap.exists()) {
                    const authorData = authorSnap.data();
                    console.log('✅ Author data found by UID (modular SDK):', authorData);
                    return {
                        billerName: authorData.name || authorData.displayName || 'Epplicon Team',
                        billerEmail: authorData.email || email || 'info@epplicon.net',
                        billerWhatsApp: authorData.whatsappNumber || authorData.phone || authorData.whatsapp || ''
                    };
                }
            } catch (uidError) {
                console.warn('⚠️ Error fetching by UID (modular SDK):', uidError);
            }
        }
        
        // Fallback: query by email using modular SDK
        if (email && window.query && window.where && window.collection && window.getDocs) {
            try {
                const { query, where, collection, getDocs } = window;
                const authorsQuery = query(collection(firestoreDb, 'authors'), where('email', '==', email));
                const authorsSnapshot = await getDocs(authorsQuery);
                
                if (!authorsSnapshot.empty) {
                    const authorData = authorsSnapshot.docs[0].data();
                    console.log('✅ Author data found by email (modular SDK):', authorData);
                    return {
                        billerName: authorData.name || authorData.displayName || 'Epplicon Team',
                        billerEmail: authorData.email || email || 'info@epplicon.net',
                        billerWhatsApp: authorData.whatsappNumber || authorData.phone || authorData.whatsapp || ''
                    };
                }
            } catch (emailError) {
                console.warn('⚠️ Error fetching by email (modular SDK):', emailError);
            }
        }
        
        // If no specific admin found, try to get any admin (for client portal)
        console.log('🔄 No specific admin found, trying to fetch any admin...');
        const anyAdmin = await fetchAnyAdmin();
        if (anyAdmin) {
            console.log('✅ Using any available admin as biller');
            return anyAdmin;
        }
        
        console.warn('⚠️ No biller data found in Firestore');
    } catch (error) {
        console.warn('⚠️ Could not fetch biller details:', error);
    }
    
    return null;
}

// Fetch client details from Firestore
async function fetchClientDetails(clientId) {
    try {
        console.log('🔍 Fetching client details for clientId:', clientId);
        
        // Check if Firebase is available
        if (typeof db === 'undefined' || !db) {
            console.warn('⚠️ Firebase db not available, skipping client fetch');
            return null;
        }
        
        // Try to use Firestore functions from different possible sources
        let firestoreFunctions = null;
        
        // Check if functions are on window
        if (window.collection && window.query && window.where && window.getDocs) {
            firestoreFunctions = {
                collection: window.collection,
                query: window.query,
                where: window.where,
                getDocs: window.getDocs
            };
            console.log('✅ Using Firestore functions from window');
        }
        // Check if they're in a firebase namespace
        else if (typeof firebase !== 'undefined' && firebase.firestore) {
            console.log('✅ Using Firebase SDK directly');
            const clientsRef = firebase.firestore().collection('clients').where('uid', '==', clientId);
            const clientsSnapshot = await clientsRef.get();
            
            if (!clientsSnapshot.empty) {
                const clientData = clientsSnapshot.docs[0].data();
                console.log('✅ Client data found:', clientData);
                
                return {
                    clientName: clientData.name || clientData.email || 'Valued Client',
                    clientEmail: clientData.email || '',
                    clientAddress: clientData.address || '',
                    clientPhone: clientData.whatsappNumber ? `${clientData.countryCode || ''} ${clientData.whatsappNumber}`.trim() : clientData.phone || ''
                };
            }
        }
        
        // Use modular SDK functions
        if (firestoreFunctions) {
            const { collection, query, where, getDocs } = firestoreFunctions;
            const clientsQuery = query(collection(db, 'clients'), where('uid', '==', clientId));
            const clientsSnapshot = await getDocs(clientsQuery);
            
            console.log('📊 Client query result - Empty?', clientsSnapshot.empty, 'Size:', clientsSnapshot.size);
            
            if (!clientsSnapshot.empty) {
                const clientData = clientsSnapshot.docs[0].data();
                console.log('✅ Client data found:', clientData);
                
                const details = {
                    clientName: clientData.name || clientData.email || 'Valued Client',
                    clientEmail: clientData.email || '',
                    clientAddress: clientData.address || '',
                    clientPhone: clientData.whatsappNumber ? `${clientData.countryCode || ''} ${clientData.whatsappNumber}`.trim() : clientData.phone || ''
                };
                
                console.log('📋 Extracted client details:', details);
                return details;
            } else {
                console.warn('⚠️ No client found with uid:', clientId);
            }
        } else {
            console.warn('⚠️ Firestore functions not available');
        }
    } catch (error) {
        console.error('❌ Error fetching client details:', error);
    }
    
    return null;
}

// Main function to generate and download PDF
async function generateInvoicePDF(invoiceData, buttonElement = null) {
    // Show loading state
    let originalHTML = '';
    let enrichedInvoiceData = null; // Declare in outer scope for error handling
    
    if (buttonElement) {
        originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        buttonElement.disabled = true;
    }

    try {
        console.log('📄 Starting PDF generation...');
        console.log('📊 Initial invoice data:', JSON.stringify(invoiceData, null, 2));
        
        // Validate invoice data
        if (!invoiceData) {
            throw new Error('No invoice data provided');
        }
        
        // Load library if not already loaded
        console.log('📚 Loading html2pdf library...');
        await loadHtml2PdfLibrary();
        console.log('✅ Library loaded');
        
        // Enrich invoice data with client details if missing
        enrichedInvoiceData = { ...invoiceData };
        
        // Ensure we have at least basic invoice info
        if (!enrichedInvoiceData.invoiceNumber) {
            if (enrichedInvoiceData.id) {
                enrichedInvoiceData.invoiceNumber = enrichedInvoiceData.id.substring(0, 8).toUpperCase();
            } else {
                enrichedInvoiceData.invoiceNumber = 'DRAFT';
            }
            console.log('📝 Generated invoice number:', enrichedInvoiceData.invoiceNumber);
        }
        
        if (!enrichedInvoiceData.projectName) {
            enrichedInvoiceData.projectName = 'Professional Services';
            console.log('📝 Using default project name');
        }
        
        if (!enrichedInvoiceData.date) {
            enrichedInvoiceData.date = new Date();
            console.log('📝 Using current date');
        }
        
        // Try to fetch client details from Firestore if clientId exists
        if (!enrichedInvoiceData.clientName && enrichedInvoiceData.clientId) {
            console.log('🔄 Attempting to fetch client details for clientId:', enrichedInvoiceData.clientId);
            try {
                const clientDetails = await fetchClientDetails(enrichedInvoiceData.clientId);
                if (clientDetails) {
                    enrichedInvoiceData = { ...enrichedInvoiceData, ...clientDetails };
                    console.log('✅ Client details fetched and merged');
                } else {
                    console.log('⚠️ No client details found in Firestore');
                }
            } catch (fetchError) {
                console.warn('⚠️ Error fetching client details:', fetchError);
            }
        }
        
        // Fallback: Try to get from current user context (client portal)
        if (!enrichedInvoiceData.clientName) {
            console.log('🔄 Trying to get client info from context...');
            
            // Check if currentUser exists (client portal)
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.email) {
                enrichedInvoiceData.clientName = currentUser.displayName || currentUser.email;
                enrichedInvoiceData.clientEmail = currentUser.email;
                console.log('✅ Using currentUser from client portal:', enrichedInvoiceData.clientName);
            }
            // Check if selectedClientData exists (admin portal)
            else if (typeof selectedClientData !== 'undefined' && selectedClientData) {
                enrichedInvoiceData.clientName = selectedClientData.name || selectedClientData.email || 'Valued Client';
                enrichedInvoiceData.clientEmail = selectedClientData.email || '';
                console.log('✅ Using selectedClientData from admin panel:', enrichedInvoiceData.clientName);
            }
            // Ultimate fallback
            else {
                enrichedInvoiceData.clientName = 'Valued Client';
                enrichedInvoiceData.clientEmail = '';
                console.log('⚠️ Using fallback client name');
            }
        }
        
        // Get biller information (admin/company contact person)
        // Try to get from invoice data first, then from admin user, then defaults
        if (!enrichedInvoiceData.billerName || !enrichedInvoiceData.billerEmail) {
            console.log('🔄 Fetching biller information...');
            
            // Get current user - try multiple sources
            let adminUser = null;
            let adminUid = null;
            let adminEmail = null;
            
            // Try window.currentAdminUser (from admin.html)
            if (window.currentAdminUser) {
                adminUser = window.currentAdminUser;
                adminUid = adminUser.uid;
                adminEmail = adminUser.email;
                console.log('✅ Found admin user from window.currentAdminUser');
            }
            // Try global currentUser
            else if (typeof currentUser !== 'undefined' && currentUser) {
                adminUser = currentUser;
                adminUid = adminUser.uid;
                adminEmail = adminUser.email;
                console.log('✅ Found admin user from global currentUser');
            }
            
            // Try to fetch biller details if we have admin user info
            if (adminUid || adminEmail) {
                try {
                    // Fetch from 'authors' collection using UID (preferred) or email
                    const billerDetails = await fetchBillerDetails(adminUid, adminEmail);
                    if (billerDetails) {
                        enrichedInvoiceData.billerName = billerDetails.billerName;
                        enrichedInvoiceData.billerEmail = billerDetails.billerEmail;
                        enrichedInvoiceData.billerWhatsApp = billerDetails.billerWhatsApp;
                        console.log('✅ Using fetched biller info:', enrichedInvoiceData.billerName);
                    } else {
                        // Use current user info as fallback
                        enrichedInvoiceData.billerName = adminUser?.displayName || adminUser?.name || 'Epplicon Team';
                        enrichedInvoiceData.billerEmail = adminEmail || 'info@epplicon.net';
                        enrichedInvoiceData.billerWhatsApp = '';
                        console.log('✅ Using current user as biller (fallback):', enrichedInvoiceData.billerName);
                    }
                } catch (error) {
                    console.warn('⚠️ Could not fetch biller data:', error);
                    // Use current user as fallback
                    if (adminUser && adminEmail) {
                        enrichedInvoiceData.billerName = adminUser.displayName || adminUser.name || 'Epplicon Team';
                        enrichedInvoiceData.billerEmail = adminEmail || 'info@epplicon.net';
                        enrichedInvoiceData.billerWhatsApp = '';
                        console.log('✅ Using current user as biller (error fallback):', enrichedInvoiceData.billerName);
                    }
                }
            } else {
                // No admin user found (likely in client portal) - try to fetch any admin
                console.log('🔄 No admin user found, trying to fetch any admin from authors collection...');
                try {
                    const anyAdmin = await fetchAnyAdmin();
                    if (anyAdmin) {
                        enrichedInvoiceData.billerName = anyAdmin.billerName;
                        enrichedInvoiceData.billerEmail = anyAdmin.billerEmail;
                        enrichedInvoiceData.billerWhatsApp = anyAdmin.billerWhatsApp;
                        console.log('✅ Using any available admin as biller:', enrichedInvoiceData.billerName);
                    } else {
                        // Fallback to defaults
                        enrichedInvoiceData.billerName = 'Epplicon Team';
                        enrichedInvoiceData.billerEmail = 'info@epplicon.net';
                        enrichedInvoiceData.billerWhatsApp = '';
                        console.log('⚠️ No admin found, using default biller information');
                    }
                } catch (error) {
                    console.warn('⚠️ Could not fetch any admin:', error);
                    // Fallback to defaults
                    enrichedInvoiceData.billerName = 'Epplicon Team';
                    enrichedInvoiceData.billerEmail = 'info@epplicon.net';
                    enrichedInvoiceData.billerWhatsApp = '';
                    console.log('⚠️ Using default biller information (error)');
                }
            }
            
            // Final fallback to defaults if still not set
            if (!enrichedInvoiceData.billerName) {
                enrichedInvoiceData.billerName = 'Epplicon Team';
                enrichedInvoiceData.billerEmail = 'info@epplicon.net';
                enrichedInvoiceData.billerWhatsApp = '';
                console.log('⚠️ Using default biller information (final fallback)');
            }
        }
        
        console.log('📋 Biller information:', {
            name: enrichedInvoiceData.billerName,
            email: enrichedInvoiceData.billerEmail,
            whatsapp: enrichedInvoiceData.billerWhatsApp
        });
        
        console.log('📋 Final enriched data for PDF:');
        console.log('  - Invoice #:', enrichedInvoiceData.invoiceNumber);
        console.log('  - Amount:', enrichedInvoiceData.amount);
        console.log('  - Client:', enrichedInvoiceData.clientName);
        console.log('  - Email:', enrichedInvoiceData.clientEmail);
        console.log('  - Project:', enrichedInvoiceData.projectName);
        
        // Preload logo
        await preloadImage('https://i.ibb.co/bgx4ddTy/Picsart-25-06-12-13-49-11-841.png');
        
        // Generate HTML
        const htmlContent = generateInvoiceHTML(enrichedInvoiceData);
        
        console.log('📝 HTML generated, length:', htmlContent.length, 'chars');
        
        if (htmlContent.length < 1000) {
            throw new Error('Generated HTML is too short - likely missing content');
        }
        
        // Extract body content from full HTML document
        // Create a temporary parser to extract the invoice-container
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Get the invoice container from the parsed document
        const invoiceContainerFromDoc = doc.querySelector('.invoice-container');
        
        if (!invoiceContainerFromDoc) {
            throw new Error('Invoice container not found in generated HTML');
        }
        
        console.log('✅ Invoice container extracted from HTML');
        
        // Create temporary container - MUST be visible for html2canvas
        const tempContainer = document.createElement('div');
        tempContainer.id = 'pdf-temp-container-' + Date.now();
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '0';
        tempContainer.style.left = '0';
        tempContainer.style.width = '794px'; // A4 width in pixels
        tempContainer.style.minHeight = '1123px'; // A4 height in pixels
        tempContainer.style.background = 'white';
        tempContainer.style.zIndex = '99999';
        tempContainer.style.overflow = 'visible';
        tempContainer.style.pointerEvents = 'none';
        tempContainer.style.opacity = '0';
        
        // Copy styles from the parsed document's head
        const styles = doc.querySelectorAll('style');
        styles.forEach(style => {
            const styleElement = document.createElement('style');
            styleElement.textContent = style.textContent;
            tempContainer.appendChild(styleElement);
        });
        
        // Clone and append the invoice container
        const invoiceElement = invoiceContainerFromDoc.cloneNode(true);
        tempContainer.appendChild(invoiceElement);
        
        document.body.appendChild(tempContainer);
        
        console.log('📦 Temp container added to DOM');
        console.log('📦 Container dimensions:', {
            width: tempContainer.offsetWidth,
            height: tempContainer.offsetHeight,
            children: tempContainer.children.length
        });
        
        console.log('✅ Invoice element found:', {
            tagName: invoiceElement.tagName,
            className: invoiceElement.className,
            children: invoiceElement.children.length,
            offsetWidth: invoiceElement.offsetWidth,
            offsetHeight: invoiceElement.offsetHeight
        });
        
        // Wait for fonts and images to load
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
            console.log('✅ Fonts ready');
        }
        
        // Wait for images to load
        const images = invoiceElement.querySelectorAll('img');
        if (images.length > 0) {
            console.log('🖼️ Waiting for', images.length, 'images to load...');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if image fails
                    setTimeout(resolve, 3000); // Timeout after 3 seconds
                });
            }));
            console.log('✅ Images loaded');
        }
        
        // Force reflow to ensure rendering
        void invoiceElement.offsetHeight;
        
        // Give time for rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Rendering wait complete');
        
        // Verify element has visible content
        const computedStyle = window.getComputedStyle(invoiceElement);
        console.log('📊 Element computed styles:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            width: computedStyle.width,
            height: computedStyle.height
        });
        
        // Check if element has text content
        const textContent = invoiceElement.textContent || invoiceElement.innerText || '';
        console.log('📄 Text content length:', textContent.length, 'chars');
        
        if (textContent.length < 50) {
            console.warn('⚠️ Very little text content found - PDF might be blank');
        }
        
        // PDF options - optimized for full page rendering
        const opt = {
            margin: [0, 0, 0, 0],
            filename: `Invoice-${enrichedInvoiceData.invoiceNumber || 'draft'}.pdf`,
            image: { 
                type: 'jpeg', 
                quality: 0.98 
            },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                letterRendering: true,
                logging: false,
                allowTaint: false,
                backgroundColor: '#ffffff',
                width: invoiceElement.scrollWidth || 794,
                height: invoiceElement.scrollHeight || 1123,
                windowWidth: invoiceElement.scrollWidth || 794,
                windowHeight: invoiceElement.scrollHeight || 1123,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true
            },
            pagebreak: { mode: ['avoid-all', 'css'], avoid: ['.invoice-container', '.invoice-header', '.client-section', '.items-table', '.totals-section'] }
        };
        
        console.log('🔨 Starting PDF conversion with options:', {
            scale: opt.html2canvas.scale,
            width: opt.html2canvas.width,
            height: opt.html2canvas.height
        });
        
        // Make container and element fully visible for capture
        const originalContainerOpacity = tempContainer.style.opacity;
        const originalElementOpacity = invoiceElement.style.opacity;
        const originalElementPosition = invoiceElement.style.position;
        const originalContainerWidth = tempContainer.style.width;
        
        // Make visible for html2canvas - ensure full width
        tempContainer.style.opacity = '1';
        tempContainer.style.width = '794px'; // Exact A4 width
        invoiceElement.style.opacity = '1';
        invoiceElement.style.position = 'relative';
        invoiceElement.style.visibility = 'visible';
        invoiceElement.style.display = 'block';
        invoiceElement.style.width = '100%';
        invoiceElement.style.maxWidth = '100%';
        
        // Force a reflow to ensure styles are applied
        void tempContainer.offsetHeight;
        void invoiceElement.offsetHeight;
        
        // Wait a bit more for rendering
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('👁️ Element made visible for capture');
        console.log('📏 Final dimensions before capture:', {
            containerWidth: tempContainer.offsetWidth,
            elementWidth: invoiceElement.offsetWidth,
            elementHeight: invoiceElement.offsetHeight,
            scrollWidth: invoiceElement.scrollWidth,
            scrollHeight: invoiceElement.scrollHeight
        });
        
        // Verify element is full width
        if (invoiceElement.offsetWidth < 700) {
            console.warn('⚠️ Element width is too narrow:', invoiceElement.offsetWidth);
            invoiceElement.style.width = '794px';
            invoiceElement.style.minWidth = '794px';
        }
        
        try {
            // Generate PDF
            console.log('🔨 Calling html2pdf...');
            await html2pdf().set(opt).from(invoiceElement).save();
            console.log('✅ PDF saved successfully!');
        } catch (pdfError) {
            console.error('❌ html2pdf error:', pdfError);
            throw pdfError;
        } finally {
            // Restore original styles
            tempContainer.style.opacity = originalContainerOpacity;
            tempContainer.style.width = originalContainerWidth;
            invoiceElement.style.opacity = originalElementOpacity;
            invoiceElement.style.position = originalElementPosition;
        }
        
        // Clean up
        if (tempContainer && tempContainer.parentNode) {
            document.body.removeChild(tempContainer);
            console.log('🧹 Cleaned up temporary elements');
        }
        
        // Show success message
        if (typeof showNotification === 'function') {
            showNotification('✅ Invoice PDF downloaded successfully!', 'success');
        } else if (typeof showToast === 'function') {
            showToast('✅ Invoice PDF downloaded successfully!', 'success');
        } else {
            console.log('✅ PDF downloaded - check your downloads folder');
        }
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            invoiceData: enrichedInvoiceData
        });
        
        const errorMessage = 'Error generating PDF: ' + error.message + '\n\nCheck browser console (F12) for details.';
        
        if (typeof showNotification === 'function') {
            showNotification(errorMessage, 'error');
        } else if (typeof showToast === 'function') {
            showToast(errorMessage, 'error');
        } else {
            alert(errorMessage);
        }
    } finally {
        // Restore button state
        if (buttonElement) {
            buttonElement.innerHTML = originalHTML || '<i class="fas fa-file-pdf"></i> Download PDF';
            buttonElement.disabled = false;
            console.log('🔄 Button state restored');
        }
    }
}

// Export functions for use in other modules
window.generateInvoicePDF = generateInvoicePDF;
window.loadHtml2PdfLibrary = loadHtml2PdfLibrary;

// Log that the script is loaded
console.log('✅ Invoice PDF Generator loaded successfully');
console.log('   - generateInvoicePDF:', typeof window.generateInvoicePDF);
console.log('   - Ready to generate PDFs!');

