/**
 * Epplicon Technologies - Enhanced Post Page JavaScript
 * Advanced post reading experience features
 */

(function() {
    'use strict';

    // --- TABLE OF CONTENTS ---
    function generateTableOfContents() {
        const tocContainer = document.getElementById('table-of-contents-list');
        const postContent = document.querySelector('.post-content-enhanced');
        
        if (!tocContainer || !postContent) return;

        const headings = postContent.querySelectorAll('h2, h3, h4');
        if (headings.length === 0) {
            document.querySelector('.table-of-contents')?.classList.add('hidden');
            return;
        }

        const tocList = document.createElement('ul');
        tocList.className = 'toc-list';

        headings.forEach((heading, index) => {
            // Add ID to heading for anchor links
            const id = `heading-${index}`;
            heading.id = id;
            heading.style.scrollMarginTop = '100px';

            // Determine level
            const level = parseInt(heading.tagName.charAt(1));
            const tocItem = document.createElement('li');
            tocItem.className = `toc-item toc-level-${level}`;

            const link = document.createElement('a');
            link.href = `#${id}`;
            link.textContent = heading.textContent;
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });

            tocItem.appendChild(link);
            tocList.appendChild(tocItem);
        });

        tocContainer.innerHTML = '';
        tocContainer.appendChild(tocList);

        // Highlight active TOC item on scroll
        highlightActiveTOCItem(headings);
    }

    function highlightActiveTOCItem(headings) {
        const tocLinks = document.querySelectorAll('.toc-item a');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    tocLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            rootMargin: '-100px 0px -66%'
        });

        headings.forEach(heading => observer.observe(heading));
    }

    // --- READING PROGRESS BAR ---
    function initReadingProgress() {
        const progressBar = document.getElementById('reading-progress-bar');
        if (!progressBar) return;

        window.addEventListener('scroll', () => {
            const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (window.scrollY / windowHeight) * 100;
            progressBar.style.width = `${scrolled}%`;
        });
    }

    // --- ENHANCED SOCIAL SHARING ---
    function initSocialSharing() {
        const shareButtons = document.querySelectorAll('.social-share-btn');
        const currentUrl = window.location.href;
        const currentTitle = document.title;
        const metaDescription = document.querySelector('meta[name="description"]')?.content || '';

        shareButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const platform = btn.classList[1]; // twitter, linkedin, etc.
                shareOnPlatform(platform, currentUrl, currentTitle, metaDescription);
            });
        });
    }

    function shareOnPlatform(platform, url, title, description) {
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);
        const encodedDescription = encodeURIComponent(description);

        let shareUrl = '';

        switch(platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'reddit':
                shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`;
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }

    // --- RELATED POSTS ---
    function loadRelatedPosts(currentPostSlug, currentCategories) {
        const relatedContainer = document.getElementById('related-posts-grid');
        if (!relatedContainer) return;

        // This will be implemented in post.html with Firebase
        // For now, show placeholder
        relatedContainer.innerHTML = '<p>Loading related posts...</p>';
    }

    // --- PRINT FUNCTIONALITY ---
    function initPrint() {
        const printBtn = document.getElementById('print-post');
        if (!printBtn) return;

        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // --- COPY LINK FUNCTIONALITY ---
    function initCopyLink() {
        const copyLinkBtn = document.getElementById('copy-link');
        if (!copyLinkBtn) return;

        copyLinkBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                showToast('Link copied to clipboard!', 'success');
            } catch (err) {
                showToast('Failed to copy link', 'error');
            }
        });
    }

    function showToast(message, type) {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }

    // --- SMOOTH SCROLL FOR ANCHORS ---
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

    // --- INITIALIZE ALL ---
    function init() {
        generateTableOfContents();
        initReadingProgress();
        initSocialSharing();
        initPrint();
        initCopyLink();
        initSmoothScroll();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions
    window.PostEnhanced = {
        generateTableOfContents,
        shareOnPlatform
    };

})();

