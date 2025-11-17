/**
 * Epplicon Technologies - Admin Client Portal Management
 * Allows admins to manage clients, projects, messages, files, milestones, invoices, and feature requests
 */

import { 
    collection, 
    addDoc, 
    getDocs,
    getDoc,
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    listAll,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';

let db, storage;
let selectedClientId = null;
let selectedClientData = null;
let unsubscribeFunctions = [];

// Declare functions early (will be defined later)
let showInvoiceModal, closeInvoiceModal, loadInvoiceForEdit, handleInvoiceSubmit;

// Initialize global invoice functions early to ensure they're available
window.editInvoice = function(invoiceId) {
    console.log('editInvoice called with ID:', invoiceId);
    if (!invoiceId) {
        console.error('No invoice ID provided');
        return;
    }
    // Call showInvoiceModal directly if available, or through window
    if (typeof showInvoiceModal === 'function') {
        showInvoiceModal(invoiceId);
    } else if (window.showInvoiceModal && typeof window.showInvoiceModal === 'function') {
        window.showInvoiceModal(invoiceId);
    } else {
        console.error('showInvoiceModal function not available');
        alert('Invoice editing is not ready yet. Please refresh the page.');
    }
};

window.updateInvoiceStatus = async function(invoiceId, status) {
    console.log('updateInvoiceStatus called:', invoiceId, status);
    if (!invoiceId || !status) {
        console.error('Missing invoice ID or status');
        return;
    }
    
    if (!db) {
        console.error('Database not initialized');
        if (typeof showToast === 'function') {
            showToast('Database not initialized', 'error');
        } else {
            alert('Database not initialized');
        }
        return;
    }
    
    try {
        await updateDoc(doc(db, 'invoices', invoiceId), { 
            status,
            updatedAt: serverTimestamp()
        });
        if (typeof showToast === 'function') {
            showToast('Invoice status updated', 'success');
        }
    } catch (error) {
        console.error('Error updating invoice status:', error);
        if (typeof showToast === 'function') {
            showToast('Error updating status: ' + error.message, 'error');
        } else {
            alert('Error: ' + error.message);
        }
    }
};

// Initialize
export function initAdminClientPortal(dbInstance, storageInstance) {
    console.log('Initializing Admin Client Portal...');
    
    try {
        // Use the already initialized instances from admin.html
        db = dbInstance;
        storage = storageInstance;
        
        console.log('Firestore and Storage instances received');
        console.log('DB:', db);
        console.log('Storage:', storage);
        
        setupEventListeners();
        loadClients();
        
        console.log('Admin Client Portal initialized successfully');
    } catch (error) {
        console.error('Error initializing Admin Client Portal:', error);
    }
}

function setupEventListeners() {
    // Refresh clients
    document.getElementById('refresh-clients-btn')?.addEventListener('click', loadClients);
    
    // Close client view
    document.getElementById('close-client-view')?.addEventListener('click', () => {
        console.log('Close client view clicked');
        document.getElementById('client-management-view').classList.add('hidden');
        
        // Show clients list card
        const clientsListCard = document.getElementById('clients-list-card');
        if (clientsListCard) {
            clientsListCard.classList.remove('hidden');
        }
        
        selectedClientId = null;
        selectedClientData = null;
        unsubscribeFunctions.forEach(unsub => unsub());
        unsubscribeFunctions = [];
    });

    // Client tabs - use event delegation
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('client-tab-btn') || e.target.closest('.client-tab-btn')) {
            const btn = e.target.classList.contains('client-tab-btn') ? e.target : e.target.closest('.client-tab-btn');
            const tabName = btn.dataset.tab;
            
            console.log('Tab clicked:', tabName);
            
            // Update active states
            document.querySelectorAll('.client-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.client-tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = document.getElementById(`client-tab-${tabName.replace('client-', '')}`);
            if (targetTab) {
                targetTab.classList.add('active');
            } else {
                console.error('Tab not found:', `client-tab-${tabName.replace('client-', '')}`);
            }
            
            // Load tab data
            loadClientTabData(tabName);
        }
    });

    // Create project
    document.getElementById('create-project-btn')?.addEventListener('click', showCreateProjectModal);
    
    // Create milestone
    document.getElementById('create-milestone-btn')?.addEventListener('click', showCreateMilestoneModal);
    
    // Create invoice
    document.getElementById('create-invoice-btn')?.addEventListener('click', () => showInvoiceModal());
    
    // Invoice modal handlers - use event delegation to ensure they work
    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'invoice-modal-close' || e.target.closest('#invoice-modal-close'))) {
            e.preventDefault();
            closeInvoiceModal();
        }
        if (e.target && (e.target.id === 'invoice-modal-cancel' || e.target.closest('#invoice-modal-cancel'))) {
            e.preventDefault();
            closeInvoiceModal();
        }
    });
    
    // Invoice form submit handler - use event delegation since form might not exist yet
    document.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'invoice-form') {
            e.preventDefault();
            if (handleInvoiceSubmit) {
                handleInvoiceSubmit(e);
            } else if (window.handleInvoiceSubmit) {
                window.handleInvoiceSubmit(e);
            } else {
                console.error('handleInvoiceSubmit not available');
            }
        }
    });
    
    // Invoice filters
    document.getElementById('invoice-status-filter')?.addEventListener('change', filterInvoices);
    document.getElementById('invoice-search')?.addEventListener('input', filterInvoices);
    
    // Message search and filters
    document.getElementById('message-search-input')?.addEventListener('input', filterMessages);
    document.getElementById('message-filter')?.addEventListener('change', filterMessages);
    document.getElementById('clear-messages-btn')?.addEventListener('click', clearMessagesView);
    
    // Upload file
    document.getElementById('admin-upload-file-btn')?.addEventListener('click', () => {
        document.getElementById('admin-upload-file').click();
    });
    document.getElementById('admin-upload-file')?.addEventListener('change', handleFileUpload);
    
    // Send message - Use event delegation to ensure it works even after tab switch
    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'admin-send-message-btn' || e.target.closest('#admin-send-message-btn'))) {
            e.preventDefault();
            sendAdminMessage();
        }
    });
    
    document.addEventListener('keypress', (e) => {
        if (e.target && e.target.id === 'admin-chat-input' && e.key === 'Enter') {
            e.preventDefault();
            sendAdminMessage();
        }
    });
}

