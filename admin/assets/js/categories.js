/**
 * Categories Page Module
 */

import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

function createSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Load categories
window.loadCategories = async function() {
    // Wait for authentication
    let waitCount = 0;
    while (!window.currentAdminUser && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    if (!window.currentAdminUser) {
        console.warn('User not authenticated, cannot load categories');
        return;
    }
    
    const db = window.db || window.adminDB;
    if (!db) {
        console.error('Database not initialized');
        return;
    }
    
    const categoriesList = document.getElementById('categories-list');
    if (!categoriesList) return;
    
    categoriesList.innerHTML = '<div class="spinner"></div>';
    
    try {
        const q = query(collection(db, 'categories'), orderBy('name'));
        const snapshot = await getDocs(q);
        
        const countElement = document.getElementById('category-count');
        if (countElement) {
            countElement.textContent = `${snapshot.size} categories`;
        }
        
        if (snapshot.empty) {
            categoriesList.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: var(--space-4);">No categories yet.</p>';
            return;
        }
        
        categoriesList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const category = docSnap.data();
            const item = document.createElement('div');
            item.className = 'category-item';
            item.innerHTML = `
                <div class="post-content">
                    <div class="post-title">${category.name}</div>
                    <div class="post-meta">Slug: ${category.slug}</div>
                </div>
                <div class="post-actions">
                    <button class="icon-btn" onclick="window.editCategory('${docSnap.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn" onclick="window.deleteCategory('${docSnap.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            categoriesList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        categoriesList.innerHTML = '<p style="color: var(--danger); text-align: center;">Error loading categories</p>';
    }
};

window.editCategory = async function(id) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        const docSnap = await getDoc(doc(db, 'categories', id));
        if (docSnap.exists()) {
            const category = docSnap.data();
            const nameInput = document.getElementById('category-name');
            const idInput = document.getElementById('category-id');
            const cancelBtn = document.getElementById('cancel-category');
            
            if (nameInput) nameInput.value = category.name;
            if (idInput) idInput.value = id;
            if (cancelBtn) cancelBtn.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading category:', error);
        window.showToast('Error loading category', 'error');
    }
};

window.deleteCategory = async function(id) {
    if (!confirm('Delete this category?')) return;
    
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await deleteDoc(doc(db, 'categories', id));
        window.showToast('Category deleted', 'success');
        window.loadCategories();
        // Refresh dashboard stats if function exists
        if (window.loadDashboardStats) {
            window.loadDashboardStats();
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        window.showToast('Error deleting category', 'error');
    }
};

// Initialize when page loads
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.route === '/categories') {
        setTimeout(() => {
            window.loadCategories();
            
            // Setup category form
            const categoryForm = document.getElementById('category-form');
            if (categoryForm && !categoryForm.dataset.listenerAdded) {
                categoryForm.dataset.listenerAdded = 'true';
                categoryForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const db = window.db || window.adminDB;
                    if (!db) return;
                    
                    const name = document.getElementById('category-name')?.value.trim();
                    const id = document.getElementById('category-id')?.value;
                    
                    if (!name) return;
                    
                    try {
                        const categoryData = {
                            name,
                            slug: createSlug(name),
                            updatedAt: serverTimestamp()
                        };
                        
                        if (id) {
                            await updateDoc(doc(db, 'categories', id), categoryData);
                            window.showToast('Category updated', 'success');
                        } else {
                            categoryData.createdAt = serverTimestamp();
                            await addDoc(collection(db, 'categories'), categoryData);
                            window.showToast('Category created', 'success');
                        }
                        
                        categoryForm.reset();
                        const idInput = document.getElementById('category-id');
                        if (idInput) idInput.value = '';
                        const cancelBtn = document.getElementById('cancel-category');
                        if (cancelBtn) cancelBtn.classList.add('hidden');
                        window.loadCategories();
                        if (window.loadDashboardStats) {
                            window.loadDashboardStats();
                        }
                    } catch (error) {
                        console.error('Error saving category:', error);
                        window.showToast('Error saving category', 'error');
                    }
                });
            }
            
            // Setup cancel button
            const cancelBtn = document.getElementById('cancel-category');
            if (cancelBtn && !cancelBtn.dataset.listenerAdded) {
                cancelBtn.dataset.listenerAdded = 'true';
                cancelBtn.addEventListener('click', () => {
                    const form = document.getElementById('category-form');
                    if (form) form.reset();
                    const idInput = document.getElementById('category-id');
                    if (idInput) idInput.value = '';
                    cancelBtn.classList.add('hidden');
                });
            }
        }, 500);
    }
});

// Fallback: Initialize if page elements exist
let categoriesInitialized = false;
function initCategoriesIfNeeded() {
    if (document.getElementById('categories-list') && !categoriesInitialized) {
        categoriesInitialized = true;
        setTimeout(() => {
            window.loadCategories();
            
            // Setup category form
            const categoryForm = document.getElementById('category-form');
            if (categoryForm && !categoryForm.dataset.listenerAdded) {
                categoryForm.dataset.listenerAdded = 'true';
                categoryForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const db = window.db || window.adminDB;
                    if (!db) return;
                    
                    const name = document.getElementById('category-name')?.value.trim();
                    const id = document.getElementById('category-id')?.value;
                    
                    if (!name) return;
                    
                    try {
                        const categoryData = {
                            name,
                            slug: createSlug(name),
                            updatedAt: serverTimestamp()
                        };
                        
                        if (id) {
                            await updateDoc(doc(db, 'categories', id), categoryData);
                            window.showToast('Category updated', 'success');
                        } else {
                            categoryData.createdAt = serverTimestamp();
                            await addDoc(collection(db, 'categories'), categoryData);
                            window.showToast('Category created', 'success');
                        }
                        
                        categoryForm.reset();
                        const idInput = document.getElementById('category-id');
                        if (idInput) idInput.value = '';
                        const cancelBtn = document.getElementById('cancel-category');
                        if (cancelBtn) cancelBtn.classList.add('hidden');
                        window.loadCategories();
                        if (window.loadDashboardStats) {
                            window.loadDashboardStats();
                        }
                    } catch (error) {
                        console.error('Error saving category:', error);
                        window.showToast('Error saving category', 'error');
                    }
                });
            }
            
            // Setup cancel button
            const cancelBtn = document.getElementById('cancel-category');
            if (cancelBtn && !cancelBtn.dataset.listenerAdded) {
                cancelBtn.dataset.listenerAdded = 'true';
                cancelBtn.addEventListener('click', () => {
                    const form = document.getElementById('category-form');
                    if (form) form.reset();
                    const idInput = document.getElementById('category-id');
                    if (idInput) idInput.value = '';
                    cancelBtn.classList.add('hidden');
                });
            }
        }, 1500);
    }
}

// Check periodically if categories page needs initialization
setInterval(initCategoriesIfNeeded, 1000);
initCategoriesIfNeeded();
