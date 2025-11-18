/**
 * Projects Page Module
 */

import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Load projects
window.loadProjects = async function() {
    const clientId = window.currentClientId;
    if (!clientId) {
        console.warn('Client ID not available');
        return;
    }
    
    const db = window.db;
    const container = document.getElementById('projects-list');
    if (!container) return;
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const q = query(collection(db, 'projects'), where('clientId', '==', clientId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-project-diagram"></i><p>No projects assigned yet. Projects will appear here once the admin creates them.</p></div>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const project = docSnap.data();
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <div class="project-header">
                    <div>
                        <h3>${project.name || 'Unnamed Project'}</h3>
                        <p>${project.description || 'No description'}</p>
                    </div>
                    <span class="status-badge status-${project.status || 'active'}">${project.status || 'active'}</span>
                </div>
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2); font-size: 0.875rem;">
                        <span style="color: var(--text-secondary);">Progress</span>
                        <span style="color: var(--primary); font-weight: 700;">${project.progress || 0}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${project.progress || 0}%;"></div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = '<p style="color: var(--danger); text-align: center;">Error loading projects. Please refresh the page.</p>';
    }
};

// Initialize when page loads
let projectsInitialized = false;

function initProjectsIfNeeded() {
    if (projectsInitialized) return;
    
    const container = document.getElementById('projects-list');
    if (!container) return;
    
    projectsInitialized = true;
    window.loadProjects();
}

// Listen for page load event
window.addEventListener('pageLoaded', (e) => {
    if (e.detail?.tab === 'projects') {
        initProjectsIfNeeded();
    }
});

// Fallback initialization
setInterval(initProjectsIfNeeded, 500);