// --- LOAD CLIENTS ---
async function loadClients() {
    const container = document.getElementById('clients-list');
    if (!container) {
        console.error('clients-list container not found');
        return;
    }
    
    container.innerHTML = '<div class="spinner"></div>';

    try {
        console.log('Loading clients from Firestore...');
        console.log('DB instance:', db);
        
        if (!db) {
            container.innerHTML = '<p class="text-danger">Database not initialized</p>';
            console.error('Firestore db is null or undefined');
            return;
        }
        
        // Try to load without orderBy first (in case index doesn't exist)
        let snapshot;
        try {
            const clientsQuery = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
            snapshot = await getDocs(clientsQuery);
        } catch (indexError) {
            console.warn('Index not found, loading without orderBy:', indexError);
            // Fallback: load without orderBy
            snapshot = await getDocs(collection(db, 'clients'));
        }
        
        console.log('Clients loaded:', snapshot.size);
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-users" style="font-size: 3rem; color: var(--text-secondary); opacity: 0.3;"></i>
                    <p>No clients found. Clients will appear here after they register.</p>
                    <a href="client-portal.html" target="_blank" class="btn" style="margin-top: 1rem;">
                        Open Client Portal
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const client = { id: doc.id, ...doc.data() };
            container.appendChild(createClientCard(client));
        });
    } catch (error) {
        container.innerHTML = `
            <div style="padding: 1rem;">
                <p class="text-danger">Error loading clients: ${error.message}</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">
                    Please ensure:
                    <ul>
                        <li>Firebase security rules are applied</li>
                        <li>You're logged in as an admin (author)</li>
                        <li>Your admin account exists in the 'authors' collection</li>
                    </ul>
                </p>
                <button onclick="location.reload()" class="btn">Reload Page</button>
            </div>
        `;
        console.error('Error loading clients:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            name: error.name
        });
    }
}

