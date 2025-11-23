/**
 * Clients Page Module
 * Full client management system
 */

import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, onSnapshot, Timestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { ref, listAll, getDownloadURL, getMetadata } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';

// Basic client list loader
window.loadClients = async function() {
    // Wait for authentication
    let waitCount = 0;
    while (!window.currentAdminUser && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    if (!window.currentAdminUser) {
        console.warn('User not authenticated, cannot load clients');
        return;
    }
    
    const db = window.db || window.adminDB;
    if (!db) {
        console.error('Database not initialized');
        return;
    }
    
    console.log('Loading clients...');
    const clientsList = document.getElementById('clients-list');
    const clientsListCard = document.getElementById('clients-list-card');
    const clientManagementView = document.getElementById('client-management-view');
    
    if (!clientsList) {
        console.error('clients-list element not found');
        return;
    }
    
    // Hide client management view, show list
    if (clientsListCard) clientsListCard.classList.remove('hidden');
    if (clientManagementView) clientManagementView.classList.add('hidden');
    
    clientsList.innerHTML = '<div class="spinner"></div>';
    
    try {
        const snapshot = await getDocs(collection(db, 'clients'));
        
        // Update count
        const countElement = document.getElementById('clients-count');
        if (countElement) {
            countElement.textContent = `${snapshot.size} clients`;
        }
        
        if (snapshot.empty) {
            clientsList.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: var(--space-4);">No clients yet. Clients will appear here once they register.</p>';
            return;
        }
        
        clientsList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const client = docSnap.data();
            const item = document.createElement('div');
            item.className = 'client-item';
            item.innerHTML = `
                <div class="stat-icon" style="background: var(--primary); opacity: 1;">
                    <i class="fas fa-user" style="color: var(--white); opacity: 1;"></i>
                </div>
                <div class="post-content">
                    <div class="post-title">${client.name || 'Unnamed Client'}</div>
                    <div class="post-meta">${client.email || 'No email'}</div>
                </div>
                <button class="btn btn-sm" onclick="window.viewClientDetail('${docSnap.id}')">
                    <i class="fas fa-arrow-right"></i> Manage
                </button>
            `;
            clientsList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
        clientsList.innerHTML = `
            <div style="text-align: center; color: var(--danger); padding: var(--space-4);">
                <p><i class="fas fa-exclamation-triangle"></i> Error loading clients</p>
                <p style="font-size: 0.875rem;">${error.message}</p>
            </div>
        `;
    }
};

// View client detail - full management system
window.viewClientDetail = async function(clientId) {
    const db = window.db || window.adminDB;
    if (!db) {
        window.showToast('Database not initialized', 'error');
        return;
    }
    
    const clientsListCard = document.getElementById('clients-list-card');
    const clientManagementView = document.getElementById('client-management-view');
    
    if (!clientsListCard || !clientManagementView) {
        window.showToast('Client management view not found', 'error');
        return;
    }
    
    // Hide list, show management view
    clientsListCard.classList.add('hidden');
    clientManagementView.classList.remove('hidden');
    
    try {
        // Load client data
        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        if (!clientDoc.exists()) {
            window.showToast('Client not found', 'error');
            window.backToClientsList();
            return;
        }
        
        const client = clientDoc.data();
        
        // Get the client's UID - this is what the client portal uses
        // The client document MUST have a 'uid' field that matches Firebase Auth UID
        const clientUID = client.uid;
        if (!clientUID) {
            console.error('Client document missing uid field! Document ID:', clientId, 'Client data:', client);
            window.showToast('Client UID not found. Client may need to be re-registered.', 'error');
            window.backToClientsList();
            return;
        }
        console.log('Client UID extracted:', clientUID, 'Document ID:', clientId);
        
        // Store client name for message avatars
        window.currentClientName = client.name || 'Client';
        
        // Update client info in the management view
        const nameEl = document.getElementById('selected-client-name');
        const emailEl = document.getElementById('selected-client-email');
        const whatsappEl = document.getElementById('selected-client-whatsapp');
        const countryEl = document.getElementById('selected-client-country');
        const joinedEl = document.getElementById('selected-client-joined');
        
        if (nameEl) {
            nameEl.innerHTML = `<i class="fas fa-user-circle"></i> ${client.name || 'Unnamed Client'}`;
        }
        if (emailEl) {
            emailEl.innerHTML = `<i class="fas fa-envelope" style="color: var(--primary); margin-right: var(--space-1);"></i> ${client.email || 'No email'}`;
        }
        if (whatsappEl) {
            const whatsapp = client.whatsapp || client.phone || 'Not provided';
            whatsappEl.innerHTML = `<i class="fab fa-whatsapp" style="color: #25D366; margin-right: var(--space-1);"></i> <span>${whatsapp}</span>`;
        }
        if (countryEl) {
            const country = client.countryCode || client.country || 'Not provided';
            countryEl.innerHTML = `<i class="fas fa-globe" style="color: var(--info); margin-right: var(--space-1);"></i> <span>${country}</span>`;
        }
        if (joinedEl) {
            const joined = client.createdAt ? new Date(client.createdAt.seconds * 1000).toLocaleDateString() : '-';
            joinedEl.innerHTML = `<i class="fas fa-calendar" style="color: var(--success); margin-right: var(--space-1);"></i> <span>${joined}</span>`;
        }
        
        // Store current client ID (document ID) and UID for use in other functions
        window.currentClientId = clientId; // Document ID
        window.currentClientUID = clientUID; // Client's UID (for Firestore queries)
        
        // Setup tabs
        setupClientTabs();
        
        // Setup close button
        const closeBtn = document.getElementById('close-client-view');
        if (closeBtn && !closeBtn.dataset.listenerAdded) {
            closeBtn.dataset.listenerAdded = 'true';
            closeBtn.addEventListener('click', window.backToClientsList);
        }
        
        // Load initial tab data - use clientUID for queries
        loadClientProjects(clientUID);
        loadClientMessages(clientUID); // Now uses real-time onSnapshot
        loadClientInvoices(clientUID);
        
        // Setup tab-specific buttons - pass clientUID for creating new items
        setupClientTabButtons(clientUID);
        
    } catch (error) {
        console.error('Error loading client detail:', error);
        window.showToast('Error loading client details', 'error');
    }
};

// Back to clients list
window.backToClientsList = function() {
    const clientsListCard = document.getElementById('clients-list-card');
    const clientManagementView = document.getElementById('client-management-view');
    
    // Unsubscribe from messages listener
    if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
    }
    
    // Clear stored client data
    window.currentClientUID = null;
    window.currentClientId = null;
    window.currentClientName = null;
    
    if (clientsListCard) clientsListCard.classList.remove('hidden');
    if (clientManagementView) clientManagementView.classList.add('hidden');
    
    window.loadClients();
};

