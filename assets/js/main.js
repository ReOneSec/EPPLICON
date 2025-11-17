/**
 * Epplicon Technologies - Main JavaScript
 * Common functionality for all pages
 */

(function() {
    'use strict';

    // --- PRELOADER ---
    function initPreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            window.addEventListener('load', () => {
                preloader.classList.add('loaded');
            });
        }
    }

    // --- HEADER SCROLL EFFECT ---
    function initHeaderScroll() {
        const mainHeader = document.getElementById('mainHeader');
        if (mainHeader) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    mainHeader.classList.add('header-scrolled');
                } else {
                    mainHeader.classList.remove('header-scrolled');
                }
            });
        }
    }

    // --- MOBILE NAVIGATION ---
    function initMobileNav() {
        const mobileNavToggle = document.getElementById('mobileNavToggle');
        const mobileNav = document.getElementById('mobileNav');
        const body = document.body;

        if (mobileNavToggle && mobileNav) {
            // Toggle mobile nav
            mobileNavToggle.addEventListener('click', () => {
                mobileNavToggle.classList.toggle('active');
                mobileNav.classList.toggle('active');
                body.classList.toggle('mobile-nav-active');
            });

            // Close mobile nav when a link is clicked
            mobileNav.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    mobileNavToggle.classList.remove('active');
                    mobileNav.classList.remove('active');
                    body.classList.remove('mobile-nav-active');
                }
            });

            // Close mobile nav on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                    mobileNavToggle.classList.remove('active');
                    mobileNav.classList.remove('active');
                    body.classList.remove('mobile-nav-active');
                }
            });
        }
    }

    // --- SKIP TO CONTENT (Accessibility) ---
    function initSkipToContent() {
        const skipLink = document.querySelector('.skip-to-content');
        if (skipLink) {
            skipLink.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(skipLink.getAttribute('href'));
                if (target) {
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    }

    // --- KEYBOARD NAVIGATION ENHANCEMENTS ---
    function initKeyboardNavigation() {
        // Add keyboard support for all interactive elements
        const interactiveElements = document.querySelectorAll('a, button, input, textarea, select');
        interactiveElements.forEach(element => {
            element.addEventListener('keydown', (e) => {
                // Enter key activates buttons and links
                if (e.key === 'Enter' && (element.tagName === 'BUTTON' || element.tagName === 'A')) {
                    if (!element.disabled) {
                        element.click();
                    }
                }
            });
        });
    }

    // --- INITIALIZE ALL ---
    function init() {
        initPreloader();
        initHeaderScroll();
        initMobileNav();
        initSkipToContent();
        initKeyboardNavigation();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