function createClientCard(client) {
    const card = document.createElement('div');
    card.style.cssText = 'padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s;';
    card.style.cssText += 'display: flex; justify-content: space-between; align-items: center;';
    
    card.addEventListener('mouseenter', () => {
        card.style.background = 'var(--background-color)';
        card.style.transform = 'translateX(5px)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.background = 'transparent';
        card.style.transform = 'translateX(0)';
    });
    
    card.innerHTML = `
        <div>
            <h3 style="margin: 0 0 0.5rem 0;">${escapeHtml(client.name || 'Unknown')}</h3>
            <p style="margin: 0; color: var(--text-secondary);">${escapeHtml(client.email || '')}</p>
            ${client.company ? `<p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;"><i class="fas fa-building"></i> ${escapeHtml(client.company)}</p>` : ''}
        </div>
        <button class="btn" onclick="window.selectClient('${client.id}', '${escapeHtml(client.name)}', '${escapeHtml(client.email)}')">
            <i class="fas fa-arrow-right"></i> Manage
        </button>
    `;
    
    return card;
}

// Make selectClient available globally
window.selectClient = async function(clientId, name, email) {
    console.log('=== SELECT CLIENT ===');
    console.log('Document ID:', clientId);
    console.log('Name:', name);
    console.log('Email:', email);
    
    // Get the full client data to get the UID
    try {
        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            selectedClientId = clientData.uid; // Use the UID, not the document ID!
            selectedClientData = { 
                name, 
                email, 
                uid: clientData.uid, 
                whatsappNumber: clientData.whatsappNumber || 'Not provided',
                countryCode: clientData.countryCode || 'Not provided',
                createdAt: clientData.createdAt,
                ...clientData
            };
            
            console.log('Client UID (for queries):', selectedClientId);
            console.log('Client data:', clientData);
            
            // Update header info
            document.getElementById('selected-client-name').textContent = name;
            
            // Update detailed info
            const emailEl = document.getElementById('selected-client-email');
            if (emailEl) {
                emailEl.innerHTML = `<i class="fas fa-envelope" style="color: var(--primary); margin-right: var(--space-1);"></i>${email}`;
            }
            
            const whatsappEl = document.getElementById('selected-client-whatsapp');
            if (whatsappEl) {
                const whatsappNum = clientData.whatsappNumber || 'Not provided';
                whatsappEl.innerHTML = `<i class="fab fa-whatsapp" style="color: #25D366; margin-right: var(--space-1);"></i><span>${whatsappNum}</span>`;
            }
            
            const countryEl = document.getElementById('selected-client-country');
            if (countryEl) {
                const countryCode = clientData.countryCode || 'Not provided';
                countryEl.innerHTML = `<i class="fas fa-globe" style="color: var(--info); margin-right: var(--space-1);"></i><span>${countryCode}</span>`;
            }
            
            const joinedEl = document.getElementById('selected-client-joined');
            if (joinedEl) {
                const joinDate = clientData.createdAt ? new Date(clientData.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown';
                joinedEl.innerHTML = `<i class="fas fa-calendar" style="color: var(--success); margin-right: var(--space-1);"></i><span>${joinDate}</span>`;
            }
            
            document.getElementById('client-management-view').classList.remove('hidden');
            
            // Load initial tab data
            loadClientTabData('client-projects');
        } else {
            console.error('Client document not found');
            alert('Error loading client data');
        }
    } catch (error) {
        console.error('Error loading client:', error);
        alert('Error loading client data: ' + error.message);
    }
};

// --- CLIENT TAB DATA ---
function loadClientTabData(tabName) {
    if (!selectedClientId) {
        console.error('No client selected');
        return;
    }

    console.log('Loading tab data:', tabName, 'for client:', selectedClientId);

    switch(tabName) {
        case 'client-projects':
            loadClientProjects();
            break;
        case 'client-messages':
            loadClientMessages();
            break;
        case 'client-files':
            loadClientFiles();
            break;
        case 'client-milestones':
            loadClientMilestones();
            break;
        case 'client-invoices':
            loadClientInvoices();
            break;
        case 'client-features':
            loadClientFeatureRequests();
            break;
        case 'client-profile':
            loadClientProfile();
            break;
    }
}

// --- PROJECTS ---
async function loadClientProjects() {
    const container = document.getElementById('client-projects-list');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const projectsQuery = query(
            collection(db, 'projects'),
            where('clientId', '==', selectedClientId),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<p>No projects found</p>';
                return;
            }

            container.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const project = { id: doc.id, ...doc.data() };
                container.appendChild(createProjectCard(project));
            });
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Error loading projects</p>';
        console.error('Error loading projects:', error);
    }
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.style.cssText = 'padding: 2rem; border: 2px solid var(--border-color); border-radius: 16px; margin-bottom: 1.5rem; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: all 0.3s;';
    
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
        this.style.borderColor = 'var(--primary-color)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        this.style.borderColor = 'var(--border-color)';
    });
    
    const progress = project.progress || 0;
    const status = project.status || 'pending';
    const statusColors = {
        'pending': '#ffc107',
        'active': 'var(--primary-color)',
        'in-progress': 'var(--primary-color)',
        'on-hold': '#dc3545',
        'completed': '#198754'
    };
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 1rem;">
            <div style="flex: 1;">
                <h4 style="margin: 0 0 0.75rem 0; font-size: 1.3rem; color: var(--text-primary); font-weight: 700;">
                    <i class="fas fa-project-diagram" style="color: var(--primary-color); margin-right: 0.5rem;"></i>
                    ${escapeHtml(project.name || 'Untitled Project')}
                </h4>
                <p style="margin: 0; color: var(--text-secondary); line-height: 1.6;">${escapeHtml(project.description || 'No description provided')}</p>
            </div>
            <select class="form-control" style="width: auto; min-width: 150px; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 10px; font-weight: 600;" onchange="window.updateProjectStatus('${project.id}', this.value)">
                <option value="pending" ${status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="active" ${status === 'active' ? 'selected' : ''}>✅ Active</option>
                <option value="in-progress" ${status === 'in-progress' ? 'selected' : ''}>🚀 In Progress</option>
                <option value="on-hold" ${status === 'on-hold' ? 'selected' : ''}>⏸️ On Hold</option>
                <option value="completed" ${status === 'completed' ? 'selected' : ''}>🎉 Completed</option>
            </select>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-weight: 600; color: var(--text-primary);">
                <span><i class="fas fa-chart-line"></i> Progress</span>
                <span style="color: var(--primary-color); font-size: 1.1rem;">${progress}%</span>
            </div>
            <div style="width: 100%; height: 14px; background: var(--background-color); border-radius: 10px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                <div style="width: ${progress}%; height: 100%; background: ${statusColors[status] || statusColors.pending}; transition: width 0.5s ease; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"></div>
            </div>
        </div>
        <div style="display: flex; gap: 1rem; align-items: center; padding-top: 1.5rem; border-top: 2px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                <input type="number" class="form-control" style="width: 120px; padding: 10px; border: 2px solid var(--border-color); border-radius: 8px; font-weight: 600;" min="0" max="100" value="${progress}" 
                       onchange="window.updateProjectProgress('${project.id}', this.value)">
                <span style="font-weight: 600; color: var(--text-secondary);">%</span>
            </div>
            <button class="btn btn-danger" onclick="window.deleteProject('${project.id}')" style="padding: 10px 20px; border-radius: 10px;">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

window.updateProjectStatus = async function(projectId, status) {
    try {
        await updateDoc(doc(db, 'projects', projectId), { status });
        showToast('Project status updated', 'success');
    } catch (error) {
        showToast('Error updating status', 'error');
        console.error(error);
    }
};

window.updateProjectProgress = async function(projectId, progress) {
    try {
        await updateDoc(doc(db, 'projects', projectId), { progress: parseInt(progress) });
        showToast('Project progress updated', 'success');
    } catch (error) {
        showToast('Error updating progress', 'error');
        console.error(error);
    }
};

window.deleteProject = async function(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        await deleteDoc(doc(db, 'projects', projectId));
        showToast('Project deleted', 'success');
    } catch (error) {
        showToast('Error deleting project', 'error');
        console.error(error);
    }
};

function showCreateProjectModal() {
    const name = prompt('Project Name:');
    if (!name) return;
    
    const description = prompt('Project Description:');
    const progress = parseInt(prompt('Initial Progress (0-100):', '0')) || 0;
    const status = prompt('Status (pending/active/in-progress/on-hold/completed):', 'pending') || 'pending';
    
    createProject(name, description, progress, status);
}

async function createProject(name, description, progress, status) {
    try {
        console.log('Creating project for client UID:', selectedClientId);
        
        const projectData = {
            clientId: selectedClientId,
            name,
            description: description || '',
            progress: Math.max(0, Math.min(100, progress)),
            status,
            createdAt: serverTimestamp()
        };
        
        console.log('Project data:', projectData);
        
        const docRef = await addDoc(collection(db, 'projects'), projectData);
        console.log('Project created with ID:', docRef.id);
        
        showToast('Project created successfully', 'success');
    } catch (error) {
        showToast('Error creating project', 'error');
        console.error('Error creating project:', error);
    }
}

// --- MESSAGES ---
function loadClientMessages() {
    const container = document.getElementById('admin-chat-messages');
    if (!container) {
        console.error('admin-chat-messages container not found');
        return;
    }
    
    container.innerHTML = '<div class="spinner"></div>';

    try {
        console.log('Loading messages for client:', selectedClientId);
        
        // Try with orderBy first
        let messagesQuery;
        try {
            messagesQuery = query(
                collection(db, 'messages'),
                where('clientId', '==', selectedClientId),
                orderBy('timestamp', 'asc')
            );
        } catch (indexError) {
            console.warn('Index not found, loading without orderBy');
            messagesQuery = query(
                collection(db, 'messages'),
                where('clientId', '==', selectedClientId)
            );
        }

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            console.log('Messages snapshot received, size:', snapshot.size);
            container.innerHTML = '';
            allMessages = [];
            
            if (snapshot.empty) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: var(--spacing-xl);"><i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3; margin-bottom: var(--spacing-md);"></i><p>No messages yet. Start the conversation!</p></div>';
                return;
            }

            snapshot.docs.forEach(doc => {
                const message = { id: doc.id, ...doc.data() };
                console.log('Message:', message);
                allMessages.push(message);
                container.appendChild(createMessageElement(message));
            });

            // Mark messages as read
            snapshot.docs.forEach(doc => {
                if (!doc.data().read) {
                    updateDoc(doc.ref, { read: true }).catch(err => console.error('Error marking as read:', err));
                }
            });

            // Auto-scroll to bottom
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }, (error) => {
            console.error('Messages snapshot error:', error);
            container.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = `<p class="text-danger">Error loading messages: ${error.message}</p>`;
        console.error('Error loading messages:', error);
    }
}

let allMessages = [];
let filteredMessages = [];

function createMessageElement(message) {
    const isAdmin = message.senderId === 'admin';
    const div = document.createElement('div');
    div.className = `message-item ${isAdmin ? 'admin' : 'client'}`;
    div.dataset.messageId = message.id;
    div.dataset.sender = isAdmin ? 'admin' : 'client';
    div.dataset.searchText = (message.text || '').toLowerCase();
    
    const senderInitial = isAdmin ? 'A' : (selectedClientData?.name?.charAt(0).toUpperCase() || 'C');
    const senderName = isAdmin ? 'Admin' : (selectedClientData?.name || 'Client');
    
    div.innerHTML = `
        <div class="client-avatar" style="width: 40px; height: 40px; font-size: 1rem;">
            ${senderInitial}
        </div>
        <div class="message-bubble">
            <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; opacity: 0.8;">
                ${senderName}
            </div>
            <div style="line-height: 1.6; word-wrap: break-word;">${escapeHtml(message.text || '')}</div>
            <div class="message-time">
                <i class="fas fa-clock" style="font-size: 0.65rem; margin-right: 0.25rem;"></i>
                ${formatDate(message.timestamp?.toDate() || new Date())}
                ${message.read ? '<i class="fas fa-check-double" style="color: var(--primary-color); margin-left: 0.5rem;"></i>' : ''}
            </div>
        </div>
    `;
    
    return div;
}

function filterMessages() {
    const searchTerm = (document.getElementById('message-search-input')?.value || '').toLowerCase();
    const filterType = document.getElementById('message-filter')?.value || 'all';
    const container = document.getElementById('admin-chat-messages');
    
    if (!container) return;
    
    const messages = Array.from(container.querySelectorAll('.message-item'));
    
    messages.forEach(msg => {
        const searchText = msg.dataset.searchText || '';
        const sender = msg.dataset.sender || '';
        
        const matchesSearch = !searchTerm || searchText.includes(searchTerm);
        const matchesFilter = filterType === 'all' || 
                           (filterType === 'admin' && sender === 'admin') ||
                           (filterType === 'client' && sender === 'client');
        
        if (matchesSearch && matchesFilter) {
            msg.style.display = 'flex';
        } else {
            msg.style.display = 'none';
        }
    });
    
    // Show empty state if no messages visible
    const visibleMessages = messages.filter(m => m.style.display !== 'none');
    let emptyState = container.querySelector('.empty-message-state');
    
    if (visibleMessages.length === 0 && messages.length > 0) {
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'empty-message-state';
            emptyState.style.cssText = 'text-align: center; color: var(--text-muted); padding: var(--spacing-xl); grid-column: 1 / -1;';
            emptyState.innerHTML = '<i class="fas fa-search" style="font-size: 2rem; opacity: 0.3; margin-bottom: var(--spacing-md);"></i><p>No messages match your search</p>';
            container.appendChild(emptyState);
        }
    } else if (emptyState) {
        emptyState.remove();
    }
}

function clearMessagesView() {
    const container = document.getElementById('admin-chat-messages');
    if (container && confirm('Clear all messages from view? (This does not delete them)')) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: var(--spacing-xl);"><i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3; margin-bottom: var(--spacing-md);"></i><p>No messages yet. Start the conversation!</p></div>';
    }
}

async function sendAdminMessage() {
    const input = document.getElementById('admin-chat-input');
    const text = input.value.trim();
    
    if (!text || !selectedClientId) {
        console.error('Cannot send message: text or clientId missing');
        return;
    }

    try {
        console.log('Sending message to client UID:', selectedClientId);
        
        const messageData = {
            clientId: selectedClientId,
            senderId: 'admin',
            text: text,
            read: false,
            timestamp: serverTimestamp()
        };
        
        console.log('Message data:', messageData);
        
        const docRef = await addDoc(collection(db, 'messages'), messageData);
        console.log('Message sent with ID:', docRef.id);
        
        input.value = '';
        showToast('Message sent!', 'success');
    } catch (error) {
        showToast('Error sending message', 'error');
        console.error('Error sending message:', error);
    }
}

// --- FILES ---
async function loadClientFiles() {
    const container = document.getElementById('client-files-list');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const filesRef = ref(storage, `clients/${selectedClientId}`);
        const filesList = await listAll(filesRef);
        
        if (filesList.items.length === 0) {
            container.innerHTML = '<p>No files found</p>';
            return;
        }

        container.innerHTML = '';
        for (const fileRef of filesList.items) {
            const url = await getDownloadURL(fileRef);
            const fileName = fileRef.name;
            
            const fileItem = document.createElement('div');
            fileItem.style.cssText = 'padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;';
            fileItem.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <i class="fas fa-file" style="font-size: 1.5rem; color: var(--primary-color);"></i>
                    <span>${escapeHtml(fileName)}</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${url}" target="_blank" class="btn btn-secondary" style="padding: 8px 12px;">
                        <i class="fas fa-download"></i>
                    </a>
                    <button class="btn btn-danger" style="padding: 8px 12px;" onclick="window.deleteClientFile('${fileRef.fullPath}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(fileItem);
        }
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Error loading files</p>';
        console.error('Error loading files:', error);
    }
}

window.deleteClientFile = async function(filePath) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
        showToast('File deleted', 'success');
        loadClientFiles();
    } catch (error) {
        showToast('Error deleting file', 'error');
        console.error(error);
    }
};

async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length || !selectedClientId) return;

    for (const file of files) {
        try {
            const fileRef = ref(storage, `clients/${selectedClientId}/${file.name}`);
            await uploadBytes(fileRef, file);
            showToast(`File "${file.name}" uploaded successfully!`, 'success');
            loadClientFiles();
        } catch (error) {
            showToast(`Error uploading "${file.name}"`, 'error');
            console.error('Upload error:', error);
        }
    }
    
    e.target.value = '';
}

// --- MILESTONES ---
async function loadClientMilestones() {
    const container = document.getElementById('client-milestones-list');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const milestonesQuery = query(
            collection(db, 'milestones'),
            where('clientId', '==', selectedClientId),
            orderBy('date', 'desc')
        );
        
        const unsubscribe = onSnapshot(milestonesQuery, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<p>No milestones found</p>';
                return;
            }

            container.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const milestone = { id: doc.id, ...doc.data() };
                container.appendChild(createMilestoneCard(milestone));
            });
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Error loading milestones</p>';
        console.error('Error loading milestones:', error);
    }
}

function createMilestoneCard(milestone) {
    const card = document.createElement('div');
    card.style.cssText = 'padding: 2rem; border: 2px solid var(--border-color); border-radius: 16px; margin-bottom: 1.5rem; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: all 0.3s; position: relative; overflow: hidden;';
    
    card.style.borderLeft = '5px solid var(--primary-color)';
    
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(8px)';
        this.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(0)';
        this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
    });
    
    const date = milestone.date?.toDate() || new Date();
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem;">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--primary-color); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 15px rgba(13, 110, 253, 0.3);">
                        <i class="fas fa-flag-checkered"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 0.25rem 0; font-size: 1.2rem; color: var(--text-primary); font-weight: 700;">
                            ${escapeHtml(milestone.title || 'Milestone')}
                        </h4>
                    </div>
                </div>
                <p style="margin: 0 0 1rem 0; color: var(--text-secondary); line-height: 1.6; padding-left: 65px;">
                    ${escapeHtml(milestone.description || 'No description provided')}
                </p>
                <div style="padding-left: 65px; display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-weight: 600;">
                    <i class="fas fa-calendar-alt" style="color: var(--primary-color);"></i>
                    <span>${formatDate(date)}</span>
                </div>
            </div>
            <button class="btn btn-danger" onclick="window.deleteMilestone('${milestone.id}')" style="padding: 10px 16px; border-radius: 10px; align-self: flex-start;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return card;
}

window.deleteMilestone = async function(milestoneId) {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    
    try {
        await deleteDoc(doc(db, 'milestones', milestoneId));
        showToast('Milestone deleted', 'success');
    } catch (error) {
        showToast('Error deleting milestone', 'error');
        console.error(error);
    }
};

function showCreateMilestoneModal() {
    const title = prompt('Milestone Title:');
    if (!title) return;
    
    const description = prompt('Milestone Description:');
    const dateStr = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    const date = dateStr ? new Date(dateStr) : new Date();
    
    createMilestone(title, description, date);
}

async function createMilestone(title, description, date) {
    try {
        console.log('Creating milestone for client UID:', selectedClientId);
        
        const milestoneData = {
            clientId: selectedClientId,
            title,
            description: description || '',
            date: date,
            createdAt: serverTimestamp()
        };
        
        console.log('Milestone data:', milestoneData);
        
        const docRef = await addDoc(collection(db, 'milestones'), milestoneData);
        console.log('Milestone created with ID:', docRef.id);
        
        showToast('Milestone created successfully', 'success');
    } catch (error) {
        showToast('Error creating milestone', 'error');
        console.error('Error creating milestone:', error);
    }
}

// --- INVOICES ---
async function loadClientInvoices() {
    const container = document.getElementById('client-invoices-list');
    if (!container) {
        console.error('client-invoices-list container not found');
        return;
    }
    
    container.innerHTML = '<div class="spinner"></div>';

    try {
        console.log('Loading invoices for client:', selectedClientId);
        
        // Try with orderBy first
        let invoicesQuery;
        try {
            invoicesQuery = query(
                collection(db, 'invoices'),
                where('clientId', '==', selectedClientId),
                orderBy('date', 'desc')
            );
        } catch (indexError) {
            console.warn('Index not found, loading without orderBy');
            invoicesQuery = query(
                collection(db, 'invoices'),
                where('clientId', '==', selectedClientId)
            );
        }
        
        const unsubscribe = onSnapshot(invoicesQuery, (snapshot) => {
            console.log('Invoices snapshot received, size:', snapshot.size);
            
            if (snapshot.empty) {
                container.innerHTML = '<p>No invoices found. Create one using the button above.</p>';
                return;
            }

            container.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const invoice = { id: doc.id, ...doc.data() };
                console.log('Invoice:', invoice);
                container.appendChild(createInvoiceCard(invoice));
            });
        }, (error) => {
            console.error('Invoices snapshot error:', error);
            container.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = `<p class="text-danger">Error loading invoices: ${error.message}</p>`;
        console.error('Error loading invoices:', error);
    }
}

function createInvoiceCard(invoice) {
    const card = document.createElement('div');
    card.className = 'invoice-card';
    card.dataset.invoiceId = invoice.id;
    card.dataset.status = invoice.status || 'pending';
    card.dataset.searchText = `${invoice.invoiceNumber || ''} ${invoice.projectName || ''}`.toLowerCase();
    
    const date = invoice.date?.toDate() || new Date();
    const status = invoice.status || 'pending';
    const amount = invoice.amount || 0;
    
    const statusClass = `invoice-status-${status}`;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    card.innerHTML = `
        <div class="invoice-header">
            <div style="display: flex; align-items: center; gap: var(--spacing-md); flex: 1;">
                <div class="invoice-icon">
                    <i class="fas fa-file-invoice-dollar"></i>
                </div>
                <div class="invoice-info">
                    <div class="invoice-number">Invoice #${escapeHtml(invoice.invoiceNumber || invoice.id.substring(0, 8))}</div>
                    <div class="invoice-meta">
                        <span><i class="fas fa-calendar-alt" style="color: var(--primary-color); margin-right: 0.5rem;"></i>${formatDate(date)}</span>
                        <span><i class="fas fa-tag" style="color: var(--primary-color); margin-right: 0.5rem;"></i>${escapeHtml(invoice.projectName || 'General')}</span>
                    </div>
                </div>
            </div>
            <div class="invoice-amount">
                <div class="invoice-amount-value">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <span class="invoice-status-badge ${statusClass}">${statusText}</span>
            </div>
        </div>
        ${invoice.notes ? `<div style="padding: var(--spacing-md); background: var(--gray-50); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</div>` : ''}
        <div class="invoice-actions">
            <button class="btn btn-inline pdf-download-btn" data-invoice-id="${invoice.id}" style="background: #e74c3c;">
                <i class="fas fa-file-pdf"></i> Download PDF
            </button>
            <button class="btn btn-inline" onclick="window.editInvoice('${invoice.id}')" style="background: var(--primary-color);">
                <i class="fas fa-edit"></i> Edit
            </button>
            ${status !== 'pending' ? `
                <button class="btn btn-inline" onclick="window.updateInvoiceStatus('${invoice.id}', 'pending')" style="background: var(--warning-color);">
                    <i class="fas fa-clock"></i> Mark Pending
                </button>
            ` : ''}
            ${status !== 'paid' ? `
                <button class="btn btn-inline" onclick="window.updateInvoiceStatus('${invoice.id}', 'paid')" style="background: var(--success-color);">
                    <i class="fas fa-check"></i> Mark Paid
                </button>
            ` : ''}
            ${status !== 'overdue' ? `
                <button class="btn btn-inline" onclick="window.updateInvoiceStatus('${invoice.id}', 'overdue')" style="background: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle"></i> Mark Overdue
                </button>
            ` : ''}
            ${invoice.downloadUrl ? `
                <a href="${invoice.downloadUrl}" target="_blank" class="btn btn-inline" style="background: var(--info-color);">
                    <i class="fas fa-download"></i> Attachment
                </a>
            ` : ''}
            <button class="btn btn-danger btn-inline" onclick="window.deleteInvoice('${invoice.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    // Add event listener for PDF download
    const pdfBtn = card.querySelector('.pdf-download-btn');
    if (pdfBtn) {
        console.log('✅ Admin: PDF button found for invoice:', invoice.id);
        pdfBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('🖱️ Admin: PDF button clicked for invoice:', invoice);
            
            if (typeof window.generateInvoicePDF !== 'function') {
                console.error('❌ generateInvoicePDF is not available!');
                alert('PDF generator not loaded. Please refresh the page.');
                return;
            }
            
            await window.generateInvoicePDF(invoice, pdfBtn);
        });
    } else {
        console.warn('⚠️ Admin: PDF button NOT found for invoice:', invoice.id);
    }
    
    return card;
}