// Setup client tabs
function setupClientTabs() {
    const tabs = document.querySelectorAll('.client-tab-btn');
    tabs.forEach(tab => {
        if (!tab.dataset.listenerAdded) {
            tab.dataset.listenerAdded = 'true';
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.client-tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active to clicked tab
                tab.classList.add('active');
                
                // Convert data-tab "client-projects" to ID "client-tab-projects"
                const tabId = tab.dataset.tab.replace('client-', 'client-tab-'); // e.g., "client-projects" -> "client-tab-projects"
                const tabContent = document.getElementById(tabId);
                
                if (tabContent) {
                    tabContent.classList.add('active');
                    
                    // Load data for this tab if needed
                    const clientUID = window.currentClientUID || window.currentClientId;
                    if (clientUID) {
                        const tabName = tab.dataset.tab.replace('client-', ''); // Remove "client-" prefix
                        if (tabName === 'projects') {
                            loadClientProjects(clientUID);
                        } else if (tabName === 'messages') {
                            loadClientMessages(clientUID);
                        } else if (tabName === 'invoices') {
                            loadClientInvoices(clientUID);
                        } else if (tabName === 'files') {
                            loadClientFiles(clientUID);
                        } else if (tabName === 'milestones') {
                            loadClientMilestones(clientUID);
                        } else if (tabName === 'features') {
                            loadClientFeatureRequests(clientUID);
                        } else if (tabName === 'profile') {
                            loadClientProfile(clientUID);
                        }
                    }
                } else {
                    console.warn('Tab content not found for ID:', tabId);
                }
            });
        }
    });
}

// Setup tab-specific buttons
function setupClientTabButtons(clientUID) {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        // Create project button
        const createProjectBtn = document.getElementById('create-project-btn');
        if (createProjectBtn && !createProjectBtn.dataset.listenerAdded) {
            createProjectBtn.dataset.listenerAdded = 'true';
            createProjectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create project button clicked, clientUID:', clientUID);
                if (window.showProjectModal) {
                    window.showProjectModal();
                } else {
                    console.error('showProjectModal not available');
                    window.showToast('Project modal not ready. Please refresh.', 'error');
                }
            });
        }
        
        // Create milestone button
        const createMilestoneBtn = document.getElementById('create-milestone-btn');
        if (createMilestoneBtn && !createMilestoneBtn.dataset.listenerAdded) {
            createMilestoneBtn.dataset.listenerAdded = 'true';
            createMilestoneBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create milestone button clicked, clientUID:', clientUID);
                if (window.showMilestoneModal) {
                    window.showMilestoneModal();
                } else {
                    console.error('showMilestoneModal not available');
                    window.showToast('Milestone modal not ready. Please refresh.', 'error');
                }
            });
        }
        
        // Send message button - use window.currentClientUID to get latest value
        const sendMsgBtn = document.getElementById('admin-send-message-btn');
        const msgInput = document.getElementById('admin-chat-input');
        if (sendMsgBtn && !sendMsgBtn.dataset.listenerAdded) {
            sendMsgBtn.dataset.listenerAdded = 'true';
            sendMsgBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentUID = window.currentClientUID || clientUID;
                if (!currentUID) {
                    window.showToast('Client UID not found. Please refresh and try again.', 'error');
                    return;
                }
                window.sendMessage(currentUID);
            });
        }
        if (msgInput && !msgInput.dataset.listenerAdded) {
            msgInput.dataset.listenerAdded = 'true';
            msgInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const currentUID = window.currentClientUID || clientUID;
                    if (!currentUID) {
                        window.showToast('Client UID not found. Please refresh and try again.', 'error');
                        return;
                    }
                    window.sendMessage(currentUID);
                }
            });
        }
        
        // Create invoice button
        const createInvoiceBtn = document.getElementById('create-invoice-btn');
        if (createInvoiceBtn && !createInvoiceBtn.dataset.listenerAdded) {
            createInvoiceBtn.dataset.listenerAdded = 'true';
            createInvoiceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create invoice button clicked, clientUID:', clientUID);
                if (window.showInvoiceModal) {
                    window.showInvoiceModal();
                } else {
                    console.error('showInvoiceModal not available');
                    window.showToast('Invoice modal not ready. Please refresh.', 'error');
                }
            });
        }
        
        // Setup project form - use window.currentClientUID to get latest value
        const projectForm = document.getElementById('project-form');
        if (projectForm && !projectForm.dataset.listenerAdded) {
            projectForm.dataset.listenerAdded = 'true';
            projectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const currentUID = window.currentClientUID || clientUID;
                console.log('Project form submitted, clientUID:', currentUID);
                if (!currentUID) {
                    window.showToast('Client UID not found. Please refresh and try again.', 'error');
                    return;
                }
                saveProject(currentUID);
            });
        }
        
        // Setup milestone form - use window.currentClientUID to get latest value
        const milestoneForm = document.getElementById('milestone-form');
        if (milestoneForm && !milestoneForm.dataset.listenerAdded) {
            milestoneForm.dataset.listenerAdded = 'true';
            milestoneForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const currentUID = window.currentClientUID || clientUID;
                console.log('Milestone form submitted, clientUID:', currentUID);
                if (!currentUID) {
                    window.showToast('Client UID not found. Please refresh and try again.', 'error');
                    return;
                }
                saveMilestone(currentUID);
            });
        }
        
        // Setup invoice form - use window.currentClientUID to get latest value
        const invoiceForm = document.getElementById('invoice-form');
        if (invoiceForm && !invoiceForm.dataset.listenerAdded) {
            invoiceForm.dataset.listenerAdded = 'true';
            invoiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const currentUID = window.currentClientUID || clientUID;
                console.log('Invoice form submitted, clientUID:', currentUID);
                if (!currentUID) {
                    window.showToast('Client UID not found. Please refresh and try again.', 'error');
                    return;
                }
                saveInvoice(currentUID);
            });
        }
        
        // Setup invoice modal close buttons
        const invoiceModalClose = document.getElementById('invoice-modal-close');
        const invoiceModalCancel = document.getElementById('invoice-modal-cancel');
        if (invoiceModalClose && !invoiceModalClose.dataset.listenerAdded) {
            invoiceModalClose.dataset.listenerAdded = 'true';
            invoiceModalClose.addEventListener('click', () => {
                if (window.closeInvoiceModal) {
                    window.closeInvoiceModal();
                }
            });
        }
        if (invoiceModalCancel && !invoiceModalCancel.dataset.listenerAdded) {
            invoiceModalCancel.dataset.listenerAdded = 'true';
            invoiceModalCancel.addEventListener('click', () => {
                if (window.closeInvoiceModal) {
                    window.closeInvoiceModal();
                }
            });
        }
    }, 100);
}

