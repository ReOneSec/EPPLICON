/**
 * Epplicon Technologies - Client Portal JavaScript
 * Complete client portal functionality with Firebase integration
 */

import { firebaseConfig_DB_AUTH, firebaseConfig_STORAGE } from '../../config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    listAll 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Initialize Firebase - Use two apps like in admin.html
const dbApp = initializeApp(firebaseConfig_DB_AUTH, 'clientPortalDB');
const storageApp = initializeApp(firebaseConfig_STORAGE, 'clientPortalStorage');

// DB App handles Auth and Database
const auth = getAuth(dbApp);
const db = getFirestore(dbApp);

// Storage App handles File Storage (to avoid CORS issues)
const storage = getStorage(storageApp);

// Global state
let currentUser = null;
let unsubscribeFunctions = [];

// --- AUTHENTICATION ---
function initAuth() {
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Check if user is a CLIENT (not admin)
            console.log("User authenticated:", user.uid);
            
            try {
                const clientsQuery = query(collection(db, 'clients'), where('uid', '==', user.uid));
                const clientsSnapshot = await getDocs(clientsQuery);
                
                if (!clientsSnapshot.empty) {
                    // User is a CLIENT - allow access
                    console.log("✅ Client access granted:", user.uid);
                    currentUser = user;
                    showDashboard();
                    loadUserData();
                    updateNavForLoggedIn();
                } else {
                    // Check if they're trying to use admin credentials
                    console.warn("❌ Access denied: Not a registered client");
                    alert('This account is not registered in the client portal. Please register first or use the correct portal.');
                    await signOut(auth);
                    showAuth();
                    updateNavForLoggedOut();
                }
            } catch (error) {
                console.error("Error checking client status:", error);
                currentUser = null;
                showAuth();
                updateNavForLoggedOut();
            }
        } else {
            currentUser = null;
            showAuth();
            updateNavForLoggedOut();
        }
    });

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                await signInWithEmailAndPassword(auth, email, password);
                showToast('Login successful!', 'success');
            } catch (error) {
                showToast(getErrorMessage(error.code), 'error');
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const countryCode = document.getElementById('register-country-code').value;
            const whatsappNumber = document.getElementById('register-whatsapp').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            // Validation
            if (!name) {
                showToast('Please enter your full name', 'error');
                return;
            }

            if (!email) {
                showToast('Please enter your email address', 'error');
                return;
            }

            if (!countryCode) {
                showToast('Please select a country code', 'error');
                return;
            }

            if (!whatsappNumber) {
                showToast('Please enter your WhatsApp number', 'error');
                return;
            }

            // Validate WhatsApp number (should be 10-15 digits)
            if (!/^[0-9]{10,15}$/.test(whatsappNumber)) {
                showToast('Please enter a valid WhatsApp number (10-15 digits)', 'error');
                return;
            }

            if (password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }

            try {
                // Show loading state
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                
                // Create Firebase Auth user
                console.log('Creating user with email:', email);
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log('User created successfully:', userCredential.user.uid);
                
                // Combine country code with WhatsApp number
                const fullWhatsAppNumber = `${countryCode}${whatsappNumber}`;
                
                // Save user profile to Firestore
                console.log('Saving client profile to Firestore...');
                await addDoc(collection(db, 'clients'), {
                    uid: userCredential.user.uid,
                    name: name,
                    email: email,
                    whatsappNumber: fullWhatsAppNumber,
                    countryCode: countryCode,
                    createdAt: serverTimestamp()
                });
                console.log('Client profile saved successfully');
                
                showToast('Registration successful! Welcome to Epplicon Technologies!', 'success');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                
                // Clear form
                registerForm.reset();
            } catch (error) {
                // Reset button
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                }
                
                // Show detailed error
                console.error('Registration error details:', {
                    code: error.code,
                    message: error.message,
                    fullError: error
                });
                
                const errorMessage = getErrorMessage(error.code);
                showToast(errorMessage, 'error');
                
                // Also show in alert for debugging
                alert(`Registration Error:\n${error.code}\n${error.message}\n\nPlease check the console for more details.`);
            }
        });
    }

    // Forgot password
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            
            try {
                await sendPasswordResetEmail(auth, email);
                showToast('Password reset email sent!', 'success');
                showLoginForm();
            } catch (error) {
                showToast(getErrorMessage(error.code), 'error');
            }
        });
    }

    // Form switching - Attach event listeners
    function setupFormSwitching() {
        const showRegisterBtn = document.getElementById('show-register');
        if (showRegisterBtn && !showRegisterBtn.dataset.listenerAttached) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showRegisterForm();
            });
            showRegisterBtn.dataset.listenerAttached = 'true';
            console.log('Register button listener attached');
        }

        const showLoginBtn = document.getElementById('show-login');
        if (showLoginBtn && !showLoginBtn.dataset.listenerAttached) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showLoginForm();
            });
            showLoginBtn.dataset.listenerAttached = 'true';
        }

        const forgotPasswordLink = document.getElementById('forgot-password-link');
        if (forgotPasswordLink && !forgotPasswordLink.dataset.listenerAttached) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showForgotPasswordForm();
            });
            forgotPasswordLink.dataset.listenerAttached = 'true';
        }

        const backToLoginBtn = document.getElementById('back-to-login');
        if (backToLoginBtn && !backToLoginBtn.dataset.listenerAttached) {
            backToLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showLoginForm();
            });
            backToLoginBtn.dataset.listenerAttached = 'true';
        }
    }
    
    // Setup form switching - try multiple times to ensure DOM is ready
    setupFormSwitching();
    setTimeout(setupFormSwitching, 100);
    setTimeout(setupFormSwitching, 500);
    
    // Also setup when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupFormSwitching);
    } else {
        // DOM already loaded, try one more time
        setTimeout(setupFormSwitching, 1000);
    }

    // Password toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            // Unsubscribe from all listeners
            unsubscribeFunctions.forEach(unsub => unsub());
            unsubscribeFunctions = [];
            
            await signOut(auth);
            showToast('Logged out successfully', 'success');
        } catch (error) {
            showToast('Error logging out', 'error');
        }
    });
}

