/**
 * Epplicon Technologies - Navigation & Footer Component
 * Reusable navigation and footer for all pages
 */

(function() {
    'use strict';

    // Get current page name for active link highlighting
    function getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page;
    }

    // Navigation HTML
    const navigationHTML = `
        <header class="main-header" id="mainHeader">
            <div class="container">
                <a href="index.html" class="logo" aria-label="Epplicon Technologies Home">Epplicon</a>
                <nav class="desktop-nav" aria-label="Main navigation">
                    <a href="services.html" data-page="services.html">Services</a>
                    <a href="portfolio.html" data-page="portfolio.html">Portfolio</a>
                    <a href="about.html" data-page="about.html">About</a>
                    <a href="blog.html" data-page="blog.html">Blog</a>
                    <a href="client-portal.html" class="client-portal-link" id="clientPortalLink" style="display: none;">Client Portal</a>
                    <a href="client-portal.html" class="client-login-btn" id="clientLoginBtn">Client Login</a>
                    <a href="index.html#contact" class="contact-btn">Contact</a>
                </nav>
                <button class="mobile-nav-toggle" id="mobileNavToggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="mobileNav">
                    <span class="icon-bar" aria-hidden="true"></span>
                    <span class="icon-bar" aria-hidden="true"></span>
                    <span class="icon-bar" aria-hidden="true"></span>
                </button>
            </div>
        </header>

        <nav class="mobile-nav" id="mobileNav" aria-label="Mobile navigation">
            <a href="services.html" data-page="services.html">Services</a>
            <a href="portfolio.html" data-page="portfolio.html">Portfolio</a>
            <a href="about.html" data-page="about.html">About</a>
            <a href="blog.html" data-page="blog.html">Blog</a>
            <a href="client-portal.html" class="client-portal-link" id="clientPortalLinkMobile" style="display: none;">Client Portal</a>
            <a href="client-portal.html" class="client-login-btn" id="clientLoginBtnMobile">Client Login</a>
            <a href="index.html#contact">Contact</a>
        </nav>
    `;

    // Footer HTML
    const footerHTML = `
        <footer class="site-footer">
            <div class="container">
                <div class="footer-grid">
                    <div class="footer-about">
                        <h4>Epplicon Technologies</h4>
                        <p>Pioneering the next generation of digital solutions with a commitment to excellence and innovation.</p>
                    </div>
                    <div class="footer-links">
                        <h4>Navigate</h4>
                        <ul>
                            <li><a href="services.html">Services</a></li>
                            <li><a href="portfolio.html">Portfolio</a></li>
                            <li><a href="about.html">About Us</a></li>
                            <li><a href="blog.html">Blog</a></li>
                            <li><a href="team.html">Team</a></li>
                            <li><a href="testimonials.html">Testimonials</a></li>
                            <li><a href="faq.html">FAQ</a></li>
                            <li><a href="index.html#contact">Contact</a></li>
                        </ul>
                    </div>
                    <div class="footer-links">
                        <h4>Connect</h4>
                        <ul>
                            <li><a href="https://www.linkedin.com/company/epplicon" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">LinkedIn</a></li>
                            <li><a href="https://twitter.com/epplicon" target="_blank" rel="noopener noreferrer" aria-label="Twitter">Twitter</a></li>
                            <li><a href="https://www.facebook.com/epplicon" target="_blank" rel="noopener noreferrer" aria-label="Facebook">Facebook</a></li>
                        </ul>
                    </div>
                    <div class="footer-links">
                        <h4>Legal</h4>
                        <ul>
                            <li><a href="privacy-policy.html">Privacy Policy</a></li>
                            <li><a href="terms-of-service.html">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; 2025 Epplicon Technologies. A vision by Sahabaj Alam & Tariq Ahmad Mir.</p>
                </div>
            </div>
        </footer>
    `;

    // Insert navigation
    function insertNavigation() {
        const navPlaceholder = document.getElementById('nav-placeholder');
        if (navPlaceholder) {
            navPlaceholder.insertAdjacentHTML('afterend', navigationHTML);
            navPlaceholder.remove();
        } else {
            // If no placeholder, try to find body and insert at start
            const body = document.body;
            if (body) {
                const skipLink = body.querySelector('.skip-to-content');
                if (skipLink) {
                    skipLink.insertAdjacentHTML('afterend', navigationHTML);
                } else {
                    body.insertAdjacentHTML('afterbegin', navigationHTML);
                }
            }
        }
    }

    // Insert footer
    function insertFooter() {
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            footerPlaceholder.insertAdjacentHTML('afterend', footerHTML);
            footerPlaceholder.remove();
        } else {
            // If no placeholder, insert before closing body tag or before scripts
            const body = document.body;
            if (body) {
                const scripts = body.querySelectorAll('script[src*="nav-footer"]');
                if (scripts.length > 0) {
                    scripts[0].insertAdjacentHTML('beforebegin', footerHTML);
                } else {
                    const allScripts = body.querySelectorAll('script');
                    if (allScripts.length > 0) {
                        allScripts[0].insertAdjacentHTML('beforebegin', footerHTML);
                    } else {
                        body.insertAdjacentHTML('beforeend', footerHTML);
                    }
                }
            }
        }
    }

    // Set active navigation link
    function setActiveLink() {
        const currentPage = getCurrentPage();
        const navLinks = document.querySelectorAll('[data-page]');
        
        navLinks.forEach(link => {
            if (link.getAttribute('data-page') === currentPage) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    // Initialize
    function init() {
        insertNavigation();
        insertFooter();
        setActiveLink();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