// Load client projects
async function loadClientProjects(clientId) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const list = document.getElementById('client-projects-list');
    if (!list) return;
    
    list.innerHTML = '<div class="spinner"></div>';
    
    try {
        const q = query(collection(db, 'projects'), where('clientId', '==', clientId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No projects yet.</p>';
            return;
        }
        
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const project = docSnap.data();
            const progress = project.progress || 0;
            const status = project.status || 'pending';
            const item = document.createElement('div');
            item.className = 'post-item';
            item.style.cssText = 'padding: var(--space-4); border: 1px solid var(--gray-200); border-radius: var(--radius-lg); margin-bottom: var(--space-3); background: var(--white);';
            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-2);">
                        <div>
                            <div class="post-title" style="font-size: 1.1rem; margin-bottom: var(--space-1);">
                                <i class="fas fa-project-diagram" style="color: var(--primary); margin-right: var(--space-1);"></i>
                                ${escapeHtml(project.name || 'Unnamed Project')}
                            </div>
                            <div class="post-meta">${escapeHtml(project.description || 'No description')}</div>
                        </div>
                        <select class="form-control" style="width: auto; min-width: 150px;" onchange="window.updateProjectStatus('${docSnap.id}', this.value)">
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="in-progress" ${status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="on-hold" ${status === 'on-hold' ? 'selected' : ''}>On Hold</option>
                            <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                    <div style="margin-bottom: var(--space-3);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1); font-size: 0.875rem; color: var(--gray-600);">
                            <span><i class="fas fa-chart-line"></i> Progress</span>
                            <span style="font-weight: 600; color: var(--primary);">${progress}%</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: var(--gray-200); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${progress}%; height: 100%; background: var(--primary); transition: width 0.3s;"></div>
                        </div>
                    </div>
                    <div style="display: flex; gap: var(--space-2); align-items: center; padding-top: var(--space-2); border-top: 1px solid var(--gray-200);">
                        <div style="display: flex; align-items: center; gap: var(--space-1); flex: 1;">
                            <input type="number" class="form-control" style="width: 100px;" min="0" max="100" value="${progress}" onchange="window.updateProjectProgress('${docSnap.id}', this.value)">
                            <span style="font-size: 0.875rem; color: var(--gray-600);">%</span>
                        </div>
                        <button class="btn btn-sm" onclick="window.showProjectModal('${docSnap.id}')" style="background: var(--primary);">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteProject('${docSnap.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        list.innerHTML = '<p style="color: var(--danger);">Error loading projects</p>';
    }
}

// Store unsubscribe function for messages
let messagesUnsubscribe = null;

// Load client messages with real-time updates
function loadClientMessages(clientId) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const list = document.getElementById('admin-chat-messages');
    if (!list) return;
    
    // Unsubscribe from previous listener if exists
    if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
    }
    
    list.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Try with orderBy first, fallback without if index doesn't exist
        let messagesQuery;
        try {
            messagesQuery = query(
                collection(db, 'messages'), 
                where('clientId', '==', clientId), 
                orderBy('timestamp', 'asc')
            );
        } catch (indexError) {
            console.warn('Index not found, loading without orderBy');
            messagesQuery = query(
                collection(db, 'messages'), 
                where('clientId', '==', clientId)
            );
        }
        
        // Use onSnapshot for real-time updates
        messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            list.innerHTML = '';
            
            if (snapshot.empty) {
                list.innerHTML = '<div style="text-align: center; color: var(--gray-500); padding: var(--space-4);"><i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3; margin-bottom: var(--space-2);"></i><p>No messages yet. Start a conversation!</p></div>';
                return;
            }
            
            // Sort messages by timestamp if we loaded without orderBy
            const messages = [];
            snapshot.forEach(docSnap => {
                messages.push({ id: docSnap.id, ...docSnap.data() });
            });
            
            // Sort by timestamp if not already ordered
            if (!snapshot.query.orderBy) {
                messages.sort((a, b) => {
                    const timeA = a.timestamp?.seconds || a.timestamp || 0;
                    const timeB = b.timestamp?.seconds || b.timestamp || 0;
                    return timeA - timeB;
                });
            }
            
            // Mark messages as read
            snapshot.docs.forEach(docSnap => {
                if (!docSnap.data().read && (docSnap.data().senderId !== 'admin' && docSnap.data().sender !== 'admin')) {
                    updateDoc(docSnap.ref, { read: true }).catch(err => console.error('Error marking as read:', err));
                }
            });
            
            messages.forEach(message => {
                const isAdmin = message.senderId === 'admin' || message.sender === 'admin';
                const messageText = message.text || message.message || '';
                
                // Get client name for avatar
                const clientName = window.currentClientName || 'Client';
                const senderInitial = isAdmin ? 'A' : (clientName.charAt(0).toUpperCase() || 'C');
                const senderName = isAdmin ? 'Admin' : clientName;
                
                // Create message item with avatar (like traditional chat apps)
                const messageItem = document.createElement('div');
                messageItem.className = `message-item ${isAdmin ? 'admin' : 'client'}`;
                messageItem.dataset.messageId = message.id;
                
                let timestamp = 'Just now';
                if (message.timestamp) {
                    if (message.timestamp.toDate) {
                        const date = message.timestamp.toDate();
                        timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else if (message.timestamp.seconds) {
                        const date = new Date(message.timestamp.seconds * 1000);
                        timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                }
                
                messageItem.innerHTML = `
                    <div class="client-avatar" style="width: 40px; height: 40px; font-size: 1rem; flex-shrink: 0;">
                        ${senderInitial}
                    </div>
                    <div class="message-bubble">
                        <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; opacity: 0.8;">
                            ${senderName}
                        </div>
                        <div style="line-height: 1.6; word-wrap: break-word;">${escapeHtml(messageText)}</div>
                        <div class="message-time">
                            <i class="fas fa-clock" style="font-size: 0.65rem; margin-right: 0.25rem;"></i>
                            ${timestamp}
                            ${message.read && !isAdmin ? '<i class="fas fa-check-double" style="color: var(--primary); margin-left: 0.5rem;"></i>' : ''}
                        </div>
                    </div>
                `;
                list.appendChild(messageItem);
            });
            
            // Auto-scroll to bottom
            setTimeout(() => {
                list.scrollTop = list.scrollHeight;
            }, 100);
        }, (error) => {
            console.error('Messages snapshot error:', error);
            list.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
        });
    } catch (error) {
        console.error('Error setting up messages listener:', error);
        list.innerHTML = '<p style="color: var(--danger);">Error loading messages: ' + error.message + '</p>';
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send message
window.sendMessage = async function(clientUID) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const input = document.getElementById('admin-chat-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    if (!clientUID) {
        window.showToast('Client UID not found. Please refresh and try again.', 'error');
        return;
    }
    
    try {
        await addDoc(collection(db, 'messages'), {
            clientId: clientUID, // Use client UID, not document ID
            senderId: 'admin',
            sender: 'admin',
            text: text,
            message: text, // Support both field names
            timestamp: serverTimestamp(),
            read: false
        });
        
        input.value = '';
        loadClientMessages(clientUID);
        window.showToast('Message sent!', 'success');
    } catch (error) {
        console.error('Error sending message:', error);
        window.showToast('Error sending message: ' + error.message, 'error');
    }
};

