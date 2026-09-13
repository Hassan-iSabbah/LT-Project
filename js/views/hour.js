// /js/views/hour.js
(function($) {
    'use strict';

    window.HourView = {
        render: function(calendar) {
            console.log('📅 HourView.render() called');
            
            const dateObj = new Date(calendar.currentDate);
            const dateStr = dateObj.toISOString().split('T')[0];
            
            let hour = calendar.currentHour;
            if (hour === null || hour === undefined) {
                hour = new Date().getHours();
                if (hour < 6 || hour > 22) hour = 9;
            }
            
            console.log('📅 HourView — Date:', dateStr, 'Hour:', hour);
            
            const events = calendar.events.filter(ev => 
                ev.event_date === dateStr && ev.start_hour === hour
            );
            events.sort((a, b) => (a.priority_rank || 2) - (b.priority_rank || 2));
            
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
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
                    html += this.renderEventCard(event);
                });
            }
            
            html += '</div></div>';
            
            $('#app-calendar').append(html);
            this.bindEvents(calendar);
        },

        renderEventCard: function(event) {
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
            
            let syncHtml = '';
            if (event.sync_percentage !== null && event.sync_percentage !== undefined) {
                const syncColor = event.sync_percentage >= 80 ? '#3FB950' : 
                                 event.sync_percentage >= 50 ? '#D29922' : '#F85149';
                syncHtml = `
                    <div style="margin-top:4px; font-size:0.8rem;">
                        <span style="font-weight:600; color:${syncColor};">
                            📊 Sync: ${event.sync_percentage}%
                            ${event.actual_duration ? `(${event.actual_duration} min actual)` : ''}
                        </span>
                    </div>
                `;
            }
            
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
                            ${event.duration ? `<span class="detail-item"><span class="detail-icon">⏱️</span> ${event.duration}h planned</span>` : ''}
                        </div>
                        ${syncHtml}
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
        },

        bindEvents: function(calendar) {
            const self = this;
            
            // ===== ADD EVENT BUTTON =====
            $(document).on('click', '.hour-view .btn-add', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const header = $(this).closest('.hour-view-header');
                const dateStr = header.data('date');
                const hour = header.data('hour');
                if (window.Panel && typeof window.Panel.showAdd === 'function') {
                    window.Panel.showAdd(dateStr, hour);
                }
            });

            // ===== EDIT BUTTON =====
            $(document).on('click', '.hour-view .btn-edit', function(e) {
                e.stopPropagation();
                const id = $(this).data('id');
                const event = calendar.events.find(ev => ev.id == id);
                if (event && window.Panel) {
                    window.Panel.showEdit(event);
                }
            });

            // ===== CYCLE PRIORITY =====
            $(document).on('click', '.hour-view .btn-cycle', function(e) {
                e.stopPropagation();
                const id = $(this).data('id');
                const card = $(this).closest('.event-card');
                const currentPriority = parseInt(card.data('priority')) || 2;
                const newPriority = (currentPriority % 3) + 1;
                
                $.ajax({
                    url: window.BASE_PATH + 'public/api/events.php?id=' + id,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({ priority_id: newPriority }),
                    dataType: 'json'
                }).done(function(response) {
                    if (response.success) {
                        const priorityLabels = {1: 'Attend', 2: 'Catch up', 3: 'Review'};
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('Priority updated to ' + priorityLabels[newPriority], 'success');
                        }
                        calendar.render();
                    }
                });
            });

            // ===== COMPLETE/TOGGLE — Using mousedown (fires BEFORE click) =====
            $(document).on('mousedown', '.hour-view .btn-complete', function(e) {
                // Stop the event from reaching the card click handler
                e.stopPropagation();
                e.preventDefault();
                
                console.log('🔥🔥🔥 COMPLETE BUTTON FIRED (mousedown) 🔥🔥🔥');
                
                const id = $(this).data('id');
                console.log('📌 Event ID:', id);
                
                const event = calendar.events.find(ev => ev.id == id);
                if (!event) {
                    console.error('❌ Event not found');
                    return;
                }
                
                console.log('📋 Event:', event.title);
                console.log('📊 is_completed:', event.is_completed);
                console.log('📊 duration:', event.duration);
                
                if (event.is_completed) {
                    console.log('↩️ Reopening event');
                    $.ajax({
                        url: window.BASE_PATH + 'public/api/events.php?action=toggle-complete&id=' + id,
                        method: 'POST',
                        dataType: 'json'
                    }).done(function(response) {
                        if (response.success) {
                            calendar.render();
                        }
                    });
                    return;
                }
                
                const plannedDuration = (event.duration || 1) * 60;
                console.log('📊 Opening Sync modal with planned duration:', plannedDuration);
                
                if (window.SyncManager && typeof window.SyncManager.open === 'function') {
                    console.log('🔓 Calling SyncManager.open()');
                    window.SyncManager.open(id, plannedDuration);
                } else {
                    console.error('❌ SyncManager not found');
                    $.ajax({
                        url: window.BASE_PATH + 'public/api/events.php?action=toggle-complete&id=' + id,
                        method: 'POST',
                        dataType: 'json'
                    }).done(function(response) {
                        if (response.success) {
                            calendar.render();
                        }
                    });
                }
            });

            // ===== DELETE =====
            $(document).on('click', '.hour-view .btn-delete', function(e) {
                e.stopPropagation();
                const id = $(this).data('id');
                if (!confirm('Delete this event permanently?')) return;
                $.ajax({
                    url: window.BASE_PATH + 'public/api/events.php?id=' + id,
                    method: 'DELETE',
                    dataType: 'json'
                }).done(function(response) {
                    if (response.success) {
                        calendar.render();
                    }
                });
            });

            // ===== EVENT CARD CLICK — Open Task View =====
            $(document).on('click', '.hour-view .event-card', function(e) {
                // If the click target is a button, ignore
                if ($(e.target).closest('.btn-action, .btn-add, .btn-edit, .btn-cycle, .btn-complete, .btn-delete').length) {
                    console.log('⏭️ Ignoring card click — button clicked');
                    return;
                }
                
                const id = $(this).data('event-id');
                console.log('📅 Hour View — Task clicked:', id);
                
                if (window.Calendar) {
                    window.Calendar.currentTaskId = id;
                    window.Calendar.currentView = 'task';
                    window.Calendar.render();
                }
            });
        }
    };

})(jQuery);