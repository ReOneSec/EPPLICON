/**
 * Epplicon Technologies - Enhanced Blog JavaScript
 * Advanced blog features and functionality
 */

(function() {
    'use strict';

    // --- READING TIME CALCULATOR ---
    function calculateReadingTime(text) {
        const wordsPerMinute = 200;
        const words = text.split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return minutes;
    }

    function updateReadingTime() {
        const postCards = document.querySelectorAll('.blog-card-enhanced');
        postCards.forEach(card => {
            const excerpt = card.querySelector('p')?.textContent || '';
            const readingTime = calculateReadingTime(excerpt);
            const timeBadge = card.querySelector('.reading-time-badge');
            if (timeBadge) {
                timeBadge.textContent = `${readingTime} min read`;
            }
        });
    }

    // --- ENHANCED SEARCH WITH SUGGESTIONS ---
    function initEnhancedSearch() {
        const searchInput = document.getElementById('blog-search-enhanced');
        const suggestionsContainer = document.getElementById('search-suggestions');
        
        if (!searchInput) return;

        let searchTimeout;
        const allPosts = [];

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 2) {
                if (suggestionsContainer) {
                    suggestionsContainer.classList.remove('show');
                }
                return;
            }

            searchTimeout = setTimeout(() => {
                showSearchSuggestions(query, allPosts);
            }, 300);
        });

        searchInput.addEventListener('focus', () => {
            if (suggestionsContainer && suggestionsContainer.querySelector('.search-suggestion-item')) {
                suggestionsContainer.classList.add('show');
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer?.contains(e.target)) {
                if (suggestionsContainer) {
                    suggestionsContainer.classList.remove('show');
                }
            }
        });
    }

    function showSearchSuggestions(query, posts) {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (!suggestionsContainer) return;

        const queryLower = query.toLowerCase();
        const matches = posts.filter(post => 
            post.title.toLowerCase().includes(queryLower) ||
            post.excerpt?.toLowerCase().includes(queryLower)
        ).slice(0, 5);

        if (matches.length === 0) {
            suggestionsContainer.innerHTML = '<div class="search-suggestion-item">No results found</div>';
        } else {
            suggestionsContainer.innerHTML = matches.map(post => `
                <div class="search-suggestion-item" data-slug="${post.slug}">
                    <strong>${highlightMatch(post.title, query)}</strong>
                    <small>${post.excerpt?.substring(0, 60)}...</small>
                </div>
            `).join('');

            // Add click handlers
            suggestionsContainer.querySelectorAll('.search-suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    window.location.href = `post.html?slug=${item.dataset.slug}`;
                });
            });
        }

        suggestionsContainer.classList.add('show');
    }

    function highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // --- VIEW TOGGLE (GRID/LIST) ---
    function initViewToggle() {
        const gridBtn = document.getElementById('view-grid');
        const listBtn = document.getElementById('view-list');
        const blogGrid = document.getElementById('blog-grid-container');

        if (!gridBtn || !listBtn || !blogGrid) return;

        gridBtn.addEventListener('click', () => {
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
            blogGrid.classList.remove('list-view');
            blogGrid.classList.add('grid-view');
            localStorage.setItem('blog-view', 'grid');
        });

        listBtn.addEventListener('click', () => {
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
            blogGrid.classList.remove('grid-view');
            blogGrid.classList.add('list-view');
            localStorage.setItem('blog-view', 'list');
        });

        // Restore saved view
        const savedView = localStorage.getItem('blog-view') || 'grid';
        if (savedView === 'list') {
            listBtn.click();
        } else {
            gridBtn.click();
        }
    }

    // --- SORT FUNCTIONALITY ---
    function initSort() {
        const sortSelect = document.getElementById('sort-posts');
        if (!sortSelect) return;

        sortSelect.addEventListener('change', (e) => {
            const sortBy = e.target.value;
            sortPosts(sortBy);
            localStorage.setItem('blog-sort', sortBy);
        });

        // Restore saved sort
        const savedSort = localStorage.getItem('blog-sort');
        if (savedSort) {
            sortSelect.value = savedSort;
        }
    }

    function sortPosts(sortBy) {
        const blogGrid = document.getElementById('blog-grid-container');
        if (!blogGrid) return;

        const cards = Array.from(blogGrid.querySelectorAll('.blog-card-enhanced'));
        
        cards.sort((a, b) => {
            switch(sortBy) {
                case 'newest':
                    return new Date(b.dataset.date || 0) - new Date(a.dataset.date || 0);
                case 'oldest':
                    return new Date(a.dataset.date || 0) - new Date(b.dataset.date || 0);
                case 'title-asc':
                    return a.querySelector('h3')?.textContent.localeCompare(b.querySelector('h3')?.textContent || '');
                case 'title-desc':
                    return b.querySelector('h3')?.textContent.localeCompare(a.querySelector('h3')?.textContent || '');
                default:
                    return 0;
            }
        });

        cards.forEach(card => blogGrid.appendChild(card));
    }

    // --- INFINITE SCROLL (Optional) ---
    function initInfiniteScroll() {
        let isLoading = false;
        
        window.addEventListener('scroll', () => {
            if (isLoading) return;

            const scrollHeight = document.documentElement.scrollHeight;
            const scrollTop = document.documentElement.scrollTop;
            const clientHeight = document.documentElement.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - 100) {
                isLoading = true;
                loadMorePosts().finally(() => {
                    isLoading = false;
                });
            }
        });
    }

    function loadMorePosts() {
        // This will be implemented in blog.html with Firebase pagination
        return Promise.resolve();
    }

    // --- INITIALIZE ALL ---
    function init() {
        updateReadingTime();
        initEnhancedSearch();
        initViewToggle();
        initSort();
        // initInfiniteScroll(); // Optional
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions
    window.BlogEnhanced = {
        calculateReadingTime,
        sortPosts
    };

})();

