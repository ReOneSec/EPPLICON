/**
 * Authentication Module
 * Handles login, logout, and auth state management
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { firebaseConfig_DB_AUTH } from '../config.js';

// Use existing app if shared.js created it, otherwise create new one
let app;
try {
    app = getApp();
    console.log('Using existing Firebase app from shared.js');
} catch (e) {
    app = initializeApp(firebaseConfig_DB_AUTH);
    console.log('Created new Firebase app in auth.js');
}

const auth = getAuth(app);
const db = getFirestore(app);

// Expose to window
window.adminAuth = auth;
// CRITICAL: Always use auth.js db instance (it has auth context)
window.adminDB = db;
window.db = db; // Also set window.db to ensure all modules use authenticated instance
window.currentAdminUser = null;
window.authCheckComplete = false;

// Flag to prevent redirect loops
let isRedirecting = false;
let authCheckComplete = false;
let authListenerSetup = false;

// Define showToast early
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

window.showToast = showToast;

function showError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    } else {
        showToast(message, 'error');
    }
}

// Check if we're on login page
const isLoginPage = window.location.pathname.includes('login.html');
const isIndexPage = window.location.pathname.includes('index.html');

// Auth state listener - only handle redirects on login page
onAuthStateChanged(auth, async (user) => {
    // Prevent duplicate checks
    if (authCheckComplete && window.currentAdminUser === user) {
        return;
    }
    
    if (user) {
        try {
            const authorDoc = await getDoc(doc(db, 'authors', user.uid));
            if (authorDoc.exists()) {
                window.currentAdminUser = user;
                authCheckComplete = true;
                window.authCheckComplete = true;
                
                // Only redirect if we're on login page
                // Let router handle redirects on index.html
                if (isLoginPage && !isRedirecting) {
                    isRedirecting = true;
                    // Use sessionStorage to prevent loop
                    sessionStorage.setItem('adminAuthRedirect', 'true');
                    setTimeout(() => {
                        window.location.href = 'index.html#/dashboard';
                    }, 300);
                }
            } else {
                await signOut(auth);
                window.currentAdminUser = null;
                authCheckComplete = true;
                window.authCheckComplete = true;
                
                // Only redirect from index page, not login page
                if (isIndexPage && !isRedirecting) {
                    isRedirecting = true;
                    sessionStorage.removeItem('adminAuthRedirect');
                    window.location.href = 'login.html';
                }
                if (isLoginPage) {
                    showError('Access denied. Admin only.');
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
            authCheckComplete = true;
            window.authCheckComplete = true;
            if (isLoginPage) {
                showError('Error checking authorization');
            }
        }
    } else {
        window.currentAdminUser = null;
        authCheckComplete = true;
        window.authCheckComplete = true;
        
        // Only redirect from index page if not already redirecting
        // Don't redirect from login page (user is already there)
        if (isIndexPage && !isRedirecting && !sessionStorage.getItem('adminAuthRedirect')) {
            isRedirecting = true;
            window.location.href = 'login.html';
        }
    }
});

// Login function
window.adminLogin = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Logout function
window.adminLogout = async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error during logout', 'error');
    }
};

// Check auth state (for login page)
export async function checkAuthState() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// Setup login form if on login page
if (document.getElementById('login-form')) {
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const result = await window.adminLogin(email, password);
        if (!result.success) {
            showError(result.error);
        }
    });
}

// Setup logout button (will be set up when sidebar loads)
window.addEventListener('pageLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => window.adminLogout());
    }
});