function showAuth() {
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');
    
    if (authView) authView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    
    console.log('Showing auth view');
}

function showDashboard() {
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');
    
    if (authView) {
        authView.classList.add('hidden');
        authView.style.display = 'none'; // Force hide
    }
    if (dashboardView) {
        dashboardView.classList.remove('hidden');
        dashboardView.style.display = 'block'; // Force show
    }
    
    console.log('Showing dashboard view');
}

function showLoginForm() {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    const forgotContainer = document.getElementById('forgot-password-container');
    
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (registerContainer) registerContainer.classList.add('hidden');
    if (forgotContainer) forgotContainer.classList.add('hidden');
}

function showRegisterForm() {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    const forgotContainer = document.getElementById('forgot-password-container');
    
    if (registerContainer) registerContainer.classList.remove('hidden');
    if (loginContainer) loginContainer.classList.add('hidden');
    if (forgotContainer) forgotContainer.classList.add('hidden');
    
    // Scroll to top of form for better UX
    const authCard = document.querySelector('.auth-card');
    if (authCard) {
        authCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function showForgotPasswordForm() {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    const forgotContainer = document.getElementById('forgot-password-container');
    
    if (forgotContainer) forgotContainer.classList.remove('hidden');
    if (loginContainer) loginContainer.classList.add('hidden');
    if (registerContainer) registerContainer.classList.add('hidden');
}

// --- NAVIGATION UPDATE ---
function updateNavForLoggedIn() {
    const portalLinks = document.querySelectorAll('.client-portal-link');
    const loginBtns = document.querySelectorAll('.client-login-btn');
    portalLinks.forEach(link => link.style.display = '');
    loginBtns.forEach(btn => btn.style.display = 'none');
}

function updateNavForLoggedOut() {
    const portalLinks = document.querySelectorAll('.client-portal-link');
    const loginBtns = document.querySelectorAll('.client-login-btn');
    portalLinks.forEach(link => link.style.display = 'none');
    loginBtns.forEach(btn => btn.style.display = '');
}

// --- DASHBOARD TABS ---
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Update active states
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
            
            // Load tab data
            loadTabData(tabName);
        });
    });
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'projects':
            loadProjects();
            break;
        case 'files':
            loadFiles();
            break;
        case 'chat':
            loadChat();
            break;
        case 'timeline':
            loadTimeline();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'feature-request':
            loadFeatureRequests();
            break;
    }
}