// Invoice Modal Functions
showInvoiceModal = function(invoiceId = null) {
    const modal = document.getElementById('invoice-modal');
    const title = document.getElementById('invoice-modal-title');
    const form = document.getElementById('invoice-form');
    
    if (!modal) {
        console.error('Invoice modal not found');
        return;
    }
    
    if (invoiceId) {
        // Edit mode - load invoice data
        title.textContent = 'Edit Invoice';
        loadInvoiceForEdit(invoiceId);
    } else {
        // Create mode
        title.textContent = 'Create Invoice';
        if (form) form.reset();
        const editIdInput = document.getElementById('invoice-edit-id');
        const dateInput = document.getElementById('invoice-date');
        const numberInput = document.getElementById('invoice-number');
        
        if (editIdInput) editIdInput.value = '';
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        if (numberInput) numberInput.value = `INV-${Date.now()}`;
    }
    
    modal.classList.remove('hidden');
}

closeInvoiceModal = function() {
    const modal = document.getElementById('invoice-modal');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.getElementById('invoice-form');
        if (form) form.reset();
    }
}

// Make functions globally accessible
window.showInvoiceModal = showInvoiceModal;
window.closeInvoiceModal = closeInvoiceModal;
window.handleInvoiceSubmit = handleInvoiceSubmit;
window.editInvoice = function(invoiceId) {
    console.log('window.editInvoice called with:', invoiceId);
    if (showInvoiceModal) {
        showInvoiceModal(invoiceId);
    } else if (window.showInvoiceModal) {
        window.showInvoiceModal(invoiceId);
    } else {
        console.error('showInvoiceModal not available');
        alert('Invoice editing feature is loading. Please try again in a moment.');
    }
};

