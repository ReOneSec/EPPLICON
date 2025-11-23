/**
 * Shared utilities and Firebase initialization for Client Portal
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, orderBy, where, limit, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getStorage, ref as storageRef, listAll, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
// Import from client-portal config.js
import { firebaseConfig_DB_AUTH, firebaseConfig_STORAGE } from '../config.js';

// Initialize Firebase - use existing app if auth.js already created it
let app1, app2;
try {
    // Try to get existing app (created by auth.js) - use 'main' name to match auth.js
    app1 = getApp('main');
} catch (e) {
    // If no app exists, create one (shouldn't happen if auth.js loads first)
    app1 = initializeApp(firebaseConfig_DB_AUTH, 'main');
}

// Storage app (separate)
try {
    app2 = getApp('storage');
} catch (e) {
    app2 = initializeApp(firebaseConfig_STORAGE, 'storage');
}

const db = getFirestore(app1);
const storage = getStorage(app2);

// Set up cross-project authentication for Storage
const storageAuth = getAuth(app2);

// Function to sync authentication to Storage project
window.syncAuthToStorage = async function(email, password) {
    if (!email || !password) {
        console.warn('Cannot sync auth to Storage: email/password not provided');
        return;
    }
    
    try {
        // Sign in to Storage project with same credentials
        await signInWithEmailAndPassword(storageAuth, email, password);
        console.log('Successfully authenticated in Storage project');
    } catch (error) {
        // If user doesn't exist in Storage project, that's okay
        // The Storage rules will handle it
        console.warn('Could not authenticate in Storage project (user may not exist there):', error.message);
    }
};

// Expose to window for compatibility
if (!window.db) {
    window.db = db;
}
if (!window.storage) {
    window.storage = storage;
}

// Expose Firestore functions for invoice PDF generator
window.getDoc = getDoc;
window.doc = doc;
window.collection = collection;
window.query = query;
window.where = where;
window.getDocs = getDocs;
window.limit = limit;
window.addDoc = addDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.setDoc = setDoc;
window.serverTimestamp = serverTimestamp;
window.orderBy = orderBy;
window.onSnapshot = onSnapshot;

// Expose Storage functions
window.storageRef = storageRef;
window.listAll = listAll;
window.getDownloadURL = getDownloadURL;

// Show toast function
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

export { db, storage, showToast };

