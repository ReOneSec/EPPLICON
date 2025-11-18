/**
 * Files Page Module
 */

import { ref as storageRef, listAll, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';

// Load files
window.loadFiles = async function() {
    const clientId = window.currentClientId;
    if (!clientId) {
        console.warn('Client ID not available');
        return;
    }
    
    const storage = window.storage;
    const container = document.getElementById('files-list');
    if (!container) return;
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const filesRef = storageRef(storage, `clients/${clientId}`);
        const result = await listAll(filesRef);
        
        if (result.items.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No files yet. Files shared by the admin will appear here.</p></div>';
            return;
        }
        
        container.innerHTML = '';
        for (const item of result.items) {
            try {
                const url = await getDownloadURL(item);
                const fileDiv = document.createElement('div');
                fileDiv.className = 'file-item';
                fileDiv.innerHTML = `
                    <div class="file-icon">
                        <i class="fas fa-file"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${item.name}</div>
                        <div class="file-meta">Click to download</div>
                    </div>
                    <a href="${url}" target="_blank" class="btn btn-sm">
                        <i class="fas fa-download"></i> Download
                    </a>
                `;
                container.appendChild(fileDiv);
            } catch (fileError) {
                console.warn('Error loading file:', item.name, fileError);
            }
        }
        
        if (container.children.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No accessible files yet.</p></div>';
        }
    } catch (error) {
        console.error('Error loading files:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No files available yet.</p><p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: var(--space-2);">Files shared by the admin will appear here.</p></div>';
    }
};

// Initialize when page loads
let filesInitialized = false;

function initFilesIfNeeded() {
    if (filesInitialized) return;
    
    const container = document.getElementById('files-list');
    if (!container) return;
    
    filesInitialized = true;
    window.loadFiles();
}

// Listen for page load event
window.addEventListener('pageLoaded', (e) => {
    if (e.detail?.tab === 'files') {
        filesInitialized = false; // Reset to allow reloading
        initFilesIfNeeded();
    }
});

// Fallback initialization
setInterval(() => {
    if (document.getElementById('files-list') && !filesInitialized) {
        initFilesIfNeeded();
    }
}, 500);

