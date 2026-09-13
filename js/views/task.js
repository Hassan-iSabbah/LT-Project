// /js/views/task.js
(function($) {
    'use strict';

    window.TaskView = {
        render: function(calendar) {
            console.log('📅 TaskView.render() called');
            
            const taskId = calendar.currentTaskId;
            if (!taskId) {
                // Try to find the first event of the day
                const dateStr = calendar.currentDate.toISOString().split('T')[0];
                const eventsOnDay = calendar.events.filter(ev => ev.event_date === dateStr);
                if (eventsOnDay.length > 0) {
                    eventsOnDay.sort((a, b) => (a.priority_rank || 2) - (b.priority_rank || 2));
                    calendar.currentTaskId = eventsOnDay[0].id;
                    calendar.render();
                    return;
                }
                
                $('#app-calendar').html(`<div style="padding:60px 20px;text-align:center;color:#8B949E;">
                    <div style="font-size:3rem;margin-bottom:16px;">📭</div>
                    <h3 style="color:#F0F6FC;margin-bottom:8px;">No Task Selected</h3>
                    <p style="margin-bottom:20px;">Click an event to view its details.</p>
                    <button onclick="window.Calendar.currentView='day';window.Calendar.render();" 
                            style="padding:8px 20px;background:#58A6FF;color:#fff;border:none;border-radius:6px;cursor:pointer;">
                        ⬅️ Back to Calendar
                    </button>
                </div>`);
                return;
            }
            
            const event = calendar.events.find(ev => ev.id == taskId);
            if (!event) {
                $('#app-calendar').html(`<div style="padding:60px 20px;text-align:center;color:#8B949E;">
                    <div style="font-size:3rem;margin-bottom:16px;">🔍</div>
                    <h3 style="color:#F0F6FC;margin-bottom:8px;">Task Not Found</h3>
                    <p style="margin-bottom:20px;">The selected task may have been deleted.</p>
                    <button onclick="window.Calendar.currentView='day';window.Calendar.render();" 
                            style="padding:8px 20px;background:#58A6FF;color:#fff;border:none;border-radius:6px;cursor:pointer;">
                        ⬅️ Back to Calendar
                    </button>
                </div>`);
                return;
            }
            
            // Store reference for edit mode
            this.currentEvent = event;
            this.isEditing = false;
            
            const html = window.ViewEngine.renderTask(calendar, event);
            $('#app-calendar').append(html);
            this.bindEvents(calendar);
        },

        bindEvents: function(calendar) {
            const self = this;

            // ===== BACK TO HOUR =====
            $(document).on('click', '.task-view [data-action="back"]', function(e) {
                e.preventDefault();
                console.log('⬅️ Back to Hour clicked');
                calendar.currentView = 'hour';
                calendar.currentTaskId = null;
                calendar.render();
            });

            // ===== EDIT TOGGLE =====
            $(document).on('click', '.task-view .btn-edit', function() {
                self.enterEditMode(calendar);
            });

            // ===== SAVE EDIT =====
            $(document).on('click', '.task-view .btn-save', function() {
                self.saveEdit(calendar);
            });

            // ===== CANCEL EDIT =====
            $(document).on('click', '.task-view .btn-cancel', function() {
                self.exitEditMode(calendar);
            });

            // ===== COMPLETE TOGGLE =====
            $(document).on('click', '.task-view .btn-complete', function() {
                const id = $(this).data('id');
                $.ajax({
                    url: window.BASE_PATH + 'public/api/events.php?action=toggle-complete&id=' + id,
                    method: 'POST',
                    dataType: 'json'
                }).done(function(response) {
                    if (response.success) {
                        calendar.render();
                    } else {
                        alert('Failed to toggle completion.');
                    }
                }).fail(function() {
                    alert('Error toggling completion.');
                });
            });

            // ===== DELETE =====
            $(document).on('click', '.task-view .btn-delete', function(e) {
                e.stopPropagation();
                const id = $(this).data('id');
                if (!confirm('Delete this event permanently?')) return;
                $.ajax({
                    url: window.BASE_PATH + 'public/api/events.php?id=' + id,
                    method: 'DELETE',
                    dataType: 'json'
                }).done(function(response) {
                    if (response.success) {
                        console.log('🗑️ Event deleted');
                        calendar.currentView = 'hour';
                        calendar.currentTaskId = null;
                        calendar.render();
                    } else {
                        alert('Failed to delete event.');
                    }
                }).fail(function() {
                    alert('Error deleting event.');
                });
            });
        },

        enterEditMode: function(calendar) {
            this.isEditing = true;
            const event = this.currentEvent;
            
            const card = $('.task-card');
            
            // Title -> input
            card.find('.task-title').replaceWith(
                `<input type="text" class="task-title-edit" value="${this.escapeHtml(event.title)}" style="width:100%;font-size:1.6rem;font-weight:700;background:transparent;color:#F0F6FC;border:1px solid #30363D;border-radius:6px;padding:4px 8px;">`
            );
            
            // Venue -> input
            const venueRow = card.find('.detail-row').filter(function() {
                return $(this).find('.detail-label').text().trim() === 'Venue';
            });
            venueRow.find('.detail-value').replaceWith(
                `<input type="text" class="venue-edit" value="${this.escapeHtml(event.venue || '')}" style="flex:1;background:transparent;color:#F0F6FC;border:1px solid #30363D;border-radius:6px;padding:2px 8px;">`
            );
            
            // Notes -> textarea
            card.find('.notes-content').replaceWith(
                `<textarea class="notes-edit">${this.escapeHtml(event.description || '')}</textarea>`
            );
            
            // Priority -> select
            const priorityRow = card.find('.detail-row').filter(function() {
                return $(this).find('.detail-label').text().trim() === 'Priority';
            });
            const currentPriority = event.priority_rank || 2;
            priorityRow.find('.detail-value').replaceWith(
                `<select class="priority-edit" style="background:transparent;color:#F0F6FC;border:1px solid #30363D;border-radius:6px;padding:2px 8px;">
                    <option value="1" ${currentPriority === 1 ? 'selected' : ''}>1 — Attend</option>
                    <option value="2" ${currentPriority === 2 ? 'selected' : ''}>2 — Catch up</option>
                    <option value="3" ${currentPriority === 3 ? 'selected' : ''}>3 — Review</option>
                </select>`
            );
            
            // Category -> select
            const categoryRow = card.find('.detail-row').filter(function() {
                return $(this).find('.detail-label').text().trim() === 'Category';
            });
            const currentCategory = event.category_id || 1;
            categoryRow.find('.detail-value').replaceWith(
                `<select class="category-edit" style="background:transparent;color:#F0F6FC;border:1px solid #30363D;border-radius:6px;padding:2px 8px;">
                    <option value="1" ${currentCategory === 1 ? 'selected' : ''}>Work</option>
                    <option value="2" ${currentCategory === 2 ? 'selected' : ''}>Personal</option>
                    <option value="3" ${currentCategory === 3 ? 'selected' : ''}>Health</option>
                    <option value="4" ${currentCategory === 4 ? 'selected' : ''}>Family</option>
                    <option value="5" ${currentCategory === 5 ? 'selected' : ''}>Errands</option>
                    <option value="6" ${currentCategory === 6 ? 'selected' : ''}>UNI</option>
                </select>`
            );
            
            // Toggle buttons
            card.find('.task-actions').html(`
                <button class="btn-task btn-save" data-action="save">💾 Save Changes</button>
                <button class="btn-task btn-cancel" data-action="cancel">Cancel</button>
            `);
        },

        exitEditMode: function(calendar) {
            this.isEditing = false;
            calendar.render();
        },

        saveEdit: function(calendar) {
            const card = $('.task-card');
            const event = this.currentEvent;
            
            const data = {
                title: card.find('.task-title-edit').val().trim(),
                venue: card.find('.venue-edit').val().trim(),
                description: card.find('.notes-edit').val().trim(),
                priority_id: parseInt(card.find('.priority-edit').val()),
                category_id: parseInt(card.find('.category-edit').val()),
                event_date: event.event_date,
                start_hour: event.start_hour,
                duration: event.duration || 1,
                is_completed: event.is_completed || 0
            };
            
            if (!data.title) {
                alert('Please enter a title.');
                return;
            }
            
            $.ajax({
                url: window.BASE_PATH + 'public/api/events.php?id=' + event.id,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(data),
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    console.log('✅ Task updated');
                    calendar.render();
                } else {
                    alert('Failed to update task.');
                }
            }).fail(function(xhr) {
                console.error('❌ Update error:', xhr.responseText);
                alert('Error updating task.');
            });
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