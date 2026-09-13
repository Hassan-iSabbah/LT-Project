// /js/goals.js
(function($) {
    'use strict';

    window.GoalsModule = {
        // ============================================================
        // STATE
        // ============================================================

        state: {
            goals: [],
            currentGoal: null,
            filters: {
                status: 'all',
                category: 'all',
                archived: 0
            },
            isLoading: false
        },

        // ============================================================
        // LIFECYCLE
        // ============================================================

        init: function() {
            console.log('🎯 GoalsModule initializing...');
            this.render();
            this.bindEvents();
        },

        render: function() {
            console.log('🎯 GoalsModule.render() called');
            this.fetchGoals();
        },

        destroy: function() {
            console.log('🎯 GoalsModule.destroy() called');
        },

        // ============================================================
        // DATA METHODS
        // ============================================================

        fetchGoals: function() {
            const self = this;
            this.state.isLoading = true;

            const params = new URLSearchParams({
                status: this.state.filters.status,
                category: this.state.filters.category,
                archived: this.state.filters.archived
            });

            const apiUrl = window.BASE_PATH + 'public/api/goals.php?' + params.toString();
            console.log('📡 Fetching goals from:', apiUrl);

            $.ajax({
                url: apiUrl,
                method: 'GET',
                dataType: 'json'
            }).done(function(response) {
                console.log('✅ Goals loaded:', response.length);
                self.state.goals = response;
                self.state.isLoading = false;
                self.renderList();
            }).fail(function(xhr) {
                console.error('❌ Failed to load goals:', xhr.responseText);
                self.state.isLoading = false;
                $('#goals-container').html('<div style="padding:40px;text-align:center;color:#8B949E;">Failed to load goals. Check console.</div>');
            });
        },

        fetchGoal: function(id) {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php?id=' + id;

            $.ajax({
                url: apiUrl,
                method: 'GET',
                dataType: 'json'
            }).done(function(response) {
                console.log('✅ Goal loaded:', response);
                self.state.currentGoal = response;
                self.renderDetail(response);
            }).fail(function(xhr) {
                console.error('❌ Failed to load goal:', xhr.responseText);
            });
        },

        createGoal: function(data) {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php';

            $.ajax({
                url: apiUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    console.log('✅ Goal created:', response.id);
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('🎯 Goal created successfully!', 'success');
                    }
                    self.closeModal();
                    self.fetchGoals();
                } else {
                    console.error('❌ Failed to create goal');
                }
            }).fail(function(xhr) {
                console.error('❌ Error creating goal:', xhr.responseText);
            });
        },

        updateGoal: function(id, data) {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php?id=' + id;

            $.ajax({
                url: apiUrl,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(data),
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    console.log('✅ Goal updated:', id);
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('🎯 Goal updated!', 'success');
                    }
                    self.closeModal();
                    self.fetchGoals();
                } else {
                    console.error('❌ Failed to update goal');
                }
            }).fail(function(xhr) {
                console.error('❌ Error updating goal:', xhr.responseText);
            });
        },

        deleteGoal: function(id) {
            const self = this;
            if (!confirm('Delete this goal and all its sub-goals?')) return;

            const apiUrl = window.BASE_PATH + 'public/api/goals.php?id=' + id;

            $.ajax({
                url: apiUrl,
                method: 'DELETE',
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    console.log('🗑️ Goal deleted:', id);
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('🎯 Goal deleted.', 'info');
                    }
                    self.fetchGoals();
                } else {
                    console.error('❌ Failed to delete goal');
                }
            }).fail(function(xhr) {
                console.error('❌ Error deleting goal:', xhr.responseText);
            });
        },

        archiveGoal: function(id) {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php?action=archive&id=' + id + '&archived=1';

            $.ajax({
                url: apiUrl,
                method: 'POST',
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    console.log('📦 Goal archived:', id);
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('📦 Goal archived.', 'info');
                    }
                    self.fetchGoals();
                } else {
                    console.error('❌ Failed to archive goal');
                }
            }).fail(function(xhr) {
                console.error('❌ Error archiving goal:', xhr.responseText);
            });
        },

        // ============================================================
        // NEGLECTED EVENTS WIDGET
        // ============================================================

        fetchNeglectedEvents: function() {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php?action=neglected';

            $.ajax({
                url: apiUrl,
                method: 'GET',
                dataType: 'json'
            }).done(function(response) {
                self.renderNeglectedWidget(response);
            }).fail(function() {
                console.warn('⚠️ Could not load neglected events.');
            });
        },

        renderNeglectedWidget: function(data) {
            const container = $('#goals-container');
            if (!container.length) return;

            const goals = data.goals || [];
            const events = data.events || [];

            // Remove any existing widget
            $('.neglected-widget').remove();

            if (goals.length === 0 && events.length === 0) {
                return;
            }

            let widgetHtml = `
                <div class="neglected-widget" style="
                    margin-bottom: 20px;
                    padding: 16px 20px;
                    background: rgba(248, 81, 73, 0.08);
                    border: 1px solid rgba(248, 81, 73, 0.25);
                    border-radius: 10px;
                    border-left: 4px solid #F85149;
                ">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <span style="font-size: 1.4rem;">⚠️</span>
                        <div>
                            <h3 style="color: #F85149; margin: 0; font-size: 1rem; font-weight: 700;">At Risk Goals</h3>
                            <p style="color: #8B949E; margin: 0; font-size: 0.8rem;">
                                ${events.length} neglected event${events.length !== 1 ? 's' : ''} across ${goals.length} goal${goals.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button class="neglected-dismiss" style="
                            margin-left: auto;
                            padding: 4px 12px;
                            background: rgba(255,255,255,0.06);
                            color: #8B949E;
                            border: 1px solid #30363D;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.7rem;
                        ">Dismiss</button>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            `;

            goals.forEach(goal => {
                const color = goal.color_hex || '#58A6FF';
                widgetHtml += `
                    <button class="neglected-goal-btn" data-goal-id="${goal.id}" style="
                        padding: 4px 14px;
                        background: rgba(255,255,255,0.04);
                        border: 1px solid #30363D;
                        border-radius: 20px;
                        color: #F0F6FC;
                        font-size: 0.75rem;
                        cursor: pointer;
                        transition: 0.15s;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color};"></span>
                        ${this.escapeHtml(goal.title)}
                        <span style="background: rgba(248,81,73,0.2); color: #F85149; padding: 0 6px; border-radius: 10px; font-size: 0.6rem; font-weight:600;">
                            ${goal.neglected_count}
                        </span>
                    </button>
                `;
            });

            widgetHtml += `
                    </div>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #30363D;">
                        <button class="neglected-view-all" style="
                            padding: 4px 12px;
                            background: transparent;
                            color: #58A6FF;
                            border: 1px solid #58A6FF;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.7rem;
                        ">View All Neglected Events</button>
                    </div>
                </div>
            `;

            const header = container.find('.goals-header');
            if (header.length) {
                header.after(widgetHtml);
            } else {
                container.prepend(widgetHtml);
            }

            this.bindNeglectedEvents();
        },

        bindNeglectedEvents: function() {
            const self = this;

            $(document).on('click', '.neglected-goal-btn', function() {
                const id = $(this).data('goal-id');
                self.fetchGoal(id);
            });

            $(document).on('click', '.neglected-dismiss', function() {
                $('.neglected-widget').slideUp(300, function() {
                    $(this).remove();
                });
            });

            $(document).on('click', '.neglected-view-all', function() {
                self.showNeglectedEventsList();
            });
        },

        showNeglectedEventsList: function() {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php?action=neglected';

            $.ajax({
                url: apiUrl,
                method: 'GET',
                dataType: 'json'
            }).done(function(response) {
                self.renderNeglectedListModal(response);
            }).fail(function() {
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('❌ Failed to load neglected events.', 'error');
                }
            });
        },

        renderNeglectedListModal: function(data) {
            const events = data.events || [];

            $('#neglected-modal').remove();

            let modalHtml = `
                <div id="neglected-modal" class="form-overlay">
                    <div class="form-modal" style="max-width: 640px;">
                        <div class="form-header">
                            <h3>⚠️ Neglected Events</h3>
                            <button class="neglected-modal-close">&times;</button>
                        </div>
                        <div style="margin-bottom: 12px; color: #8B949E; font-size: 0.85rem;">
                            ${events.length} event${events.length !== 1 ? 's' : ''} past their scheduled date and still incomplete.
                        </div>
                        <div style="max-height: 400px; overflow-y: auto;">
            `;

            if (events.length === 0) {
                modalHtml += `
                    <div style="text-align:center; padding:40px; color:#8B949E;">
                        <span style="font-size:2rem; display:block; margin-bottom:8px;">🎉</span>
                        No neglected events! Great job.
                    </div>
                `;
            } else {
                events.forEach(event => {
                    const formattedDate = new Date(event.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    const hourLabel = Utils.formatHour(event.start_hour);
                    const color = event.color_hex || '#58A6FF';
                    const daysOverdue = Math.floor((Date.now() - new Date(event.event_date).getTime()) / (1000 * 60 * 60 * 24));

                    modalHtml += `
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 10px 12px;
                            border-bottom: 1px solid #21262D;
                            border-left: 3px solid ${color};
                            background: rgba(255,255,255,0.02);
                        ">
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:500; color:#F0F6FC; font-size:0.9rem;">
                                    ${this.escapeHtml(event.title)}
                                </div>
                                <div style="font-size:0.7rem; color:#8B949E;">
                                    ${formattedDate} · ${hourLabel} · ${event.category_name || 'Uncategorized'}
                                    ${event.goal_title ? `· 🎯 ${this.escapeHtml(event.goal_title)}` : ''}
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                                <span style="
                                    background: rgba(248,81,73,0.15);
                                    color: #F85149;
                                    padding: 2px 8px;
                                    border-radius: 12px;
                                    font-size: 0.6rem;
                                    font-weight:600;
                                ">${daysOverdue}d overdue</span>
                                <button class="neglected-complete-btn" data-event-id="${event.id}" style="
                                    padding: 4px 12px;
                                    font-size: 0.7rem;
                                    background: rgba(63,185,80,0.15);
                                    color: #3FB950;
                                    border: 1px solid #3FB950;
                                    border-radius: 4px;
                                    cursor: pointer;
                                ">✅ Complete</button>
                                <button class="neglected-view-btn" data-event-id="${event.id}" style="
                                    padding: 4px 12px;
                                    font-size: 0.7rem;
                                    background: rgba(88,166,255,0.15);
                                    color: #58A6FF;
                                    border: 1px solid #58A6FF;
                                    border-radius: 4px;
                                    cursor: pointer;
                                ">📋 View</button>
                            </div>
                        </div>
                    `;
                });
            }

            modalHtml += `
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary neglected-modal-close">Close</button>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
            $('#neglected-modal').show();

            $('.neglected-modal-close').on('click', function() {
                $('#neglected-modal').remove();
            });
            $('#neglected-modal').on('click', function(e) {
                if ($(e.target).is('#neglected-modal')) {
                    $('#neglected-modal').remove();
                }
            });

            $('.neglected-complete-btn').on('click', function() {
                const eventId = $(this).data('event-id');
                $.ajax({
                    url: window.BASE_PATH + 'public/api/events.php?action=toggle-complete&id=' + eventId,
                    method: 'POST',
                    dataType: 'json'
                }).done(function(response) {
                    if (response.success) {
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('✅ Event completed!', 'success');
                        }
                        $('#neglected-modal').remove();
                        GoalsModule.fetchNeglectedEvents();
                        GoalsModule.fetchGoals();
                    }
                });
            });

            $('.neglected-view-btn').on('click', function() {
                const eventId = $(this).data('event-id');
                window.location.href = window.BASE_PATH + '?page=calendar&view=task&id=' + eventId;
            });
        },

        // ============================================================
        // UI RENDER METHODS
        // ============================================================

        renderList: function() {
            const container = $('#goals-container');
            if (!container.length) return;

            // --- Fetch and render neglected events widget ---
            this.fetchNeglectedEvents();

            const goals = this.state.goals;
            const rootGoals = goals.filter(g => !g.parent_goal_id);

            let html = `
                <div class="goals-view">
                    <div class="goals-header">
                        <h2>🎯 Goals</h2>
                        <div class="goals-actions">
                            <button class="btn-add-goal">+ New Goal</button>
                        </div>
                    </div>
                    <div class="goals-filters">
                        <div class="filter-group">
                            <select class="goals-filter-status">
                                <option value="all" ${this.state.filters.status === 'all' ? 'selected' : ''}>All Status</option>
                                <option value="not_started" ${this.state.filters.status === 'not_started' ? 'selected' : ''}>Not Started</option>
                                <option value="in_progress" ${this.state.filters.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${this.state.filters.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <select class="goals-filter-category">
                                <option value="all" ${this.state.filters.category === 'all' ? 'selected' : ''}>All Categories</option>
                            </select>
                        </div>
                        <button class="goals-reset-filters">↺ Reset</button>
                    </div>
                    <div class="goals-list">
            `;

            if (rootGoals.length === 0) {
                html += `
                    <div class="goals-empty">
                        <div class="empty-icon">🎯</div>
                        <div class="empty-title">No Goals Yet</div>
                        <div class="empty-hint">Create your first goal to start tracking progress.</div>
                    </div>
                `;
            } else {
                rootGoals.forEach(goal => {
                    html += this.renderGoalCard(goal, goals);
                });
            }

            html += `
                    </div>
                </div>
            `;

            container.html(html);

            this.populateCategoryFilter();
        },

        renderGoalCard: function(goal, allGoals, level = 0) {
            const subGoals = allGoals.filter(g => g.parent_goal_id === goal.id);
            const hasSubGoals = subGoals.length > 0;
            const indent = level * 20;

            const statusLabels = {
                'not_started': 'Not Started',
                'in_progress': 'In Progress',
                'completed': 'Completed'
            };

            const statusColors = {
                'not_started': '#8B949E',
                'in_progress': '#D29922',
                'completed': '#3FB950'
            };

            const progress = parseFloat(goal.progress) || 0;
            const color = goal.color_hex || '#58A6FF';

            let html = `
                <div class="goal-card" data-goal-id="${goal.id}" style="margin-left: ${indent}px; border-left-color: ${color};">
                    <div class="goal-card-header">
                        <div class="goal-info">
                            <span class="goal-expand ${hasSubGoals ? 'has-children' : ''}" data-goal-id="${goal.id}">
                                ${hasSubGoals ? '▶' : '•'}
                            </span>
                            <span class="goal-title">${this.escapeHtml(goal.title)}</span>
                            <span class="goal-category" style="color: ${color};">${goal.category_name || 'Uncategorized'}</span>
                        </div>
                        <div class="goal-meta">
                            <span class="goal-status" style="color: ${statusColors[goal.status]};">
                                ${statusLabels[goal.status] || 'Not Started'}
                            </span>
                            <span class="goal-progress-text">${progress}%</span>
                        </div>
                    </div>
                    <div class="goal-card-body">
                        <div class="goal-progress-bar">
                            <div class="goal-progress-fill" style="width: ${progress}%; background: ${color};"></div>
                        </div>
                        ${goal.description ? `<div class="goal-description">${this.escapeHtml(goal.description)}</div>` : ''}
                    </div>
                    <div class="goal-card-actions">
                        <button class="goal-action-view" data-goal-id="${goal.id}">📋 View</button>
                        <button class="goal-action-edit" data-goal-id="${goal.id}">✏️ Edit</button>
                        <button class="goal-action-archive" data-goal-id="${goal.id}">📦 Archive</button>
                        <button class="goal-action-delete" data-goal-id="${goal.id}">🗑️ Delete</button>
                    </div>
                </div>
            `;

            if (hasSubGoals) {
                html += `<div class="goal-sub-list" data-parent="${goal.id}" style="display: block;">`;
                subGoals.forEach(sub => {
                    html += this.renderGoalCard(sub, allGoals, level + 1);
                });
                html += `</div>`;
            }

            return html;
        },

        renderDetail: function(goal) {
            const container = $('#goals-container');
            if (!container.length) return;

            const statusLabels = {
                'not_started': 'Not Started',
                'in_progress': 'In Progress',
                'completed': 'Completed'
            };

            const statusColors = {
                'not_started': '#8B949E',
                'in_progress': '#D29922',
                'completed': '#3FB950'
            };

            const progress = parseFloat(goal.progress) || 0;
            const color = goal.color_hex || '#58A6FF';
            const subGoals = goal.sub_goals || [];
            const linkedEvents = goal.linked_events || [];

            let html = `
                <div class="goals-detail-view">
                    <button class="goals-back-btn">⬅️ Back to List</button>
                    <div class="goal-detail-card" style="border-left-color: ${color};">
                        <div class="goal-detail-header">
                            <h2>${this.escapeHtml(goal.title)}</h2>
                            <span class="goal-status-badge" style="background: ${statusColors[goal.status]}22; color: ${statusColors[goal.status]};">
                                ${statusLabels[goal.status] || 'Not Started'}
                            </span>
                        </div>
                        ${goal.description ? `<div class="goal-detail-description">${this.escapeHtml(goal.description)}</div>` : ''}
                        <div class="goal-detail-progress">
                            <div class="goal-progress-label">Progress: ${progress}%</div>
                            <div class="goal-progress-bar large">
                                <div class="goal-progress-fill" style="width: ${progress}%; background: ${color};"></div>
                            </div>
                        </div>
                        <div class="goal-detail-meta">
                            <span>🏷️ ${goal.category_name || 'Uncategorized'}</span>
                            <span>📅 Created: ${new Date(goal.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="goal-detail-actions">
                            <button class="goal-action-add-sub" data-goal-id="${goal.id}">+ Add Sub-Goal</button>
                            <button class="goal-action-link-event" data-goal-id="${goal.id}">🔗 Link Event</button>
                            <button class="goal-action-edit" data-goal-id="${goal.id}">✏️ Edit</button>
                            <button class="goal-action-archive" data-goal-id="${goal.id}">📦 Archive</button>
                        </div>
                    </div>

                    ${subGoals.length > 0 ? `
                    <div class="goal-detail-subgoals">
                        <h3>📋 Sub-Goals (${subGoals.length})</h3>
                        ${subGoals.map(sub => `
                            <div class="goal-sub-item" data-goal-id="${sub.id}" style="border-left-color: ${sub.color_hex || '#58A6FF'};">
                                <span class="sub-title">${this.escapeHtml(sub.title)}</span>
                                <span class="sub-status" style="color: ${statusColors[sub.status] || '#8B949E'};">
                                    ${statusLabels[sub.status] || 'Not Started'}
                                </span>
                                <span class="sub-progress">${parseFloat(sub.progress) || 0}%</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    ${linkedEvents.length > 0 ? `
                    <div class="goal-detail-events">
                        <h3>📅 Linked Events (${linkedEvents.length})</h3>
                        ${linkedEvents.map(ev => `
                            <div class="goal-event-item">
                                <span class="event-title">${this.escapeHtml(ev.title)}</span>
                                <span class="event-date">${new Date(ev.event_date).toLocaleDateString()}</span>
                                <span class="event-status">${ev.is_completed ? '✅' : '⏳'}</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            `;

            container.html(html);
        },

        populateCategoryFilter: function() {
            const categories = [...new Set(this.state.goals.map(g => g.category_name).filter(Boolean))];
            const select = $('.goals-filter-category');
            if (select.length) {
                select.html('<option value="all">All Categories</option>');
                categories.forEach(cat => {
                    select.append(`<option value="${cat}">${cat}</option>`);
                });
                select.val(this.state.filters.category);
            }
        },

        // ============================================================
        // MODAL METHODS
        // ============================================================

        openCreateModal: function(parentGoalId = null) {
            this.openGoalModal(null, parentGoalId);
        },

        openEditModal: function(goalId) {
            const goal = this.state.goals.find(g => g.id === goalId);
            if (goal) {
                this.openGoalModal(goal);
            }
        },

        openGoalModal: function(goal = null, parentGoalId = null) {
            $('#goal-modal').remove();

            const isEdit = goal !== null;
            const title = isEdit ? 'Edit Goal' : 'Create Goal';

            const categories = this.state.goals.map(g => g.category_name).filter(Boolean);
            const uniqueCategories = [...new Set(categories)];

            let categoryOptions = '<option value="">None</option>';
            uniqueCategories.forEach(cat => {
                const selected = (goal && goal.category_name === cat) ? 'selected' : '';
                categoryOptions += `<option value="${cat}" ${selected}>${cat}</option>`;
            });

            let parentOptions = '<option value="">None (Root Goal)</option>';
            if (!isEdit) {
                this.state.goals.forEach(g => {
                    if (!g.parent_goal_id) {
                        const selected = (parentGoalId === g.id) ? 'selected' : '';
                        parentOptions += `<option value="${g.id}" ${selected}>${this.escapeHtml(g.title)}</option>`;
                    }
                });
            }

            const statusOptions = `
                <option value="not_started" ${goal && goal.status === 'not_started' ? 'selected' : ''}>Not Started</option>
                <option value="in_progress" ${goal && goal.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${goal && goal.status === 'completed' ? 'selected' : ''}>Completed</option>
            `;

            const modalHtml = `
                <div id="goal-modal" class="form-overlay">
                    <div class="form-modal">
                        <div class="form-header">
                            <h3>${title}</h3>
                            <button class="goal-modal-close">&times;</button>
                        </div>
                        <form id="goal-form">
                            <input type="hidden" id="goal-id" value="${goal ? goal.id : ''}">
                            <input type="hidden" id="goal-parent-id" value="${parentGoalId || ''}">
                            <div class="form-group">
                                <label for="goal-title">Title *</label>
                                <input type="text" id="goal-title" placeholder="e.g., Master Calculus" value="${goal ? this.escapeHtml(goal.title) : ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="goal-description">Description</label>
                                <textarea id="goal-description" rows="3" placeholder="What does this goal entail?">${goal ? this.escapeHtml(goal.description) : ''}</textarea>
                            </div>
                            <div class="form-group" style="display:flex; gap:10px;">
                                <div style="flex:1;">
                                    <label for="goal-category">Category</label>
                                    <select id="goal-category">
                                        ${categoryOptions}
                                    </select>
                                </div>
                                <div style="flex:1;">
                                    <label for="goal-status">Status</label>
                                    <select id="goal-status">
                                        ${statusOptions}
                                    </select>
                                </div>
                            </div>
                            ${!isEdit ? `
                            <div class="form-group">
                                <label for="goal-parent">Parent Goal</label>
                                <select id="goal-parent">
                                    ${parentOptions}
                                </select>
                            </div>
                            ` : ''}
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">💾 Save Goal</button>
                                <button type="button" class="btn-secondary goal-modal-close">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
            $('#goal-modal').show();

            $('#goal-form').on('submit', function(e) {
                e.preventDefault();
                const formData = {
                    title: $('#goal-title').val().trim(),
                    description: $('#goal-description').val().trim(),
                    category_name: $('#goal-category').val() || null,
                    status: $('#goal-status').val()
                };

                if (!formData.title) {
                    alert('Please enter a title.');
                    return;
                }

                const id = $('#goal-id').val();
                if (id) {
                    GoalsModule.updateGoal(id, formData);
                } else {
                    const parentId = $('#goal-parent').val() || null;
                    formData.parent_goal_id = parentId;
                    GoalsModule.createGoal(formData);
                }
            });

            $('.goal-modal-close').on('click', function() {
                GoalsModule.closeModal();
            });
            $(document).on('click', '#goal-modal', function(e) {
                if ($(e.target).is('#goal-modal')) {
                    GoalsModule.closeModal();
                }
            });
        },

        closeModal: function() {
            $('#goal-modal').remove();
        },

        // ============================================================
        // LINK EVENT MODAL
        // ============================================================

        openLinkEventModal: function(goalId) {
            $('#link-event-modal').remove();

            const modalHtml = `
                <div id="link-event-modal" class="form-overlay">
                    <div class="form-modal" style="max-width: 560px;">
                        <div class="form-header">
                            <h3>🔗 Link Event to Goal</h3>
                            <button class="link-event-close">&times;</button>
                        </div>
                        <div class="form-group">
                            <label for="link-event-search">Search Events</label>
                            <input type="text" id="link-event-search" placeholder="Type to filter events..." style="width:100%; padding:8px 12px; background:#0D1117; color:#F0F6FC; border:1px solid #30363D; border-radius:6px;">
                        </div>
                        <div class="form-group">
                            <label>Select Event</label>
                            <div id="link-event-list" style="max-height:300px; overflow-y:auto; border:1px solid #30363D; border-radius:6px; padding:4px;">
                                <div style="color:#8B949E; text-align:center; padding:20px;">Loading events...</div>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary link-event-close">Cancel</button>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
            $('#link-event-modal').show();

            this.loadEventsForLinking(goalId);

            $('.link-event-close').on('click', function() {
                $('#link-event-modal').remove();
            });
            $('#link-event-modal').on('click', function(e) {
                if ($(e.target).is('#link-event-modal')) {
                    $('#link-event-modal').remove();
                }
            });

            $('#link-event-search').on('input', function() {
                const searchTerm = $(this).val().toLowerCase();
                $('#link-event-list .link-event-item').each(function() {
                    const title = $(this).data('title').toLowerCase();
                    $(this).toggle(title.includes(searchTerm));
                });
            });
        },

        loadEventsForLinking: function(goalId) {
            const self = this;
            const container = $('#link-event-list');

            const apiUrl = window.BASE_PATH + 'public/api/events.php';

            $.ajax({
                url: apiUrl,
                method: 'GET',
                data: { start: '2024-01-01', end: '2030-12-31' },
                dataType: 'json'
            }).done(function(events) {
                events.sort((a, b) => a.event_date < b.event_date ? 1 : -1);

                const linkedApi = window.BASE_PATH + 'public/api/goals.php?id=' + goalId;
                $.ajax({
                    url: linkedApi,
                    method: 'GET',
                    dataType: 'json'
                }).done(function(goalData) {
                    const linkedEventIds = (goalData.linked_events || []).map(e => e.id);
                    self.renderEventList(events, linkedEventIds, goalId);
                }).fail(function() {
                    self.renderEventList(events, [], goalId);
                });
            }).fail(function() {
                container.html('<div style="color:#8B949E; text-align:center; padding:20px;">Failed to load events.</div>');
            });
        },

        renderEventList: function(events, linkedEventIds, goalId) {
            const container = $('#link-event-list');
            if (!events.length) {
                container.html('<div style="color:#8B949E; text-align:center; padding:20px;">No events found.</div>');
                return;
            }

            let html = '';
            events.forEach(event => {
                const isLinked = linkedEventIds.includes(event.id);
                const formattedDate = new Date(event.event_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                const hourLabel = Utils.formatHour(event.start_hour);

                html += `
                    <div class="link-event-item" data-event-id="${event.id}" data-title="${this.escapeHtml(event.title)}" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 12px;
                        border-bottom: 1px solid #21262D;
                        cursor: ${isLinked ? 'default' : 'pointer'};
                        background: ${isLinked ? 'rgba(63,185,80,0.08)' : 'transparent'};
                        transition: background 0.15s;
                    ">
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:500; font-size:0.9rem; color:#F0F6FC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${this.escapeHtml(event.title)}
                            </div>
                            <div style="font-size:0.7rem; color:#8B949E;">
                                ${formattedDate} · ${hourLabel} · ${event.category_name || 'Uncategorized'}
                            </div>
                        </div>
                        <div>
                            ${isLinked ? `
                                <span style="color:#3FB950; font-size:0.8rem;">✅ Linked</span>
                                <button class="link-event-unlink" data-event-id="${event.id}" data-goal-id="${goalId}" style="
                                    padding: 2px 10px;
                                    font-size: 0.65rem;
                                    background: rgba(248,81,73,0.15);
                                    color: #F85149;
                                    border: 1px solid #F85149;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    margin-left: 8px;
                                ">Unlink</button>
                            ` : `
                                <button class="link-event-btn" data-event-id="${event.id}" data-goal-id="${goalId}" style="
                                    padding: 4px 14px;
                                    font-size: 0.75rem;
                                    background: #58A6FF;
                                    color: #fff;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    transition: 0.15s;
                                ">Link</button>
                            `}
                        </div>
                    </div>
                `;
            });

            container.html(html);

            container.find('.link-event-btn').on('click', function(e) {
                e.stopPropagation();
                const eventId = $(this).data('event-id');
                const goalId = $(this).data('goal-id');
                GoalsModule.linkEventToGoal(eventId, goalId);
            });

            container.find('.link-event-unlink').on('click', function(e) {
                e.stopPropagation();
                const eventId = $(this).data('event-id');
                const goalId = $(this).data('goal-id');
                GoalsModule.unlinkEventFromGoal(eventId, goalId);
            });
        },

        linkEventToGoal: function(eventId, goalId) {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php?action=link-event';

            $.ajax({
                url: apiUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ event_id: eventId, goal_id: goalId }),
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('🔗 Event linked to goal!', 'success');
                    }
                    self.openLinkEventModal(goalId);
                    self.fetchGoal(goalId);
                } else {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('❌ Failed to link event.', 'error');
                    }
                }
            }).fail(function() {
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('❌ Error linking event.', 'error');
                }
            });
        },

        unlinkEventFromGoal: function(eventId, goalId) {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php?action=unlink-event&event_id=' + eventId + '&goal_id=' + goalId;

            if (!confirm('Remove this event from the goal?')) return;

            $.ajax({
                url: apiUrl,
                method: 'DELETE',
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('🔗 Event unlinked from goal.', 'info');
                    }
                    self.openLinkEventModal(goalId);
                    self.fetchGoal(goalId);
                } else {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('❌ Failed to unlink event.', 'error');
                    }
                }
            }).fail(function() {
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('❌ Error unlinking event.', 'error');
                }
            });
        },

        // ============================================================
        // BIND EVENTS
        // ============================================================

        bindEvents: function() {
            const self = this;

            $(document).on('click', '.btn-add-goal', function() {
                self.openCreateModal();
            });

            $(document).on('click', '.goal-expand.has-children', function(e) {
                e.stopPropagation();
                const goalId = $(this).data('goal-id');
                const subList = $(`.goal-sub-list[data-parent="${goalId}"]`);
                subList.toggle();
                const icon = $(this);
                icon.text(icon.text() === '▶' ? '▼' : '▶');
            });

            $(document).on('click', '.goal-action-view', function(e) {
                e.stopPropagation();
                const id = $(this).data('goal-id');
                self.fetchGoal(id);
            });

            $(document).on('click', '.goal-action-edit', function(e) {
                e.stopPropagation();
                const id = $(this).data('goal-id');
                self.openEditModal(id);
            });

            $(document).on('click', '.goal-action-archive', function(e) {
                e.stopPropagation();
                const id = $(this).data('goal-id');
                self.archiveGoal(id);
            });

            $(document).on('click', '.goal-action-delete', function(e) {
                e.stopPropagation();
                const id = $(this).data('goal-id');
                self.deleteGoal(id);
            });

            // ===== Link Event Button in Detail View =====
            $(document).on('click', '.goal-action-link-event', function(e) {
                e.stopPropagation();
                const id = $(this).data('goal-id');
                self.openLinkEventModal(id);
            });

            $(document).on('click', '.goals-back-btn', function() {
                self.fetchGoals();
            });

            $(document).on('change', '.goals-filter-status', function() {
                self.state.filters.status = $(this).val();
                self.fetchGoals();
            });

            $(document).on('change', '.goals-filter-category', function() {
                self.state.filters.category = $(this).val();
                self.fetchGoals();
            });

            $(document).on('click', '.goals-reset-filters', function() {
                self.state.filters = { status: 'all', category: 'all', archived: 0 };
                $('.goals-filter-status').val('all');
                $('.goals-filter-category').val('all');
                self.fetchGoals();
            });
        },

        // ============================================================
        // UTILITY
        // ============================================================

        escapeHtml: function(str) {
            if (!str) return '';
            return String(str).replace(/[&<>"]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                if (m === '"') return '&quot;';
                return m;
            });
        }
    };

    // ============================================================
    // AUTO-INIT
    // ============================================================

    $(document).ready(function() {
        if ($('#goals-container').length) {
            console.log('🎯 Goals page detected — initializing...');
            window.GoalsModule.init();
        }
    });

})(jQuery);