loadInvoiceForEdit = async function(invoiceId) {
    try {
        const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));
        if (!invoiceDoc.exists()) {
            showToast('Invoice not found', 'error');
            closeInvoiceModal();
            return;
        }
        
        const invoice = invoiceDoc.data();
        let invoiceDate = new Date();
        
        // Handle Firestore Timestamp or Date object
        if (invoice.date) {
            if (invoice.date.toDate) {
                invoiceDate = invoice.date.toDate();
            } else if (invoice.date instanceof Date) {
                invoiceDate = invoice.date;
            } else if (invoice.date.seconds) {
                invoiceDate = new Date(invoice.date.seconds * 1000);
            }
        }
        
        const editIdInput = document.getElementById('invoice-edit-id');
        const numberInput = document.getElementById('invoice-number');
        const dateInput = document.getElementById('invoice-date');
        const projectInput = document.getElementById('invoice-project');
        const amountInput = document.getElementById('invoice-amount');
        const statusInput = document.getElementById('invoice-status');
        const notesInput = document.getElementById('invoice-notes');
        
        if (editIdInput) editIdInput.value = invoiceId;
        if (numberInput) numberInput.value = invoice.invoiceNumber || '';
        if (dateInput) dateInput.value = invoiceDate.toISOString().split('T')[0];
        if (projectInput) projectInput.value = invoice.projectName || '';
        if (amountInput) amountInput.value = invoice.amount || 0;
        if (statusInput) statusInput.value = invoice.status || 'pending';
        if (notesInput) notesInput.value = invoice.notes || '';
    } catch (error) {
        console.error('Error loading invoice:', error);
        showToast('Error loading invoice: ' + error.message, 'error');
        closeInvoiceModal();
    }
}