// Load client invoices
async function loadClientInvoices(clientId) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const list = document.getElementById('client-invoices-list');
    if (!list) return;
    
    list.innerHTML = '<div class="spinner"></div>';
    
    try {
        const q = query(
            collection(db, 'invoices'), 
            where('clientId', '==', clientId), 
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No invoices yet.</p>';
            return;
        }
        
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const invoice = docSnap.data();
            const item = document.createElement('div');
            item.className = 'post-item';
            item.style.cssText = 'padding: var(--space-4); border: 1px solid var(--gray-200); border-radius: var(--radius-lg); margin-bottom: var(--space-3); background: var(--white);';
            
            // Handle date formatting
            let dateStr = 'N/A';
            if (invoice.date) {
                if (invoice.date.toDate) {
                    dateStr = invoice.date.toDate().toLocaleDateString();
                } else if (invoice.date.seconds) {
                    dateStr = new Date(invoice.date.seconds * 1000).toLocaleDateString();
                } else if (invoice.date instanceof Date) {
                    dateStr = invoice.date.toLocaleDateString();
                }
            }
            
            const status = invoice.status || 'pending';
            const amount = invoice.amount || 0;
            
            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-2);">
                        <div>
                            <div class="post-title" style="font-size: 1.1rem; margin-bottom: var(--space-1);">
                                <i class="fas fa-file-invoice" style="color: var(--info); margin-right: var(--space-1);"></i>
                                Invoice #${escapeHtml(invoice.invoiceNumber || 'N/A')}
                            </div>
                            <div class="post-meta">${escapeHtml(invoice.projectName || 'No project')} • ${dateStr}</div>
                            ${invoice.notes ? `<div style="margin-top: var(--space-2); padding: var(--space-2); background: var(--gray-50); border-radius: var(--radius); font-size: 0.875rem;"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--gray-900); margin-bottom: var(--space-1);">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <span class="badge badge-${status}">${status}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; padding-top: var(--space-2); border-top: 1px solid var(--gray-200);">
                        <button class="btn btn-sm pdf-download-btn" data-invoice-id="${docSnap.id}" style="background: #e74c3c;">
                            <i class="fas fa-file-pdf"></i> Download PDF
                        </button>
                        <button class="btn btn-sm" onclick="window.showInvoiceModal('${docSnap.id}')" style="background: var(--primary);">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${status !== 'pending' ? `<button class="btn btn-sm" onclick="window.updateInvoiceStatus('${docSnap.id}', 'pending')" style="background: var(--warning);"><i class="fas fa-clock"></i> Mark Pending</button>` : ''}
                        ${status !== 'paid' ? `<button class="btn btn-sm" onclick="window.updateInvoiceStatus('${docSnap.id}', 'paid')" style="background: var(--success);"><i class="fas fa-check"></i> Mark Paid</button>` : ''}
                        ${status !== 'overdue' ? `<button class="btn btn-sm" onclick="window.updateInvoiceStatus('${docSnap.id}', 'overdue')" style="background: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Mark Overdue</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="window.deleteInvoice('${docSnap.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(item);
            
            // Setup PDF download button
            const pdfBtn = item.querySelector('.pdf-download-btn');
            if (pdfBtn && window.generateInvoicePDF) {
                pdfBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const invoiceData = { id: docSnap.id, ...invoice };
                    await window.generateInvoicePDF(invoiceData, pdfBtn);
                });
            }
        });
    } catch (error) {
        console.error('Error loading invoices:', error);
        list.innerHTML = '<p style="color: var(--danger);">Error loading invoices</p>';
    }
}

// Project Modal Functions
window.showProjectModal = function(projectId = null) {
    console.log('showProjectModal called with:', projectId);
    const modal = document.getElementById('project-modal');
    const title = document.getElementById('project-modal-title');
    const form = document.getElementById('project-form');
    
    if (!modal) {
        console.error('Project modal not found in DOM');
        window.showToast('Project modal not found. Please refresh the page.', 'error');
        return;
    }
    
    if (projectId) {
        if (title) title.textContent = 'Edit Project';
        loadProjectForEdit(projectId);
    } else {
        if (title) title.textContent = 'Create Project';
        if (form) form.reset();
        const editId = document.getElementById('project-edit-id');
        if (editId) editId.value = '';
    }
    
    modal.classList.remove('hidden');
    console.log('Project modal shown');
};

window.closeProjectModal = function() {
    const modal = document.getElementById('project-modal');
    if (modal) modal.classList.add('hidden');
};

async function loadProjectForEdit(projectId) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
            const project = projectDoc.data();
            const editId = document.getElementById('project-edit-id');
            const name = document.getElementById('project-name');
            const description = document.getElementById('project-description');
            const progress = document.getElementById('project-progress');
            const status = document.getElementById('project-status');
            
            if (editId) editId.value = projectId;
            if (name) name.value = project.name || '';
            if (description) description.value = project.description || '';
            if (progress) progress.value = project.progress || 0;
            if (status) status.value = project.status || 'pending';
        }
    } catch (error) {
        console.error('Error loading project:', error);
        window.showToast('Error loading project', 'error');
    }
}

async function saveProject(clientUID) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const projectId = document.getElementById('project-edit-id')?.value;
    const name = document.getElementById('project-name')?.value.trim();
    const description = document.getElementById('project-description')?.value.trim();
    const progress = parseInt(document.getElementById('project-progress')?.value) || 0;
    const status = document.getElementById('project-status')?.value;
    
    if (!name || !status) {
        window.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!clientUID) {
        window.showToast('Client UID not found. Please refresh and try again.', 'error');
        return;
    }
    
    try {
        const projectData = {
            clientId: clientUID, // Use client UID, not document ID
            name,
            description: description || '',
            progress: Math.max(0, Math.min(100, progress)),
            status,
            updatedAt: serverTimestamp()
        };
        
        if (projectId) {
            await updateDoc(doc(db, 'projects', projectId), projectData);
            window.showToast('Project updated', 'success');
        } else {
            projectData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'projects'), projectData);
            window.showToast('Project created', 'success');
        }
        
        window.closeProjectModal();
        loadClientProjects(clientUID);
    } catch (error) {
        console.error('Error saving project:', error);
        window.showToast('Error saving project: ' + error.message, 'error');
    }
}