// --- USER DATA ---
async function loadUserData() {
    if (!currentUser) return;

    try {
        // Get client profile
        const clientsQuery = query(collection(db, 'clients'), where('uid', '==', currentUser.uid));
        const clientsSnapshot = await getDocs(clientsQuery);
        
        if (!clientsSnapshot.empty) {
            const clientData = clientsSnapshot.docs[0].data();
            document.getElementById('client-name').textContent = clientData.name || 'Client';
        }

        // Load overview stats
        loadOverviewStats();
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// --- OVERVIEW STATS ---
async function loadOverviewStats() {
    if (!currentUser) return;

    try {
        // Projects count
        const projectsQuery = query(collection(db, 'projects'), where('clientId', '==', currentUser.uid));
        const projectsSnapshot = await getDocs(projectsQuery);
        const activeProjects = projectsSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.status === 'active' || data.status === 'in-progress';
        }).length;
        document.getElementById('stat-active-projects').textContent = activeProjects;

        // Files count - Handle CORS gracefully
        try {
            const filesRef = ref(storage, `clients/${currentUser.uid}`);
            const filesList = await listAll(filesRef);
            document.getElementById('stat-total-files').textContent = filesList.items.length;
        } catch (storageError) {
            console.warn('Storage access error (CORS or not configured):', storageError);
            document.getElementById('stat-total-files').textContent = '0';
        }

        // Unread messages - Handle without orderBy to avoid index requirement
        let unreadCount = 0;
        try {
            const messagesQuery = query(
                collection(db, 'messages'),
                where('clientId', '==', currentUser.uid),
                where('read', '==', false)
            );
            const messagesSnapshot = await getDocs(messagesQuery);
            unreadCount = messagesSnapshot.size;
            document.getElementById('stat-unread-messages').textContent = unreadCount;
        } catch (msgError) {
            console.warn('Error loading unread messages:', msgError);
            document.getElementById('stat-unread-messages').textContent = '0';
        }
        
        // Update badge
        const badge = document.getElementById('unread-count');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        // Pending invoices
        try {
            const invoicesQuery = query(
                collection(db, 'invoices'),
                where('clientId', '==', currentUser.uid),
                where('status', '==', 'pending')
            );
            const invoicesSnapshot = await getDocs(invoicesQuery);
            document.getElementById('stat-pending-invoices').textContent = invoicesSnapshot.size;
        } catch (invError) {
            console.warn('Error loading pending invoices:', invError);
            document.getElementById('stat-pending-invoices').textContent = '0';
        }

        // Recent projects
        loadRecentProjects();
        loadRecentMessages();
    } catch (error) {
        console.error('Error loading overview stats:', error);
    }
}

// --- PROJECTS ---
async function loadProjects() {
    if (!currentUser) return;

    const container = document.getElementById('projects-list');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading projects...</p></div>';

    try {
        let projectsQuery;
        try {
            projectsQuery = query(
                collection(db, 'projects'),
                where('clientId', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
            );
        } catch (indexError) {
            console.warn('Index not found, loading without orderBy:', indexError);
            projectsQuery = query(
                collection(db, 'projects'),
                where('clientId', '==', currentUser.uid)
            );
        }
        
        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            console.log('Client: Projects snapshot received, size:', snapshot.size);
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-project-diagram"></i>
                        <p>No projects yet. Your projects will appear here once they are created by the team.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const project = { id: doc.id, ...doc.data() };
                console.log('Client: Loading project:', project);
                container.appendChild(createProjectCard(project));
            });
        }, (error) => {
            console.error('Client: Projects snapshot error:', error);
            container.innerHTML = `<p class="empty-state">Error: ${error.message}</p>`;
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Error loading projects: ${error.message}</p>
            </div>
        `;
        console.error('Error loading projects:', error);
    }
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    const progress = project.progress || 0;
    const statusClass = project.status || 'pending';
    const statusDisplay = statusClass.replace('-', ' ').split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    card.innerHTML = `
        <div class="project-header">
            <div>
                <h3 class="project-title">${escapeHtml(project.name || 'Untitled Project')}</h3>
                <p style="color: var(--text-secondary); margin: 0;">${escapeHtml(project.description || '')}</p>
            </div>
            <span class="project-status ${statusClass}">${statusDisplay}</span>
        </div>
        <div class="project-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">
                <span>Progress</span>
                <span>${progress}%</span>
            </div>
        </div>
    `;
    
    return card;
}

async function loadRecentProjects() {
    if (!currentUser) return;

    try {
        const projectsQuery = query(
            collection(db, 'projects'),
            where('clientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(projectsQuery);
        const container = document.getElementById('recent-projects-list');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-state">No projects yet</p>';
            return;
        }

        container.innerHTML = '';
        snapshot.docs.slice(0, 5).forEach(doc => {
            const project = doc.data();
            const item = document.createElement('div');
            item.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-color);';
            item.innerHTML = `
                <h4 style="margin: 0 0 0.25rem 0;">${escapeHtml(project.name || 'Untitled')}</h4>
                <small style="color: var(--text-secondary);">${project.status || 'pending'}</small>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading recent projects:', error);
    }
}

