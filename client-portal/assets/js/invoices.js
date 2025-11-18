/**
 * Invoices Page Module
 */

import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Generate PDF for invoice
window.generateInvoicePDFInline = async function(docId) {
    console.log('🖱️ Generating PDF for invoice:', docId);
    
    try {
        // Check if PDF generator is loaded - wait a bit if not ready
        if (typeof window.generateInvoicePDF !== 'function') {
            console.log('⏳ Waiting for PDF generator to load...');
            
            // Wait up to 5 seconds for PDF generator to load
            let waited = 0;
            while (typeof window.generateInvoicePDF !== 'function' && waited < 5000) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waited += 100;
            }
            
            if (typeof window.generateInvoicePDF !== 'function') {
                console.error('❌ PDF generator not loaded after waiting');
                alert('PDF generator not loaded. Please refresh the page.\n\nIf the problem persists, check the browser console for errors.');
                return;
            }
            
            console.log('✅ PDF generator loaded successfully');
        }
        
        const db = window.db;
        // Fetch the full invoice data
        const invoiceDoc = await getDoc(doc(db, 'invoices', docId));
        if (!invoiceDoc.exists()) {
            alert('Invoice not found.');
            return;
        }
        
        const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() };
        console.log('Invoice data for PDF:', invoiceData);
        
        // Generate PDF
        await window.generateInvoicePDF(invoiceData);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF: ' + error.message);
    }
};

// Load invoices
window.loadInvoices = async function() {
    const clientId = window.currentClientId;
    if (!clientId) {
        console.warn('Client ID not available');
        return;
    }
    
    const db = window.db;
    const container = document.getElementById('invoices-list');
    if (!container) return;
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Try with orderBy, fallback without if index doesn't exist
        let q;
        try {
            q = query(collection(db, 'invoices'), where('clientId', '==', clientId), orderBy('date', 'desc'));
        } catch (indexError) {
            console.warn('Invoices index not found, loading without orderBy');
            q = query(collection(db, 'invoices'), where('clientId', '==', clientId));
        }
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No invoices yet. Invoices will appear here once created.</p></div>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const invoice = docSnap.data();
            const card = document.createElement('div');
            card.className = 'invoice-card';
            
            let dateStr = 'N/A';
            if (invoice.date) {
                if (invoice.date.toDate) {
                    dateStr = invoice.date.toDate().toLocaleDateString();
                } else if (invoice.date.seconds) {
                    dateStr = new Date(invoice.date.seconds * 1000).toLocaleDateString();
                }
            }
            
            card.innerHTML = `
                <div class="invoice-header">
                    <div>
                        <div class="invoice-number">Invoice #${invoice.invoiceNumber || 'N/A'}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: var(--space-2);">
                            ${invoice.projectName || 'General'} • ${dateStr}
                        </div>
                        ${invoice.notes ? `<div style="padding: var(--space-3); background: var(--gray-50); border-radius: var(--radius); font-size: 0.875rem; color: var(--text-secondary);"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div class="invoice-amount">$${invoice.amount ? invoice.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</div>
                        <span class="invoice-status status-${invoice.status || 'pending'}">${invoice.status || 'pending'}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                    <button class="btn btn-sm" onclick="window.generateInvoicePDFInline('${docSnap.id}')" style="background: var(--primary); color: white;">
                        <i class="fas fa-file-pdf"></i> Download PDF
                    </button>
                    ${invoice.downloadUrl ? `
                        <a href="${invoice.downloadUrl}" target="_blank" class="btn btn-sm">
                            <i class="fas fa-download"></i> Attachment
                        </a>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading invoices:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center;">Error loading invoices. Please refresh the page.</p>';
    }
};

// Initialize when page loads
let invoicesInitialized = false;

function initInvoicesIfNeeded() {
    if (invoicesInitialized) return;
    
    const container = document.getElementById('invoices-list');
    if (!container) return;
    
    invoicesInitialized = true;
    window.loadInvoices();
}

// Listen for page load event
window.addEventListener('pageLoaded', (e) => {
    if (e.detail?.tab === 'invoices') {
        invoicesInitialized = false; // Reset to allow reloading
        initInvoicesIfNeeded();
    }
});

// Fallback initialization
setInterval(() => {
    if (document.getElementById('invoices-list') && !invoicesInitialized) {
        initInvoicesIfNeeded();
    }
}, 500);

