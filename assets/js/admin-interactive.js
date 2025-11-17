/**
 * Epplicon Technologies - Admin Panel Interactive Features
 * Keyboard shortcuts, animations, and productivity enhancements
 */

(function() {
    'use strict';

    // --- KEYBOARD SHORTCUTS ---
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K: Quick search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('post-search');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // Ctrl/Cmd + N: New post
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                const createBtn = document.getElementById('create-new-btn');
                if (createBtn && !createBtn.offsetParent === null) {
                    createBtn.click();
                }
            }
            
            // Ctrl/Cmd + S: Save post (if in editor)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const saveBtn = document.getElementById('save-post-btn');
                if (saveBtn && saveBtn.offsetParent !== null) {
                    e.preventDefault();
                    saveBtn.click();
                }
            }
            
            // Escape: Cancel/Close
            if (e.key === 'Escape') {
                const cancelBtn = document.getElementById('cancel-edit-btn');
                if (cancelBtn && cancelBtn.offsetParent !== null) {
                    cancelBtn.click();
                }
                
                const closeClientBtn = document.getElementById('close-client-view');
                if (closeClientBtn && closeClientBtn.offsetParent !== null) {
                    closeClientBtn.click();
                }
            }
        });
    }

    // --- STAT COUNTER ANIMATION ---
    function animateStatsCounter() {
        const stats = document.querySelectorAll('.stat-card h3');
        
        stats.forEach(stat => {
            const targetValue = parseInt(stat.textContent) || 0;
            let currentValue = 0;
            const increment = Math.ceil(targetValue / 30);
            const duration = 1000; // 1 second
            const stepTime = duration / 30;
            
            const counter = setInterval(() => {
                currentValue += increment;
                if (currentValue >= targetValue) {
                    stat.textContent = targetValue;
                    clearInterval(counter);
                } else {
                    stat.textContent = currentValue;
                }
            }, stepTime);
        });
    }

    // --- CARD HOVER EFFECTS ---
    function initCardEffects() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function(e) {
                this.style.transform = 'translateY(-5px)';
            });
            
            card.addEventListener('mouseleave', function(e) {
                this.style.transform = 'translateY(0)';
            });
        });
    }

    // --- SMOOTH SCROLL FOR NAVIGATION ---
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // --- ENHANCED TOAST NOTIFICATIONS ---
    function createToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const colors = {
            success: 'linear-gradient(135deg, #51cf66, #37b24d)',
            error: 'linear-gradient(135deg, #ff6b6b, #fa5252)',
            warning: 'linear-gradient(135deg, #ffd43b, #fab005)',
            info: 'linear-gradient(135deg, #4dabf7, #339af0)'
        };
        
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: #fff;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            min-width: 300px;
            animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
        `;
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}" style="font-size: 1.5rem;"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; margin-left: auto;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }

    // Make toast available globally
    window.showAdminToast = createToast;
    
    // Override the existing showToast if it exists
    if (!window.showToast) {
        window.showToast = createToast;
    }

    // --- ADD KEYBOARD SHORTCUTS HELP ---
    function showKeyboardShortcuts() {
        const helpModal = document.createElement('div');
        helpModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        `;
        
        helpModal.innerHTML = `
            <div style="background: #fff; border-radius: 16px; padding: 2rem; max-width: 600px; width: 100%;">
                <h2 style="margin-top: 0; color: var(--primary-color);">⌨️ Keyboard Shortcuts</h2>
                <div style="display: grid; gap: 1rem;">
                    <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--background-color); border-radius: 8px;">
                        <span><strong>Ctrl/Cmd + K</strong></span>
                        <span>Quick Search</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--background-color); border-radius: 8px;">
                        <span><strong>Ctrl/Cmd + N</strong></span>
                        <span>New Post</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--background-color); border-radius: 8px;">
                        <span><strong>Ctrl/Cmd + S</strong></span>
                        <span>Save Post</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--background-color); border-radius: 8px;">
                        <span><strong>Escape</strong></span>
                        <span>Cancel/Close</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--background-color); border-radius: 8px;">
                        <span><strong>?</strong></span>
                        <span>Show this help</span>
                    </div>
                </div>
                <button onclick="this.closest('div[style*=fixed]').remove()" class="btn" style="margin-top: 1.5rem; width: 100%;">
                    Close
                </button>
            </div>
        `;
        
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.remove();
            }
        });
        
        document.body.appendChild(helpModal);
    }

    // Show shortcuts on '?'
    document.addEventListener('keydown', (e) => {
        if (e.key === '?' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            showKeyboardShortcuts();
        }
    });

    // --- ADD SHORTCUTS HINT ---
    function addShortcutsHint() {
        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, var(--primary-color), #4dabf7);
            color: #fff;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 4px 20px rgba(13, 110, 253, 0.3);
            cursor: pointer;
            z-index: 999;
            transition: all 0.3s;
        `;
        
        hint.innerHTML = '<i class="fas fa-keyboard"></i> Press ? for shortcuts';
        hint.addEventListener('click', showKeyboardShortcuts);
        hint.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        hint.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        // Only show in admin view
        const adminView = document.getElementById('admin-view');
        if (adminView && !adminView.classList.contains('hidden')) {
            document.body.appendChild(hint);
        }
    }

    // --- INITIALIZE ---
    function init() {
        initKeyboardShortcuts();
        initCardEffects();
        initSmoothScroll();
        
        // Delay for dashboard stats animation
        setTimeout(() => {
            const dashboardView = document.getElementById('dashboard-view');
            if (dashboardView && !dashboardView.classList.contains('hidden')) {
                animateStatsCounter();
            }
        }, 500);
        
        // Add shortcuts hint after admin login
        setTimeout(addShortcutsHint, 1000);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-animate stats when dashboard is shown
    document.addEventListener('click', (e) => {
        if (e.target.dataset.view === 'dashboard-view') {
            setTimeout(animateStatsCounter, 300);
        }
    });

})();

