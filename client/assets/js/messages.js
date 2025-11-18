/**
 * Messages Page Module
 */

import { collection, query, where, orderBy, addDoc, onSnapshot, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

let messagesUnsubscribe = null;

// Load messages with real-time updates
window.loadMessages = async function() {
    const clientId = window.currentClientId;
    if (!clientId) {
        console.warn('Client ID not available');
        return;
    }
    
    const db = window.db;
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    // Unsubscribe from previous listener
    if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
    }
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Try with orderBy first, fallback without if index doesn't exist
        let q;
        try {
            q = query(collection(db, 'messages'), where('clientId', '==', clientId), orderBy('timestamp', 'asc'));
        } catch (indexError) {
            console.warn('Messages index not found, loading without orderBy');
            q = query(collection(db, 'messages'), where('clientId', '==', clientId));
        }
        
        messagesUnsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>No messages yet. Start the conversation!</p></div>';
                return;
            }
            
            container.innerHTML = '';
            
            // Sort messages by timestamp if orderBy wasn't available
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }));
            if (messages.length > 0 && !messages[0].timestamp) {
                // If no timestamp, show as is
            } else {
                messages.sort((a, b) => {
                    if (!a.timestamp) return 1;
                    if (!b.timestamp) return -1;
                    return a.timestamp.seconds - b.timestamp.seconds;
                });
            }
            
            messages.forEach(message => {
                const div = document.createElement('div');
                // CLIENT messages on RIGHT, ADMIN messages on LEFT (traditional chat style)
                div.className = `message-item ${message.senderId === 'admin' ? 'admin' : 'client'}`;
                
                const initial = message.senderId === 'admin' ? 'A' : 'Y';
                const name = message.senderId === 'admin' ? 'Epplicon Team' : 'You';
                const time = message.timestamp ? new Date(message.timestamp.seconds * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Just now';
                
                // Escape HTML to prevent XSS
                const escapeHtml = (text) => {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                };
                const messageText = escapeHtml(message.text || message.message || '');
                
                div.innerHTML = `
                    <div class="message-avatar">${initial}</div>
                    <div class="message-bubble">
                        <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: var(--space-1); opacity: 0.8;">${name}</div>
                        ${messageText}
                        <div class="message-time">${time}</div>
                    </div>
                `;
                container.appendChild(div);
                
                // Mark admin messages as read
                if (message.senderId === 'admin' && !message.read && message.ref) {
                    updateDoc(message.ref, { read: true }).catch(err => console.warn('Could not mark as read:', err));
                }
            });
            
            // Scroll to bottom
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }, (error) => {
            console.error('Messages snapshot error:', error);
            container.innerHTML = '<p style="color: var(--danger);">Error loading messages. Please refresh the page.</p>';
        });
    } catch (error) {
        console.error('Error setting up messages listener:', error);
        container.innerHTML = '<p style="color: var(--danger);">Error loading messages</p>';
    }
};

// Send message
window.sendMessage = async function() {
    const clientId = window.currentClientId;
    if (!clientId) {
        window.showToast('Not logged in', 'error');
        return;
    }
    
    const db = window.db;
    const input = document.getElementById('message-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    try {
        await addDoc(collection(db, 'messages'), {
            clientId: clientId,
            senderId: 'client',
            text,
            timestamp: serverTimestamp(),
            read: false
        });
        
        input.value = '';
        window.showToast('Message sent!', 'success');
    } catch (error) {
        window.showToast('Error sending message', 'error');
    }
};

// Initialize when page loads
let messagesInitialized = false;

function initMessagesIfNeeded() {
    if (messagesInitialized) return;
    
    const container = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('send-message-btn');
    const input = document.getElementById('message-input');
    
    if (!container || !sendBtn || !input) return;
    
    messagesInitialized = true;
    
    // Setup event listeners
    if (!sendBtn.dataset.listenerAdded) {
        sendBtn.addEventListener('click', window.sendMessage);
        sendBtn.dataset.listenerAdded = 'true';
    }
    
    if (!input.dataset.listenerAdded) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.sendMessage();
        });
        input.dataset.listenerAdded = 'true';
    }
    
    // Load messages
    window.loadMessages();
}

// Listen for page load event
window.addEventListener('pageLoaded', (e) => {
    if (e.detail?.tab === 'messages') {
        messagesInitialized = false; // Reset to allow reloading
        initMessagesIfNeeded();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (messagesUnsubscribe) {
        messagesUnsubscribe();
    }
});

// Fallback initialization
setInterval(() => {
    if (document.getElementById('chat-messages') && !messagesInitialized) {
        initMessagesIfNeeded();
    }
}, 500);

