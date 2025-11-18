/**
 * Profile Page Module
 */

import { collection, getDocs, query, where, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

let originalProfileData = {};

// Load country codes
async function loadCountryCodes() {
    try {
        const response = await fetch('components/country-codes.html');
        const html = await response.text();
        const select = document.getElementById('profile-country-code');
        if (select) {
            select.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading country codes:', error);
    }
}

// Load client profile for editing
window.loadClientProfileForEdit = async function() {
    const clientId = window.currentClientId;
    if (!clientId) {
        console.warn('Client ID not available');
        return;
    }
    
    const db = window.db;
    
    try {
        const clientQuery = query(collection(db, 'clients'), where('uid', '==', clientId));
        const clientSnap = await getDocs(clientQuery);
        
        if (clientSnap.empty) {
            window.showToast('Profile not found', 'error');
            return;
        }
        
        const clientDoc = clientSnap.docs[0];
        const clientData = clientDoc.data();
        
        // Store original data for comparison
        originalProfileData = {
            name: clientData.name || '',
            email: clientData.email || '',
            whatsappNumber: clientData.whatsappNumber || '',
            countryCode: clientData.countryCode || ''
        };
        
        // Populate form
        const nameEl = document.getElementById('profile-name');
        const emailEl = document.getElementById('profile-email');
        const whatsappEl = document.getElementById('profile-whatsapp');
        const countryCodeEl = document.getElementById('profile-country-code');
        
        if (nameEl) nameEl.value = clientData.name || '';
        if (emailEl) emailEl.value = clientData.email || '';
        if (whatsappEl) whatsappEl.value = clientData.whatsappNumber || '';
        if (countryCodeEl) {
            // Load country codes first, then set value
            await loadCountryCodes();
            countryCodeEl.value = clientData.countryCode || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        window.showToast('Error loading profile', 'error');
    }
};

// Initialize when page loads
let profileInitialized = false;

function initProfileIfNeeded() {
    if (profileInitialized) return;
    
    const form = document.getElementById('profile-edit-form');
    const cancelBtn = document.getElementById('cancel-profile-edit');
    
    if (!form) return;
    
    profileInitialized = true;
    
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
            
            const name = document.getElementById('profile-name').value.trim();
            const whatsappNumber = document.getElementById('profile-whatsapp').value.trim();
            const countryCode = document.getElementById('profile-country-code').value;
            
            if (!name) {
                window.showToast('Name is required', 'error');
                return;
            }
            
            const statusEl = document.getElementById('profile-status');
            const submitBtn = e.target.querySelector('button[type="submit"]');
            
            if (statusEl) statusEl.textContent = 'Saving...';
            if (submitBtn) submitBtn.disabled = true;
            
            try {
                // Get client document
                const clientQuery = query(collection(db, 'clients'), where('uid', '==', clientId));
                const clientSnap = await getDocs(clientQuery);
                
                if (clientSnap.empty) {
                    window.showToast('Profile not found', 'error');
                    return;
                }
                
                const clientDoc = clientSnap.docs[0];
                const newData = { 
                    name, 
                    whatsappNumber,
                    countryCode
                };
                
                // Track what changed
                const changes = {};
                if (originalProfileData.name !== name) {
                    changes.name = { old: originalProfileData.name, new: name };
                }
                if (originalProfileData.whatsappNumber !== whatsappNumber) {
                    changes.whatsappNumber = { old: originalProfileData.whatsappNumber, new: whatsappNumber };
                }
                if (originalProfileData.countryCode !== countryCode) {
                    changes.countryCode = { old: originalProfileData.countryCode, new: countryCode };
                }
                
                // Update profile
                await updateDoc(clientDoc.ref, {
                    ...newData,
                    updatedAt: serverTimestamp()
                });
                
                // Save edit history if there were changes
                if (Object.keys(changes).length > 0) {
                    await addDoc(collection(db, 'clientEditHistory'), {
                        clientDocId: clientDoc.id,
                        clientId: clientId,
                        changes,
                        editedAt: serverTimestamp()
                    });
                }
                
                // Update original data
                originalProfileData = { ...originalProfileData, name, whatsappNumber, countryCode };
                
                window.showToast('Profile updated successfully!', 'success');
                if (statusEl) {
                    statusEl.textContent = 'Saved!';
                    setTimeout(() => statusEl.textContent = '', 3000);
                }
                
                // Update the name in header
                const clientNameEl = document.getElementById('client-name');
                if (clientNameEl) {
                    clientNameEl.textContent = name;
                }
            } catch (error) {
                console.error('Error saving profile:', error);
                window.showToast('Error saving profile: ' + error.message, 'error');
                if (statusEl) statusEl.textContent = 'Error saving';
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
        form.dataset.listenerAdded = 'true';
    }
    
    // Setup cancel button
    if (cancelBtn && !cancelBtn.dataset.listenerAdded) {
        cancelBtn.addEventListener('click', () => {
            window.loadClientProfileForEdit();
            window.showToast('Changes cancelled', 'info');
        });
        cancelBtn.dataset.listenerAdded = 'true';
    }
    
    // Load profile
    window.loadClientProfileForEdit();
}

// Listen for page load event
window.addEventListener('pageLoaded', (e) => {
    if (e.detail?.tab === 'profile') {
        profileInitialized = false; // Reset to allow reloading
        initProfileIfNeeded();
    }
});

// Fallback initialization
setInterval(() => {
    if (document.getElementById('profile-edit-form') && !profileInitialized) {
        initProfileIfNeeded();
    }
}, 500);

