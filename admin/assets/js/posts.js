/**
 * Posts Page Module
 */

import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';

let quill = null;
let editingPostId = null;

// Initialize Quill editor
function initQuill() {
    if (!quill && document.getElementById('editor-container')) {
        quill = new Quill('#editor-container', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link', 'image'],
                    ['clean']
                ]
            },
            placeholder: 'Write your post content here...'
        });
    }
    return quill;
}

// Load posts
window.loadPosts = async function() {
    // Wait for authentication
    let waitCount = 0;
    while (!window.currentAdminUser && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    if (!window.currentAdminUser) {
        console.warn('User not authenticated, cannot load posts');
        return;
    }
    
    const db = window.db || window.adminDB;
    if (!db) {
        console.error('Database not initialized');
        return;
    }
    
    const postsList = document.getElementById('posts-list');
    const categoryFilter = document.getElementById('category-filter');
    
    if (!postsList) return;
    
    postsList.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Load categories for filter
        const categoriesSnap = await getDocs(query(collection(db, 'categories'), orderBy('name')));
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            categoriesSnap.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                categoryFilter.appendChild(opt);
            });
        }
        
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            postsList.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: var(--space-6);">No posts yet. Create your first post!</p>';
            return;
        }
        
        postsList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const post = docSnap.data();
            const item = document.createElement('div');
            item.className = 'post-item';
            item.dataset.status = post.isPublished ? 'published' : 'draft';
            item.dataset.title = post.title.toLowerCase();
            
            item.innerHTML = `
                ${post.featuredImage ? `<img src="${post.featuredImage}" class="post-thumbnail">` : `<div class="post-thumbnail" style="background: var(--gray-200); display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="color: var(--gray-400);"></i></div>`}
                <div class="post-content">
                    <div class="post-title">${post.title}</div>
                    <div class="post-meta">${post.authorName || 'Unknown'} • ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</div>
                </div>
                <span class="badge ${post.isPublished ? 'badge-success' : 'badge-warning'}">${post.isPublished ? 'Published' : 'Draft'}</span>
                <div class="post-actions">
                    <button class="icon-btn" onclick="window.editPost('${docSnap.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn" onclick="window.deletePost('${docSnap.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            postsList.appendChild(item);
        });
        
        setupPostFilters();
    } catch (error) {
        console.error('Error loading posts:', error);
        postsList.innerHTML = '<p style="color: var(--danger); text-align: center;">Error loading posts</p>';
    }
};

function setupPostFilters() {
    const searchInput = document.getElementById('post-search');
    const statusFilter = document.getElementById('status-filter');
    const categoryFilter = document.getElementById('category-filter');
    const clearBtn = document.getElementById('clear-filters');
    
    if (!searchInput || !statusFilter || !clearBtn) return;
    
    function filterPosts() {
        const search = searchInput.value.toLowerCase();
        const status = statusFilter.value;
        
        document.querySelectorAll('.post-item').forEach(item => {
            const matchesSearch = item.dataset.title.includes(search);
            const matchesStatus = !status || item.dataset.status === status;
            
            item.style.display = matchesSearch && matchesStatus ? 'flex' : 'none';
        });
    }
    
    searchInput.addEventListener('input', filterPosts);
    statusFilter.addEventListener('change', filterPosts);
    if (categoryFilter) categoryFilter.addEventListener('change', filterPosts);
    
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = '';
        if (categoryFilter) categoryFilter.value = '';
        filterPosts();
    });
}

// Post Editor Functions
window.openPostEditor = function(postId = null) {
    editingPostId = postId;
    const modal = document.getElementById('post-editor-modal');
    const title = document.getElementById('editor-modal-title');
    
    if (!modal) {
        console.error('Post editor modal not found');
        return;
    }
    
    initQuill();
    
    if (postId) {
        if (title) title.textContent = 'Edit Post';
        loadPostForEdit(postId);
    } else {
        if (title) title.textContent = 'Create New Post';
        const form = document.getElementById('post-form');
        if (form) form.reset();
        const postIdInput = document.getElementById('post-id');
        if (postIdInput) postIdInput.value = '';
        const postSlug = document.getElementById('post-slug');
        if (postSlug) postSlug.value = '(Auto-generated)';
        if (quill) quill.root.innerHTML = '';
        const preview = document.getElementById('post-image-preview');
        if (preview) preview.classList.add('hidden');
    }
    
    loadCategoriesForEditor();
    modal.classList.remove('hidden');
};

