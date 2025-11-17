/**
 * Epplicon Technologies - Animations JavaScript
 * Scroll animations using Intersection Observer
 */

(function() {
    'use strict';

    /**
     * Initialize scroll animations using Intersection Observer
     */
    function initScrollAnimations() {
        const observerCallback = (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const animationElements = entry.target.querySelectorAll('[data-animation="fade-up"]');
                    animationElements.forEach((el, index) => {
                        // Stagger delay for multiple elements
                        el.style.transitionDelay = `${index * 120}ms`;
                        el.classList.add('visible');
                    });
                    observer.unobserve(entry.target); // Stop observing after animation
                }
            });
        };

        const observerOptions = {
            threshold: 0.15, // Trigger when 15% of the element is visible
            rootMargin: '0px 0px -50px 0px' // Start animation slightly before element enters viewport
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        // Observe all elements with the .animate-group class
        const animationGroups = document.querySelectorAll('.animate-group');
        animationGroups.forEach((group) => observer.observe(group));
    }

    /**
     * Initialize value card click interactions (About page)
     */
    function initValueCards() {
        const valueCards = document.querySelectorAll('.value-card');
        if (valueCards.length > 0) {
            valueCards.forEach(card => {
                card.addEventListener('click', (event) => {
                    event.stopPropagation();
                    
                    const isAlreadySelected = card.classList.contains('card-selected');
                    
                    // Remove selected class from all cards
                    valueCards.forEach(c => c.classList.remove('card-selected'));
                    
                    // If not already selected, select it
                    if (!isAlreadySelected) {
                        card.classList.add('card-selected');
                    }
                });

                // Keyboard support
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        card.click();
                    }
                });

                // Make cards focusable
                if (!card.hasAttribute('tabindex')) {
                    card.setAttribute('tabindex', '0');
                }
            });

            // Deselect all when clicking outside
            document.addEventListener('click', (event) => {
                if (!event.target.closest('.value-card')) {
                    valueCards.forEach(c => c.classList.remove('card-selected'));
                }
            });
        }
    }

    /**
     * Initialize smooth scroll for anchor links
     */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#' || href === '#!') return;
                
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

    /**
     * Initialize all animations
     */
    function init() {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (!prefersReducedMotion) {
            initScrollAnimations();
        } else {
            // If reduced motion, show all elements immediately
            document.querySelectorAll('[data-animation="fade-up"]').forEach(el => {
                el.classList.add('visible');
            });
        }

        initValueCards();
        initSmoothScroll();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