handleInvoiceSubmit = async function(e) {
    e.preventDefault();
    console.log('handleInvoiceSubmit called');
    
    const invoiceId = document.getElementById('invoice-edit-id')?.value;
    const invoiceNumber = document.getElementById('invoice-number')?.value.trim();
    const invoiceDate = document.getElementById('invoice-date')?.value;
    const projectName = document.getElementById('invoice-project')?.value.trim();
    const amount = parseFloat(document.getElementById('invoice-amount')?.value) || 0;
    const status = document.getElementById('invoice-status')?.value;
    const notes = document.getElementById('invoice-notes')?.value.trim();
    
    console.log('Invoice form data:', { invoiceId, invoiceNumber, invoiceDate, projectName, amount, status });
    
    if (!invoiceNumber || !projectName || !invoiceDate) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!selectedClientId) {
        showToast('No client selected', 'error');
        console.error('selectedClientId is null');
        return;
    }
    
    const saveBtn = document.getElementById('invoice-modal-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    
    try {
        // Convert date string to Date object
        const dateObj = new Date(invoiceDate);
        if (isNaN(dateObj.getTime())) {
            showToast('Invalid date format', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
            }
            return;
        }
        
        const invoiceData = {
            invoiceNumber,
            projectName,
            amount: parseFloat(amount),
            date: dateObj,
            status,
            notes: notes || null,
            updatedAt: serverTimestamp()
        };
        
        console.log('Saving invoice with data:', invoiceData);
        
        if (invoiceId) {
            // Update existing invoice
            console.log('Updating invoice:', invoiceId);
            await updateDoc(doc(db, 'invoices', invoiceId), invoiceData);
            showToast('Invoice updated successfully', 'success');
        } else {
            // Create new invoice
            console.log('Creating new invoice for client:', selectedClientId);
            invoiceData.clientId = selectedClientId;
            invoiceData.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
            console.log('Invoice created with ID:', docRef.id);
            showToast('Invoice created successfully', 'success');
        }
        
        closeInvoiceModal();
        // The onSnapshot listener will automatically update the list
    } catch (error) {
        showToast('Error saving invoice: ' + error.message, 'error');
        console.error('Error saving invoice:', error);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';
        }
    }
}