window.closePostEditor = function() {
    const modal = document.getElementById('post-editor-modal');
    if (modal) modal.classList.add('hidden');
    editingPostId = null;
};

async function loadCategoriesForEditor() {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    const select = document.getElementById('post-categories');
    if (!select) return;
    
    select.innerHTML = '';
    
    try {
        const snapshot = await getDocs(query(collection(db, 'categories'), orderBy('name')));
        snapshot.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = doc.data().name;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadPostForEdit(postId) {
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        const docSnap = await getDoc(doc(db, 'posts', postId));
        if (docSnap.exists()) {
            const post = docSnap.data();
            const postIdInput = document.getElementById('post-id');
            const postTitle = document.getElementById('post-title');
            const postSlug = document.getElementById('post-slug');
            const postExcerpt = document.getElementById('post-excerpt');
            const postStatus = document.getElementById('post-status');
            
            if (postIdInput) postIdInput.value = postId;
            if (postTitle) postTitle.value = post.title;
            if (postSlug) postSlug.value = post.slug || '';
            if (postExcerpt) postExcerpt.value = post.excerpt || '';
            if (postStatus) postStatus.value = post.isPublished ? 'published' : 'draft';
            if (quill) quill.root.innerHTML = post.content || '';
            
            if (post.featuredImage) {
                const preview = document.getElementById('post-image-preview');
                if (preview) {
                    const img = preview.querySelector('img');
                    if (img) img.src = post.featuredImage;
                    preview.classList.remove('hidden');
                }
            }
            
            if (post.categoryIds) {
                const select = document.getElementById('post-categories');
                if (select) {
                    Array.from(select.options).forEach(opt => {
                        opt.selected = post.categoryIds.includes(opt.value);
                    });
                }
            }
            
            updateExcerptCount();
        }
    } catch (error) {
        console.error('Error loading post:', error);
        window.showToast('Error loading post', 'error');
    }
}

function createSlug(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

window.editPost = function(postId) {
    window.openPostEditor(postId);
};

window.deletePost = async function(postId) {
    if (!confirm('Delete this post?')) return;
    
    const db = window.db || window.adminDB;
    if (!db) return;
    
    try {
        await deleteDoc(doc(db, 'posts', postId));
        window.showToast('Post deleted', 'success');
        loadPosts();
    } catch (error) {
        console.error('Error deleting post:', error);
        window.showToast('Error deleting post', 'error');
    }
};

function updateExcerptCount() {
    const excerpt = document.getElementById('post-excerpt');
    const count = document.getElementById('excerpt-count');
    if (excerpt && count) {
        const length = excerpt.value.length;
        count.textContent = `${length}/200 characters`;
    }
}

// Initialize when page loads
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.route === '/posts') {
        setTimeout(() => {
            // Wait for auth
            let waitCount = 0;
            const checkAuth = setInterval(() => {
                if (window.currentAdminUser || waitCount > 20) {
                    clearInterval(checkAuth);
                    window.loadPosts();
                    
                    // Setup new post button
                    const newPostBtn = document.getElementById('new-post-btn');
                    if (newPostBtn) {
                        newPostBtn.addEventListener('click', () => window.openPostEditor());
                    }
                    
                    // Setup post form
                    const postForm = document.getElementById('post-form');
                    if (postForm) {
                        postForm.addEventListener('submit', (e) => {
                            e.preventDefault();
                            savePost(e);
                        });
                    }
                    
                    // Setup excerpt counter
                    const postExcerpt = document.getElementById('post-excerpt');
                    if (postExcerpt) {
                        postExcerpt.addEventListener('input', updateExcerptCount);
                    }
                    
                    // Setup title to slug
                    const postTitle = document.getElementById('post-title');
                    if (postTitle) {
                        postTitle.addEventListener('input', (e) => {
                            const slug = document.getElementById('post-slug');
                            if (slug) slug.value = createSlug(e.target.value);
                        });
                    }
                } else {
                    waitCount++;
                }
            }, 100);
        }, 500);
    }
});

