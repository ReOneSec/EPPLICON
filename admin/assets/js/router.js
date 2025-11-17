/**
 * Simple Router for Admin Panel
 * Handles navigation between pages using hash-based routing
 */

class AdminRouter {
    constructor() {
        this.routes = {
            '/': 'pages/dashboard.html',
            '/dashboard': 'pages/dashboard.html',
            '/posts': 'pages/posts.html',
            '/categories': 'pages/categories.html',
            '/clients': 'pages/clients.html',
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
        
        // Clear redirect flag if we successfully loaded
        if (sessionStorage.getItem('adminAuthRedirect')) {
            sessionStorage.removeItem('adminAuthRedirect');
        }
        
        // Wait for auth to initialize (up to 2 seconds)
        let authCheckAttempts = 0;
        while (!window.currentAdminUser && authCheckAttempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            authCheckAttempts++;
            
            // If auth check is complete and no user, break early
            if (window.authCheckComplete && !window.currentAdminUser) {
                break;
            }
        }
        
        // Check authentication (only if we're not on login page)
        if (!window.currentAdminUser && hash !== '/login') {
            // Don't redirect if we're already redirecting or just redirected
            if (!window.location.pathname.includes('login.html') && !sessionStorage.getItem('adminAuthRedirect')) {
                window.location.href = 'login.html';
            }
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
            
            // Load sidebar
            const sidebarResponse = await fetch('components/sidebar.html');
            const sidebarHtml = await sidebarResponse.text();
            
            // Load page content
            const response = await fetch(route);
            const html = await response.text();
            
            // Update DOM
            if (app) {
                app.innerHTML = `
                    <div class="admin-layout">
                        ${sidebarHtml}
                        <main class="main-content">
                            ${html}
                        </main>
                    </div>
                `;
            }
            
            // Update active nav
            this.updateActiveNav(hash);
            
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
            if (script.src) {
                // Scripts are executed in the context of admin/index.html
                // So paths should be relative to admin/ folder
                let src = script.src;
                
                // If script has ../, remove it (pages/../assets -> assets)
                if (src.startsWith('../')) {
                    src = src.replace('../', '');
                }
                
                // If script has ./, remove it
                if (src.startsWith('./')) {
                    src = src.replace('./', '');
                }
                
                // All paths should now be relative to admin/ folder
                // e.g., assets/js/dashboard.js resolves to admin/assets/js/dashboard.js
                newScript.src = src;
                
                // Wait for script to load
                const scriptPromise = new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                    // Timeout after 5 seconds
                    setTimeout(() => resolve(), 5000);
                });
                scriptPromises.push(scriptPromise);
            } else {
                newScript.textContent = script.textContent;
            }
            newScript.type = script.type || 'module';
            document.body.appendChild(newScript);
        });
        
        // Wait for all scripts to load
        await Promise.all(scriptPromises);
    }
    
    triggerPageInit(route) {
        // Trigger page-specific initialization
        const event = new CustomEvent('pageLoaded', { 
            detail: { route } 
        });
        window.dispatchEvent(event);
    }
    
    updateActiveNav(route) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${route}` || (route === '/' && href === '#/dashboard')) {
                link.classList.add('active');
            }
        });
    }
    
    navigate(route) {
        window.location.hash = route;
    }
}

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.router = new AdminRouter();
    });
} else {
    window.router = new AdminRouter();
}