// --- FILES ---
async function loadFiles() {
    if (!currentUser) return;

    const container = document.getElementById('files-list');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading files...</p></div>';

    try {
        const filesRef = ref(storage, `clients/${currentUser.uid}`);
        console.log('Loading files from storage...');
        const filesList = await listAll(filesRef);
        console.log('Files loaded:', filesList.items.length);
        
        if (filesList.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No files uploaded yet. Files shared by the team will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        for (const fileRef of filesList.items) {
            const url = await getDownloadURL(fileRef);
            const fileName = fileRef.name;
            const metadata = await fileRef.getMetadata().catch(() => ({}));
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">
                        <i class="fas fa-file"></i>
                    </div>
                    <div class="file-details">
                        <h4>${escapeHtml(fileName)}</h4>
                        <small>${formatFileSize(metadata.size || 0)}</small>
                    </div>
                </div>
                <div class="file-actions">
                    <button onclick="window.open('${url}', '_blank')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
            container.appendChild(fileItem);
        }
    } catch (error) {
        // Handle CORS or storage errors gracefully
        if (error.code === 'storage/unauthorized' || error.message.includes('CORS')) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>File storage is being configured. Files will be available soon.</p>
                    <small style="color: var(--text-secondary);">Please contact support if this persists.</small>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Error loading files.</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
        console.error('Error loading files:', error);
    }
}

// File upload
document.getElementById('upload-file-btn')?.addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input')?.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length || !currentUser) return;

    for (const file of files) {
        try {
            const fileRef = ref(storage, `clients/${currentUser.uid}/${file.name}`);
            await uploadBytes(fileRef, file);
            showToast(`File "${file.name}" uploaded successfully!`, 'success');
            loadFiles();
        } catch (error) {
            showToast(`Error uploading "${file.name}"`, 'error');
            console.error('Upload error:', error);
        }
    }
    
    e.target.value = '';
});

// --- CHAT ---
function loadChat() {
    if (!currentUser) return;

    const container = document.getElementById('chat-messages');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading messages...</p></div>';

    try {
        let messagesQuery;
        try {
            messagesQuery = query(
                collection(db, 'messages'),
                where('clientId', '==', currentUser.uid),
                orderBy('timestamp', 'desc')
            );
        } catch (indexError) {
            console.warn('Index not found, loading without orderBy:', indexError);
            messagesQuery = query(
                collection(db, 'messages'),
                where('clientId', '==', currentUser.uid)
            );
        }

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            console.log('Client: Messages snapshot received, size:', snapshot.size);
            
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>No messages yet. Start a conversation with the team!</p></div>';
                return;
            }

            container.innerHTML = '';
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
            
            console.log('Client: Displaying messages:', messages);
            messages.forEach(message => {
                container.appendChild(createMessageElement(message));
            });

            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        }, (error) => {
            console.error('Client: Messages snapshot error:', error);
            container.innerHTML = `<div class="empty-state"><p>Error: ${error.message}</p></div>`;
        });

        unsubscribeFunctions.push(unsubscribe);

        // Send message - prevent duplicate listeners
        const sendBtn = document.getElementById('send-message-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (sendBtn && !sendBtn.dataset.listenerAttached) {
            sendBtn.addEventListener('click', sendMessage);
            sendBtn.dataset.listenerAttached = 'true';
        }
        
        if (chatInput && !chatInput.dataset.listenerAttached) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
            chatInput.dataset.listenerAttached = 'true';
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Error loading messages: ${error.message}</p>
            </div>
        `;
        console.error('Error loading chat:', error);
    }
}

function createMessageElement(message) {
    const isClient = message.senderId === currentUser.uid;
    const div = document.createElement('div');
    div.className = `message ${isClient ? 'client' : ''}`;
    
    const senderInitial = isClient 
        ? (currentUser.email?.charAt(0).toUpperCase() || 'C')
        : 'T';
    
    div.innerHTML = `
        <div class="message-avatar">${senderInitial}</div>
        <div class="message-content">
            <div>${escapeHtml(message.text || '')}</div>
            <div class="message-meta">
                <span>${formatDate(message.timestamp?.toDate() || new Date())}</span>
            </div>
        </div>
    `;
    
    return div;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    
    if (!text || !currentUser) return;

    try {
        await addDoc(collection(db, 'messages'), {
            clientId: currentUser.uid,
            senderId: currentUser.uid,
            text: text,
            read: false,
            timestamp: serverTimestamp()
        });
        
        input.value = '';
    } catch (error) {
        showToast('Error sending message', 'error');
        console.error('Error sending message:', error);
    }
}

async function loadRecentMessages() {
    if (!currentUser) return;

    try {
        const messagesQuery = query(
            collection(db, 'messages'),
            where('clientId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(messagesQuery);
        const container = document.getElementById('recent-messages-list');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-state">No messages yet</p>';
            return;
        }

        container.innerHTML = '';
        snapshot.docs.slice(0, 3).forEach(doc => {
            const message = doc.data();
            const item = document.createElement('div');
            item.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-color);';
            item.innerHTML = `
                <p style="margin: 0 0 0.25rem 0;">${escapeHtml(message.text || '').substring(0, 50)}...</p>
                <small style="color: var(--text-secondary);">${formatDate(message.timestamp?.toDate() || new Date())}</small>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading recent messages:', error);
    }
}

