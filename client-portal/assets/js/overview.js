/**
 * Overview Page Module
 */

import { collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { ref, listAll } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';

// Load overview stats
window.loadOverviewStats = async function() {
    const clientId = window.currentClientId;
    if (!clientId) {
        console.warn('⚠️ Overview: Client ID not available');
        return;
    }
    
    const db = window.db;
    const storage = window.storage;
    
    if (!db) {
        console.warn('⚠️ Overview: DB not available');
        return;
    }
    
    console.log('📊 Loading overview stats for client:', clientId);
    
    // Set defaults first
    const statProjects = document.getElementById('stat-projects');
    const statFiles = document.getElementById('stat-files');
    const statMessages = document.getElementById('stat-messages');
    const statInvoices = document.getElementById('stat-invoices');
    
    if (statProjects) statProjects.textContent = '0';
    if (statFiles) statFiles.textContent = '0';
    if (statMessages) statMessages.textContent = '0';
    if (statInvoices) statInvoices.textContent = '0';
    
    // Try to load each stat independently
    await Promise.all([
        loadProjectsCount(clientId, db),
        loadFilesCount(clientId, storage),
        loadMessagesCount(clientId, db),
        loadInvoicesCount(clientId, db),
        loadRecentActivity(clientId, db)
    ]);
    
    console.log('✅ Overview stats loaded');
};

async function loadProjectsCount(clientId, db) {
    try {
        if (!db || !clientId) {
            console.warn('Overview: DB or clientId not available for projects count');
            return;
        }
        const projectsSnap = await getDocs(query(collection(db, 'projects'), where('clientId', '==', clientId)));
        const statEl = document.getElementById('stat-projects');
        if (statEl) statEl.textContent = projectsSnap.size;
        console.log('📊 Projects count loaded:', projectsSnap.size);
    } catch (error) {
        console.warn('Error loading projects count:', error);
    }
}

async function loadFilesCount(clientId, storage) {
    try {
        if (!storage) {
            console.warn('Storage not available');
            return;
        }
        // Use window.storageRef if available (from shared.js), otherwise use imported ref
        const refFn = window.storageRef || ref;
        const filesRef = refFn(storage, `clients/${clientId}`);
        const filesList = await listAll(filesRef);
        const statEl = document.getElementById('stat-files');
        if (statEl) statEl.textContent = filesList.items.length;
    } catch (error) {
        console.warn('Error loading files count:', error);
        // Silently fail - storage might not be accessible
    }
}

async function loadMessagesCount(clientId, db) {
    try {
        if (!db || !clientId) {
            return;
        }
        const messagesSnap = await getDocs(query(collection(db, 'messages'), where('clientId', '==', clientId), where('read', '==', false), where('senderId', '==', 'admin')));
        const statEl = document.getElementById('stat-messages');
        if (statEl) statEl.textContent = messagesSnap.size;
        if (messagesSnap.size > 0) {
            const badge = document.getElementById('unread-badge');
            if (badge) {
                badge.textContent = messagesSnap.size;
                badge.style.display = 'inline-block';
            }
        }
        console.log('📊 Messages count loaded:', messagesSnap.size);
    } catch (error) {
        console.warn('Error loading messages count:', error);
    }
}

async function loadInvoicesCount(clientId, db) {
    try {
        if (!db || !clientId) {
            return;
        }
        const invoicesSnap = await getDocs(query(collection(db, 'invoices'), where('clientId', '==', clientId), where('status', '==', 'pending')));
        const statEl = document.getElementById('stat-invoices');
        if (statEl) statEl.textContent = invoicesSnap.size;
        console.log('📊 Invoices count loaded:', invoicesSnap.size);
    } catch (error) {
        console.warn('Error loading invoices count:', error);
    }
}

async function loadRecentActivity(clientId, db) {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Try with orderBy first, fallback without if index doesn't exist
        let projectsSnap;
        try {
            projectsSnap = await getDocs(query(collection(db, 'projects'), where('clientId', '==', clientId), orderBy('createdAt', 'desc')));
        } catch (indexError) {
            console.warn('Index not found, loading without orderBy');
            projectsSnap = await getDocs(query(collection(db, 'projects'), where('clientId', '==', clientId)));
        }
        
        if (projectsSnap.empty) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent activity</p></div>';
            return;
        }
        
        container.innerHTML = '';
        projectsSnap.docs.slice(0, 3).forEach(docSnap => {
            const project = docSnap.data();
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <div class="file-icon">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${project.name || 'Unnamed Project'}</div>
                    <div class="file-meta">Status: ${project.status || 'active'} • Progress: ${project.progress || 0}%</div>
                </div>
                <span class="status-badge status-${project.status || 'active'}">${project.status || 'active'}</span>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No recent activity</p>';
    }
}

// Initialize when page loads
let overviewInitialized = false;

function initOverviewIfNeeded() {
    if (overviewInitialized) return;
    
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    // Wait for clientId and db/storage to be available
    let waitCount = 0;
    const checkReady = setInterval(() => {
        const clientId = window.currentClientId;
        const db = window.db;
        const storage = window.storage;
        
        if (clientId && db && storage) {
            clearInterval(checkReady);
            overviewInitialized = true;
            console.log('📊 Initializing overview with clientId:', clientId);
            window.loadOverviewStats();
        } else if (waitCount >= 50) {
            clearInterval(checkReady);
            console.warn('⚠️ Overview: Client ID or Firebase not available after waiting');
        }
        waitCount++;
    }, 100);
}

// Listen for page load event
window.addEventListener('pageLoaded', (e) => {
    if (e.detail?.tab === 'overview') {
        overviewInitialized = false; // Reset to allow reloading
        initOverviewIfNeeded();
    }
});

// Also listen for auth ready event
window.addEventListener('clientAuthenticated', () => {
    if (document.getElementById('recent-activity')) {
        overviewInitialized = false;
        initOverviewIfNeeded();
    }
});

// Fallback initialization
setInterval(() => {
    if (document.getElementById('recent-activity') && !overviewInitialized) {
        initOverviewIfNeeded();
    }
}, 500);