// Milestone Modal Functions
window.showMilestoneModal = function(milestoneId = null) {
    console.log('showMilestoneModal called with:', milestoneId);
    const modal = document.getElementById('milestone-modal');
    const title = document.getElementById('milestone-modal-title');
    const form = document.getElementById('milestone-form');
    
    if (!modal) {
        console.error('Milestone modal not found in DOM');
        window.showToast('Milestone modal not found. Please refresh the page.', 'error');
        return;
    }
    
    if (milestoneId) {
        if (title) title.textContent = 'Edit Milestone';
        loadMilestoneForEdit(milestoneId);
    } else {
        if (title) title.textContent = 'Add Milestone';
        if (form) form.reset();
        const editId = document.getElementById('milestone-edit-id');
        if (editId) editId.value = '';
        const dateInput = document.getElementById('milestone-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    modal.classList.remove('hidden');
    console.log('Milestone modal shown');
};

window.closeMilestoneModal = function() {
    const modal = document.getElementById('milestone-modal');
    if (modal) modal.classList.add('hidden');
};

async function loadMilestoneForEdit(milestoneId) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        const milestoneDoc = await getDoc(doc(db, 'milestones', milestoneId));
        if (milestoneDoc.exists()) {
            const milestone = milestoneDoc.data();
            const editId = document.getElementById('milestone-edit-id');
            const title = document.getElementById('milestone-title');
            const description = document.getElementById('milestone-description');
            const date = document.getElementById('milestone-date');
            
            if (editId) editId.value = milestoneId;
            if (title) title.value = milestone.title || '';
            if (description) description.value = milestone.description || '';
            if (date) {
                let milestoneDate = new Date();
                if (milestone.date) {
                    if (milestone.date.toDate) {
                        milestoneDate = milestone.date.toDate();
                    } else if (milestone.date.seconds) {
                        milestoneDate = new Date(milestone.date.seconds * 1000);
                    }
                }
                date.value = milestoneDate.toISOString().split('T')[0];
            }
        }
    } catch (error) {
        console.error('Error loading milestone:', error);
        window.showToast('Error loading milestone', 'error');
    }
}

async function saveMilestone(clientUID) {
    const db = window.db || window.adminDB;
    if (!db) {
        console.error('Database not available');
        return;
    }
    
    const milestoneId = document.getElementById('milestone-edit-id')?.value;
    const title = document.getElementById('milestone-title')?.value.trim();
    const description = document.getElementById('milestone-description')?.value.trim();
    const dateStr = document.getElementById('milestone-date')?.value;
    
    console.log('saveMilestone called:', { milestoneId, title, dateStr, clientUID });
    
    if (!title || !dateStr) {
        window.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!clientUID) {
        console.error('Client UID is missing!');
        window.showToast('Client UID not found. Please refresh and try again.', 'error');
        return;
    }
    
    try {
        // Create date object and convert to Firestore Timestamp
        const dateObj = new Date(dateStr + 'T00:00:00'); // Add time to ensure correct date
        if (isNaN(dateObj.getTime())) {
            window.showToast('Invalid date format', 'error');
            return;
        }
        
        // Use Timestamp for Firestore (like admin-client-portal.js)
        const dateTimestamp = Timestamp.fromDate(dateObj);
        
        const milestoneData = {
            clientId: clientUID, // Use client UID, not document ID
            title,
            description: description || '',
            date: dateTimestamp, // Use Timestamp instead of Date object
            updatedAt: serverTimestamp()
        };
        
        console.log('Saving milestone data:', milestoneData);
        
        if (milestoneId) {
            await updateDoc(doc(db, 'milestones', milestoneId), milestoneData);
            window.showToast('Milestone updated', 'success');
        } else {
            milestoneData.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, 'milestones'), milestoneData);
            console.log('Milestone created with ID:', docRef.id);
            window.showToast('Milestone created', 'success');
        }
        
        window.closeMilestoneModal();
        // Reload milestones using current client UID
        const currentUID = window.currentClientUID || clientUID;
        if (currentUID) {
            loadClientMilestones(currentUID);
        }
    } catch (error) {
        console.error('Error saving milestone:', error);
        window.showToast('Error saving milestone: ' + error.message, 'error');
    }
}

// Invoice Modal Functions
window.showInvoiceModal = function(invoiceId = null) {
    console.log('showInvoiceModal called with:', invoiceId);
    const modal = document.getElementById('invoice-modal');
    const title = document.getElementById('invoice-modal-title');
    const form = document.getElementById('invoice-form');
    
    if (!modal) {
        console.error('Invoice modal not found in DOM');
        window.showToast('Invoice modal not found. Please refresh the page.', 'error');
        return;
    }
    
    if (invoiceId) {
        if (title) title.textContent = 'Edit Invoice';
        loadInvoiceForEdit(invoiceId);
    } else {
        if (title) title.textContent = 'Create Invoice';
        if (form) form.reset();
        const editId = document.getElementById('invoice-edit-id');
        const dateInput = document.getElementById('invoice-date');
        const numberInput = document.getElementById('invoice-number');
        
        if (editId) editId.value = '';
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        if (numberInput) numberInput.value = `INV-${Date.now()}`;
    }
    
    modal.classList.remove('hidden');
    console.log('Invoice modal shown');
};

window.closeInvoiceModal = function() {
    const modal = document.getElementById('invoice-modal');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.getElementById('invoice-form');
        if (form) form.reset();
    }
};

async function loadInvoiceForEdit(invoiceId) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));
        if (!invoiceDoc.exists()) {
            window.showToast('Invoice not found', 'error');
            window.closeInvoiceModal();
            return;
        }
        
        const invoice = invoiceDoc.data();
        let invoiceDate = new Date();
        
        if (invoice.date) {
            if (invoice.date.toDate) {
                invoiceDate = invoice.date.toDate();
            } else if (invoice.date.seconds) {
                invoiceDate = new Date(invoice.date.seconds * 1000);
            } else if (invoice.date instanceof Date) {
                invoiceDate = invoice.date;
            }
        }
        
        const editId = document.getElementById('invoice-edit-id');
        const number = document.getElementById('invoice-number');
        const date = document.getElementById('invoice-date');
        const project = document.getElementById('invoice-project');
        const amount = document.getElementById('invoice-amount');
        const status = document.getElementById('invoice-status');
        const notes = document.getElementById('invoice-notes');
        
        if (editId) editId.value = invoiceId;
        if (number) number.value = invoice.invoiceNumber || '';
        if (date) date.value = invoiceDate.toISOString().split('T')[0];
        if (project) project.value = invoice.projectName || '';
        if (amount) amount.value = invoice.amount || 0;
        if (status) status.value = invoice.status || 'pending';
        if (notes) notes.value = invoice.notes || '';
    } catch (error) {
        console.error('Error loading invoice:', error);
        window.showToast('Error loading invoice', 'error');
        window.closeInvoiceModal();
    }
}

