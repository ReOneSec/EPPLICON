/**
 * Timeline Page Module
 */

import { collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Load timeline/milestones
window.loadTimeline = async function() {
    const clientId = window.currentClientId;
    if (!clientId) {
        console.warn('Client ID not available');
        return;
    }
    
    const db = window.db;
    const container = document.getElementById('timeline-list');
    if (!container) return;
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Try with orderBy, fallback without if index doesn't exist
        let q;
        try {
            q = query(collection(db, 'milestones'), where('clientId', '==', clientId), orderBy('date', 'desc'));
        } catch (indexError) {
            console.warn('Milestones index not found, loading without orderBy');
            q = query(collection(db, 'milestones'), where('clientId', '==', clientId));
        }
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar"></i><p>No milestones yet. Project milestones will appear here.</p></div>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const milestone = docSnap.data();
            const item = document.createElement('div');
            item.className = 'timeline-item';
            
            let dateStr = 'N/A';
            const milestoneDate = milestone.date;
            if (milestoneDate) {
                if (milestoneDate.toDate) {
                    dateStr = milestoneDate.toDate().toLocaleDateString();
                } else if (milestoneDate.seconds) {
                    dateStr = new Date(milestoneDate.seconds * 1000).toLocaleDateString();
                } else if (milestoneDate instanceof Date) {
                    dateStr = milestoneDate.toLocaleDateString();
                }
            }
            
            item.innerHTML = `
                <div class="timeline-content">
                    <div class="timeline-date">${dateStr}</div>
                    <div class="timeline-title">${milestone.title || 'Untitled'}</div>
                    <div style="color: var(--text-secondary); font-size: 0.9375rem;">${milestone.description || ''}</div>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading timeline:', error);
        container.innerHTML = '<p style="color: var(--danger);">Error loading timeline. Please refresh the page.</p>';
    }
};

// Initialize when page loads
let timelineInitialized = false;

function initTimelineIfNeeded() {
    if (timelineInitialized) return;
    
    const container = document.getElementById('timeline-list');
    if (!container) return;
    
    timelineInitialized = true;
    window.loadTimeline();
}

// Listen for page load event
window.addEventListener('pageLoaded', (e) => {
    if (e.detail?.tab === 'timeline') {
        timelineInitialized = false; // Reset to allow reloading
        initTimelineIfNeeded();
    }
});

// Fallback initialization
setInterval(() => {
    if (document.getElementById('timeline-list') && !timelineInitialized) {
        initTimelineIfNeeded();
    }
}, 500);

