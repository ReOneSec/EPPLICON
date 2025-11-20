/**
 * Epplicon Technologies - Advanced Features JavaScript
 * Dark Mode, Back to Top, Toast Notifications, Contact Form, etc.
 */

(function() {
    'use strict';

    // --- DARK MODE TOGGLE ---
    function initDarkMode() {
        const themeToggle = document.getElementById('themeToggle');
        const currentTheme = localStorage.getItem('theme') || 'light';
        
        // Apply saved theme
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        if (themeToggle) {
            // Update icon based on current theme
            updateThemeIcon(currentTheme);
            
            // Show toggle after a delay
            setTimeout(() => {
                themeToggle.classList.add('visible');
            }, 500);
            
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateThemeIcon(newTheme);
                
                // Show toast notification
                showToast(`Switched to ${newTheme} mode`, 'success');
            });
        }
    }

    function updateThemeIcon(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
        }
    }

    // --- BACK TO TOP BUTTON ---
    function initBackToTop() {
        const backToTop = document.getElementById('backToTop');
        
        if (backToTop) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    backToTop.classList.add('visible');
                } else {
                    backToTop.classList.remove('visible');
                }
            });
            
            backToTop.addEventListener('click', (e) => {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    // --- READING PROGRESS BAR ---
    function initReadingProgress() {
        const readingProgress = document.getElementById('readingProgress');
        
        if (readingProgress) {
            window.addEventListener('scroll', () => {
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
                
                readingProgress.style.width = Math.min(scrollPercent, 100) + '%';
            });
        }
    }

    // --- TOAST NOTIFICATIONS ---
    function createToastContainer() {
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    function showToast(message, type = 'info', duration = 5000) {
        createToastContainer();
        const container = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-content">${message}</span>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        const autoRemove = setTimeout(() => {
            removeToast(toast);
        }, duration);
        
        // Manual close
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            removeToast(toast);
        });
    }

    function removeToast(toast) {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }

    // --- CONTACT FORM ---
    function initContactForm() {
        const contactForm = document.getElementById('contactForm');
        const formStatus = document.getElementById('form-status');
        
        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = contactForm.querySelector('.form-submit');
                const btnText = submitBtn.querySelector('.btn-text');
                const btnLoader = submitBtn.querySelector('.btn-loader');
                
                // Validate form
                if (!validateForm(contactForm)) {
                    return;
                }
                
                // Hide previous status
                if (formStatus) {
                    formStatus.style.display = 'none';
                    formStatus.className = 'form-status';
                }
                
                // Show loading state
                submitBtn.disabled = true;
                if (btnText) btnText.style.display = 'none';
                if (btnLoader) btnLoader.style.display = 'inline-block';
                
                // Get form data
                const formData = new FormData(contactForm);
                
                try {
                    // Submit to Web3Forms
                    const response = await fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Success
                        if (formStatus) {
                            formStatus.textContent = 'Thank you! Your message has been sent successfully. We\'ll get back to you soon.';
                            formStatus.className = 'form-status success';
                            formStatus.style.display = 'block';
                        }
                        showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
                        contactForm.reset();
                        clearFormErrors(contactForm);
                        
                        // Scroll to status message
                        if (formStatus) {
                            formStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    } else {
                        throw new Error(result.message || 'Failed to send message');
                    }
                    
                } catch (error) {
                    console.error('Form submission error:', error);
                    const errorMessage = error.message || 'Failed to send message. Please try again or contact us directly at info@epplicon.net';
                    
                    if (formStatus) {
                        formStatus.textContent = errorMessage;
                        formStatus.className = 'form-status error';
                        formStatus.style.display = 'block';
                    }
                    showToast(errorMessage, 'error');
                } finally {
                    // Reset button state
                    submitBtn.disabled = false;
                    if (btnText) btnText.style.display = 'inline';
                    if (btnLoader) btnLoader.style.display = 'none';
                }
            });
            
            // Real-time validation
            const inputs = contactForm.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    validateField(input);
                });
                
                input.addEventListener('input', () => {
                    if (input.parentElement.classList.contains('error')) {
                        validateField(input);
                    }
                });
            });
        }
    }

    function validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });
        
        // Email validation
        const emailInput = form.querySelector('input[type="email"]');
        if (emailInput && emailInput.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailInput.value)) {
                setFieldError(emailInput, 'Please enter a valid email address');
                isValid = false;
            }
        }
        
        return isValid;
    }

    function validateField(input) {
        if (input.hasAttribute('required') && !input.value.trim()) {
            setFieldError(input, 'This field is required');
            return false;
        }
        
        if (input.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                setFieldError(input, 'Please enter a valid email address');
                return false;
            }
        }
        
        clearFieldError(input);
        return true;
    }

    function setFieldError(input, message) {
        const formGroup = input.closest('.form-group');
        const errorMsg = formGroup.querySelector('.error-message');
        
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
        if (errorMsg) {
            errorMsg.textContent = message;
        }
    }

    function clearFieldError(input) {
        const formGroup = input.closest('.form-group');
        formGroup.classList.remove('error');
        formGroup.classList.add('success');
    }

    function clearFormErrors(form) {
        const formGroups = form.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            group.classList.remove('error', 'success');
        });
    }

    // --- BLOG SEARCH ---
    function initBlogSearch() {
        const searchInput = document.getElementById('blogSearchInput');
        const searchBtn = document.getElementById('blogSearchBtn');
        
        if (searchInput) {
            const performSearch = () => {
                const query = searchInput.value.trim().toLowerCase();
                const blogCards = document.querySelectorAll('.blog-card');
                let resultsCount = 0;
                
                blogCards.forEach(card => {
                    const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
                    const excerpt = card.querySelector('p')?.textContent.toLowerCase() || '';
                    const tags = Array.from(card.querySelectorAll('.blog-card-tag')).map(tag => tag.textContent.toLowerCase()).join(' ');
                    
                    const matches = title.includes(query) || excerpt.includes(query) || tags.includes(query);
                    
                    if (matches) {
                        card.style.display = '';
                        resultsCount++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                // Show no results message
                let noResults = document.getElementById('noSearchResults');
                if (query && resultsCount === 0) {
                    if (!noResults) {
                        noResults = document.createElement('div');
                        noResults.id = 'noSearchResults';
                        noResults.className = 'no-results';
                        noResults.style.cssText = 'text-align: center; padding: 3rem; grid-column: 1 / -1;';
                        noResults.innerHTML = '<p>No posts found matching your search.</p>';
                        document.querySelector('.blog-grid').appendChild(noResults);
                    }
                } else if (noResults) {
                    noResults.remove();
                }
            };
            
            if (searchBtn) {
                searchBtn.addEventListener('click', performSearch);
            }
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch();
                }
            });
            
            // Clear search on input
            searchInput.addEventListener('input', () => {
                if (searchInput.value.trim() === '') {
                    document.querySelectorAll('.blog-card').forEach(card => {
                        card.style.display = '';
                    });
                    const noResults = document.getElementById('noSearchResults');
                    if (noResults) noResults.remove();
                }
            });
        }
    }

    // --- READING TIME CALCULATION ---
    function calculateReadingTime() {
        const readingTimeElements = document.querySelectorAll('[data-reading-time]');
        
        readingTimeElements.forEach(element => {
            const content = element.textContent || element.innerText;
            const words = content.trim().split(/\s+/).length;
            const readingTime = Math.ceil(words / 200); // Average reading speed: 200 words per minute
            
            const badge = document.createElement('span');
            badge.className = 'reading-time';
            badge.innerHTML = `<i class="fas fa-clock"></i> ${readingTime} min read`;
            
            // Insert after the element or in a specific container
            const container = element.closest('.post-meta') || element.parentElement;
            if (container) {
                container.appendChild(badge);
            }
        });
    }

    // --- INITIALIZE ALL ---
    function init() {
        initDarkMode();
        initBackToTop();
        initReadingProgress();
        initContactForm();
        initBlogSearch();
        
        // Calculate reading time after content loads
        if (document.readyState === 'complete') {
            calculateReadingTime();
        } else {
            window.addEventListener('load', calculateReadingTime);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export showToast for use in other scripts
    window.showToast = showToast;

})();

