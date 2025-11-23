/**
 * Authentication Module for Client Portal
 * Handles login, register, logout, and auth state management
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, setDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { firebaseConfig_DB_AUTH } from '../config.js';

// Use existing app if shared.js created it, otherwise create new one
let app;
try {
    app = getApp('main');
} catch (e) {
    app = initializeApp(firebaseConfig_DB_AUTH, 'main');
}

const auth = getAuth(app);
const db = getFirestore(app);

// Set auth persistence to LOCAL (prevent auto-logout)
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log('Auth persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });

// Expose to window
window.clientAuth = auth;
window.db = db; // Ensure db is available
window.currentUser = null;
window.currentClientId = null;
window.authCheckComplete = false;

// State
let currentUser = null;
let currentClientId = null;

// Helper functions
function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.classList.remove('hidden');
        setTimeout(() => element.classList.add('hidden'), 5000);
    } else {
        window.showToast(message, 'error');
    }
}

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const clientQuery = query(collection(db, 'clients'), where('uid', '==', user.uid));
        const clientSnap = await getDocs(clientQuery);
        
        if (!clientSnap.empty) {
            currentUser = user;
            window.currentUser = user; // Expose to window for invoice PDF generator
            currentClientId = user.uid;
            window.currentClientId = user.uid;
            const clientData = clientSnap.docs[0].data();
            
            // Update client name in header if element exists
            const clientNameEl = document.getElementById('client-name');
            if (clientNameEl) {
                clientNameEl.textContent = clientData.name || 'Client';
            }
            
            window.authCheckComplete = true;
            
            // Dispatch event for router
            window.dispatchEvent(new CustomEvent('clientAuthenticated', { detail: { user, clientData } }));
            
            // Hide loading, show dashboard
            const loadingView = document.getElementById('loading-view');
            const authView = document.getElementById('auth-view');
            if (loadingView) loadingView.classList.add('hidden');
            if (authView) authView.classList.add('hidden');
        } else {
            await signOut(auth);
            showError(null, 'Not registered as a client.');
        }
    } else {
        currentUser = null;
        window.currentUser = null;
        currentClientId = null;
        window.currentClientId = null;
        window.authCheckComplete = true;
        
        // Show auth view, hide dashboard
        const loadingView = document.getElementById('loading-view');
        const authView = document.getElementById('auth-view');
        if (loadingView) loadingView.classList.add('hidden');
        if (authView) authView.classList.remove('hidden');
        
        // Dispatch event for router
        window.dispatchEvent(new CustomEvent('clientLoggedOut'));
    }
});

// Login function
window.clientLogin = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        
        // Also authenticate in Storage project for cross-project access
        if (window.syncAuthToStorage) {
            await window.syncAuthToStorage(email, password);
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Register function
window.clientRegister = async (name, email, countryCode, whatsappNum, password) => {
    if (!countryCode) {
        return { success: false, error: 'Please select country code' };
    }
    
    const whatsappNumber = countryCode + whatsappNum;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, 'clients', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name,
            email,
            countryCode,
            whatsappNumber,
            createdAt: serverTimestamp()
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Logout function
window.clientLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
        window.showToast('Error during logout', 'error');
    }
};

export { auth, db, currentUser, currentClientId };

