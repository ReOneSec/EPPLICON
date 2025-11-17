/**
 * Epplicon Technologies - Interactive UI/UX JavaScript
 * Advanced interactive components for enhanced user experience
 */

(function() {
    'use strict';

    // --- STATISTICS COUNTER ANIMATION ---
    function initStatisticsCounter() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        const animateCounter = (element) => {
            const target = parseInt(element.getAttribute('data-target')) || parseInt(element.textContent.replace(/\D/g, ''));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    const suffix = element.getAttribute('data-suffix') || '';
                    element.textContent = Math.floor(current) + suffix;
                    requestAnimationFrame(updateCounter);
                } else {
                    const suffix = element.getAttribute('data-suffix') || '';
                    element.textContent = target + suffix;
                }
            };
            
            updateCounter();
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const statNumber = entry.target.querySelector('.stat-number');
                    if (statNumber && !statNumber.classList.contains('animated')) {
                        statNumber.classList.add('animated');
                        animateCounter(statNumber);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        document.querySelectorAll('.stat-card').forEach(card => {
            observer.observe(card);
        });
    }

    // --- PROGRESS BARS ANIMATION ---
    function initProgressBars() {
        const progressBars = document.querySelectorAll('.progress-bar');
        
        const animateProgress = (bar) => {
            const target = parseInt(bar.getAttribute('data-progress')) || 0;
            bar.style.width = target + '%';
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    if (!bar.classList.contains('animated')) {
                        bar.classList.add('animated');
                        animateProgress(bar);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        progressBars.forEach(bar => {
            observer.observe(bar);
        });
    }

    // --- ACCORDION FUNCTIONALITY ---
    function initAccordion() {
        const accordionItems = document.querySelectorAll('.accordion-item');
        
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');
            
            header.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all items
                accordionItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                });
                
                // Open clicked item if it wasn't active
                if (!isActive) {
                    item.classList.add('active');
                }
            });
            
            // Keyboard support
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    header.click();
                }
            });
            
            // Make header focusable
            if (!header.hasAttribute('tabindex')) {
                header.setAttribute('tabindex', '0');
            }
        });
    }

    // --- TESTIMONIALS CAROUSEL ---
    function initTestimonialCarousel() {
        const carousel = document.querySelector('.testimonial-carousel');
        if (!carousel) return;
        
        const slides = carousel.querySelectorAll('.testimonial-slide');
        const dots = carousel.querySelectorAll('.testimonial-dot');
        const prevBtn = carousel.querySelector('.testimonial-nav.prev');
        const nextBtn = carousel.querySelector('.testimonial-nav.next');
        
        let currentSlide = 0;
        
        const showSlide = (index) => {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });
            
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
            
            currentSlide = index;
        };
        
        const nextSlide = () => {
            const next = (currentSlide + 1) % slides.length;
            showSlide(next);
        };
        
        const prevSlide = () => {
            const prev = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(prev);
        };
        
        // Dot navigation
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => showSlide(index));
        });
        
        // Arrow navigation
        if (nextBtn) nextBtn.addEventListener('click', nextSlide);
        if (prevBtn) prevBtn.addEventListener('click', prevSlide);
        
        // Auto-play
        let autoPlayInterval = setInterval(nextSlide, 5000);
        
        // Pause on hover
        carousel.addEventListener('mouseenter', () => {
            clearInterval(autoPlayInterval);
        });
        
        carousel.addEventListener('mouseleave', () => {
            autoPlayInterval = setInterval(nextSlide, 5000);
        });
        
        // Keyboard navigation
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === 'ArrowRight') nextSlide();
        });
        
        // Initialize
        showSlide(0);
    }

    // --- IMAGE LIGHTBOX/GALLERY ---
    function initImageLightbox() {
        const galleryItems = document.querySelectorAll('.gallery-item');
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <img src="" alt="">
                <button class="lightbox-close" aria-label="Close lightbox">
                    <i class="fas fa-times"></i>
                </button>
                <button class="lightbox-nav prev" aria-label="Previous image">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="lightbox-nav next" aria-label="Next image">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
        document.body.appendChild(lightbox);
        
        const lightboxImg = lightbox.querySelector('img');
        const lightboxContent = lightbox.querySelector('.lightbox-content');
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-nav.prev');
        const nextBtn = lightbox.querySelector('.lightbox-nav.next');
        
        let currentIndex = 0;
        const images = Array.from(galleryItems).map(item => ({
            src: item.querySelector('img').src,
            alt: item.querySelector('img').alt
        }));
        
        const openLightbox = (index) => {
            currentIndex = index;
            lightboxImg.src = images[index].src;
            lightboxImg.alt = images[index].alt;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        };
        
        const closeLightbox = () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        };
        
        const showNext = () => {
            currentIndex = (currentIndex + 1) % images.length;
            openLightbox(currentIndex);
        };
        
        const showPrev = () => {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            openLightbox(currentIndex);
        };
        
        galleryItems.forEach((item, index) => {
            item.addEventListener('click', () => openLightbox(index));
        });
        
        closeBtn.addEventListener('click', closeLightbox);
        nextBtn.addEventListener('click', showNext);
        prevBtn.addEventListener('click', showPrev);
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') showNext();
            if (e.key === 'ArrowLeft') showPrev();
        });
    }

    // --- PARALLAX SCROLLING ---
    function initParallax() {
        const parallaxSections = document.querySelectorAll('.parallax-section');
        
        if (parallaxSections.length === 0) return;
        
        const handleScroll = () => {
            parallaxSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const scrolled = window.pageYOffset;
                const rate = scrolled * 0.5;
                
                const bg = section.querySelector('.parallax-bg');
                if (bg && rect.top < window.innerHeight && rect.bottom > 0) {
                    bg.style.transform = `translateY(${rate}px)`;
                }
            });
        };
        
        // Throttle scroll events
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // --- INITIALIZE ALL ---
    function init() {
        initStatisticsCounter();
        initProgressBars();
        initAccordion();
        initTestimonialCarousel();
        initImageLightbox();
        
        // Check for reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion) {
            initParallax();
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