async function saveInvoice(clientUID) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const invoiceId = document.getElementById('invoice-edit-id')?.value;
    const invoiceNumber = document.getElementById('invoice-number')?.value.trim();
    const invoiceDate = document.getElementById('invoice-date')?.value;
    const projectName = document.getElementById('invoice-project')?.value.trim();
    const amount = parseFloat(document.getElementById('invoice-amount')?.value) || 0;
    const status = document.getElementById('invoice-status')?.value;
    const notes = document.getElementById('invoice-notes')?.value.trim();
    
    if (!invoiceNumber || !projectName || !invoiceDate) {
        window.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!clientUID) {
        window.showToast('Client UID not found. Please refresh and try again.', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('invoice-modal-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    
    try {
        const dateObj = new Date(invoiceDate);
        if (isNaN(dateObj.getTime())) {
            window.showToast('Invalid date format', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
            }
            return;
        }
        
        const invoiceData = {
            clientId: clientUID, // Use client UID, not document ID
            invoiceNumber,
            projectName,
            amount: parseFloat(amount),
            date: dateObj,
            status,
            notes: notes || null,
            updatedAt: serverTimestamp()
        };
        
        if (invoiceId) {
            await updateDoc(doc(db, 'invoices', invoiceId), invoiceData);
            window.showToast('Invoice updated', 'success');
        } else {
            invoiceData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'invoices'), invoiceData);
            window.showToast('Invoice created', 'success');
        }
        
        window.closeInvoiceModal();
        loadClientInvoices(clientUID);
    } catch (error) {
        console.error('Error saving invoice:', error);
        window.showToast('Error saving invoice: ' + error.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
        }
    }
}

// Legacy function for compatibility
window.createInvoice = function(clientId) {
    window.showInvoiceModal();
};

// Project Management Functions
window.updateProjectStatus = async function(projectId, status) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await updateDoc(doc(db, 'projects', projectId), { status });
        window.showToast('Project status updated', 'success');
        // Reload projects
        const clientUID = window.currentClientUID;
        if (clientUID) loadClientProjects(clientUID);
    } catch (error) {
        console.error('Error updating project status:', error);
        window.showToast('Error updating status: ' + error.message, 'error');
    }
};

window.updateProjectProgress = async function(projectId, progress) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await updateDoc(doc(db, 'projects', projectId), { progress: parseInt(progress) });
        window.showToast('Project progress updated', 'success');
        // Reload projects
        const clientUID = window.currentClientUID;
        if (clientUID) loadClientProjects(clientUID);
    } catch (error) {
        console.error('Error updating project progress:', error);
        window.showToast('Error updating progress: ' + error.message, 'error');
    }
};

window.deleteProject = async function(projectId) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await deleteDoc(doc(db, 'projects', projectId));
        window.showToast('Project deleted', 'success');
        // Reload projects
        const clientUID = window.currentClientUID;
        if (clientUID) loadClientProjects(clientUID);
    } catch (error) {
        console.error('Error deleting project:', error);
        window.showToast('Error deleting project: ' + error.message, 'error');
    }
};

// Invoice Management Functions
window.updateInvoiceStatus = async function(invoiceId, status) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await updateDoc(doc(db, 'invoices', invoiceId), { 
            status,
            updatedAt: serverTimestamp()
        });
        window.showToast('Invoice status updated', 'success');
        // Reload invoices
        const clientUID = window.currentClientUID;
        if (clientUID) loadClientInvoices(clientUID);
    } catch (error) {
        console.error('Error updating invoice status:', error);
        window.showToast('Error updating status: ' + error.message, 'error');
    }
};

window.deleteInvoice = async function(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await deleteDoc(doc(db, 'invoices', invoiceId));
        window.showToast('Invoice deleted', 'success');
        // Reload invoices
        const clientUID = window.currentClientUID;
        if (clientUID) loadClientInvoices(clientUID);
    } catch (error) {
        console.error('Error deleting invoice:', error);
        window.showToast('Error deleting invoice: ' + error.message, 'error');
    }
};

// Feature Request Management Functions
window.updateFeatureRequestStatus = async function(requestId, status) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await updateDoc(doc(db, 'featureRequests', requestId), { status });
        window.showToast('Feature request status updated', 'success');
        // Reload feature requests
        const clientUID = window.currentClientUID;
        if (clientUID) loadClientFeatureRequests(clientUID);
    } catch (error) {
        console.error('Error updating feature request status:', error);
        window.showToast('Error updating status: ' + error.message, 'error');
    }
};

window.deleteFeatureRequest = async function(requestId) {
    if (!confirm('Are you sure you want to delete this feature request? This action cannot be undone.')) return;
    
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await deleteDoc(doc(db, 'featureRequests', requestId));
        window.showToast('Feature request deleted', 'success');
        // Reload feature requests
        const clientUID = window.currentClientUID;
        if (clientUID) loadClientFeatureRequests(clientUID);
    } catch (error) {
        console.error('Error deleting feature request:', error);
        window.showToast('Error deleting feature request: ' + error.message, 'error');
    }
};

// Milestone Management Functions
window.deleteMilestone = async function(milestoneId) {
    if (!confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) return;
    
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await deleteDoc(doc(db, 'milestones', milestoneId));
        window.showToast('Milestone deleted', 'success');
        // Reload milestones
        const clientUID = window.currentClientUID;
        if (clientUID) loadClientMilestones(clientUID);
    } catch (error) {
        console.error('Error deleting milestone:', error);
        window.showToast('Error deleting milestone: ' + error.message, 'error');
    }
};

