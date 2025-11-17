/**
 * Profile Page Module
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';

// Load profile
window.loadProfile = async function() {
    const db = window.db || window.adminDB;
    const user = window.currentAdminUser;
    
    if (!db || !user) {
        console.warn('Database or user not available');
        return;
    }
    
    try {
        const profileDoc = await getDoc(doc(db, 'authors', user.uid));
        if (profileDoc.exists()) {
            const profile = profileDoc.data();
            const nameInput = document.getElementById('profile-name');
            const bioInput = document.getElementById('profile-bio');
            const preview = document.getElementById('profile-image-preview');
            
            if (nameInput) nameInput.value = profile.name || '';
            if (bioInput) bioInput.value = profile.description || '';
            updateBioCount();
            
            if (profile.image && preview) {
                preview.innerHTML = `<img src="${profile.image}" style="width: 100%; height: 100%; object-fit: cover;">`;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        window.showToast('Error loading profile', 'error');
    }
};

function updateBioCount() {
    const profileBio = document.getElementById('profile-bio');
    const bioCount = document.getElementById('bio-count');
    if (profileBio && bioCount) {
        const length = profileBio.value.length;
        bioCount.textContent = `${length}/500 characters`;
        bioCount.style.color = length > 450 ? 'var(--danger)' : 'var(--gray-500)';
    }
}

// Initialize when page loads
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.route === '/profile') {
        setTimeout(() => {
            loadProfile();
            
            // Setup profile form
            const profileForm = document.getElementById('profile-form');
            if (profileForm) {
                profileForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const db = window.db || window.adminDB;
                    const storage = window.storage || window.adminStorage;
                    const user = window.currentAdminUser;
                    
                    if (!db || !storage || !user) {
                        window.showToast('Not authenticated', 'error');
                        return;
                    }
                    
                    const status = document.getElementById('profile-status');
                    if (status) status.textContent = 'Saving...';
                    
                    try {
                        const profileData = {
                            name: document.getElementById('profile-name')?.value || '',
                            description: document.getElementById('profile-bio')?.value || '',
                            updatedAt: serverTimestamp()
                        };
                        
                        const imageFile = document.getElementById('profile-image')?.files[0];
                        if (imageFile) {
                            const imageRef = storageRef(storage, `authors/${user.uid}/${Date.now()}_${imageFile.name}`);
                            await uploadBytes(imageRef, imageFile);
                            profileData.image = await getDownloadURL(imageRef);
                        }
                        
                        await setDoc(doc(db, 'authors', user.uid), profileData, { merge: true });
                        
                        if (status) {
                            status.textContent = 'Profile saved successfully!';
                            status.style.color = 'var(--success)';
                        }
                        
                        window.showToast('Profile saved successfully!', 'success');
                        
                        setTimeout(() => {
                            if (status) status.textContent = '';
                            window.loadProfile();
                        }, 2000);
                    } catch (error) {
                        console.error('Error saving profile:', error);
                        if (status) {
                            status.textContent = 'Error saving profile';
                            status.style.color = 'var(--danger)';
                        }
                        window.showToast('Error saving profile', 'error');
                    }
                });
            }
            
            // Setup bio counter
            const profileBio = document.getElementById('profile-bio');
            if (profileBio) {
                profileBio.addEventListener('input', updateBioCount);
            }
            
            // Setup image preview
            const profileImage = document.getElementById('profile-image');
            if (profileImage) {
                profileImage.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const preview = document.getElementById('profile-image-preview');
                            if (preview) {
                                preview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
            
            // Setup cancel button
            const cancelBtn = document.getElementById('cancel-profile');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', window.loadProfile);
            }
        }, 500);
    }
});

// Also run on direct load
if (document.getElementById('profile-form')) {
    setTimeout(() => {
        window.loadProfile();
    }, 1000);
}
