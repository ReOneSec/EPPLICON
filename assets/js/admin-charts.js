/**
 * Epplicon Technologies - Admin Dashboard Charts & Visualizations
 * Visual analytics for better insights
 */

(function() {
    'use strict';

    // --- CREATE ACTIVITY CHART ---
    function createActivityChart(posts) {
        const activitySection = document.createElement('div');
        activitySection.className = 'dashboard-card';
        activitySection.style.cssText = 'background: #fff; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem;';
        
        // Group posts by month
        const monthlyData = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        posts.forEach(post => {
            if (post.createdAt) {
                const date = post.createdAt.toDate();
                const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
            }
        });
        
        const chartData = Object.entries(monthlyData).slice(-6); // Last 6 months
        const maxValue = Math.max(...chartData.map(([, count]) => count)) || 1;
        
        activitySection.innerHTML = `
            <h3 style="margin-bottom: 1.5rem; color: var(--primary-color);">
                <i class="fas fa-chart-bar"></i> Publishing Activity
            </h3>
            <div style="display: flex; align-items: flex-end; gap: 1rem; height: 200px; padding: 1rem; background: var(--background-color); border-radius: 12px;">
                ${chartData.map(([month, count]) => {
                    const height = (count / maxValue) * 100;
                    return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                            <div style="width: 100%; height: ${height}%; min-height: 20px; background: linear-gradient(180deg, var(--primary-color), #4dabf7); border-radius: 8px 8px 0 0; transition: all 0.3s; cursor: pointer; position: relative;" 
                                 onmouseenter="this.style.transform='scaleY(1.05)'" 
                                 onmouseleave="this.style.transform='scaleY(1)'"
                                 title="${count} post${count !== 1 ? 's' : ''}">
                                <span style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); font-weight: 600; color: var(--primary-color);">${count}</span>
                            </div>
                            <small style="font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap;">${month}</small>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        return activitySection;
    }

    // --- CREATE CATEGORY DISTRIBUTION ---
    function createCategoryDistribution(posts, categories) {
        const distSection = document.createElement('div');
        distSection.className = 'dashboard-card';
        distSection.style.cssText = 'background: #fff; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);';
        
        const categoryCount = {};
        categories.forEach(cat => {
            categoryCount[cat.name] = 0;
        });
        
        posts.forEach(post => {
            if (post.categoryIds) {
                post.categoryIds.forEach(catId => {
                    const cat = categories.find(c => c.id === catId);
                    if (cat) {
                        categoryCount[cat.name] = (categoryCount[cat.name] || 0) + 1;
                    }
                });
            }
        });
        
        const sortedCategories = Object.entries(categoryCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
        
        const colors = [
            'linear-gradient(135deg, #667eea, #764ba2)',
            'linear-gradient(135deg, #f093fb, #f5576c)',
            'linear-gradient(135deg, #4facfe, #00f2fe)',
            'linear-gradient(135deg, #fa709a, #fee140)',
            'linear-gradient(135deg, #30cfd0, #330867)'
        ];
        
        const maxCount = Math.max(...sortedCategories.map(([, count]) => count)) || 1;
        
        distSection.innerHTML = `
            <h3 style="margin-bottom: 1.5rem; color: var(--primary-color);">
                <i class="fas fa-chart-pie"></i> Top Categories
            </h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${sortedCategories.map(([name, count], index) => {
                    const percentage = (count / maxCount) * 100;
                    return `
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="font-weight: 600;">${name}</span>
                                <span style="color: var(--text-secondary);">${count} post${count !== 1 ? 's' : ''}</span>
                            </div>
                            <div style="width: 100%; height: 12px; background: var(--background-color); border-radius: 6px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: ${colors[index]}; border-radius: 6px; transition: width 1s ease;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        return distSection;
    }

    // --- CREATE RECENT ACTIVITY FEED ---
    function createRecentActivity(posts) {
        const activityFeed = document.createElement('div');
        activityFeed.className = 'dashboard-card';
        activityFeed.style.cssText = 'background: #fff; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);';
        
        const recentPosts = posts
            .sort((a, b) => {
                const aDate = a.updatedAt || a.createdAt;
                const bDate = b.updatedAt || b.createdAt;
                return (bDate?.toDate() || 0) - (aDate?.toDate() || 0);
            })
            .slice(0, 5);
        
        activityFeed.innerHTML = `
            <h3 style="margin-bottom: 1.5rem; color: var(--primary-color);">
                <i class="fas fa-clock"></i> Recent Activity
            </h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${recentPosts.map(post => {
                    const date = post.updatedAt || post.createdAt;
                    const timeAgo = date ? getTimeAgo(date.toDate()) : 'Recently';
                    const status = post.isPublished ? 'published' : 'draft';
                    return `
                        <div style="padding: 1rem; background: var(--background-color); border-radius: 10px; border-left: 4px solid ${post.isPublished ? '#51cf66' : '#ffd43b'}; transition: all 0.3s; cursor: pointer;"
                             onmouseenter="this.style.transform='translateX(5px)'"
                             onmouseleave="this.style.transform='translateX(0)'">
                            <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                                <div style="flex: 1;">
                                    <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">${escapeHtml(post.title || 'Untitled')}</h4>
                                    <small style="color: var(--text-secondary);">
                                        <i class="fas fa-clock"></i> ${timeAgo}
                                    </small>
                                </div>
                                <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: ${post.isPublished ? 'rgba(81, 207, 102, 0.2)' : 'rgba(255, 212, 59, 0.2)'}; color: ${post.isPublished ? '#37b24d' : '#fab005'};">
                                    ${status}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        return activityFeed;
    }

    // --- HELPER: TIME AGO ---
    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        
        return 'Just now';
    }

    // --- HELPER: ESCAPE HTML ---
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- INJECT CHARTS INTO DASHBOARD ---
    async function enhanceDashboard() {
        const dashboardView = document.getElementById('dashboard-view');
        if (!dashboardView) return;
        
        // Check if charts already exist
        if (dashboardView.querySelector('.dashboard-card')) return;
        
        try {
            // Wait for Firebase to be available
            if (typeof db === 'undefined') {
                console.log('Waiting for Firebase...');
                setTimeout(enhanceDashboard, 1000);
                return;
            }
            
            // Get posts and categories
            const postsSnapshot = await getDocs(collection(db, 'posts'));
            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            
            const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Create charts container
            const chartsContainer = document.createElement('div');
            chartsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin-top: 2rem;';
            
            // Add charts
            if (posts.length > 0) {
                chartsContainer.appendChild(createActivityChart(posts));
                chartsContainer.appendChild(createRecentActivity(posts));
            }
            
            if (categories.length > 0 && posts.length > 0) {
                chartsContainer.appendChild(createCategoryDistribution(posts, categories));
            }
            
            // Insert after quick actions
            const quickActions = dashboardView.querySelector('.quick-actions');
            if (quickActions) {
                quickActions.after(chartsContainer);
            }
            
        } catch (error) {
            console.error('Error enhancing dashboard:', error);
        }
    }

    // --- INITIALIZE ---
    function init() {
        // Wait for dashboard to be visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.id === 'dashboard-view' && !mutation.target.classList.contains('hidden')) {
                    enhanceDashboard();
                }
            });
        });
        
        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView) {
            observer.observe(dashboardView, { attributes: true, attributeFilter: ['class'] });
            
            // Also try immediately if already visible
            if (!dashboardView.classList.contains('hidden')) {
                setTimeout(enhanceDashboard, 1000);
            }
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

