// /js/panel.js
(function($) {
    'use strict';

    console.log('🔧 panel.js loading...');

    const Panel = {
        currentEventId: null,
        isEditMode: false,

        init() {
            console.log('✅ Panel initialized');
            this.bindEvents();
            this.loadGoals(); // Load goals for dropdown
        },

        // ============================================================
        // LOAD GOALS
        // ============================================================

        loadGoals: function() {
            const self = this;
            const apiUrl = window.BASE_PATH + 'public/api/goals.php';

            $.ajax({
                url: apiUrl,
                method: 'GET',
                data: { archived: 0 },
                dataType: 'json'
            }).done(function(goals) {
                self.populateGoalDropdown(goals);
            }).fail(function() {
                console.warn('⚠️ Could not load goals for dropdown.');
            });
        },

        populateGoalDropdown: function(goals) {
            const select = $('#event-goal');
            if (!select.length) return;

            // Build hierarchical options
            const rootGoals = goals.filter(g => !g.parent_goal_id);
            let options = '<option value="">— No Goal —</option>';

            rootGoals.forEach(root => {
                options += `<option value="${root.id}">${this.escapeHtml(root.title)}</option>`;
                // Add sub-goals with indentation
                const subGoals = goals.filter(g => g.parent_goal_id === root.id);
                subGoals.forEach(sub => {
                    options += `<option value="${sub.id}">— ${this.escapeHtml(sub.title)}</option>`;
                });
            });

            select.html(options);
        },

        // ============================================================
        // BIND EVENTS
        // ============================================================

        bindEvents() {
            const self = this;

            // Close panel
            $('#panel-close, #panel-cancel').on('click', function() {
                self.hide();
            });

            // Click outside to close
            $(document).on('click', function(e) {
                const panel = $('#event-panel');
                if (panel.is(':visible') && !$(e.target).closest('#event-panel').length) {
                    if (!$(e.target).closest('.hour-content').length) {
                        self.hide();
                    }
                }
            });

            // Toggle recurring end date
            $('#event-recurrence').on('change', function() {
                if ($(this).val() !== 'none') {
                    $('#recur-end-group').show();
                } else {
                    $('#recur-end-group').hide();
                }
            });

            // Form submit
            $('#event-form').on('submit', function(e) {
                e.preventDefault();
                self.save();
            });

            // Delete
            $('#panel-delete').on('click', function() {
                self.deleteEvent();
            });
        },

        // ============================================================
        // SHOW / HIDE
        // ============================================================

        showAdd(date, hour) {
            console.log('📝 Show Add Panel:', date, hour);
            this.isEditMode = false;
            this.currentEventId = null;
            
            // Reset form
            $('#panel-title').text('Add Event');
            $('#event-id').val('');
            $('#event-form')[0].reset();
            $('#event-date').val(date);
            $('#event-hour').val(hour);
            $('#event-duration').val(1);
            $('#event-completed').prop('checked', false);
            $('#event-recurrence').val('none');
            $('#recur-end-group').hide();
            $('#panel-delete').hide();
            $('#event-goal').val(''); // Reset goal dropdown
            
            // Show the panel
            $('#event-panel').css({
                display: 'block',
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                maxWidth: '420px',
                width: '90%'
            });
            
            console.log('✅ Panel should be visible now');
        },

        showEdit(event) {
            console.log('✏️ Show Edit Panel:', event);
            this.isEditMode = true;
            this.currentEventId = event.id;
            
            $('#panel-title').text('Edit Event');
            $('#event-id').val(event.id);
            $('#event-title').val(event.title);
            $('#event-venue').val(event.venue || '');
            $('#event-date').val(event.event_date);
            $('#event-hour').val(event.start_hour);
            $('#event-duration').val(event.duration || 1);
            $('#event-category').val(event.category_id);
            $('#event-priority').val(event.priority_id || 2);
            $('#event-description').val(event.description || '');
            $('#event-completed').prop('checked', !!event.is_completed);
            
            // Set goal if linked
            if (event.goal_id) {
                $('#event-goal').val(event.goal_id);
            } else {
                $('#event-goal').val('');
            }
            
            if (event.recurrence_rule) {
                const recurrenceType = event.recurrence_rule.includes('DAILY') ? 'daily' : 
                                      event.recurrence_rule.includes('WEEKLY') ? 'weekly' : 'none';
                $('#event-recurrence').val(recurrenceType);
                $('#recur-end-group').show();
                $('#event-recur-end').val(event.recurrence_end_date || '');
            } else {
                $('#event-recurrence').val('none');
                $('#recur-end-group').hide();
            }
            
            $('#panel-delete').show();
            
            // Show the panel
            $('#event-panel').css({
                display: 'block',
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                maxWidth: '420px',
                width: '90%'
            });
            
            console.log('✅ Panel should be visible now (edit mode)');
        },

        hide() {
            $('#event-panel').hide();
        },

        // ============================================================
        // SAVE
        // ============================================================

        save() {
            const title = $('#event-title').val()?.trim() || '';
            const venue = $('#event-venue').val()?.trim() || '';
            const eventDate = $('#event-date').val();
            const startHour = parseInt($('#event-hour').val()) || 0;
            const duration = parseInt($('#event-duration').val()) || 1;
            const categoryId = parseInt($('#event-category').val()) || 1;
            const priorityId = parseInt($('#event-priority').val()) || 2;
            const description = $('#event-description').val()?.trim() || '';
            const isCompleted = $('#event-completed').is(':checked') ? 1 : 0;
            const goalId = $('#event-goal').val() || null;

            // Validate
            if (!title) {
                alert('Please enter a title.');
                $('#event-title').focus();
                return;
            }

            if (!eventDate) {
                alert('Please select a date.');
                $('#event-date').focus();
                return;
            }

            // Build data object
            const data = {
                title: title,
                venue: venue,
                event_date: eventDate,
                start_hour: startHour,
                duration: duration,
                category_id: categoryId,
                priority_id: priorityId,
                description: description,
                is_completed: isCompleted,
                goal_id: goalId
            };

            // Handle recurrence
            const recurrenceType = $('#event-recurrence').val() || 'none';
            if (recurrenceType !== 'none') {
                if (recurrenceType === 'daily') {
                    data.recurrence_rule = 'DAILY:1';
                } else if (recurrenceType === 'weekly') {
                    data.recurrence_rule = 'WEEKLY:1';
                }
                data.recurrence_end_date = $('#event-recur-end').val() || null;
            } else {
                data.recurrence_rule = null;
                data.recurrence_end_date = null;
            }

            const url = window.BASE_PATH + 'public/api/events.php';
            const method = this.isEditMode ? 'PUT' : 'POST';
            const urlWithId = this.isEditMode ? url + '?id=' + this.currentEventId : url;

            console.log('💾 Saving event:', data);

            $.ajax({
                url: urlWithId,
                method: method,
                contentType: 'application/json',
                data: JSON.stringify(data),
                dataType: 'json'
            }).done(function(response) {
                console.log('✅ Save response:', response);
                if (response.success) {
                    // If a goal was linked, link the event to the goal
                    if (goalId && response.id) {
                        $.ajax({
                            url: window.BASE_PATH + 'public/api/goals.php?action=link-event',
                            method: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                event_id: response.id,
                                goal_id: goalId
                            }),
                            dataType: 'json'
                        }).done(function(linkResponse) {
                            console.log('🔗 Goal link response:', linkResponse);
                        }).fail(function() {
                            console.warn('⚠️ Failed to link event to goal.');
                        });
                    }
                    
                    alert('✅ Event saved!');
                    Panel.hide();
                    if (window.Calendar) {
                        window.Calendar.render();
                    } else {
                        location.reload();
                    }
                } else {
                    alert('❌ Failed to save event: ' + (response.error || 'Unknown error'));
                }
            }).fail(function(xhr) {
                console.error('❌ Save error:', xhr.responseText);
                alert('❌ Error saving event. Check console for details.');
            });
        },

        // ============================================================
        // DELETE
        // ============================================================

        deleteEvent() {
            if (!confirm('Delete this event permanently?')) return;
            const id = this.currentEventId;
            $.ajax({
                url: window.BASE_PATH + 'public/api/events.php?id=' + id,
                method: 'DELETE',
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    alert('🗑️ Event deleted.');
                    Panel.hide();
                    if (window.Calendar) {
                        window.Calendar.render();
                    } else {
                        location.reload();
                    }
                } else {
                    alert('❌ Failed to delete event.');
                }
            }).fail(function(xhr) {
                console.error('❌ Delete error:', xhr.responseText);
                alert('❌ Error deleting event.');
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

    // Expose globally
    window.Panel = Panel;

    $(document).ready(function() {
        Panel.init();
    });

})(jQuery);