// --- TIMELINE ---
async function loadTimeline() {
    if (!currentUser) return;

    const container = document.getElementById('timeline-container');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading timeline...</p></div>';

    try {
        const milestonesQuery = query(
            collection(db, 'milestones'),
            where('clientId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );
        
        const unsubscribe = onSnapshot(milestonesQuery, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-state">No milestones yet</p>';
                return;
            }

            container.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const milestone = { id: doc.id, ...doc.data() };
                container.appendChild(createTimelineItem(milestone));
            });
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = '<p class="empty-state">Error loading timeline</p>';
        console.error('Error loading timeline:', error);
    }
}

function createTimelineItem(milestone) {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    
    const date = milestone.date?.toDate() || new Date();
    
    item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-content">
            <div class="timeline-date">${formatDate(date)}</div>
            <h4 class="timeline-title">${escapeHtml(milestone.title || 'Milestone')}</h4>
            <p class="timeline-description">${escapeHtml(milestone.description || '')}</p>
        </div>
    `;
    
    return item;
}

// --- INVOICES ---
async function loadInvoices() {
    if (!currentUser) return;

    const container = document.getElementById('invoices-list');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading invoices...</p></div>';

    try {
        let invoicesQuery;
        try {
            invoicesQuery = query(
                collection(db, 'invoices'),
                where('clientId', '==', currentUser.uid),
                orderBy('date', 'desc')
            );
        } catch (indexError) {
            console.warn('Index not found, loading without orderBy:', indexError);
            invoicesQuery = query(
                collection(db, 'invoices'),
                where('clientId', '==', currentUser.uid)
            );
        }
        
        const unsubscribe = onSnapshot(invoicesQuery, (snapshot) => {
            console.log('Client: Invoices snapshot received, size:', snapshot.size);
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-invoice"></i>
                        <p>No invoices yet. Invoices will appear here once created.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const invoice = { id: doc.id, ...doc.data() };
                console.log('Client: Loading invoice:', invoice);
                container.appendChild(createInvoiceCard(invoice));
            });
        }, (error) => {
            console.error('Client: Invoices snapshot error:', error);
            container.innerHTML = `<div class="empty-state"><p>Error: ${error.message}</p></div>`;
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Error loading invoices: ${error.message}</p>
            </div>
        `;
        console.error('Error loading invoices:', error);
    }
}