// Load client files
async function loadClientFiles(clientUID) {
    const storage = window.storage || window.adminStorage;
    if (!storage) {
        console.error('Storage not available');
        const list = document.getElementById('client-files-list');
        if (list) {
            list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">Storage not initialized.</p>';
        }
        return;
    }
    
    const list = document.getElementById('client-files-list');
    if (!list) return;
    
    list.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Load files from Storage (same path as admin-client-portal.js uses)
        const filesRef = ref(storage, `clients/${clientUID}`);
        const result = await listAll(filesRef);
        
        if (result.items.length === 0) {
            list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No files uploaded yet.</p>';
            return;
        }
        
        list.innerHTML = '';
        
        // Load each file's metadata and URL
        for (const itemRef of result.items) {
            try {
                const [url, metadata] = await Promise.all([
                    getDownloadURL(itemRef),
                    getMetadata(itemRef)
                ]);
                
                const fileSize = metadata.size ? formatFileSize(metadata.size) : 'Unknown size';
                const uploadDate = metadata.timeCreated ? new Date(metadata.timeCreated).toLocaleDateString() : 'N/A';
                
                const fileItem = document.createElement('div');
                fileItem.className = 'post-item';
                fileItem.innerHTML = `
                    <div class="stat-icon" style="background: var(--info); opacity: 1;">
                        <i class="fas fa-file" style="color: var(--white); opacity: 1;"></i>
                    </div>
                    <div class="post-content">
                        <div class="post-title">${escapeHtml(itemRef.name)}</div>
                        <div class="post-meta">${fileSize} • ${uploadDate}</div>
                    </div>
                    <a href="${url}" target="_blank" class="btn btn-sm">
                        <i class="fas fa-download"></i> Download
                    </a>
                `;
                list.appendChild(fileItem);
            } catch (fileError) {
                console.warn('Error loading file:', itemRef.name, fileError);
            }
        }
        
        if (list.children.length === 0) {
            list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No accessible files.</p>';
        }
    } catch (error) {
        console.error('Error loading files:', error);
        // If the folder doesn't exist, show empty state
        if (error.code === 'storage/object-not-found' || error.code === 'storage/unauthorized') {
            list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No files uploaded yet.</p>';
        } else {
            list.innerHTML = `<p style="color: var(--danger); text-align: center; padding: var(--space-4);">Error loading files: ${error.message}</p>`;
        }
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Load client milestones
async function loadClientMilestones(clientUID) {
    const db = window.db || window.adminDB;
    if (!db) {
        console.error('Database not available');
        return;
    }
    
    const list = document.getElementById('client-milestones-list');
    if (!list) {
        console.error('client-milestones-list element not found');
        return;
    }
    
    console.log('Loading milestones for client UID:', clientUID);
    
    list.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Try with orderBy first, fallback if index doesn't exist
        let q;
        try {
            q = query(
                collection(db, 'milestones'), 
                where('clientId', '==', clientUID), 
                orderBy('date', 'desc') // Use desc like admin-client-portal.js
            );
        } catch (orderError) {
            console.warn('Index not found, loading without orderBy:', orderError);
            q = query(
                collection(db, 'milestones'), 
                where('clientId', '==', clientUID)
            );
        }
        
        const snapshot = await getDocs(q);
        console.log('Milestones snapshot size:', snapshot.size);
        
        if (snapshot.empty) {
            list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No milestones yet. Click "Add Milestone" to create one.</p>';
            return;
        }
        
        list.innerHTML = '';
        
        // Sort by date if not already ordered
        const milestones = [];
        snapshot.forEach(docSnap => {
            milestones.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Sort by date if not already ordered
        if (!snapshot.query.orderBy) {
            milestones.sort((a, b) => {
                const dateA = a.date?.toDate ? a.date.toDate() : (a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(0));
                const dateB = b.date?.toDate ? b.date.toDate() : (b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(0));
                return dateB - dateA; // Descending
            });
        }
        
        milestones.forEach(milestone => {
            const item = document.createElement('div');
            item.className = 'post-item';
            item.style.cssText = 'padding: var(--space-4); border: 1px solid var(--gray-200); border-left: 4px solid var(--primary); border-radius: var(--radius-lg); margin-bottom: var(--space-3); background: var(--white);';
            
            // Handle date formatting
            let dateStr = 'N/A';
            const milestoneDate = milestone.date || milestone.dueDate;
            if (milestoneDate) {
                if (milestoneDate.toDate) {
                    dateStr = milestoneDate.toDate().toLocaleDateString();
                } else if (milestoneDate.seconds) {
                    dateStr = new Date(milestoneDate.seconds * 1000).toLocaleDateString();
                } else if (milestoneDate instanceof Date) {
                    dateStr = milestoneDate.toLocaleDateString();
                }
            }
            
            // Determine status badge
            let statusBadge = 'warning';
            let statusText = 'pending';
            if (milestone.status === 'completed') {
                statusBadge = 'success';
                statusText = 'completed';
            } else if (milestone.status === 'overdue') {
                statusBadge = 'danger';
                statusText = 'overdue';
            } else if (milestone.status) {
                statusText = milestone.status;
            }
            
            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-2);">
                        <div style="flex: 1;">
                            <div class="post-title" style="font-size: 1.1rem; margin-bottom: var(--space-1);">
                                <i class="fas fa-flag-checkered" style="color: var(--primary); margin-right: var(--space-1);"></i>
                                ${escapeHtml(milestone.title || 'Unnamed Milestone')}
                            </div>
                            <div class="post-meta" style="margin-bottom: var(--space-2);">${escapeHtml(milestone.description || 'No description')}</div>
                            <div style="display: flex; gap: var(--space-3); font-size: 0.875rem; color: var(--gray-600);">
                                <span><i class="fas fa-calendar-alt"></i> Due: ${dateStr}</span>
                            </div>
                        </div>
                        <span class="badge badge-${statusBadge}">${statusText}</span>
                    </div>
                    <div style="display: flex; gap: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--gray-200);">
                        <button class="btn btn-sm" onclick="window.showMilestoneModal('${milestone.id}')" style="background: var(--primary);">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteMilestone('${milestone.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading milestones:', error);
        list.innerHTML = `<p style="color: var(--danger); text-align: center; padding: var(--space-4);">Error loading milestones: ${error.message}</p>`;
    }
}

// Load client feature requests
async function loadClientFeatureRequests(clientId) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const list = document.getElementById('client-feature-requests-list');
    if (!list) return;
    
    list.innerHTML = '<div class="spinner"></div>';
    
    try {
        const q = query(collection(db, 'featureRequests'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No feature requests yet.</p>';
            return;
        }
        
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const feature = docSnap.data();
            const status = feature.status || 'submitted';
            const priority = feature.priority || 'medium';
            const item = document.createElement('div');
            item.className = 'post-item';
            item.style.cssText = 'padding: var(--space-4); border: 1px solid var(--gray-200); border-left: 4px solid var(--primary); border-radius: var(--radius-lg); margin-bottom: var(--space-3); background: var(--white);';
            
            let dateStr = 'N/A';
            if (feature.createdAt) {
                if (feature.createdAt.toDate) {
                    dateStr = feature.createdAt.toDate().toLocaleDateString();
                } else if (feature.createdAt.seconds) {
                    dateStr = new Date(feature.createdAt.seconds * 1000).toLocaleDateString();
                }
            }
            
            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-2); flex-wrap: wrap; gap: var(--space-2);">
                        <div style="flex: 1;">
                            <div class="post-title" style="font-size: 1.1rem; margin-bottom: var(--space-1);">
                                <i class="fas fa-lightbulb" style="color: var(--warning); margin-right: var(--space-1);"></i>
                                ${escapeHtml(feature.title || 'Unnamed Feature')}
                            </div>
                            <div class="post-meta" style="margin-bottom: var(--space-2);">${escapeHtml(feature.description || 'No description')}</div>
                            <div style="display: flex; gap: var(--space-3); font-size: 0.875rem; color: var(--gray-600);">
                                <span><i class="fas fa-calendar"></i> ${dateStr}</span>
                                <span style="padding: 2px 8px; border-radius: 12px; background: ${priority === 'urgent' ? '#dc3545' : priority === 'high' ? '#ffc107' : priority === 'low' ? '#198754' : 'var(--primary)'}; color: white; font-size: 0.75rem; font-weight: 600;">${priority} Priority</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
                            <select class="form-control" style="width: auto; min-width: 150px;" onchange="window.updateFeatureRequestStatus('${docSnap.id}', this.value)">
                                <option value="submitted" ${status === 'submitted' ? 'selected' : ''}>Submitted</option>
                                <option value="reviewing" ${status === 'reviewing' ? 'selected' : ''}>Reviewing</option>
                                <option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option>
                                <option value="in-progress" ${status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                            <button class="btn btn-sm btn-danger" onclick="window.deleteFeatureRequest('${docSnap.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading feature requests:', error);
        list.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No feature requests yet.</p>';
    }
}

// Load client profile
async function loadClientProfile(clientUID) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const profileInfo = document.getElementById('client-profile-info');
    const editHistory = document.getElementById('client-edit-history');
    
    if (!profileInfo) return;
    
    profileInfo.innerHTML = '<div class="spinner"></div>';
    if (editHistory) editHistory.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Query by UID (like admin-client-portal.js)
        const clientQuery = query(collection(db, 'clients'), where('uid', '==', clientUID));
        const clientSnap = await getDocs(clientQuery);
        
        if (clientSnap.empty) {
            profileInfo.innerHTML = '<p style="color: var(--danger);">Client profile not found</p>';
            if (editHistory) editHistory.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No history available</p>';
            return;
        }
        
        const clientDoc = clientSnap.docs[0];
        const client = clientDoc.data();
        
        // Display profile info (matching admin-client-portal.js style)
        profileInfo.innerHTML = `
            <div class="post-item" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-4); padding: var(--space-4);">
                <div>
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-1); font-weight: 600;">Full Name</div>
                    <div style="font-size: 1.125rem; color: var(--gray-900); font-weight: 600;">${escapeHtml(client.name || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-1); font-weight: 600;">Email Address</div>
                    <div style="font-size: 1.125rem; color: var(--gray-900);">${escapeHtml(client.email || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-1); font-weight: 600;">WhatsApp Number</div>
                    <div style="font-size: 1.125rem; color: var(--gray-900); word-break: break-all;">${escapeHtml(client.whatsappNumber || 'Not provided')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-1); font-weight: 600;">Country Code</div>
                    <div style="font-size: 1.125rem; color: var(--gray-900);">${escapeHtml(client.countryCode || 'Not provided')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-1); font-weight: 600;">User ID</div>
                    <div style="font-size: 0.8125rem; color: var(--gray-900); font-family: monospace; word-break: break-all;">${escapeHtml(client.uid || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-1); font-weight: 600;">Registration Date</div>
                    <div style="font-size: 1.125rem; color: var(--gray-900);">${client.createdAt ? new Date(client.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</div>
                </div>
            </div>
        `;
        
        // Load edit history (using clientDoc.id like admin-client-portal.js)
        if (editHistory) {
            try {
                const historyQuery = query(
                    collection(db, 'clientEditHistory'),
                    where('clientDocId', '==', clientDoc.id),
                    orderBy('editedAt', 'desc')
                );
                const historySnap = await getDocs(historyQuery);
                
                if (historySnap.empty) {
                    editHistory.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: var(--space-4);">No edit history yet. Changes made by the client will appear here.</p>';
                } else {
                    editHistory.innerHTML = '';
                    historySnap.forEach(docSnap => {
                        const history = docSnap.data();
                        const item = document.createElement('div');
                        item.className = 'post-item';
                        item.style.cssText = 'padding: var(--space-4); border: 1px solid var(--gray-200); border-left: 3px solid var(--info); border-radius: var(--radius-lg); margin-bottom: var(--space-3); background: var(--white);';
                        item.innerHTML = `
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--gray-900); margin-bottom: var(--space-2);">
                                    <i class="fas fa-edit" style="color: var(--info); margin-right: var(--space-1);"></i> Profile Updated
                                </div>
                                <div style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: var(--space-2);">
                                    <i class="fas fa-clock"></i> ${history.editedAt ? new Date(history.editedAt.seconds * 1000).toLocaleString() : 'Unknown date'}
                                </div>
                                ${history.changes ? `
                                    <div style="background: var(--gray-50); padding: var(--space-3); border-radius: var(--radius); font-size: 0.8125rem;">
                                        <strong>Changes:</strong>
                                        <ul style="margin: var(--space-2) 0 0 var(--space-4); color: var(--gray-600);">
                                            ${Object.entries(history.changes).map(([field, change]) => `
                                                <li style="margin-bottom: var(--space-1);">
                                                    <strong>${field}:</strong> 
                                                    <span style="color: var(--danger); text-decoration: line-through;">${escapeHtml(change.old || 'empty')}</span>
                                                    →
                                                    <span style="color: var(--success);">${escapeHtml(change.new || 'empty')}</span>
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                        editHistory.appendChild(item);
                    });
                }
            } catch (error) {
                console.error('Error loading edit history:', error);
                editHistory.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: var(--space-4);">No edit history available.</p>';
            }
        }
    } catch (error) {
        console.error('Error loading client profile:', error);
        profileInfo.innerHTML = '<p style="color: var(--danger);">Error loading profile</p>';
    }
}

// Initialize when page loads
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.route === '/clients') {
        setTimeout(() => {
            window.loadClients();
            
            // Setup refresh button
            const refreshBtn = document.getElementById('refresh-clients-btn');
            if (refreshBtn && !refreshBtn.dataset.listenerAdded) {
                refreshBtn.dataset.listenerAdded = 'true';
                refreshBtn.addEventListener('click', () => {
                    window.loadClients();
                });
            }
        }, 500);
    }
});

// Fallback: Initialize if page elements exist
let clientsInitialized = false;
function initClientsIfNeeded() {
    if (document.getElementById('clients-list') && !clientsInitialized) {
        clientsInitialized = true;
        setTimeout(() => {
            window.loadClients();
        }, 1500);
    }
}

// Check periodically if clients page needs initialization
setInterval(initClientsIfNeeded, 1000);
initClientsIfNeeded();
