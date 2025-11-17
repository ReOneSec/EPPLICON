/**
 * Epplicon Technologies - Enhanced Post Editor
 * Better UX for content creation
 */

(function() {
    'use strict';

    // --- CHARACTER/WORD COUNTER ---
    function initWordCounter() {
        const quillCheck = setInterval(() => {
            if (typeof quill !== 'undefined' && quill) {
                clearInterval(quillCheck);
                
                const editorContainer = document.getElementById('editor-container');
                if (!editorContainer) return;
                
                // Create counter display
                const counterDiv = document.createElement('div');
                counterDiv.id = 'word-counter';
                counterDiv.style.cssText = `
                    position: absolute;
                    bottom: 10px;
                    right: 15px;
                    background: rgba(13, 110, 253, 0.9);
                    color: #fff;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    z-index: 10;
                    pointer-events: none;
                `;
                
                editorContainer.parentElement.style.position = 'relative';
                editorContainer.parentElement.appendChild(counterDiv);
                
                // Update counter
                function updateCounter() {
                    const text = quill.getText();
                    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
                    const chars = text.length;
                    counterDiv.textContent = `${words} words • ${chars} characters`;
                }
                
                quill.on('text-change', updateCounter);
                updateCounter();
            }
        }, 100);
        
        // Clear interval after 10 seconds if Quill not found
        setTimeout(() => clearInterval(quillCheck), 10000);
    }

    // --- TITLE TO SLUG AUTO-GENERATION ---
    function initTitleSlugSync() {
        const titleInput = document.getElementById('post-title');
        const slugInput = document.getElementById('post-slug');
        
        if (titleInput && slugInput) {
            let isManualSlug = false;
            
            // Check if slug was manually edited
            slugInput.addEventListener('input', () => {
                isManualSlug = true;
            });
            
            // Auto-generate slug from title
            titleInput.addEventListener('input', (e) => {
                if (!isManualSlug && !document.getElementById('post-id').value) {
                    const slug = e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/&/g, 'and')
                        .replace(/[^\w\s-]/g, '')
                        .replace(/[\s_-]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                    slugInput.value = slug || '(Will be generated on save)';
                }
            });
        }
    }

    // --- EDITOR TOOLBAR ENHANCEMENTS ---
    function enhanceEditorToolbar() {
        const toolbar = document.querySelector('.ql-toolbar');
        if (!toolbar) return;
        
        // Add custom buttons
        const customButtons = document.createElement('div');
        customButtons.style.cssText = 'display: inline-flex; gap: 0.5rem; margin-left: 1rem;';
        
        customButtons.innerHTML = `
            <button type="button" class="ql-custom" title="Full Screen" onclick="toggleFullScreenEditor()">
                <i class="fas fa-expand"></i>
            </button>
            <button type="button" class="ql-custom" title="Preview" onclick="previewPost()">
                <i class="fas fa-eye"></i>
            </button>
        `;
        
        toolbar.appendChild(customButtons);
    }

    // --- FULL SCREEN EDITOR ---
    window.toggleFullScreenEditor = function() {
        const editorView = document.getElementById('post-editor-view');
        if (!editorView) return;
        
        if (!editorView.classList.contains('fullscreen')) {
            editorView.classList.add('fullscreen');
            editorView.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                background: #fff;
                overflow-y: auto;
                padding: 2rem;
            `;
            document.body.style.overflow = 'hidden';
        } else {
            editorView.classList.remove('fullscreen');
            editorView.style.cssText = '';
            document.body.style.overflow = '';
        }
    };

    // --- POST PREVIEW ---
    window.previewPost = function() {
        if (typeof quill === 'undefined' || !quill) return;
        
        const title = document.getElementById('post-title').value || 'Untitled Post';
        const content = quill.root.innerHTML;
        const excerpt = document.getElementById('post-excerpt').value || '';
        
        const previewWindow = window.open('', 'Preview', 'width=800,height=600');
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title} - Preview</title>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Poppins', sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 2rem;
                        line-height: 1.8;
                        background: #f5f7fa;
                    }
                    h1 { color: #0a192f; margin-bottom: 1rem; }
                    .excerpt { color: #6c757d; font-size: 1.1rem; margin-bottom: 2rem; font-style: italic; }
                    .content { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                    .content img { max-width: 100%; height: auto; border-radius: 8px; }
                    .content h2 { color: #0d6efd; margin-top: 2rem; }
                    .content blockquote { border-left: 4px solid #0d6efd; padding-left: 1rem; margin: 1.5rem 0; color: #6c757d; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${excerpt ? `<p class="excerpt">${excerpt}</p>` : ''}
                <div class="content">${content}</div>
            </body>
            </html>
        `);
        previewWindow.document.close();
    };

    // --- AUTOSAVE INDICATOR ---
    function createAutosaveIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'autosave-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 300px;
            background: linear-gradient(135deg, #51cf66, #37b24d);
            color: #fff;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 4px 20px rgba(81, 207, 102, 0.3);
            display: none;
            align-items: center;
            gap: 0.5rem;
            z-index: 998;
        `;
        
        indicator.innerHTML = '<i class="fas fa-check"></i> <span>All changes saved</span>';
        document.body.appendChild(indicator);
        
        return indicator;
    }

    // --- INITIALIZE ALL ---
    function init() {
        const editorView = document.getElementById('post-editor-view');
        if (editorView) {
            // Wait a bit for Quill to initialize
            setTimeout(() => {
                initWordCounter();
                enhanceEditorToolbar();
                initTitleSlugSync();
                createAutosaveIndicator();
            }, 1000);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