function createInvoiceCard(invoice) {
    const card = document.createElement('div');
    card.className = 'invoice-card';
    
    const date = invoice.date?.toDate() || new Date();
    const status = invoice.status || 'pending';
    const amount = invoice.amount || 0;
    
    card.innerHTML = `
        <div class="invoice-info">
            <h4>Invoice #${escapeHtml(invoice.invoiceNumber || invoice.id.substring(0, 8))}</h4>
            <div class="invoice-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(date)}</span>
                <span><i class="fas fa-tag"></i> ${escapeHtml(invoice.projectName || 'General')}</span>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div class="invoice-amount">$${amount.toLocaleString()}</div>
            <span class="invoice-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
            <button class="btn btn-secondary pdf-download-btn" data-invoice-id="${invoice.id}" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                <i class="fas fa-file-pdf"></i> Download PDF
            </button>
            ${invoice.downloadUrl ? `<a href="${invoice.downloadUrl}" target="_blank" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;"><i class="fas fa-download"></i> Attachment</a>` : ''}
        </div>
    `;
    
    // Add event listener for PDF download
    const pdfBtn = card.querySelector('.pdf-download-btn');
    if (pdfBtn) {
        console.log('✅ PDF button found and adding listener for invoice:', invoice.id);
        pdfBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('🖱️ PDF button clicked for invoice:', invoice);
            
            if (typeof window.generateInvoicePDF !== 'function') {
                console.error('❌ generateInvoicePDF is not available!');
                alert('PDF generator not loaded. Please refresh the page.');
                return;
            }
            
            await window.generateInvoicePDF(invoice, pdfBtn);
        });
    } else {
        console.warn('⚠️ PDF button NOT found in card for invoice:', invoice.id);
    }
    
    return card;
}

// --- FEATURE REQUESTS ---
async function loadFeatureRequests() {
    if (!currentUser) return;

    const container = document.getElementById('feature-requests-list');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading feature requests...</p></div>';

    try {
        // Load projects for dropdown
        const projectsQuery = query(collection(db, 'projects'), where('clientId', '==', currentUser.uid));
        const projectsSnapshot = await getDocs(projectsQuery);
        const projectSelect = document.getElementById('feature-project');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Select a project...</option>';
            projectsSnapshot.docs.forEach(doc => {
                const project = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = project.name || 'Untitled Project';
                projectSelect.appendChild(option);
            });
        }

        // Load feature requests
        const requestsQuery = query(
            collection(db, 'featureRequests'),
            where('clientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-state">No feature requests yet</p>';
                return;
            }

            container.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const request = { id: doc.id, ...doc.data() };
                container.appendChild(createFeatureRequestCard(request));
            });
        });

        unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
        container.innerHTML = '<p class="empty-state">Error loading feature requests</p>';
        console.error('Error loading feature requests:', error);
    }
}

function createFeatureRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'feature-request-card';
    
    const priority = request.priority || 'medium';
    const date = request.createdAt?.toDate() || new Date();
    
    card.innerHTML = `
        <div class="feature-request-header">
            <h4 class="feature-request-title">${escapeHtml(request.title || 'Untitled')}</h4>
            <span class="feature-request-priority ${priority}">${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
        </div>
        <p class="feature-request-description">${escapeHtml(request.description || '')}</p>
        <div class="feature-request-meta">
            <span><i class="fas fa-calendar"></i> ${formatDate(date)}</span>
            ${request.status ? `<span>Status: ${request.status}</span>` : ''}
        </div>
    `;
    
    return card;
}

// Feature request form
document.getElementById('feature-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById('feature-title').value;
    const description = document.getElementById('feature-description').value;
    const priority = document.getElementById('feature-priority').value;
    const projectId = document.getElementById('feature-project').value;

    try {
        await addDoc(collection(db, 'featureRequests'), {
            clientId: currentUser.uid,
            title: title,
            description: description,
            priority: priority,
            projectId: projectId || null,
            status: 'submitted',
            createdAt: serverTimestamp()
        });

        showToast('Feature request submitted successfully!', 'success');
        e.target.reset();
        loadFeatureRequests();
    } catch (error) {
        showToast('Error submitting feature request', 'error');
        console.error('Error submitting feature request:', error);
    }
});

// --- UTILITY FUNCTIONS ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    if (!(date instanceof Date)) {
        date = date.toDate ? date.toDate() : new Date(date);
    }
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getErrorMessage(errorCode) {
    const messages = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email already registered. Please use a different email or login.',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
        'permission-denied': 'Permission denied. Please check Firebase security rules.',
        'unavailable': 'Firebase service unavailable. Please try again later.'
    };
    return messages[errorCode] || `Error: ${errorCode}. Please try again or contact support.`;
}

function showToast(message, type = 'info') {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}

// --- INITIALIZE ---
function init() {
    initAuth();
    initTabs();
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

