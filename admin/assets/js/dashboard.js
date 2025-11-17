/**
 * Dashboard Page Module
 */

import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Load dashboard stats
window.loadDashboardStats = async function() {
    try {
        // Wait for authentication to complete
        let waitCount = 0;
        while (!window.currentAdminUser && waitCount < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        
        if (!window.currentAdminUser) {
            console.warn('User not authenticated, cannot load stats');
            return;
        }
        
        // Use window.db (set by shared.js or auth.js) for compatibility
        const db = window.db || window.adminDB;
        
        if (!db) {
            console.error('Database not initialized');
            window.showToast('Database not initialized. Please refresh.', 'error');
            return;
        }
        
        const postsSnap = await getDocs(collection(db, 'posts'));
        const published = postsSnap.docs.filter(d => d.data().isPublished).length;
        
        const statPosts = document.getElementById('stat-posts');
        const statPublished = document.getElementById('stat-published');
        const statDrafts = document.getElementById('stat-drafts');
        const statCategories = document.getElementById('stat-categories');
        const statClients = document.getElementById('stat-clients');
        
        if (statPosts) statPosts.textContent = postsSnap.size;
        if (statPublished) statPublished.textContent = published;
        if (statDrafts) statDrafts.textContent = postsSnap.size - published;
        
        const categoriesSnap = await getDocs(collection(db, 'categories'));
        if (statCategories) statCategories.textContent = categoriesSnap.size;
        
        const clientsSnap = await getDocs(collection(db, 'clients'));
        if (statClients) statClients.textContent = clientsSnap.size;
    } catch (error) {
        console.error('Error loading stats:', error);
        if (error.code === 'permission-denied') {
            window.showToast('Permission denied. Please check Firebase security rules.', 'error');
        } else {
            window.showToast(`Error loading dashboard stats: ${error.message}`, 'error');
        }
    }
};

// Quick Actions
function setupQuickActions() {
    const quickNewPost = document.getElementById('quick-new-post');
    const quickCategories = document.getElementById('quick-categories');
    const quickClients = document.getElementById('quick-clients');
    const quickBlog = document.getElementById('quick-blog');
    const refreshDashboard = document.getElementById('refresh-dashboard');
    
    if (quickNewPost) {
        quickNewPost.addEventListener('click', () => {
            window.router?.navigate('/posts');
            setTimeout(() => {
                const newPostBtn = document.getElementById('new-post-btn');
                if (newPostBtn) newPostBtn.click();
            }, 500);
        });
    }
    
    if (quickCategories) {
        quickCategories.addEventListener('click', () => {
            window.router?.navigate('/categories');
        });
    }
    
    if (quickClients) {
        quickClients.addEventListener('click', () => {
            window.router?.navigate('/clients');
        });
    }
    
    if (quickBlog) {
        quickBlog.addEventListener('click', () => {
            window.open('/', '_blank');
        });
    }
    
    if (refreshDashboard) {
        refreshDashboard.addEventListener('click', window.loadDashboardStats);
    }
}

// Initialize when page loads
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.route === '/dashboard' || e.detail.route === '/') {
        // Wait a bit for auth to be ready
        setTimeout(() => {
            window.loadDashboardStats();
            setupQuickActions();
        }, 1000);
    }
});

// Fallback: Initialize if page elements exist (in case pageLoaded event was missed)
let dashboardInitialized = false;
function initDashboardIfNeeded() {
    if (document.getElementById('stat-posts') && !dashboardInitialized) {
        dashboardInitialized = true;
        setTimeout(() => {
            window.loadDashboardStats();
            setupQuickActions();
        }, 1500);
    }
}

// Check periodically if dashboard needs initialization
setInterval(initDashboardIfNeeded, 1000);
initDashboardIfNeeded();

