/**
 * Epplicon Technologies - Enhanced Admin Panel JavaScript
 * Advanced CMS features and functionality
 */

(function() {
    'use strict';

    // --- DASHBOARD STATISTICS ---
    function initDashboardStats() {
        // This will be called from admin.html after Firebase is initialized
        // Statistics are calculated from actual data
    }

    function calculateStats(posts, categories) {
        const totalPosts = posts.length;
        const publishedPosts = posts.filter(p => p.isPublished).length;
        const draftPosts = totalPosts - publishedPosts;
        const totalCategories = categories.length;

        return {
            totalPosts,
            publishedPosts,
            draftPosts,
            totalCategories
        };
    }

    // --- AUTO-SAVE FUNCTIONALITY ---
    function initAutoSave(quill, formInputs, saveCallback) {
        let autoSaveTimer;
        const indicator = document.getElementById('auto-save-indicator');
        
        if (!indicator) return;

        const save = () => {
            if (indicator) {
                indicator.classList.add('show', 'saving');
                indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving draft...';
            }
            
            // Call the save callback
            if (saveCallback) {
                saveCallback().then(() => {
                    if (indicator) {
                        indicator.classList.remove('saving');
                        indicator.innerHTML = '<i class="fas fa-check"></i> Draft saved';
                        setTimeout(() => {
                            indicator.classList.remove('show');
                        }, 2000);
                    }
                }).catch(() => {
                    if (indicator) {
                        indicator.classList.remove('saving');
                        indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Save failed';
                        setTimeout(() => {
                            indicator.classList.remove('show');
                        }, 3000);
                    }
                });
            }
        };

        // Auto-save on content change
        if (quill) {
            quill.on('text-change', () => {
                clearTimeout(autoSaveTimer);
                autoSaveTimer = setTimeout(save, 2000); // Save after 2 seconds of inactivity
            });
        }

        // Auto-save on form input change
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(autoSaveTimer);
                autoSaveTimer = setTimeout(save, 2000);
            });
        });
    }

    // --- POST PREVIEW ---
    function initPostPreview() {
        const previewBtns = document.querySelectorAll('.preview-post-btn');
        const previewModal = document.getElementById('preview-modal');
        const previewClose = document.getElementById('preview-close');
        const previewContent = document.getElementById('preview-content');

        if (!previewModal) return;

        previewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = btn.dataset.id;
                loadPostPreview(postId);
            });
        });

        if (previewClose) {
            previewClose.addEventListener('click', () => {
                previewModal.classList.add('hidden');
            });
        }

        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                previewModal.classList.add('hidden');
            }
        });
    }

    function loadPostPreview(postId) {
        // This will be implemented in admin.html with Firebase
        const previewModal = document.getElementById('preview-modal');
        const previewContent = document.getElementById('preview-content');
        
        if (previewModal && previewContent) {
            previewModal.classList.remove('hidden');
            previewContent.innerHTML = '<div class="spinner"></div>';
            // Load post data and render preview
        }
    }

    // --- BULK ACTIONS ---
    function initBulkActions() {
        const selectAllCheckbox = document.getElementById('select-all-posts');
        const postCheckboxes = document.querySelectorAll('.post-checkbox');
        const bulkActionsBar = document.getElementById('bulk-actions');
        const bulkDeleteBtn = document.getElementById('bulk-delete');
        const bulkPublishBtn = document.getElementById('bulk-publish');
        const bulkUnpublishBtn = document.getElementById('bulk-unpublish');

        if (!selectAllCheckbox) return;

        // Select all functionality
        selectAllCheckbox.addEventListener('change', (e) => {
            postCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                updatePostSelection(checkbox);
            });
            updateBulkActionsBar();
        });

        // Individual checkbox changes
        postCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updatePostSelection(checkbox);
                updateBulkActionsBar();
                updateSelectAllState();
            });
        });

        // Bulk delete
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                const selectedIds = getSelectedPostIds();
                if (selectedIds.length > 0) {
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} post(s)?`)) {
                        bulkDeletePosts(selectedIds);
                    }
                }
            });
        }

        // Bulk publish
        if (bulkPublishBtn) {
            bulkPublishBtn.addEventListener('click', () => {
                const selectedIds = getSelectedPostIds();
                if (selectedIds.length > 0) {
                    bulkUpdateStatus(selectedIds, true);
                }
            });
        }

        // Bulk unpublish
        if (bulkUnpublishBtn) {
            bulkUnpublishBtn.addEventListener('click', () => {
                const selectedIds = getSelectedPostIds();
                if (selectedIds.length > 0) {
                    bulkUpdateStatus(selectedIds, false);
                }
            });
        }
    }

    function updatePostSelection(checkbox) {
        const postItem = checkbox.closest('.post-item');
        if (checkbox.checked) {
            postItem.classList.add('selected');
        } else {
            postItem.classList.remove('selected');
        }
    }

    function updateBulkActionsBar() {
        const bulkActionsBar = document.getElementById('bulk-actions');
        const selectedCount = getSelectedPostIds().length;
        
        if (bulkActionsBar) {
            if (selectedCount > 0) {
                bulkActionsBar.classList.remove('hidden');
                const countSpan = bulkActionsBar.querySelector('.selected-count');
                if (countSpan) {
                    countSpan.textContent = `${selectedCount} selected`;
                }
            } else {
                bulkActionsBar.classList.add('hidden');
            }
        }
    }

    function updateSelectAllState() {
        const selectAllCheckbox = document.getElementById('select-all-posts');
        const postCheckboxes = document.querySelectorAll('.post-checkbox');
        const checkedCount = Array.from(postCheckboxes).filter(cb => cb.checked).length;
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = checkedCount === postCheckboxes.length && postCheckboxes.length > 0;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < postCheckboxes.length;
        }
    }

    function getSelectedPostIds() {
        const checkedBoxes = document.querySelectorAll('.post-checkbox:checked');
        return Array.from(checkedBoxes).map(cb => cb.dataset.id);
    }

    function bulkDeletePosts(ids) {
        // This will be implemented in admin.html with Firebase
        console.log('Bulk delete:', ids);
    }

    function bulkUpdateStatus(ids, isPublished) {
        // This will be implemented in admin.html with Firebase
        console.log('Bulk update status:', ids, isPublished);
    }

    // --- SEARCH & FILTER ---
    function initPostSearch() {
        const searchInput = document.getElementById('post-search');
        const statusFilter = document.getElementById('status-filter');
        const categoryFilter = document.getElementById('category-filter');
        const authorFilter = document.getElementById('author-filter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterPosts(e.target.value, statusFilter?.value, categoryFilter?.value, authorFilter?.value);
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                filterPosts(searchInput?.value, statusFilter.value, categoryFilter?.value, authorFilter?.value);
            });
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                filterPosts(searchInput?.value, statusFilter?.value, categoryFilter.value, authorFilter?.value);
            });
        }

        if (authorFilter) {
            authorFilter.addEventListener('change', () => {
                filterPosts(searchInput?.value, statusFilter?.value, categoryFilter?.value, authorFilter.value);
            });
        }
    }

    function filterPosts(searchTerm, status, category, author) {
        const postItems = document.querySelectorAll('.post-item');
        const searchLower = searchTerm?.toLowerCase() || '';

        postItems.forEach(item => {
            const title = item.querySelector('h3')?.textContent.toLowerCase() || '';
            const postStatus = item.querySelector('.badge')?.textContent.toLowerCase() || '';
            const postCategory = item.querySelector('small')?.textContent.toLowerCase() || '';
            const postAuthor = item.closest('.post-author-group')?.querySelector('h2')?.textContent.toLowerCase() || '';

            const matchesSearch = !searchTerm || title.includes(searchLower);
            const matchesStatus = !status || postStatus.includes(status.toLowerCase());
            const matchesCategory = !category || postCategory.includes(category.toLowerCase());
            const matchesAuthor = !author || postAuthor.includes(author.toLowerCase());

            if (matchesSearch && matchesStatus && matchesCategory && matchesAuthor) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        // Hide empty author groups
        document.querySelectorAll('.post-author-group').forEach(group => {
            const visiblePosts = group.querySelectorAll('.post-item[style=""]').length;
            if (visiblePosts === 0) {
                group.style.display = 'none';
            } else {
                group.style.display = '';
            }
        });
    }

    // --- IMAGE UPLOAD PREVIEW ---
    function initImagePreview() {
        const imageInputs = document.querySelectorAll('input[type="file"][accept="image/*"]');
        
        imageInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        showImagePreview(input, event.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }

    function showImagePreview(input, imageSrc) {
        let previewContainer = input.parentElement.querySelector('.image-upload-preview');
        
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.className = 'image-upload-preview';
            input.parentElement.appendChild(previewContainer);
        }

        previewContainer.innerHTML = `
            <img src="${imageSrc}" alt="Preview">
            <button type="button" class="remove-image" aria-label="Remove image">
                <i class="fas fa-times"></i>
            </button>
        `;

        const removeBtn = previewContainer.querySelector('.remove-image');
        removeBtn.addEventListener('click', () => {
            previewContainer.remove();
            input.value = '';
        });
    }

    // --- INITIALIZE ALL ---
    function init() {
        initPostSearch();
        initImagePreview();
        initBulkActions();
        initPostPreview();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions for use in admin.html
    window.AdminEnhanced = {
        initAutoSave,
        calculateStats,
        filterPosts
    };

})();