// Save post function
async function savePost(e) {
    e.preventDefault();
    
    const db = window.db || window.adminDB;
    const storage = window.storage || window.adminStorage;
    const user = window.currentAdminUser;
    
    if (!db || !storage || !user) {
        window.showToast('Not authenticated or database not available', 'error');
        return;
    }
    
    const postId = document.getElementById('post-id')?.value;
    const title = document.getElementById('post-title')?.value.trim();
    const excerpt = document.getElementById('post-excerpt')?.value.trim();
    const status = document.getElementById('post-status')?.value;
    const content = quill ? quill.root.innerHTML : '';
    const imageFile = document.getElementById('post-image')?.files[0];
    
    if (!title || !content) {
        window.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const selectedCategories = Array.from(document.getElementById('post-categories')?.selectedOptions || []).map(opt => opt.value);
    if (selectedCategories.length === 0) {
        window.showToast('Please select at least one category', 'error');
        return;
    }
    
    try {
        // Get author name
        let authorName = 'Admin';
        try {
            const authorDoc = await getDoc(doc(db, 'authors', user.uid));
            if (authorDoc.exists()) {
                authorName = authorDoc.data().name || 'Admin';
            }
        } catch (e) {
            console.warn('Could not fetch author name:', e);
        }
        
        const postData = {
            title,
            slug: createSlug(title),
            excerpt: excerpt || '',
            content,
            categoryIds: selectedCategories,
            isPublished: status === 'published',
            authorId: user.uid,
            authorName: authorName,
            updatedAt: serverTimestamp()
        };
        
        if (imageFile) {
            const imageRef = storageRef(storage, `posts/${Date.now()}_${imageFile.name}`);
            await uploadBytes(imageRef, imageFile);
            postData.featuredImage = await getDownloadURL(imageRef);
        }
        
        if (postId) {
            await updateDoc(doc(db, 'posts', postId), postData);
            window.showToast('Post updated', 'success');
        } else {
            postData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'posts'), postData);
            window.showToast('Post created', 'success');
        }
        
        window.closePostEditor();
        window.loadPosts();
        if (window.loadDashboardStats) {
            window.loadDashboardStats();
        }
    } catch (error) {
        console.error('Error saving post:', error);
        window.showToast(`Error saving post: ${error.message}`, 'error');
    }
}

// HTML Paste Modal Functions
window.openHtmlPasteModal = function() {
    const modal = document.getElementById('html-paste-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeHtmlPasteModal = function() {
    const modal = document.getElementById('html-paste-modal');
    if (modal) {
        modal.classList.add('hidden');
        const input = document.getElementById('html-paste-input');
        if (input) input.value = '';
    }
};

window.insertHtmlToEditor = function() {
    const html = document.getElementById('html-paste-input')?.value;
    if (html && quill) {
        const range = quill.getSelection(true);
        quill.clipboard.dangerouslyPasteHTML(range ? range.index : 0, html);
        window.showToast('HTML inserted successfully!', 'success');
        window.closeHtmlPasteModal();
    }
};

// Fallback: Initialize if page elements exist
let postsInitialized = false;
function initPostsIfNeeded() {
    if (document.getElementById('posts-list') && !postsInitialized) {
        postsInitialized = true;
        setTimeout(() => {
            window.loadPosts();
            
            // Setup new post button
            const newPostBtn = document.getElementById('new-post-btn');
            if (newPostBtn && !newPostBtn.dataset.listenerAdded) {
                newPostBtn.dataset.listenerAdded = 'true';
                newPostBtn.addEventListener('click', () => window.openPostEditor());
            }
            
            // Setup post form
            const postForm = document.getElementById('post-form');
            if (postForm && !postForm.dataset.listenerAdded) {
                postForm.dataset.listenerAdded = 'true';
                postForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    savePost(e);
                });
            }
            
            // Setup excerpt counter
            const postExcerpt = document.getElementById('post-excerpt');
            if (postExcerpt && !postExcerpt.dataset.listenerAdded) {
                postExcerpt.dataset.listenerAdded = 'true';
                postExcerpt.addEventListener('input', updateExcerptCount);
            }
            
            // Setup title to slug
            const postTitle = document.getElementById('post-title');
            if (postTitle && !postTitle.dataset.listenerAdded) {
                postTitle.dataset.listenerAdded = 'true';
                postTitle.addEventListener('input', (e) => {
                    const slug = document.getElementById('post-slug');
                    if (slug) slug.value = createSlug(e.target.value);
                });
            }
        }, 1500);
    }
}

// Check periodically if posts page needs initialization
setInterval(initPostsIfNeeded, 1000);
initPostsIfNeeded();