function filterInvoices() {
    const statusFilter = document.getElementById('invoice-status-filter')?.value || 'all';
    const searchTerm = (document.getElementById('invoice-search')?.value || '').toLowerCase();
    const container = document.getElementById('client-invoices-list');
    
    if (!container) return;
    
    const invoices = Array.from(container.querySelectorAll('.invoice-card'));
    
    invoices.forEach(card => {
        const status = card.dataset.status || '';
        const searchText = card.dataset.searchText || '';
        
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesSearch = !searchTerm || searchText.includes(searchTerm);
        
        if (matchesStatus && matchesSearch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// These are redefined later but kept here for early availability
// The later definitions will override these

window.deleteInvoice = async function(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    
    try {
        await deleteDoc(doc(db, 'invoices', invoiceId));
        showToast('Invoice deleted', 'success');
    } catch (error) {
        showToast('Error deleting invoice', 'error');
        console.error(error);
    }
};

// --- FEATURE REQUESTS ---
async function loadClientFeatureRequests() {
    const container = document.getElementById('client-feature-requests-list');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const requestsQuery = query(
            collection(db, 'featureRequests'),
            where('clientId', '==', selectedClientId),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<p>No feature requests found</p>';
                return;
            }

            container.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const request = { id: doc.id, ...doc.data() };
                container.appendChild(createFeatureRequestCard(request));
            });
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Error loading feature requests</p>';
        console.error('Error loading feature requests:', error);
    }
}

function createFeatureRequestCard(request) {
    const card = document.createElement('div');
    card.style.cssText = 'padding: 2rem; border: 2px solid var(--border-color); border-radius: 16px; margin-bottom: 1.5rem; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: all 0.3s;';
    
    card.style.borderLeft = '5px solid var(--primary-color)';
    
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(8px)';
        this.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(0)';
        this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
    });
    
    const priority = request.priority || 'medium';
    const date = request.createdAt?.toDate() || new Date();
    const status = request.status || 'submitted';
    
    const priorityColors = {
        'low': '#198754',
        'medium': 'var(--primary-color)',
        'high': '#ffc107',
        'urgent': '#dc3545'
    };
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 300px;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--primary-color); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 15px rgba(13, 110, 253, 0.3);">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; color: var(--text-primary); font-weight: 700;">
                            ${escapeHtml(request.title || 'Untitled')}
                        </h4>
                        <span style="padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-block; background: ${priorityColors[priority] || priorityColors.medium}; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                            ${priority} Priority
                        </span>
                    </div>
                </div>
                <p style="margin: 0 0 1rem 0; color: var(--text-secondary); line-height: 1.6; padding-left: 65px;">
                    ${escapeHtml(request.description || 'No description provided')}
                </p>
                <div style="padding-left: 65px; display: flex; gap: 1.5rem; flex-wrap: wrap; color: var(--text-secondary); font-size: 0.9rem; font-weight: 600;">
                    <span><i class="fas fa-calendar-alt" style="color: var(--primary-color); margin-right: 0.5rem;"></i>${formatDate(date)}</span>
                    <span><i class="fas fa-info-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Status: ${status}</span>
                </div>
            </div>
            <select class="form-control" style="width: auto; min-width: 180px; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 10px; font-weight: 600;" onchange="window.updateFeatureRequestStatus('${request.id}', this.value)">
                <option value="submitted" ${status === 'submitted' ? 'selected' : ''}>📝 Submitted</option>
                <option value="reviewing" ${status === 'reviewing' ? 'selected' : ''}>👀 Reviewing</option>
                <option value="approved" ${status === 'approved' ? 'selected' : ''}>✅ Approved</option>
                <option value="in-progress" ${status === 'in-progress' ? 'selected' : ''}>🚀 In Progress</option>
                <option value="completed" ${status === 'completed' ? 'selected' : ''}>🎉 Completed</option>
                <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
            </select>
        </div>
    `;
    
    return card;
}

window.updateFeatureRequestStatus = async function(requestId, status) {
    try {
        await updateDoc(doc(db, 'featureRequests', requestId), { status });
        showToast('Feature request status updated', 'success');
    } catch (error) {
        showToast('Error updating status', 'error');
        console.error(error);
    }
};

// --- UTILITY FUNCTIONS ---
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    if (!(date instanceof Date)) {
        date = date.toDate ? date.toDate() : new Date(date);
    }
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    console.log('showToast called:', message, type);
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        // Fallback to alert if window.showToast not available
        console.warn('window.showToast not available, using alert');
        alert(message);
    }
}

// --- CLIENT PROFILE & EDIT HISTORY ---
async function loadClientProfile() {
    const profileContainer = document.getElementById('client-profile-info');
    const historyContainer = document.getElementById('client-edit-history');
    
    if (!profileContainer || !historyContainer) return;
    
    profileContainer.innerHTML = '<div class="spinner"></div>';
    historyContainer.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Get client document by UID
        const clientQuery = query(collection(db, 'clients'), where('uid', '==', selectedClientId));
        const clientSnap = await getDocs(clientQuery);
        
        if (clientSnap.empty) {
            profileContainer.innerHTML = '<p>Client profile not found</p>';
            historyContainer.innerHTML = '<p>No history available</p>';
            return;
        }
        
        const clientDoc = clientSnap.docs[0];
        const clientData = clientDoc.data();
        
        // Display profile info
        profileContainer.innerHTML = `
            <div class="post-item" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-lg); padding: var(--spacing-xl);">
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--spacing-sm); font-weight: 600;">Full Name</div>
                    <div style="font-size: 1.125rem; color: var(--text-primary); font-weight: 600;">${escapeHtml(clientData.name || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--spacing-sm); font-weight: 600;">Email Address</div>
                    <div style="font-size: 1.125rem; color: var(--text-primary);">${escapeHtml(clientData.email || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--spacing-sm); font-weight: 600;">WhatsApp Number</div>
                    <div style="font-size: 1.125rem; color: var(--text-primary); word-break: break-all;">${escapeHtml(clientData.whatsappNumber || 'Not provided')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--spacing-sm); font-weight: 600;">Country Code</div>
                    <div style="font-size: 1.125rem; color: var(--text-primary);">${escapeHtml(clientData.countryCode || 'Not provided')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--spacing-sm); font-weight: 600;">User ID</div>
                    <div style="font-size: 0.8125rem; color: var(--text-primary); font-family: monospace; word-break: break-all;">${escapeHtml(clientData.uid || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--spacing-sm); font-weight: 600;">Registration Date</div>
                    <div style="font-size: 1.125rem; color: var(--text-primary);">${clientData.createdAt ? new Date(clientData.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</div>
                </div>
            </div>
        `;
        
        // Load edit history
        loadClientEditHistory(clientDoc.id);
    } catch (error) {
        console.error('Error loading client profile:', error);
        profileContainer.innerHTML = '<p class="text-danger">Error loading profile</p>';
    }
}

async function loadClientEditHistory(clientDocId) {
    const container = document.getElementById('client-edit-history');
    
    try {
        const historyQuery = query(
            collection(db, 'clientEditHistory'),
            where('clientDocId', '==', clientDocId),
            orderBy('editedAt', 'desc')
        );
        
        const snapshot = await getDocs(historyQuery);
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: var(--spacing-xl);">No edit history yet. Changes made by the client will appear here.</p>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const history = docSnap.data();
            const item = document.createElement('div');
            item.className = 'post-item';
            item.style.borderLeft = '3px solid var(--info)';
            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-edit" style="color: var(--info);"></i> Profile Updated
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: var(--spacing-sm);">
                        <i class="fas fa-clock"></i> ${history.editedAt ? new Date(history.editedAt.seconds * 1000).toLocaleString() : 'Unknown date'}
                    </div>
                    ${history.changes ? `
                        <div style="background: var(--gray-50); padding: var(--spacing-md); border-radius: var(--radius-md); font-size: 0.8125rem;">
                            <strong>Changes:</strong>
                            <ul style="margin: var(--spacing-sm) 0 0 var(--spacing-lg); color: var(--text-secondary);">
                                ${Object.entries(history.changes).map(([field, change]) => `
                                    <li style="margin-bottom: var(--spacing-xs);">
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
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading edit history:', error);
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: var(--spacing-xl);">No edit history available.</p>';
    }
}

