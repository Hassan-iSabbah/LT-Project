// /js/views/month.js
(function($) {
    'use strict';

    // MonthView module — renders 7-column grid with event indicators
    window.MonthView = {
        render: function(calendar) {
            console.log('📅 MonthView.render() called');
            
            const year = calendar.currentDate.getFullYear();
            const month = calendar.currentDate.getMonth();
            
            // First day of month
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            
            // Day of week for first day (0=Sunday, 1=Monday, ...)
            const firstDayOfWeek = firstDay.getDay(); // 0=Sunday, 6=Saturday
            
            // Days from previous month to show (start from Sunday)
            const daysFromPrevMonth = firstDayOfWeek; // 0=Sunday, 1=Monday, ...
            
            // Get the last day of the previous month
            const prevMonthDate = new Date(year, month, 0);
            const daysInPrevMonth = prevMonthDate.getDate();
            
            // Total cells (rows × 7 columns)
            const totalCells = Math.ceil((daysFromPrevMonth + daysInMonth) / 7) * 7;
            
            // Build grid data
            const cells = [];
            const today = new Date();
            const todayStr = Utils.formatDate(today);
            
            // Previous month days (start from Sunday)
            for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
                const dayNum = daysInPrevMonth - i;
                const date = new Date(year, month - 1, dayNum);
                const dateStr = Utils.formatDate(date);
                cells.push({
                    date: date,
                    dateStr: dateStr,
                    dayNumber: dayNum,
                    isCurrentMonth: false,
                    isToday: dateStr === todayStr
                });
            }
            
            // Current month days
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month, d);
                const dateStr = Utils.formatDate(date);
                cells.push({
                    date: date,
                    dateStr: dateStr,
                    dayNumber: d,
                    isCurrentMonth: true,
                    isToday: dateStr === todayStr
                });
            }
            
            // Next month days
            const remaining = totalCells - cells.length;
            for (let d = 1; d <= remaining; d++) {
                const date = new Date(year, month + 1, d);
                const dateStr = Utils.formatDate(date);
                cells.push({
                    date: date,
                    dateStr: dateStr,
                    dayNumber: d,
                    isCurrentMonth: false,
                    isToday: dateStr === todayStr
                });
            }
            
            // Group events by date
            const eventsByDate = {};
            calendar.events.forEach(ev => {
                if (!eventsByDate[ev.event_date]) {
                    eventsByDate[ev.event_date] = [];
                }
                eventsByDate[ev.event_date].push(ev);
            });
            
            // Sort events within each date by priority
            for (let date in eventsByDate) {
                eventsByDate[date].sort((a, b) => (a.priority_rank || 2) - (b.priority_rank || 2));
            }
            
            // Build HTML
            const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });
            const yearNum = year;
            
            let html = '<div class="calendar-grid month-view">';
            
            // Header: Month name + year
            html += `<div class="month-header-title" style="text-align:center;padding:8px 0;font-size:1.1rem;font-weight:600;color:#F0F6FC;">
                        ${monthName} ${yearNum}
                    </div>`;
            
            // Day labels (Sunday-first)
            html += '<div class="month-header">';
            const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayLabels.forEach(label => {
                html += `<div class="month-day-label">${label}</div>`;
            });
            html += '</div>';
            
            // Grid cells
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
                    
                    // Show up to 2 events, then "+N more"
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
            
            $('#app-calendar').append(html);
            
            // Bind view-specific events
            this.bindEvents(calendar);
        },

        bindEvents: function(calendar) {
            // Click on a day cell to zoom in to Day View
            $(document).on('click', '.month-day-cell', function(e) {
                if ($(e.target).closest('.event-indicator, .more-indicator').length) return;
                
                const dateStr = $(this).data('date');
                if (dateStr) {
                    console.log('📅 Month View — Day clicked:', dateStr);
                    const parts = dateStr.split('-');
                    calendar.currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    calendar.currentView = 'day';
                    calendar.render();
                }
            });

            // Click on an event indicator to open edit panel
            $(document).on('click', '.month-view .event-indicator', function(e) {
                e.stopPropagation();
                const id = $(this).data('event-id');
                const event = calendar.events.find(ev => ev.id == id);
                if (event && window.Panel && typeof window.Panel.showEdit === 'function') {
                    window.Panel.showEdit(event);
                } else {
                    console.error('❌ Event not found for edit:', id);
                }
            });

            // Click on "+N more" to show all events for that day
            $(document).on('click', '.month-view .more-indicator', function(e) {
                e.stopPropagation();
                const dateStr = $(this).data('date');
                const events = calendar.events.filter(ev => ev.event_date === dateStr);
                console.log('📋 Month View — All events for', dateStr, ':', events);
                
                let msg = `📅 Events for ${dateStr}:\n\n`;
                events.forEach((ev, i) => {
                    const time = Utils.formatHour(ev.start_hour);
                    msg += `${i+1}. ${time} — ${ev.title} (P${ev.priority_rank || 2})\n`;
                    if (ev.venue) msg += `   📍 ${ev.venue}\n`;
                });
                alert(msg);
            });
        }
    };

})(jQuery);