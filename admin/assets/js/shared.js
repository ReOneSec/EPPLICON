/**
 * Shared utilities and Firebase initialization
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, orderBy, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';
// Import from admin/config.js (local to admin folder)
import { firebaseConfig_DB_AUTH, firebaseConfig_STORAGE } from '../config.js';

// Initialize Firebase - use existing app if auth.js already created it
let app1, app2;
try {
    // Try to get existing app (created by auth.js)
    app1 = getApp();
    console.log('shared.js: Using existing Firebase app from auth.js');
} catch (e) {
    // If no app exists, create one (shouldn't happen if auth.js loads first)
    app1 = initializeApp(firebaseConfig_DB_AUTH);
    console.log('shared.js: Created new Firebase app (auth.js should load first!)');
}

// Storage app (separate)
try {
    app2 = getApp('storage');
} catch (e) {
    app2 = initializeApp(firebaseConfig_STORAGE, 'storage');
}

const db = getFirestore(app1);
const storage = getStorage(app2);

// Expose to window for compatibility (ensure it's available globally)
// But don't overwrite if auth.js already set it (it has auth context)
if (!window.adminDB) {
    window.adminDB = db;
}
if (!window.db) {
    window.db = db;
}
window.adminStorage = storage;
if (!window.storage) {
    window.storage = storage;
}

// Expose Firestore functions
window.getDoc = getDoc;
window.doc = doc;
window.collection = collection;
window.query = query;
window.where = where;
window.getDocs = getDocs;
window.addDoc = addDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.setDoc = setDoc;
window.serverTimestamp = serverTimestamp;
window.orderBy = orderBy;

// Expose Storage functions
window.storageRef = storageRef;
window.uploadBytes = uploadBytes;
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

