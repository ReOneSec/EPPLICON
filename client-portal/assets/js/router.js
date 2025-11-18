/**
 * Router for Client Portal
 * Handles navigation between pages using hash-based routing
 */

class ClientPortalRouter {
    constructor() {
        this.routes = {
            '/': 'pages/overview.html',
            '/overview': 'pages/overview.html',
            '/projects': 'pages/projects.html',
            '/files': 'pages/files.html',
            '/messages': 'pages/messages.html',
            '/timeline': 'pages/timeline.html',
            '/invoices': 'pages/invoices.html',
            '/features': 'pages/features.html',
            '/profile': 'pages/profile.html'
        };
        
        this.currentRoute = null;
        this.init();
    }
    
    init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Handle initial load
        this.handleRoute();
    }
    
    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const route = this.routes[hash] || this.routes['/'];
        
        // Wait for auth to initialize (up to 3 seconds)
        let authCheckAttempts = 0;
        while (!window.authCheckComplete && authCheckAttempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            authCheckAttempts++;
        }
        
        // Check authentication
        if (!window.currentUser && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
            return;
        }
        
        // If authenticated and on login page, redirect to dashboard
        if (window.currentUser && window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html#/overview';
            return;
        }
        
        // Load the page
        await this.loadPage(route, hash);
    }
    
    async loadPage(route, hash) {
        try {
            // Show loading
            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = '<div class="spinner" style="margin: 50px auto;"></div>';
            }
            
            // Load header
            const headerResponse = await fetch('components/header.html');
            const headerHtml = await headerResponse.text();
            
            // Load tabs
            const tabsResponse = await fetch('components/tabs.html');
            const tabsHtml = await tabsResponse.text();
            
            // Load page content
            const response = await fetch(route);
            const html = await response.text();
            
            // Update DOM
            if (app) {
                app.innerHTML = `
                    <div class="dashboard-container">
                        ${headerHtml}
                        <div class="main-content">
                            ${tabsHtml}
                            ${html}
                        </div>
                    </div>
                `;
            }
            
            // Update active tab
            this.updateActiveTab(hash);
            
            // Setup logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn && !logoutBtn.dataset.listenerAdded) {
                logoutBtn.addEventListener('click', () => window.clientLogout());
                logoutBtn.dataset.listenerAdded = 'true';
            }
            
            // Setup tab buttons
            this.setupTabButtons();
            
            // Execute scripts in the loaded page
            await this.executeScripts(html, route);
            
            // Wait a bit for scripts to initialize, then trigger page-specific initialization
            setTimeout(() => {
                this.triggerPageInit(hash);
            }, 200);
            
        } catch (error) {
            console.error('Error loading page:', error);
            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = `
                    <div class="card">
                        <h2>Error Loading Page</h2>
                        <p>${error.message}</p>
                        <button class="btn" onclick="window.location.reload()">Reload</button>
                    </div>
                `;
            }
        }
    }
    
    async executeScripts(html, routePath) {
        // Extract and execute script tags
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const scripts = doc.querySelectorAll('script');
        
        const scriptPromises = [];
        
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            
            // Preserve type="module" if present
            if (script.type === 'module') {
                newScript.type = 'module';
            }
            
            if (script.src) {
                // Scripts are executed in the context of client-portal/index.html
                // So paths should be relative to client-portal/ folder
                let src = script.src;
                
                // If script has ../, remove it (pages/../assets -> assets)
                if (src.startsWith('../')) {
                    src = src.replace('../', '');
                }
                
                // If script has ./, remove it
                if (src.startsWith('./')) {
                    src = src.replace('./', '');
                }
                
                // All paths should now be relative to client-portal/ folder
                newScript.src = src;
                
                // Wait for script to load
                const scriptPromise = new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                });
                scriptPromises.push(scriptPromise);
            } else {
                // Inline script
                newScript.textContent = script.textContent;
            }
            
            document.body.appendChild(newScript);
        });
        
        // Wait for all scripts to load
        await Promise.all(scriptPromises);
    }
    
    updateActiveTab(hash) {
        // Remove active class from all tabs and tab contents
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to current tab
        const tabName = hash === '/' ? 'overview' : hash.slice(1);
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Show active tab content
        const activeContent = document.getElementById(`tab-${tabName}`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }
    
    setupTabButtons() {
        // Setup tab button click handlers
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (!btn.dataset.listenerAdded) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tab = btn.dataset.tab;
                    window.location.hash = `#/${tab}`;
                });
                btn.dataset.listenerAdded = 'true';
            }
        });
    }
    
    triggerPageInit(hash) {
        const tabName = hash === '/' ? 'overview' : hash.slice(1);
        
        // Dispatch pageLoaded event
        window.dispatchEvent(new CustomEvent('pageLoaded', { detail: { tab: tabName } }));
    }
}

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.clientRouter = new ClientPortalRouter();
    });
} else {
    window.clientRouter = new ClientPortalRouter();
}

