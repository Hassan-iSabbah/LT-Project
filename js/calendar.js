// /js/calendar.js
(function($) {
    'use strict';

    const BASE_PATH = window.location.pathname.split('/').slice(0, -1).join('/') + '/';
    window.BASE_PATH = BASE_PATH;
    console.log('📂 BASE_PATH:', BASE_PATH);

    const Calendar = {
        currentView: 'week',
        currentDate: new Date(),
        currentHour: null,
        currentTaskId: null,
        events: [],
        userId: $('#app-calendar').data('user-id'),
        isRendering: false,

        init() {
            console.log('🗓️ Calendar initializing...');
            
            // Detect view from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const page = urlParams.get('page');
            
            // Set initial view based on page parameter
            if (page === 'hindsight') {
                this.currentView = 'hindsight';
            } else if (page === 'calendar' || !page) {
                this.currentView = 'week';
            } else {
                this.currentView = 'week'; // default fallback
            }
            
            console.log('📌 Initial view:', this.currentView);
            this.render();
            this.bindEvents();
        },

        // ===== VIEW RANGE =====
        getViewRange() {
            switch (this.currentView) {
                case 'day':
                    const d = new Date(this.currentDate);
                    return { start: d.toISOString().split('T')[0], end: d.toISOString().split('T')[0] };
                case 'week':
                    return Utils.getWeekRange(this.currentDate);
                case 'month':
                    return Utils.getMonthRange(this.currentDate);
                case 'year':
                    return Utils.getYearRange(this.currentDate);
                case 'hour':
                    const h = new Date(this.currentDate);
                    return { start: h.toISOString().split('T')[0], end: h.toISOString().split('T')[0] };
                case 'task':
                    const t = new Date(this.currentDate);
                    return { start: t.toISOString().split('T')[0], end: t.toISOString().split('T')[0] };
                case 'hindsight':
                    const hs = new Date(this.currentDate);
                    const startDate = new Date(hs);
                    startDate.setMonth(startDate.getMonth() - 3);
                    return { start: Utils.formatDate(startDate), end: Utils.formatDate(hs) };
                default:
                    return Utils.getWeekRange(this.currentDate);
            }
        },

        // ===== FETCH EVENTS =====
        fetchEvents() {
            const range = this.getViewRange();
            const apiUrl = BASE_PATH + 'public/api/events.php';
            console.log('📡 Fetching from:', apiUrl, 'range:', range);
            return $.ajax({
                url: apiUrl,
                method: 'GET',
                data: { start: range.start, end: range.end },
                dataType: 'json'
            }).fail(function(xhr, status, error) {
                console.error('❌ AJAX Error:', status, error);
                console.error('📄 Response:', xhr.responseText);
            });
        },

        // ============================================================
        // REFLECTION BANNER
        // ============================================================

        loadReflectionBanner: function() {
            const self = this;
            $.ajax({
                url: window.BASE_PATH + 'public/api/reflections.php?action=random',
                method: 'GET',
                dataType: 'json'
            }).done(function(reflection) {
                self.renderReflectionBanner(reflection);
            }).fail(function() {
                self.renderReflectionBanner(null);
            });
        },

        renderReflectionBanner: function(reflection) {
            $('#reflection-banner').remove();

            let bannerHtml = '';

            if (reflection && reflection.answer) {
                const typeLabels = {
                    'daily': '🌅 Daily',
                    'weekly': '📅 Weekly',
                    'monthly': '📆 Monthly',
                    'event': '📝 Event'
                };
                const typeLabel = typeLabels[reflection.reflection_type] || 'Reflection';
                const date = new Date(reflection.created_at);
                const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                bannerHtml = `
                    <div id="reflection-banner" class="reflection-banner">
                        <span class="banner-icon">💭</span>
                        <div class="banner-content">
                            <div class="banner-quote">${this.escapeHtml(reflection.answer)}</div>
                            <div class="banner-meta">
                                <span class="meta-type">${typeLabel}</span>
                                <span class="meta-date">${formattedDate}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                bannerHtml = `
                    <div id="reflection-banner" class="reflection-banner empty">
                        <span class="banner-icon">💭</span>
                        <div class="banner-content">
                            <div class="banner-quote">Start reflecting to see your wisdom here.</div>
                            <div class="banner-meta">
                                <span class="meta-type">✨ Daily Wisdom</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            const breadcrumb = $('#app-calendar .calendar-breadcrumb');
            if (breadcrumb.length) {
                breadcrumb.after(bannerHtml);
            } else {
                $('#app-calendar').prepend(bannerHtml);
            }
        },

        // ===== RENDER =====
        render() {
            if (this.isRendering) {
                console.warn('⚠️ Render already in progress — skipping duplicate call');
                return;
            }

            this.isRendering = true;
            const self = this;

            $('#app-calendar').empty();

            this.loadReflectionBanner();

            this.fetchEvents().done(function(events) {
                self.events = events;
                console.log('✅ Loaded', events.length, 'events');

                switch (self.currentView) {
                    case 'week':
                        if (window.WeekView && typeof window.WeekView.render === 'function') {
                            window.WeekView.render(self);
                        } else {
                            console.error('❌ WeekView module not loaded');
                            $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">WeekView module not loaded.</div>');
                        }
                        break;

                    case 'day':
                        if (window.DayView && typeof window.DayView.render === 'function') {
                            window.DayView.render(self);
                        } else {
                            console.error('❌ DayView module not loaded');
                            $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">DayView module not loaded.</div>');
                        }
                        break;

                    case 'month':
                        if (window.MonthView && typeof window.MonthView.render === 'function') {
                            window.MonthView.render(self);
                        } else {
                            console.error('❌ MonthView module not loaded');
                            $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">MonthView module not loaded.</div>');
                        }
                        break;

                    case 'year':
                        if (window.YearView && typeof window.YearView.render === 'function') {
                            window.YearView.render(self);
                        } else {
                            console.error('❌ YearView module not loaded');
                            $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">YearView module not loaded.</div>');
                        }
                        break;

                    case 'hour':
                        if (window.HourView && typeof window.HourView.render === 'function') {
                            window.HourView.render(self);
                        } else {
                            console.error('❌ HourView module not loaded');
                            $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">HourView module not loaded.</div>');
                        }
                        break;

                    case 'task':
                        if (!self.currentTaskId) {
                            const dateStr = self.currentDate.toISOString().split('T')[0];
                            const eventsOnDay = self.events.filter(ev => ev.event_date === dateStr);
                            if (eventsOnDay.length > 0) {
                                eventsOnDay.sort((a, b) => (a.priority_rank || 2) - (b.priority_rank || 2));
                                self.currentTaskId = eventsOnDay[0].id;
                            } else {
                                $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">No tasks available. <br><br> <button onclick="window.Calendar.currentView=\'day\';window.Calendar.render();" style="padding:8px 20px;background:#58A6FF;color:#fff;border:none;border-radius:6px;cursor:pointer;">⬅️ Back to Day</button></div>');
                                self.isRendering = false;
                                return;
                            }
                        }

                        if (window.TaskView && typeof window.TaskView.render === 'function') {
                            window.TaskView.render(self);
                        } else {
                            console.error('❌ TaskView module not loaded');
                            $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">TaskView module not loaded.</div>');
                        }
                        break;

                    case 'hindsight':
                        if (window.HindsightView && typeof window.HindsightView.render === 'function') {
                            window.HindsightView.render(self);
                        } else {
                            console.error('❌ HindsightView module not loaded');
                            $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">HindsightView module not loaded.</div>');
                        }
                        break;

                    default:
                        if (window.WeekView && typeof window.WeekView.render === 'function') {
                            window.WeekView.render(self);
                        } else {
                            $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">No view module available.</div>');
                        }
                        break;
                }

                self.updateBreadcrumb();
                self.isRendering = false;
            }).fail(function() {
                $('#app-calendar').html('<div style="padding: 40px; text-align: center; color: #8B949E;">⚠️ Could not load events. Check console.</div>');
                self.isRendering = false;
            });
        },

        // ===== GROUP EVENTS =====
        groupEventsByDateHour(events) {
            const map = {};
            events.forEach(ev => {
                const key = `${ev.event_date}_${ev.start_hour}`;
                if (!map[key]) map[key] = [];
                map[key].push(ev);
            });
            for (let key in map) {
                map[key].sort((a, b) => (a.priority_rank || 2) - (b.priority_rank || 2));
            }
            return map;
        },

        // ===== RENDER EVENT PILL (Legacy) =====
        renderEventPill(event, clashCount, showVenue = false) {
            const categoryName = event.category_name || 'Work';
            const completed = event.is_completed ? 'completed' : '';
            const priority = event.priority_rank || 2;

            let clashBadge = '';
            if (clashCount > 0) {
                clashBadge = `<span class="more-badge" data-event-id="${event.id}" data-date="${event.event_date}" data-hour="${event.start_hour}">+${clashCount}</span>`;
            }

            let venueHtml = '';
            if (showVenue && event.venue) {
                venueHtml = `<span class="event-venue">📍${this.escapeHtml(event.venue)}</span>`;
            }

            let priorityClass = '';
            if (priority === 1) priorityClass = 'priority-high';
            else if (priority === 2) priorityClass = 'priority-medium';
            else if (priority === 3) priorityClass = 'priority-low';

            return `<div class="event-pill ${completed} ${priorityClass}"
                        data-color="${categoryName}"
                        data-event-id="${event.id}"
                        data-date="${event.event_date}"
                        data-hour="${event.start_hour}"
                        data-priority="${priority}">
                        <span class="event-title">${this.escapeHtml(event.title)}</span>
                        ${venueHtml}
                        <span class="priority-badge">P${priority}</span>
                        ${clashBadge}
                        ${clashCount > 0 ? `<span class="cycle-arrow" data-event-id="${event.id}">▼</span>` : ''}
                    </div>`;
        },

        escapeHtml(str) {
            if (!str) return '';
            return String(str).replace(/[&<>"]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                if (m === '"') return '&quot;';
                return m;
            });
        },

        // ===== BREADCRUMB =====
        updateBreadcrumb() {
            $('#app-calendar .calendar-breadcrumb').remove();

            const viewLabel = this.currentView.charAt(0).toUpperCase() + this.currentView.slice(1);
            let dateStr = '';

            if (this.currentView === 'week') {
                const range = this.getViewRange();
                const start = new Date(range.start);
                const end = new Date(range.end);
                dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' + end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } else if (this.currentView === 'day') {
                const d = new Date(this.currentDate);
                dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            } else if (this.currentView === 'month') {
                const d = new Date(this.currentDate);
                dateStr = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } else if (this.currentView === 'year') {
                const d = new Date(this.currentDate);
                dateStr = d.getFullYear().toString();
            } else if (this.currentView === 'hour') {
                const d = new Date(this.currentDate);
                const hour = this.currentHour !== null && this.currentHour !== undefined ? this.currentHour : new Date().getHours();
                dateStr = Utils.formatHour(hour) + ' — ' + d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            } else if (this.currentView === 'task') {
                const taskId = this.currentTaskId;
                const event = this.events.find(ev => ev.id == taskId);
                const title = event ? this.escapeHtml(event.title) : 'Task';
                dateStr = '🔍 ' + title;
            } else if (this.currentView === 'hindsight') {
                const d = new Date(this.currentDate);
                dateStr = 'Past Events — ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } else {
                const d = new Date(this.currentDate);
                dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }

            const breadcrumb = `<div class="calendar-breadcrumb">
                                    <span class="view-label">${viewLabel} — ${dateStr}</span>
                                    <div class="zoom-controls">
                                        <button data-zoom="in">🔍 Zoom In</button>
                                        <button data-zoom="out">🔍 Zoom Out</button>
                                        <button data-zoom="today">Today</button>
                                    </div>
                                </div>`;
            $('#app-calendar').prepend(breadcrumb);
        },

        // ===== BIND EVENTS =====
        bindEvents() {
            const self = this;

            $(document).on('click', '[data-zoom="in"]', function() {
                self.zoomIn();
            });
            $(document).on('click', '[data-zoom="out"]', function() {
                self.zoomOut();
            });
            $(document).on('click', '[data-zoom="today"]', function() {
                self.currentDate = new Date();
                self.render();
            });

            $(document).on('click', '.week-view .hour-cell', function(e) {
                if ($(e.target).closest('.event-pill, .more-badge, .cycle-arrow').length) return;
                const hour = $(this).data('hour');
                const date = $(this).data('date');
                if (window.Panel) window.Panel.showAdd(date, hour);
            });

            $(document).on('click', '.week-view .event-pill', function(e) {
                if ($(e.target).closest('.cycle-arrow, .more-badge').length) return;
                const id = $(this).data('event-id');
                const event = self.events.find(ev => ev.id == id);
                if (event) {
                    self.currentTaskId = id;
                    self.currentDate = new Date(event.event_date);
                    self.currentHour = event.start_hour;
                    self.currentView = 'task';
                    self.render();
                }
            });

            $(document).on('click', '.event-pill', function(e) {
                if ($(e.target).closest('.cycle-arrow, .more-badge').length) return;
                if ($(this).closest('.week-view').length) return;
                const id = $(this).data('event-id');
                const event = self.events.find(ev => ev.id == id);
                if (event) {
                    self.currentTaskId = id;
                    self.currentDate = new Date(event.event_date);
                    self.currentHour = event.start_hour;
                    self.currentView = 'task';
                    self.render();
                }
            });

            $(document).on('click', '.week-view .cycle-arrow', function(e) {
                e.stopPropagation();
                const id = $(this).data('event-id');
                const pill = $(this).closest('.event-pill');
                const currentPriority = parseInt(pill.data('priority')) || 2;
                const newPriority = (currentPriority % 3) + 1;

                const arrow = $(this);
                arrow.prop('disabled', true).text('⏳');

                $.ajax({
                    url: window.BASE_PATH + 'public/api/events.php?id=' + id,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({ priority_id: newPriority }),
                    dataType: 'json'
                }).done(function(response) {
                    if (response.success) {
                        const priorityLabels = {1: 'Attend', 2: 'Catch up', 3: 'Review'};
                        pill.data('priority', newPriority);
                        pill.find('.priority-badge').text('P' + newPriority);
                        pill.attr('data-priority', newPriority);
                        pill.removeClass('priority-high priority-medium priority-low');
                        if (newPriority === 1) pill.addClass('priority-high');
                        else if (newPriority === 2) pill.addClass('priority-medium');
                        else if (newPriority === 3) pill.addClass('priority-low');

                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('Priority updated to ' + priorityLabels[newPriority], 'success');
                        }
                    } else {
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('Failed to update priority', 'error');
                        }
                    }
                }).fail(function() {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('Error updating priority', 'error');
                    }
                }).always(function() {
                    arrow.prop('disabled', false).text('▼');
                });
            });

            $(document).on('click', '.week-view .more-badge', function(e) {
                e.stopPropagation();
                const date = $(this).data('date');
                const hour = $(this).data('hour');
                console.log('📋 Week View — Show clash list for:', date, hour);
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('Clash list coming soon!', 'info');
                } else {
                    alert('Clash list coming soon!');
                }
            });

            // ============================================================
            // KEYBOARD SHORTCUTS
            // ============================================================
            $(document).on('keydown', function(e) {
                if ($(e.target).is('input, textarea, select')) return;

                // F = Reflection
                if (e.key === 'f' || e.key === 'F') {
                    e.preventDefault();
                    if (window.Reflection && typeof window.Reflection.open === 'function') {
                        window.Reflection.open('daily');
                    }
                }

                // C = Calendar
                if (e.key === 'c' || e.key === 'C') {
                    e.preventDefault();
                    window.location.href = window.BASE_PATH + '?page=calendar';
                }

                // S = Subjects
                if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    window.location.href = window.BASE_PATH + '?page=subjects';
                }

                // H = Hindsight
                if (e.key === 'h' || e.key === 'H') {
                    e.preventDefault();
                    window.location.href = window.BASE_PATH + '?page=hindsight';
                }

                // G = Goals
                if (e.key === 'g' || e.key === 'G') {
                    e.preventDefault();
                    window.location.href = window.BASE_PATH + '?page=goals';
                }
            });
        },

        // ===== ZOOM CONTROLS =====
        zoomIn() {
            const views = ['year', 'month', 'week', 'day', 'hour', 'task', 'hindsight'];
            const idx = views.indexOf(this.currentView);

            if (idx >= views.length - 1) {
                alert('Already at the deepest view.');
                return;
            }

            const nextView = views[idx + 1];

            if (this.currentView === 'hour' && nextView === 'task') {
                const dateStr = this.currentDate.toISOString().split('T')[0];
                const hour = this.currentHour !== null ? this.currentHour : new Date().getHours();
                const eventsInHour = this.events.filter(ev =>
                    ev.event_date === dateStr && ev.start_hour === hour
                );

                if (eventsInHour.length > 0) {
                    eventsInHour.sort((a, b) => (a.priority_rank || 2) - (b.priority_rank || 2));
                    this.currentTaskId = eventsInHour[0].id;
                    this.currentView = 'task';
                    this.render();
                    return;
                } else {
                    if (window.Panel) window.Panel.showAdd(dateStr, hour);
                    return;
                }
            }

            this.currentView = nextView;
            if (this.currentView === 'hour') {
                if (this.currentHour === null || this.currentHour === undefined) {
                    this.currentHour = new Date().getHours();
                    if (this.currentHour < 6 || this.currentHour > 22) this.currentHour = 9;
                }
            }

            this.render();
        },

        zoomOut() {
            const views = ['hindsight', 'task', 'hour', 'day', 'week', 'month', 'year'];
            const idx = views.indexOf(this.currentView);
            if (idx < views.length - 1) {
                this.currentView = views[idx + 1];
                this.render();
            } else {
                alert('Already at the widest view (Year).');
            }
        }
    };

    // ===== INIT =====
    $(document).ready(function() {
        Calendar.init();
    });

    window.Calendar = Calendar;

})(jQuery);