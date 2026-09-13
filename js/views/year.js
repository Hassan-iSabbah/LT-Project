// /js/views/year.js
(function($) {
    'use strict';

    // YearView module — renders 4-column grid of months with event density
    window.YearView = {
        render: function(calendar) {
            console.log('📅 YearView.render() called');
            
            const year = calendar.currentDate.getFullYear();
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            
            // Group events by month
            const eventsByMonth = {};
            for (let m = 0; m < 12; m++) {
                eventsByMonth[m] = [];
            }
            
            calendar.events.forEach(ev => {
                const evDate = new Date(ev.event_date);
                const evMonth = evDate.getMonth();
                if (evDate.getFullYear() === year) {
                    eventsByMonth[evMonth].push(ev);
                }
            });
            
            // Build HTML
            let html = '<div class="calendar-grid year-view">';
            
            // Header: Year
            html += `<div class="year-header">${year}</div>`;
            
            // Grid of months
            html += '<div class="year-grid">';
            
            for (let m = 0; m < 12; m++) {
                const events = eventsByMonth[m] || [];
                const eventCount = events.length;
                const monthDate = new Date(year, m, 1);
                
                // Generate dot pattern (max 20 dots)
                const maxDots = 20;
                const dots = [];
                const daysInMonth = new Date(year, m + 1, 0).getDate();
                
                // Group events by day to show density
                const eventsByDay = {};
                events.forEach(ev => {
                    const day = new Date(ev.event_date).getDate();
                    if (!eventsByDay[day]) eventsByDay[day] = [];
                    eventsByDay[day].push(ev);
                });
                
                // Build dots (one per day, colored if has event)
                for (let d = 1; d <= daysInMonth && d <= maxDots; d++) {
                    const dayEvents = eventsByDay[d] || [];
                    let dotClass = 'dot';
                    if (dayEvents.length > 0) {
                        if (dayEvents.length > 1) {
                            dotClass += ' has-clash';
                        } else {
                            dotClass += ' has-event';
                        }
                    }
                    dots.push(`<span class="${dotClass}"></span>`);
                }
                
                // If more days than maxDots, show ellipsis
                if (daysInMonth > maxDots) {
                    const remaining = daysInMonth - maxDots;
                    const hasRemainingEvents = Object.keys(eventsByDay).some(day => day > maxDots);
                    if (hasRemainingEvents) {
                        dots.push(`<span class="dot has-event" style="opacity:0.5;">…</span>`);
                    } else {
                        dots.push(`<span class="dot" style="opacity:0.3;">…</span>`);
                    }
                }
                
                // Build preview text (top 2 event titles)
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
            
            $('#app-calendar').append(html);
            
            // Bind view-specific events
            this.bindEvents(calendar);
        },

        bindEvents: function(calendar) {
            // Click on a month card to zoom in to Month View
            $(document).on('click', '.year-month-card', function(e) {
                // Don't trigger if clicking on a preview event
                if ($(e.target).closest('.preview-event').length) return;
                
                const month = parseInt($(this).data('month'));
                const year = parseInt($(this).data('year'));
                
                console.log('📅 Year View — Month clicked:', month, year);
                
                // Set calendar date to the clicked month
                calendar.currentDate = new Date(year, month, 1);
                // Zoom in to Month View
                calendar.currentView = 'month';
                calendar.render();
            });

            // Click on a preview event to open edit panel
            $(document).on('click', '.year-view .preview-event', function(e) {
                e.stopPropagation();
                // Find the parent month card, get its events
                const card = $(this).closest('.year-month-card');
                const month = parseInt(card.data('month'));
                const year = parseInt(card.data('year'));
                
                // Find events for this month
                const monthEvents = calendar.events.filter(ev => {
                    const evDate = new Date(ev.event_date);
                    return evDate.getFullYear() === year && evDate.getMonth() === month;
                });
                
                // Find the specific event by title (approximate)
                const title = $(this).text().trim();
                const event = monthEvents.find(ev => ev.title.includes(title.replace('…', '')));
                
                if (event && window.Panel && typeof window.Panel.showEdit === 'function') {
                    window.Panel.showEdit(event);
                } else {
                    console.error('❌ Could not find event for preview click');
                }
            });
        }
    };

})(jQuery);