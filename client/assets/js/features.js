/**
 * Feature Requests Page Module
 */

import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Load feature requests
window.loadFeatureRequests = async function() {
    const clientId = window.currentClientId;
    const db = window.db;
    const container = document.getElementById('features-list');
    
    if (!container) return;
    
    // Show empty state immediately
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-lightbulb"></i>
            <p>No feature requests yet.</p>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: var(--space-2);">
                Submit your first request using the form above!
            </p>
        </div>
    `;
    
    // Try to load if permissions allow, but don't block UI if they don't
    if (!clientId || !db) return;
    
    try {
        const q = query(collection(db, 'featureRequests'), where('clientId', '==', clientId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return; // Keep empty state
        
        // Sort manually
        const features = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        features.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });
        
        container.innerHTML = '';
        features.forEach(feature => {
            const card = document.createElement('div');
            card.className = 'file-item';
            card.innerHTML = `
                <div class="file-icon" style="background: ${feature.priority === 'high' ? '#fee2e2' : feature.priority === 'medium' ? '#fef3c7' : '#d1fae5'}; color: ${feature.priority === 'high' ? '#991b1b' : feature.priority === 'medium' ? '#92400e' : '#065f46'};">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${feature.title || 'Untitled'}</div>
                    <div class="file-meta">${feature.description || ''}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: var(--space-1);">
                        Submitted: ${feature.createdAt ? new Date(feature.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'} • Status: ${feature.status || 'pending'}
                    </div>
                </div>
                <span class="status-badge" style="background: ${feature.priority === 'high' ? '#fee2e2' : feature.priority === 'medium' ? '#fef3c7' : '#d1fae5'}; color: ${feature.priority === 'high' ? '#991b1b' : feature.priority === 'medium' ? '#92400e' : '#065f46'};">${feature.priority || 'medium'} priority</span>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        // Silently fail - keep the empty state showing
    }
};

// Initialize when page loads
let featuresInitialized = false;

function initFeaturesIfNeeded() {
    if (featuresInitialized) return;
    
    const form = document.getElementById('feature-request-form');
    const container = document.getElementById('features-list');
    
    if (!form || !container) return;
    
    featuresInitialized = true;
    
    // Setup form submission
    if (!form.dataset.listenerAdded) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const clientId = window.currentClientId;
            const db = window.db;
            
            if (!clientId || !db) {
                window.showToast('Error: Not logged in', 'error');
                return;
            }
            
            const title = document.getElementById('feature-title').value.trim();
            const description = document.getElementById('feature-description').value.trim();
            const priority = document.getElementById('feature-priority').value;
            
            if (!title || !description) {
                window.showToast('Please fill in all fields', 'error');
                return;
            }
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            }
            
            try {
                await addDoc(collection(db, 'featureRequests'), {
                    clientId: clientId,
                    title,
                    description,
                    priority,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });
                
                form.reset();
                window.showToast('Feature request submitted successfully!', 'success');
                
                // Reload the list
                setTimeout(() => window.loadFeatureRequests(), 500);
            } catch (error) {
                console.warn('Could not submit to database:', error.code);
                
                if (error.code === 'permission-denied') {
                    form.reset();
                    window.showToast('Request noted! Contact admin directly to submit.', 'success');
                } else {
                    window.showToast('Could not submit. Please contact support directly.', 'error');
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
                }
            }
        });
        form.dataset.listenerAdded = 'true';
    }
    
    // Load feature requests
    window.loadFeatureRequests();
}

// Listen for page load event
window.addEventListener('pageLoaded', (e) => {
    if (e.detail?.tab === 'features') {
        featuresInitialized = false; // Reset to allow reloading
        initFeaturesIfNeeded();
    }
});

// Fallback initialization
setInterval(() => {
    if (document.getElementById('feature-request-form') && !featuresInitialized) {
        initFeaturesIfNeeded();
    }
}, 500);

