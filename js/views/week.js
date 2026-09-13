// /js/views/week.js
(function($) {
    'use strict';

    window.WeekView = {
        render: function(calendar) {
            const html = window.ViewEngine.renderWeek(calendar);
            $('#app-calendar').append(html);
            this.bindEvents(calendar);
        },

        bindEvents: function(calendar) {
            // ============================================================
            // 1. Click on hour cell → Add Event
            // ============================================================
            $(document).on('click', '.week-view .hour-cell', function(e) {
                if ($(e.target).closest('.event-pill, .more-badge, .cycle-arrow').length) return;
                const hour = $(this).data('hour');
                const date = $(this).data('date');
                console.log('🖱️ Week View — Hour cell clicked:', date, hour);
                if (window.Panel) window.Panel.showAdd(date, hour);
            });

            // ============================================================
            // 2. Click on event pill → Open Task View (REQUIRES RENDER)
            // ============================================================
            $(document).on('click', '.week-view .event-pill', function(e) {
                if ($(e.target).closest('.cycle-arrow, .more-badge').length) return;
                
                const id = $(this).data('event-id');
                console.log('📌 Week View — Event pill clicked, ID:', id);
                
                const event = calendar.events.find(ev => ev.id == id);
                if (event && window.Calendar) {
                    window.Calendar.currentTaskId = id;
                    window.Calendar.currentDate = new Date(event.event_date);
                    window.Calendar.currentHour = event.start_hour;
                    window.Calendar.currentView = 'task';
                    window.Calendar.render(); // ✅ NEEDED — switching views
                } else {
                    console.error('❌ Event not found for ID:', id);
                }
            });

            // ============================================================
            // 3. Priority Cycling — ▼ arrow (NO RENDER — update DOM in place)
            // ============================================================
            $(document).on('click', '.week-view .cycle-arrow', function(e) {
                e.stopPropagation();
                
                const id = $(this).data('event-id');
                const pill = $(this).closest('.event-pill');
                const currentPriority = parseInt(pill.data('priority')) || 2;
                const newPriority = (currentPriority % 3) + 1;
                
                console.log('🔄 Week View — Cycling priority for event:', id, 'from', currentPriority, 'to', newPriority);
                
                const arrow = $(this);
                arrow.prop('disabled', true).text('⏳');
                
                $.ajax({
                    url: window.BASE_PATH + 'public/api/events.php?id=' + id,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({ priority_id: newPriority }),
                    dataType: 'json'
                }).done(function(response) {
                    console.log('✅ Priority update response:', response);
                    if (response.success) {
                        const priorityLabels = {1: 'Attend', 2: 'Catch up', 3: 'Review'};
                        
                        // Update the pill in place — NO RENDER
                        pill.data('priority', newPriority);
                        pill.find('.priority-badge').text('P' + newPriority);
                        pill.attr('data-priority', newPriority);
                        
                        // Update priority class for styling
                        pill.removeClass('priority-high priority-medium priority-low');
                        if (newPriority === 1) pill.addClass('priority-high');
                        else if (newPriority === 2) pill.addClass('priority-medium');
                        else if (newPriority === 3) pill.addClass('priority-low');
                        
                        // Also update the event in the calendar's events array
                        const event = calendar.events.find(ev => ev.id == id);
                        if (event) {
                            event.priority_rank = newPriority;
                            event.priority_id = newPriority;
                        }
                        
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('Priority updated to ' + priorityLabels[newPriority], 'success');
                        }
                        // ❌ NO render() call here
                    } else {
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('Failed to update priority', 'error');
                        }
                    }
                }).fail(function(xhr) {
                    console.error('❌ Priority update error:', xhr.responseText);
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('Error updating priority', 'error');
                    }
                }).always(function() {
                    arrow.prop('disabled', false).text('▼');
                });
            });

            // ============================================================
            // 4. "+N" Clash List — More Badge
            // ============================================================
            $(document).on('click', '.week-view .more-badge', function(e) {
                e.stopPropagation();
                
                const date = $(this).data('date');
                const hour = $(this).data('hour');
                console.log('📋 Week View — Show clash list for:', date, hour);
                
                const eventsInHour = calendar.events.filter(ev => 
                    ev.event_date === date && ev.start_hour === hour
                );
                
                if (eventsInHour.length === 0) {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('No events at this hour', 'info');
                    }
                    return;
                }
                
                const badge = $(this);
                const badgeRect = badge[0].getBoundingClientRect();
                
                $('.clash-list-dropdown').remove();
                
                const dropdown = $('<div class="clash-list-dropdown"></div>');
                dropdown.css({
                    position: 'fixed',
                    top: (badgeRect.bottom + 8) + 'px',
                    left: (badgeRect.left - 80) + 'px',
                    background: '#161B22',
                    border: '1px solid #30363D',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    minWidth: '240px',
                    maxWidth: '320px',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
                    zIndex: 9999,
                    maxHeight: '300px',
                    overflowY: 'auto'
                });
                
                let listHtml = `<div style="font-size:0.75rem;font-weight:600;color:#8B949E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;border-bottom:1px solid #30363D;padding-bottom:6px;">
                                    ${eventsInHour.length} events at ${Utils.formatHour(hour)}
                                </div>`;
                
                eventsInHour.forEach(ev => {
                    const priorityLabel = ev.priority_rank === 1 ? 'Attend' : 
                                         ev.priority_rank === 2 ? 'Catch up' : 'Review';
                    
                    listHtml += `
                        <div class="clash-item" data-event-id="${ev.id}" style="
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            padding:6px 4px;
                            border-bottom:1px solid #21262D;
                            cursor:pointer;
                            transition:background 0.15s;
                        ">
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:500;font-size:0.85rem;color:#F0F6FC;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    ${Utils.escapeHtml ? Utils.escapeHtml(ev.title) : ev.title}
                                </div>
                                <div style="font-size:0.65rem;color:#8B949E;">
                                    ${ev.venue ? '📍' + (Utils.escapeHtml ? Utils.escapeHtml(ev.venue) : ev.venue) + ' · ' : ''}
                                    P${ev.priority_rank} — ${priorityLabel}
                                </div>
                            </div>
                            <div style="display:flex;gap:4px;flex-shrink:0;">
                                <button class="clash-edit" data-id="${ev.id}" style="padding:2px 8px;font-size:0.6rem;background:rgba(88,166,255,0.15);color:#58A6FF;border:1px solid #58A6FF;border-radius:4px;cursor:pointer;">✏️</button>
                                <button class="clash-complete" data-id="${ev.id}" style="padding:2px 8px;font-size:0.6rem;background:rgba(63,185,80,0.15);color:#3FB950;border:1px solid #3FB950;border-radius:4px;cursor:pointer;">${ev.is_completed ? '↩️' : '✅'}</button>
                                <button class="clash-delete" data-id="${ev.id}" style="padding:2px 8px;font-size:0.6rem;background:rgba(248,81,73,0.15);color:#F85149;border:1px solid #F85149;border-radius:4px;cursor:pointer;">🗑️</button>
                            </div>
                        </div>
                    `;
                });
                
                dropdown.html(listHtml);
                $('body').append(dropdown);
                
                // Close dropdown when clicking outside
                const closeDropdown = function(e) {
                    if (!$(e.target).closest('.clash-list-dropdown').length && !$(e.target).closest('.more-badge').length) {
                        $('.clash-list-dropdown').remove();
                        $(document).off('click.clashList');
                    }
                };
                $(document).on('click.clashList', closeDropdown);
                
                // ===== Clash List Actions =====
                // Edit — opens panel, no render needed
                dropdown.on('click', '.clash-edit', function(e) {
                    e.stopPropagation();
                    const id = $(this).data('id');
                    const event = calendar.events.find(ev => ev.id == id);
                    if (event && window.Panel) {
                        window.Panel.showEdit(event);
                        $('.clash-list-dropdown').remove();
                        $(document).off('click.clashList');
                    }
                });
                
                // Complete — update in place, NO RENDER
                dropdown.on('click', '.clash-complete', function(e) {
                    e.stopPropagation();
                    const id = $(this).data('id');
                    
                    $.ajax({
                        url: window.BASE_PATH + 'public/api/events.php?action=toggle-complete&id=' + id,
                        method: 'POST',
                        dataType: 'json'
                    }).done(function(response) {
                        if (response.success) {
                            // Find the pill in the calendar and update it
                            const pill = $('.event-pill[data-event-id="' + id + '"]');
                            if (pill.length) {
                                pill.toggleClass('completed');
                                // Update the event in the calendar's events array
                                const event = calendar.events.find(ev => ev.id == id);
                                if (event) {
                                    event.is_completed = !event.is_completed;
                                }
                            }
                            
                            if (typeof Utils !== 'undefined' && Utils.showToast) {
                                Utils.showToast('Event toggled', 'success');
                            }
                            $('.clash-list-dropdown').remove();
                            $(document).off('click.clashList');
                            // ❌ NO render() call here
                        }
                    }).fail(function() {
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('Failed to toggle', 'error');
                        }
                    });
                });
                
                // Delete — remove pill from DOM, NO RENDER
                dropdown.on('click', '.clash-delete', function(e) {
                    e.stopPropagation();
                    const id = $(this).data('id');
                    if (!confirm('Delete this event permanently?')) return;
                    
                    $.ajax({
                        url: window.BASE_PATH + 'public/api/events.php?id=' + id,
                        method: 'DELETE',
                        dataType: 'json'
                    }).done(function(response) {
                        if (response.success) {
                            // Remove the pill from the DOM
                            const pill = $('.event-pill[data-event-id="' + id + '"]');
                            if (pill.length) {
                                // Find the parent hour-cell and remove the pill
                                const hourCell = pill.closest('.hour-cell');
                                pill.remove();
                                
                                // If the hour-cell is now empty, show the "+" empty slot
                                if (hourCell.find('.event-pill').length === 0) {
                                    hourCell.html('<span class="empty-slot">+</span>');
                                }
                                
                                // Remove from calendar.events array
                                const index = calendar.events.findIndex(ev => ev.id == id);
                                if (index !== -1) {
                                    calendar.events.splice(index, 1);
                                }
                            }
                            
                            if (typeof Utils !== 'undefined' && Utils.showToast) {
                                Utils.showToast('Event deleted', 'success');
                            }
                            $('.clash-list-dropdown').remove();
                            $(document).off('click.clashList');
                            // ❌ NO render() call here
                        }
                    }).fail(function() {
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('Failed to delete', 'error');
                        }
                    });
                });
            });

            // ============================================================
            // 5. Drag-and-Drop (Week View)
            // ============================================================
            let dragData = null;

            $(document).on('mousedown', '.week-view .event-pill .drag-handle', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const pill = $(this).closest('.event-pill');
                const id = pill.data('event-id');
                const hour = pill.data('hour');
                const date = pill.data('date');
                const rect = pill[0].getBoundingClientRect();
                
                // Store drag data
                dragData = {
                    id: id,
                    originalHour: hour,
                    originalDate: date,
                    pill: pill,
                    offsetX: e.clientX - rect.left,
                    offsetY: e.clientY - rect.top,
                    targetHour: null,
                    targetDate: null,
                    clone: null
                };
                
                // Create a clone to drag
                const clone = pill.clone();
                clone.css({
                    position: 'fixed',
                    top: (e.clientY - dragData.offsetY) + 'px',
                    left: (e.clientX - dragData.offsetX) + 'px',
                    width: pill.outerWidth() + 'px',
                    pointerEvents: 'none',
                    opacity: 0.85,
                    zIndex: 10000,
                    transform: 'scale(1.05)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                    borderRadius: '20px',
                    transition: 'none'
                });
                clone.addClass('dragging-clone');
                $('body').append(clone);
                dragData.clone = clone;
                
                // Fade the original
                pill.css('opacity', '0.3');
                pill.addClass('dragging-original');
                
                // Highlight all hour cells
                $('.week-view .hour-cell').addClass('drop-zone');
            });

            $(document).on('mousemove', function(e) {
                if (!dragData || !dragData.clone) return;
                
                // Update clone position to follow mouse
                dragData.clone.css({
                    top: (e.clientY - dragData.offsetY) + 'px',
                    left: (e.clientX - dragData.offsetX) + 'px'
                });
                
                // Find the target hour cell under the cursor
                const targetCell = $(document.elementFromPoint(e.clientX, e.clientY)).closest('.week-view .hour-cell');
                
                // Clear all highlights
                $('.week-view .hour-cell').removeClass('drop-target');
                $('.week-view .week-day-header').removeClass('drop-target-day');
                
                if (targetCell.length) {
                    targetCell.addClass('drop-target');
                    dragData.targetHour = parseInt(targetCell.data('hour'));
                    dragData.targetDate = targetCell.data('date');
                    
                    // Highlight the corresponding day header
                    const targetDate = targetCell.data('date');
                    $('.week-view .week-day-header').each(function() {
                        // We need to match the header to the date — we'll check the date text
                        // For simplicity, we'll use a data attribute approach
                        // Since we can't easily match, we'll just highlight the cell's column
                    });
                } else {
                    dragData.targetHour = null;
                    dragData.targetDate = null;
                }
            });

            $(document).on('mouseup', function(e) {
                if (!dragData) return;
                
                // Remove clone
                if (dragData.clone) {
                    dragData.clone.remove();
                }
                $('.dragging-clone').remove();
                $('.week-view .hour-cell').removeClass('drop-zone drop-target');
                $('.week-view .week-day-header').removeClass('drop-target-day');
                
                // Restore original pill opacity
                if (dragData.pill) {
                    dragData.pill.css('opacity', '1');
                    dragData.pill.removeClass('dragging-original');
                }
                
                // Check if dropped on a valid target
                const targetHour = dragData.targetHour;
                const targetDate = dragData.targetDate;
                const originalHour = dragData.originalHour;
                const originalDate = dragData.originalDate;
                const id = dragData.id;
                const pill = dragData.pill;
                
                // Determine what changed
                const hourChanged = (targetHour !== null && targetHour !== undefined && targetHour !== originalHour);
                const dayChanged = (targetDate && targetDate !== originalDate);
                
                if (targetHour !== null && targetHour !== undefined && (hourChanged || dayChanged)) {
                    console.log('📦 Dropped on:', targetDate, 'at hour', targetHour, 'from', originalDate, originalHour);
                    
                    // Build update payload
                    const updateData = { start_hour: targetHour };
                    if (dayChanged) {
                        updateData.event_date = targetDate;
                    }
                    
                    // Update the event via AJAX
                    $.ajax({
                        url: window.BASE_PATH + 'public/api/events.php?id=' + id,
                        method: 'PUT',
                        contentType: 'application/json',
                        data: JSON.stringify(updateData),
                        dataType: 'json'
                    }).done(function(response) {
                        if (response.success) {
                            // Update the event in the calendar's events array
                            const event = calendar.events.find(ev => ev.id == id);
                            if (event) {
                                event.start_hour = targetHour;
                                if (dayChanged) {
                                    event.event_date = targetDate;
                                }
                            }
                            
                            // Show toast with location info
                            let message = 'Event moved to ' + Utils.formatHour(targetHour);
                            if (dayChanged) {
                                const dateObj = new Date(targetDate);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                message += ' on ' + dayName + ' ' + dateObj.getDate();
                            }
                            
                            if (typeof Utils !== 'undefined' && Utils.showToast) {
                                Utils.showToast(message, 'success');
                            }
                            
                            // Re-render the calendar (the lock prevents duplication)
                            if (window.Calendar) {
                                window.Calendar.render();
                            }
                        } else {
                            if (typeof Utils !== 'undefined' && Utils.showToast) {
                                Utils.showToast('Failed to move event', 'error');
                            }
                        }
                    }).fail(function() {
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast('Error moving event', 'error');
                        }
                    });
                } else if (targetHour !== null && targetHour === originalHour && !dayChanged) {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('Event not moved (same location)', 'info');
                    }
                }
                
                // Reset drag data
                dragData = null;
            });
        }
    };

})(jQuery);