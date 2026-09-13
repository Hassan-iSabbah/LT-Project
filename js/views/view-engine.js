// /js/view-engine.js
(function($) {
    'use strict';

    window.ViewEngine = {
        // ===== HINDSIGHT VIEW =====
        // ===== HINDSIGHT VIEW =====
        renderHindsight: function(calendar, pastEvents, filters) {
            console.log('📅 ViewEngine — Rendering Hindsight View');

            // Build filter bar
            let filterHtml = `
                <div class="hindsight-filters">
                    <div class="filter-row">
                        <div class="filter-group search-group">
                            <input type="text" class="hindsight-search" placeholder="🔎 Search events..." value="${filters.search || ''}">
                        </div>
                        <div class="filter-group">
                            <select class="hindsight-filter-daterange">
                                <option value="all" ${filters.dateRange === 'all' ? 'selected' : ''}>📅 All Time</option>
                                <option value="7days" ${filters.dateRange === '7days' ? 'selected' : ''}>Last 7 Days</option>
                                <option value="30days" ${filters.dateRange === '30days' ? 'selected' : ''}>Last 30 Days</option>
                                <option value="90days" ${filters.dateRange === '90days' ? 'selected' : ''}>Last 3 Months</option>
                                <option value="custom" ${filters.dateRange === 'custom' ? 'selected' : ''}>Custom</option>
                            </select>
                        </div>
                        <div class="filter-group custom-date-range" style="display: ${filters.dateRange === 'custom' ? 'flex' : 'none'};">
                            <input type="date" class="custom-date-start" value="${filters.customStartDate || ''}">
                            <button class="custom-date-apply">Apply</button>
                        </div>
                        <div class="filter-group">
                            <select class="hindsight-filter-category">
                                <option value="all" ${filters.category === 'all' ? 'selected' : ''}>🏷️ All Categories</option>
                                <option value="Work" ${filters.category === 'Work' ? 'selected' : ''}>Work</option>
                                <option value="Personal" ${filters.category === 'Personal' ? 'selected' : ''}>Personal</option>
                                <option value="Health" ${filters.category === 'Health' ? 'selected' : ''}>Health</option>
                                <option value="Family" ${filters.category === 'Family' ? 'selected' : ''}>Family</option>
                                <option value="Errands" ${filters.category === 'Errands' ? 'selected' : ''}>Errands</option>
                                <option value="UNI" ${filters.category === 'UNI' ? 'selected' : ''}>UNI</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <select class="hindsight-filter-recurrence">
                                <option value="all" ${filters.recurrence === 'all' ? 'selected' : ''}>🔄 All Events</option>
                                <option value="recurring" ${filters.recurrence === 'recurring' ? 'selected' : ''}>Recurring</option>
                                <option value="once-off" ${filters.recurrence === 'once-off' ? 'selected' : ''}>Once-off</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <select class="hindsight-filter-completion">
                                <option value="all" ${filters.completion === 'all' ? 'selected' : ''}>All Status</option>
                                <option value="completed" ${filters.completion === 'completed' ? 'selected' : ''}>✅ Completed</option>
                                <option value="incomplete" ${filters.completion === 'incomplete' ? 'selected' : ''}>⏳ Incomplete</option>
                            </select>
                        </div>
                        <button class="hindsight-reset-filters">↺ Reset</button>
                    </div>
                    <div class="filter-stats">
                        <span>${pastEvents.length} events found</span>
                    </div>
                </div>
            `;

            if (pastEvents.length === 0) {
                return `
                    <div class="hindsight-view">
                        ${filterHtml}
                        <div class="hindsight-empty">
                            <div class="empty-icon">🔍</div>
                            <div class="empty-title">No Past Events Found</div>
                            <div class="empty-hint">Try adjusting your filters or complete more events.</div>
                        </div>
                    </div>
                `;
            }

            // Build styled cards
            let cardsHtml = '';
            pastEvents.forEach(event => {
                const dateObj = new Date(event.event_date);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
                const hourLabel = Utils.formatHour(event.start_hour);
                const statusClass = event.is_completed ? 'completed' : 'incomplete';
                const statusIcon = event.is_completed ? '✅' : '⏳';
                const categoryColor = event.color_hex || '#58A6FF';
                const isRecurring = event.recurrence_rule && event.recurrence_rule !== '';
                const recurringLabel = isRecurring ? '🔄' : '';

                // Determine glow level based on sync percentage
                let glowClass = 'glow-low';
                if (event.sync_percentage !== null && event.sync_percentage !== undefined) {
                    if (event.sync_percentage >= 80) glowClass = 'glow-high';
                    else if (event.sync_percentage >= 50) glowClass = 'glow-medium';
                }

                cardsHtml += `
                    <div class="hindsight-card ${statusClass} ${glowClass}" 
                        data-event-id="${event.id}" 
                        style="border-left-color: ${categoryColor};">
                        <div class="card-left">
                            <span class="card-status">${statusIcon}</span>
                            <span class="card-title">${this.escapeHtml(event.title)}</span>
                            ${recurringLabel ? `<span class="card-recurring">${recurringLabel}</span>` : ''}
                            ${event.venue ? `<span class="card-venue">📍${this.escapeHtml(event.venue)}</span>` : ''}
                        </div>
                        <div class="card-right">
                            <span class="card-time">${hourLabel}</span>
                            <span class="card-date">${formattedDate}</span>
                        </div>
                    </div>
                `;
            });

            let html = `
                <div class="hindsight-view">
                    ${filterHtml}
                    <div class="hindsight-list">
                        ${cardsHtml}
                    </div>
                </div>
            `;

            return html;
        },
        // ===== SNAPSHOT OVERLAY =====
// ===== SNAPSHOT OVERLAY =====
renderSnapshot: function(calendar, event) {
    const dateObj = new Date(event.event_date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const hourLabel = Utils.formatHour(event.start_hour);
    const nextHour = Utils.formatHour((event.start_hour + 1) % 24);
    const categoryColor = event.color_hex || '#58A6FF';
    const categoryName = event.category_name || 'Uncategorized';
    const priorityLabel = event.priority_rank || 2;
    const priorityText = priorityLabel === 1 ? 'Attend' :
                        priorityLabel === 2 ? 'Catch up' : 'Review';

    // Sync bar
    let syncHtml = '';
    if (event.sync_percentage !== null && event.sync_percentage !== undefined) {
        syncHtml = window.Utils.renderSyncBar(event.sync_percentage, true);
    }

    // Check if event has existing reflections
    const hasReflection = event.reflection && event.reflection.length > 0;
    const reflectionText = hasReflection ? event.reflection : '';

    return `
        <div class="snapshot-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeInOverlay 0.3s ease;
        ">
            <div class="snapshot-modal" style="
                background: #161B22;
                border: 1px solid #30363D;
                border-radius: 12px;
                max-width: 640px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                padding: 28px 32px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.8);
                position: relative;
                animation: slideUpModal 0.35s ease;
            ">
                <!-- Close Button -->
                <button class="snapshot-close" style="
                    position: absolute;
                    top: 14px;
                    right: 18px;
                    background: none;
                    border: none;
                    font-size: 1.6rem;
                    color: #8B949E;
                    cursor: pointer;
                    transition: 0.15s;
                ">&times;</button>

                <!-- Header -->
                <div class="snapshot-header" style="
                    padding: 4px 0 12px 16px;
                    margin-bottom: 16px;
                    border-bottom: 1px solid #30363D;
                    border-left: 5px solid ${categoryColor};
                ">
                    <h2 style="
                        font-size: 1.4rem;
                        font-weight: 700;
                        color: #F0F6FC;
                        margin: 0 0 8px 0;
                    ">${this.escapeHtml(event.title)}</h2>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span style="
                            padding: 2px 12px;
                            border-radius: 12px;
                            font-size: 0.7rem;
                            font-weight: 600;
                            background: ${categoryColor}33;
                            color: ${categoryColor};
                        ">${categoryName}</span>
                        <span style="
                            padding: 2px 12px;
                            border-radius: 12px;
                            font-size: 0.7rem;
                            font-weight: 600;
                            background: rgba(210, 153, 34, 0.1);
                            color: #D29922;
                        ">P${priorityLabel} — ${priorityText}</span>
                        <span style="
                            padding: 2px 12px;
                            border-radius: 12px;
                            font-size: 0.7rem;
                            font-weight: 600;
                            background: ${event.is_completed ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)'};
                            color: ${event.is_completed ? '#3FB950' : '#F85149'};
                        ">${event.is_completed ? '✅ Completed' : '⏳ Pending'}</span>
                    </div>
                </div>

                <!-- Details -->
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px 16px;
                    padding: 12px 0;
                    border-bottom: 1px solid #30363D;
                    margin-bottom: 16px;
                ">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #C9D1D9; padding: 2px 0;">
                        <span style="font-size: 0.9rem; width: 24px; text-align: center;">📅</span>
                        <span>${formattedDate}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #C9D1D9; padding: 2px 0;">
                        <span style="font-size: 0.9rem; width: 24px; text-align: center;">⏰</span>
                        <span>${hourLabel} — ${nextHour}</span>
                    </div>
                    ${event.venue ? `
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #C9D1D9; padding: 2px 0;">
                        <span style="font-size: 0.9rem; width: 24px; text-align: center;">📍</span>
                        <span>${this.escapeHtml(event.venue)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #C9D1D9; padding: 2px 0;">
                        <span style="font-size: 0.9rem; width: 24px; text-align: center;">📊</span>
                        <span>Sync: ${syncHtml || '—'}</span>
                    </div>
                </div>

                <!-- Reflection -->
                <div style="margin-bottom: 16px;">
                    <h3 style="
                        font-size: 0.9rem;
                        font-weight: 600;
                        color: #8B949E;
                        margin: 0 0 8px 0;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">💭 Reflection</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label for="snapshot-well" style="
                                display: block;
                                font-size: 0.75rem;
                                font-weight: 600;
                                color: #8B949E;
                                margin-bottom: 4px;
                            ">What went well?</label>
                            <textarea id="snapshot-well" rows="4" style="
                                width: 100%;
                                padding: 10px 12px;
                                background: #0D1117;
                                color: #F0F6FC;
                                border: 1px solid #30363D;
                                border-radius: 6px;
                                font-size: 0.9rem;
                                resize: vertical;
                                font-family: inherit;
                                transition: 0.15s;
                            " placeholder="Write what went well..."></textarea>
                        </div>
                        <div>
                            <label for="snapshot-better" style="
                                display: block;
                                font-size: 0.75rem;
                                font-weight: 600;
                                color: #8B949E;
                                margin-bottom: 4px;
                            ">What could have gone better?</label>
                            <textarea id="snapshot-better" rows="4" style="
                                width: 100%;
                                padding: 10px 12px;
                                background: #0D1117;
                                color: #F0F6FC;
                                border: 1px solid #30363D;
                                border-radius: 6px;
                                font-size: 0.9rem;
                                resize: vertical;
                                font-family: inherit;
                                transition: 0.15s;
                            " placeholder="Write what could have gone better..."></textarea>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div style="
                    display: flex;
                    gap: 10px;
                    padding-top: 12px;
                    border-top: 1px solid #30363D;
                ">
                    <button class="snapshot-save" data-event-id="${event.id}" style="
                        padding: 10px 28px;
                        background: #58A6FF;
                        color: #fff;
                        border: none;
                        border-radius: 6px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: 0.15s;
                    ">💾 Save Reflection</button>
                    <button class="snapshot-close-secondary" style="
                        padding: 10px 24px;
                        background: transparent;
                        color: #8B949E;
                        border: 1px solid #30363D;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: 0.15s;
                    ">Cancel</button>
                </div>
            </div>
        </div>
    `;
},
        // ===== WEEK VIEW =====
        renderWeek: function(calendar) {
            console.log('📅 ViewEngine — Rendering Week View');
            
            const range = calendar.getViewRange();
            const start = new Date(range.start);
            const end = new Date(range.end);
            
            const days = [];
            let current = new Date(start);
            while (current <= end) {
                days.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }

            const grouped = calendar.groupEventsByDateHour(calendar.events);
            
            let html = '<div class="calendar-grid week-view">';
            
            // Header: 7 days (with an empty spacer in the first column)
            html += '<div class="week-header">';
            // Spacer for the hour-label column
            html += '<div class="week-header-spacer"></div>';
            days.forEach(day => {
                const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                const dayDate = day.getDate();
                const isToday = day.toDateString() === new Date().toDateString();
                html += `<div class="week-day-header${isToday ? ' today' : ''}">
                            <span class="day-name">${dayName}</span>
                            <span class="day-date">${dayDate}</span>
                        </div>`;
            });
            html += '</div>';

            // Hour rows (0–23)
            for (let h = 0; h < 24; h++) {
                html += `<div class="hour-row" data-hour="${h}">
                            <div class="hour-label">${Utils.formatHour(h)}</div>`;
                
                days.forEach(day => {
                    const dateStr = Utils.formatDate(day);
                    const key = `${dateStr}_${h}`;
                    const eventsAtHour = grouped[key] || [];
                    
                    html += `<div class="hour-cell" data-date="${dateStr}" data-hour="${h}">`;
                    
                    if (eventsAtHour.length > 0) {
                        const highest = eventsAtHour[0];
                        const clashCount = eventsAtHour.length - 1;
                        html += this.renderEventPill(calendar, highest, clashCount, false);
                    } else {
                        html += `<span class="empty-slot">+</span>`;
                    }
                    
                    html += `</div>`;
                });
                
                html += '</div>';
            }

            html += '</div>';
            return html;
        },

        // ===== DAY VIEW =====
        renderDay: function(calendar) {
            console.log('📅 ViewEngine — Rendering Day View');
            
            const range = calendar.getViewRange();
            const dateStr = range.start;
            const day = new Date(dateStr);
            const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
            const formattedDate = day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            const grouped = calendar.groupEventsByDateHour(calendar.events);
            
            const columns = [
                { label: 'Morning', hours: [0, 1, 2, 3, 4, 5, 6, 7] },
                { label: 'Afternoon', hours: [8, 9, 10, 11, 12, 13, 14, 15] },
                { label: 'Evening', hours: [16, 17, 18, 19, 20, 21, 22, 23] }
            ];

            let html = '<div class="calendar-grid day-view">';
            
            html += `<div class="day-header">
                        <span class="day-name">${dayName}</span>
                        <span class="day-date">${formattedDate}</span>
                    </div>`;
            
            html += '<div class="day-columns">';
            
            columns.forEach(col => {
                html += `<div class="day-column">
                            <div class="column-label">${col.label}</div>`;
                
                col.hours.forEach(h => {
                    const key = `${dateStr}_${h}`;
                    const eventsAtHour = grouped[key] || [];
                    
                    html += `<div class="day-hour-row" data-hour="${h}">
                                <div class="hour-label" data-hour="${h}">${Utils.formatHour(h)}</div>
                                <div class="hour-cell" data-date="${dateStr}" data-hour="${h}">`;
                    
                    if (eventsAtHour.length > 0) {
                        eventsAtHour.forEach((event) => {
                            html += this.renderEventPill(calendar, event, 0, true);
                        });
                    } else {
                        html += `<span class="empty-slot">+</span>`;
                    }
                    
                    html += `</div></div>`;
                });
                
                html += '</div>';
            });
            
            html += '</div></div>';
            return html;
        },

        // ===== TASK VIEW =====
        renderTask: function(calendar, event) {
            console.log('📅 ViewEngine — Rendering Task View');
            
            const priorityLabel = event.priority_rank || 2;
            const priorityText = priorityLabel === 1 ? 'Attend' : 
                                priorityLabel === 2 ? 'Catch up' : 'Review';
            const priorityClass = 'priority-' + priorityLabel;
            
            const statusText = event.is_completed ? 'Complete ✅' : 'Incomplete';
            const statusClass = event.is_completed ? 'status-complete' : 'status-incomplete';
            
            const dateObj = new Date(event.event_date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
            const hourLabel = Utils.formatHour(event.start_hour);
            const nextHourNum = (event.start_hour + 1) % 24;
            const nextHourLabel = Utils.formatHour(nextHourNum);
            
            const categoryName = event.category_name || 'Work';
            const color = event.color_hex || '#58A6FF';
            
            const recurringText = event.recurrence_rule ? 
                `Weekly ${event.recurrence_end_date ? '— ends ' + new Date(event.recurrence_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}` : 
                'None';
            
            const notes = event.description || 'No notes for this event.';
            
            // Sync % display (if available)
            let syncRow = '';
            if (event.sync_percentage !== null && event.sync_percentage !== undefined) {
                const syncColor = event.sync_percentage >= 80 ? '#3FB950' : 
                                event.sync_percentage >= 50 ? '#D29922' : '#F85149';
                syncRow = `<div class="detail-row">
                                <span class="detail-icon">📊</span>
                                <span class="detail-label">Sync %</span>
                                <span class="detail-value" style="font-weight:600; color:${syncColor};">
                                    ${event.sync_percentage}%
                                    ${event.actual_duration ? `(${event.actual_duration} min actual)` : ''}
                                </span>
                            </div>`;
            }
            
            let html = '<div class="calendar-grid task-view">';
            html += '<div class="task-container">';
            html += `<div class="task-card" style="border-left-color:${color};">`;
            
            // Header
            html += `<div class="task-header">
                        <div class="task-title-area">
                            <h1 class="task-title">${this.escapeHtml(event.title)}</h1>
                            <div class="task-subtitle">${categoryName} · ${formattedDate}</div>
                        </div>
                        <span class="task-status-badge ${statusClass}">${statusText}</span>
                    </div>`;
            
            // Details Grid — ALL rows INSIDE
            html += `<div class="task-details">
                        <div class="detail-row">
                            <span class="detail-icon">📍</span>
                            <span class="detail-label">Venue</span>
                            <span class="detail-value">${event.venue ? this.escapeHtml(event.venue) : '—'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-icon">⏰</span>
                            <span class="detail-label">Time</span>
                            <span class="detail-value">${hourLabel} — ${nextHourLabel}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-icon">📅</span>
                            <span class="detail-label">Date</span>
                            <span class="detail-value">${formattedDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-icon">🏷️</span>
                            <span class="detail-label">Category</span>
                            <span class="detail-value">${categoryName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-icon">🔢</span>
                            <span class="detail-label">Priority</span>
                            <span class="detail-value ${priorityClass}">${priorityLabel} — ${priorityText}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-icon">🔁</span>
                            <span class="detail-label">Recurrence</span>
                            <span class="detail-value">${recurringText}</span>
                        </div>
                        ${syncRow}   <!-- <-- Sync row INSIDE the details grid -->
                    </div>`;  // <-- Closes .task-details
            
            // Notes
            html += `<div class="task-notes">
                        <span class="notes-label">📝 Notes</span>
                        <div class="notes-content">${this.escapeHtml(notes)}</div>
                    </div>`;
            
            // Actions
            html += `<div class="task-actions">
                        <button class="btn-task btn-edit" data-action="edit">✏️ Edit</button>
                        <button class="btn-task btn-complete" data-action="complete" data-id="${event.id}">
                            ${event.is_completed ? '↩️ Reopen' : '✅ Mark Complete'}
                        </button>
                        <button class="btn-task btn-danger" data-action="delete" data-id="${event.id}">🗑️ Delete</button>
                        <button class="btn-task btn-secondary" data-action="back">⬅️ Back to Hour</button>
                    </div>`;
            
            html += '</div></div></div>';
            return html;
        },

        // ===== MONTH VIEW =====
        // ===== MONTH VIEW =====
        renderMonth: function(calendar) {
            console.log('📅 ViewEngine — Rendering Month View');
            
            const year = calendar.currentDate.getFullYear();
            const month = calendar.currentDate.getMonth();
            
            // First day of the month
            const firstDay = new Date(year, month, 1);
            const firstDayOfWeek = firstDay.getDay(); // 0=Sunday, 6=Saturday
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Days from previous month to show (Sunday-first week)
            const daysFromPrevMonth = firstDayOfWeek; // 0-6
            
            // Previous month details
            const prevMonthDate = new Date(year, month, 0);
            const daysInPrevMonth = prevMonthDate.getDate();
            const startPrevMonth = daysInPrevMonth - daysFromPrevMonth + 1;
            
            // Total cells (multiple of 7)
            const totalCells = Math.ceil((daysFromPrevMonth + daysInMonth) / 7) * 7;
            
            const cells = [];
            const today = new Date();
            const todayStr = Utils.formatDate(today);
            
            console.log(`📅 Month: ${year}-${month+1}, First day: ${firstDayOfWeek}, Days from prev: ${daysFromPrevMonth}`);
            console.log(`📅 Prev month: ${daysInPrevMonth} days, starting from ${startPrevMonth}`);
            
            // Previous month days
            for (let d = startPrevMonth; d <= daysInPrevMonth; d++) {
                const date = new Date(year, month - 1, d);
                cells.push({
                    date: date,
                    dateStr: Utils.formatDate(date),
                    dayNumber: d,
                    isCurrentMonth: false,
                    isToday: Utils.formatDate(date) === todayStr
                });
            }
            
            // Current month days
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month, d);
                cells.push({
                    date: date,
                    dateStr: Utils.formatDate(date),
                    dayNumber: d,
                    isCurrentMonth: true,
                    isToday: Utils.formatDate(date) === todayStr
                });
            }
            
            // Next month days
            const remaining = totalCells - cells.length;
            for (let d = 1; d <= remaining; d++) {
                const date = new Date(year, month + 1, d);
                cells.push({
                    date: date,
                    dateStr: Utils.formatDate(date),
                    dayNumber: d,
                    isCurrentMonth: false,
                    isToday: Utils.formatDate(date) === todayStr
                });
            }
            
            // Group events by date
            const eventsByDate = {};
            calendar.events.forEach(ev => {
                if (!eventsByDate[ev.event_date]) eventsByDate[ev.event_date] = [];
                eventsByDate[ev.event_date].push(ev);
            });
            
            for (let date in eventsByDate) {
                eventsByDate[date].sort((a, b) => (a.priority_rank || 2) - (b.priority_rank || 2));
            }
            
            const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });
            
            let html = '<div class="calendar-grid month-view">';
            html += `<div class="month-header-title" style="text-align:center;padding:8px 0;font-size:1.1rem;font-weight:600;color:#F0F6FC;">${monthName} ${year}</div>`;
            html += '<div class="month-header">';
            // Sunday-first day labels
            const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayLabels.forEach(label => {
                html += `<div class="month-day-label">${label}</div>`;
            });
            html += '</div>';
            html += '<div class="month-grid">';
            
            cells.forEach(cell => {
                const events = eventsByDate[cell.dateStr] || [];
                const eventCount = events.length;
                const otherMonthClass = cell.isCurrentMonth ? '' : 'other-month';
                const todayClass = cell.isToday ? ' today' : '';
                
                html += `<div class="month-day-cell${otherMonthClass}${todayClass}" data-date="${cell.dateStr}">`;
                html += `<span class="day-number">${cell.dayNumber}</span>`;
                
                if (eventCount > 0) {
                    html += '<div class="day-events">';
                    const maxShow = 2;
                    const showEvents = events.slice(0, maxShow);
                    const remainingEvents = events.length - maxShow;
                    
                    showEvents.forEach(ev => {
                        const categoryColor = ev.color_hex || '#58A6FF';
                        const title = ev.title.length > 12 ? ev.title.substring(0, 10) + '…' : ev.title;
                        html += `<div class="event-indicator" style="border-left-color:${categoryColor};" data-event-id="${ev.id}">
                                    <span class="indicator-title">${title}</span>
                                    <span class="indicator-count">P${ev.priority_rank || 2}</span>
                                </div>`;
                    });
                    
                    if (remainingEvents > 0) {
                        html += `<span class="more-indicator" data-date="${cell.dateStr}">+${remainingEvents} more</span>`;
                    }
                    
                    html += '</div>';
                }
                
                html += '</div>';
            });
            
            html += '</div></div>';
            return html;
        },

        // ===== YEAR VIEW =====
        renderYear: function(calendar) {
            console.log('📅 ViewEngine — Rendering Year View');
            
            const year = calendar.currentDate.getFullYear();
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            
            const eventsByMonth = {};
            for (let m = 0; m < 12; m++) eventsByMonth[m] = [];
            
            calendar.events.forEach(ev => {
                const evDate = new Date(ev.event_date);
                const evMonth = evDate.getMonth();
                if (evDate.getFullYear() === year) {
                    eventsByMonth[evMonth].push(ev);
                }
            });
            
            let html = '<div class="calendar-grid year-view">';
            html += `<div class="year-header">${year}</div>`;
            html += '<div class="year-grid">';
            
            for (let m = 0; m < 12; m++) {
                const events = eventsByMonth[m] || [];
                const eventCount = events.length;
                
                const eventsByDay = {};
                events.forEach(ev => {
                    const day = new Date(ev.event_date).getDate();
                    if (!eventsByDay[day]) eventsByDay[day] = [];
                    eventsByDay[day].push(ev);
                });
                
                const maxDots = 20;
                const daysInMonth = new Date(year, m + 1, 0).getDate();
                const dots = [];
                
                for (let d = 1; d <= daysInMonth && d <= maxDots; d++) {
                    const dayEvents = eventsByDay[d] || [];
                    let dotClass = 'dot';
                    if (dayEvents.length > 0) {
                        if (dayEvents.length > 1) dotClass += ' has-clash';
                        else dotClass += ' has-event';
                    }
                    dots.push(`<span class="${dotClass}"></span>`);
                }
                
                if (daysInMonth > maxDots) {
                    const hasRemainingEvents = Object.keys(eventsByDay).some(day => day > maxDots);
                    dots.push(`<span class="dot ${hasRemainingEvents ? 'has-event' : ''}" style="opacity:${hasRemainingEvents ? '0.5' : '0.3'};">…</span>`);
                }
                
                const previewEvents = events.slice(0, 3);
                let previewHtml = '';
                if (previewEvents.length > 0) {
                    previewHtml = '<div class="month-preview">';
                    previewEvents.forEach(ev => {
                        const title = ev.title.length > 8 ? ev.title.substring(0, 6) + '…' : ev.title;
                        const color = ev.color_hex || '#58A6FF';
                        previewHtml += `<span class="preview-event" style="border-left-color:${color};">${title}</span>`;
                    });
                    if (events.length > 3) {
                        previewHtml += `<span class="preview-event" style="border-left-color:#888;">+${events.length - 3}</span>`;
                    }
                    previewHtml += '</div>';
                }
                
                html += `<div class="year-month-card" data-month="${m}" data-year="${year}">
                            <div class="month-name">${monthNames[m]}</div>
                            <div class="month-year">${year}</div>
                            <div class="month-stats">
                                <div class="event-dots">${dots.join('')}</div>
                                <div class="event-count"><strong>${eventCount}</strong> event${eventCount !== 1 ? 's' : ''}</div>
                                ${previewHtml}
                            </div>
                        </div>`;
            }
            
            html += '</div></div>';
            return html;
        },

        // ===== HOUR VIEW =====
        renderHour: function(calendar) {
            console.log('📅 ViewEngine — Rendering Hour View');
            
            const dateObj = new Date(calendar.currentDate);
            const dateStr = dateObj.toISOString().split('T')[0];
            
            let hour = calendar.currentHour;
            if (hour === null || hour === undefined) {
                hour = new Date().getHours();
                if (hour < 6 || hour > 22) hour = 9;
            }
            
            const events = calendar.events.filter(ev => 
                ev.event_date === dateStr && ev.start_hour === hour
            );
            events.sort((a, b) => (a.priority_rank || 2) - (b.priority_rank || 2));
            
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
            });
            const hourLabel = Utils.formatHour(hour);
            const nextHourNum = (hour + 1) % 24;
            const nextHourLabel = Utils.formatHour(nextHourNum);
            
            let html = '<div class="calendar-grid hour-view">';
            html += `<div class="hour-view-header" data-date="${dateStr}" data-hour="${hour}">
                        <div class="hour-time">
                            ⏰ ${hourLabel} — ${nextHourLabel}
                            <span class="hour-date">${formattedDate}</span>
                        </div>
                        <div class="hour-actions">
                            <button class="btn-add" data-action="add-event">+ Add Event</button>
                        </div>
                    </div>`;
            html += '<div class="hour-events">';
            
            if (events.length === 0) {
                html += `<div class="hour-empty">
                            <span class="empty-icon">📭</span>
                            <div class="empty-text">No events at ${hourLabel}</div>
                            <div class="empty-hint">Click "+ Add Event" to create one</div>
                        </div>`;
            } else {
                events.forEach((event) => {
                    html += this.renderEventCard(calendar, event);
                });
            }
            
            html += '</div></div>';
            return html;
        },

        // ===== EVENT PILL =====
        // ===== EVENT PILL =====
renderEventPill: function(calendar, event, clashCount, showVenue) {
    const categoryName = event.category_name || 'Work';
    const completed = event.is_completed ? 'completed' : '';
    const priority = event.priority_rank || 2;

    // --- Sync Bar (always rendered, uses is_completed) ---
    const syncHtml = window.Utils.renderSyncBar(event.sync_percentage, event.is_completed);

    // --- Goal Indicator (if event is linked to a goal) ---
    let goalIndicator = '';
    if (event.goal_id && event.goal_title) {
        goalIndicator = `<span class="goal-indicator" data-goal-id="${event.goal_id}" title="🎯 ${this.escapeHtml(event.goal_title)}">🎯</span>`;
    }

    // --- Rest of the pill ---
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
                data-priority="${priority}"
                data-goal-id="${event.goal_id || ''}">
                <span class="drag-handle">≡</span>
                <span class="event-title">${this.escapeHtml(event.title)}</span>
                ${venueHtml}
                ${goalIndicator}
                ${syncHtml}
                <span class="priority-badge">P${priority}</span>
                ${clashBadge}
                ${clashCount > 0 ? `<span class="cycle-arrow" data-event-id="${event.id}">▼</span>` : ''}
            </div>`;
},
        // ===== EVENT CARD (for Hour View) =====
        renderEventCard: function(calendar, event) {
            const categoryName = event.category_name || 'Work';
            const color = event.color_hex || '#58A6FF';
            const completed = event.is_completed ? 'completed' : '';
            const priorityLabel = event.priority_rank || 2;
            
            let priorityClass = 'priority-';
            if (priorityLabel === 1) priorityClass += '1';
            else if (priorityLabel === 2) priorityClass += '2';
            else priorityClass += '3';
            
            const priorityText = priorityLabel === 1 ? 'Attend' : 
                                 priorityLabel === 2 ? 'Catch up' : 'Review';
            
            const recurringBadge = event.recurrence_rule ? 
                `<span class="badge badge-recurring">🔄 Weekly</span>` : '';
            
            const completedBadge = event.is_completed ? 
                `<span class="badge badge-completed">✅ Done</span>` : '';
            
            const descriptionHtml = event.description ? 
                `<div class="event-card-description">${this.escapeHtml(event.description)}</div>` : '';
            
            return `<div class="event-card ${completed}" data-event-id="${event.id}" style="border-left-color:${color};">
                        <div class="event-card-header">
                            <span class="event-card-title">${this.escapeHtml(event.title)}</span>
                            <div class="event-card-badges">
                                <span class="badge badge-priority ${priorityClass}">P${priorityLabel} — ${priorityText}</span>
                                <span class="badge badge-category">${categoryName}</span>
                                ${recurringBadge}
                                ${completedBadge}
                            </div>
                        </div>
                        <div class="event-card-details">
                            ${event.venue ? `<span class="detail-item"><span class="detail-icon">📍</span> ${this.escapeHtml(event.venue)}</span>` : ''}
                            <span class="detail-item"><span class="detail-icon">⏰</span> ${Utils.formatHour(event.start_hour)}</span>
                        </div>
                        ${descriptionHtml}
                        <div class="event-card-actions">
                            <button class="btn-action btn-edit" data-action="edit" data-id="${event.id}">✏️ Edit</button>
                            <button class="btn-action btn-cycle" data-action="cycle" data-id="${event.id}">🔄 Cycle Priority</button>
                            <button class="btn-action btn-complete" data-action="complete" data-id="${event.id}">
                                ${event.is_completed ? '↩️ Reopen' : '✅ Complete'}
                            </button>
                            <button class="btn-action btn-delete" data-action="delete" data-id="${event.id}">🗑️ Delete</button>
                        </div>
                    </div>`;
        },

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

})(jQuery);