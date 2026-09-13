// /js/subject.js
(function($) {
    'use strict';

    window.SubjectManager = {
        currentSubjectId: null,
        currentSubjectName: null,
        isEditMode: false,

        init: function() {
            console.log('📚 SubjectManager initialized');
            this.loadSubjects();
            this.bindEvents();
        },

        loadSubjects: function() {
            const self = this;
            $.ajax({
                url: window.BASE_PATH + 'public/api/subjects.php',
                method: 'GET',
                dataType: 'json'
            }).done(function(subjects) {
                self.renderSubjectList(subjects);
            }).fail(function() {
                alert('Failed to load subjects.');
            });
        },

        renderSubjectList: function(subjects) {
            const container = $('#subject-manager-container');
            if (!container.length) return;

            let html = '<div class="subject-manager">';
            html += '<div class="subject-header"><h2>📚 Your Subjects</h2><button class="btn-add-subject">+ Add Subject</button></div>';
            
            if (subjects.length === 0) {
                html += '<div class="subject-empty">No subjects yet. Create your first subject!</div>';
            } else {
                html += '<div class="subject-list">';
                subjects.forEach(subject => {
                    html += this.renderSubjectCard(subject);
                });
                html += '</div>';
            }
            
            html += '</div>';
            container.html(html);
        },

        renderSubjectCard: function(subject) {
            const color = subject.color_hex || '#58A6FF';
            const sessions = subject.sessions || [];
            const subjectName = subject.full_name ? subject.name + ' — ' + subject.full_name : subject.name;
            
            let sessionsHtml = '';
            if (sessions.length > 0) {
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                sessionsHtml = '<div class="session-list">';
                sessions.forEach(session => {
                    const dayName = dayNames[session.day_of_week] || '?';
                    const hourLabel = Utils.formatHour(session.start_hour);
                    const venue = session.venue ? '📍' + session.venue : '';
                    sessionsHtml += `<span class="session-tag">${dayName} ${hourLabel} ${venue}</span>`;
                });
                sessionsHtml += '</div>';
            } else {
                sessionsHtml = '<span class="no-sessions">No sessions added</span>';
            }

            const priorityLabel = subject.priority_rank || 2;
            const priorityText = priorityLabel === 1 ? 'Attend' : 
                                 priorityLabel === 2 ? 'Catch up' : 'Review';

            return `<div class="subject-card" data-id="${subject.id}" data-name="${this.escapeHtml(subjectName)}">
                        <div class="subject-card-header" style="border-left-color:${color};">
                            <div class="subject-info">
                                <span class="subject-name">${this.escapeHtml(subject.name)}</span>
                                ${subject.full_name ? `<span class="subject-fullname">— ${this.escapeHtml(subject.full_name)}</span>` : ''}
                            </div>
                            <div class="subject-badges">
                                <span class="badge badge-category">${subject.category_name || 'Uncategorized'}</span>
                                <span class="badge badge-priority">P${priorityLabel} ${priorityText}</span>
                            </div>
                        </div>
                        <div class="subject-card-body">
                            <div class="subject-sessions">
                                ${sessionsHtml}
                            </div>
                            <div class="subject-actions">
                                <button class="btn-add-session" data-id="${subject.id}">+ Add Session</button>
                                <button class="btn-generate" data-id="${subject.id}">📅 Generate Events</button>
                                <button class="btn-edit-subject" data-id="${subject.id}">✏️ Edit</button>
                                <button class="btn-delete-subject" data-id="${subject.id}">🗑️ Delete</button>
                            </div>
                        </div>
                    </div>`;
        },

        bindEvents: function() {
            // Add Subject button
            $(document).on('click', '.btn-add-subject', function() {
                SubjectManager.showSubjectForm();
            });

            // Add Session button
            $(document).on('click', '.btn-add-session', function() {
                const id = $(this).data('id');
                const card = $(this).closest('.subject-card');
                const name = card.data('name') || 'Subject';
                SubjectManager.currentSubjectName = name;
                SubjectManager.showSessionForm(id);
            });

            // Generate Events button
            $(document).on('click', '.btn-generate', function() {
                const id = $(this).data('id');
                SubjectManager.generateEvents(id);
            });

            // Edit Subject button
            $(document).on('click', '.btn-edit-subject', function() {
                const id = $(this).data('id');
                SubjectManager.showSubjectForm(id);
            });

            // Delete Subject button
            $(document).on('click', '.btn-delete-subject', function() {
                const id = $(this).data('id');
                if (confirm('Delete this subject and all its sessions?')) {
                    SubjectManager.deleteSubject(id);
                }
            });

            // Subject form submit
            $(document).on('submit', '#subject-form', function(e) {
                e.preventDefault();
                SubjectManager.saveSubject();
            });

            // Session form submit
            $(document).on('submit', '#session-form', function(e) {
                e.preventDefault();
                SubjectManager.saveSession();
            });

            // Close forms
            $(document).on('click', '.subject-form-close, .session-form-close', function() {
                $(this).closest('.form-overlay').remove();
            });
        },

        // ===== SUBJECT FORM =====
        showSubjectForm: function(id) {
            const self = this;
            this.currentSubjectId = id || null;
            this.isEditMode = !!id;

            // Remove any existing form
            $('#subject-form-container').remove();
            
            const container = $('<div id="subject-form-container" class="form-overlay"></div>');
            $('body').append(container);

            const title = this.isEditMode ? 'Edit Subject' : 'Add Subject';
            
            // Build category options
            let categoryOptions = '';
            $.ajax({
                url: window.BASE_PATH + 'public/api/categories.php',
                method: 'GET',
                dataType: 'json',
                async: false
            }).done(function(categories) {
                categories.forEach(cat => {
                    categoryOptions += `<option value="${cat.id}">${cat.name}</option>`;
                });
            }).fail(function() {
                // Fallback options
                categoryOptions = `<option value="1">Work</option>
                                  <option value="2">Personal</option>
                                  <option value="3">Health</option>
                                  <option value="4">Family</option>
                                  <option value="5">Errands</option>
                                  <option value="6">UNI</option>`;
            });

            let formHtml = `<div class="form-modal">
                                <div class="form-header">
                                    <h3>${title}</h3>
                                    <button class="subject-form-close">&times;</button>
                                </div>
                                <form id="subject-form">
                                    <input type="hidden" id="subject-id" value="${id || ''}">
                                    <div class="form-group">
                                        <label for="subject-name">Subject Code *</label>
                                        <input type="text" id="subject-name" placeholder="e.g., MAM152" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="subject-fullname">Full Name</label>
                                        <input type="text" id="subject-fullname" placeholder="e.g., Calculus III">
                                    </div>
                                    <div class="form-group" style="display:flex; gap:10px;">
                                        <div style="flex:1;">
                                            <label for="subject-category">Category</label>
                                            <select id="subject-category">${categoryOptions}</select>
                                        </div>
                                        <div style="flex:1;">
                                            <label for="subject-priority">Priority</label>
                                            <select id="subject-priority">
                                                <option value="1">1 — Attend</option>
                                                <option value="2" selected>2 — Catch up</option>
                                                <option value="3">3 — Review</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="subject-color">Color</label>
                                        <input type="color" id="subject-color" value="#58A6FF">
                                    </div>
                                    <div class="form-group">
                                        <label for="subject-description">Description</label>
                                        <textarea id="subject-description" rows="2" placeholder="Optional notes about this subject..."></textarea>
                                    </div>
                                    <div class="form-actions">
                                        <button type="submit" class="btn-primary">💾 Save Subject</button>
                                        <button type="button" class="btn-secondary subject-form-close">Cancel</button>
                                    </div>
                                </form>
                            </div>`;

            container.html(formHtml).show();

            // If editing, load subject data
            if (this.isEditMode && id) {
                $.ajax({
                    url: window.BASE_PATH + 'public/api/subjects.php?id=' + id,
                    method: 'GET',
                    dataType: 'json'
                }).done(function(subject) {
                    $('#subject-name').val(subject.name);
                    $('#subject-fullname').val(subject.full_name || '');
                    $('#subject-category').val(subject.category_id);
                    $('#subject-priority').val(subject.priority_id || 2);
                    $('#subject-color').val(subject.color_hex || '#58A6FF');
                    $('#subject-description').val(subject.description || '');
                }).fail(function() {
                    alert('Failed to load subject data.');
                });
            }
            
            // Bind close for this specific overlay
            container.find('.subject-form-close').on('click', function() {
                container.remove();
            });
        },

        saveSubject: function() {
            const id = $('#subject-id').val();
            const data = {
                name: $('#subject-name').val().trim(),
                full_name: $('#subject-fullname').val().trim(),
                category_id: parseInt($('#subject-category').val()),
                priority_id: parseInt($('#subject-priority').val()),
                color_hex: $('#subject-color').val(),
                description: $('#subject-description').val().trim()
            };

            if (!data.name) {
                alert('Please enter a subject code.');
                return;
            }

            const url = window.BASE_PATH + 'public/api/subjects.php' + (id ? '?id=' + id : '');
            const method = id ? 'PUT' : 'POST';

            $.ajax({
                url: url,
                method: method,
                contentType: 'application/json',
                data: JSON.stringify(data),
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    alert('✅ Subject saved!');
                    $('#subject-form-container').remove();
                    SubjectManager.loadSubjects();
                } else {
                    alert('❌ Failed to save subject.');
                }
            }).fail(function() {
                alert('❌ Error saving subject.');
            });
        },

        // ===== SESSION FORM =====
        showSessionForm: function(subjectId) {
            console.log('📝 Opening session form for subject:', subjectId);
            
            // Remove any existing session form container
            $('#session-form-container').remove();
            
            // Create fresh container
            const container = $('<div id="session-form-container" class="form-overlay"></div>');
            $('body').append(container);

            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            let dayOptions = '';
            dayNames.forEach((name, index) => {
                dayOptions += `<option value="${index}">${name}</option>`;
            });

            let hourOptions = '';
            for (let h = 0; h < 24; h++) {
                const ampm = h >= 12 ? 'PM' : 'AM';
                const hour12 = h % 12 || 12;
                hourOptions += `<option value="${h}">${String(hour12).padStart(2, '0')}:00 ${ampm}</option>`;
            }

            const today = new Date().toISOString().split('T')[0];
            const nextMonth = new Date(Date.now() + 28*24*60*60*1000).toISOString().split('T')[0];

            const formHtml = `<div class="form-modal">
                                <div class="form-header">
                                    <h3>Add Session — ${this.currentSubjectName || 'Subject'}</h3>
                                    <button class="session-form-close">&times;</button>
                                </div>
                                <form id="session-form">
                                    <input type="hidden" id="session-subject-id" value="${subjectId}">
                                    <div class="form-group" style="display:flex; gap:10px;">
                                        <div style="flex:1;">
                                            <label for="session-day">Day</label>
                                            <select id="session-day">${dayOptions}</select>
                                        </div>
                                        <div style="flex:1;">
                                            <label for="session-hour">Time</label>
                                            <select id="session-hour">${hourOptions}</select>
                                        </div>
                                        <div style="flex:0 0 70px;">
                                            <label for="session-duration">Hours</label>
                                            <select id="session-duration">
                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                                <option value="3">3</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="session-venue">Venue</label>
                                        <input type="text" id="session-venue" placeholder="e.g., Prefabs OA">
                                    </div>
                                    <div class="form-group" style="display:flex; gap:10px;">
                                        <div style="flex:1;">
                                            <label for="session-start-date">Start Date</label>
                                            <input type="date" id="session-start-date" value="${today}" required>
                                        </div>
                                        <div style="flex:1;">
                                            <label for="session-end-date">End Date (optional)</label>
                                            <input type="date" id="session-end-date" value="${nextMonth}">
                                        </div>
                                    </div>
                                    <div class="form-actions">
                                        <button type="submit" class="btn-primary">💾 Add Session</button>
                                        <button type="button" class="btn-secondary session-form-close">Cancel</button>
                                    </div>
                                </form>
                            </div>`;

            container.html(formHtml).show();
            
            // Bind close event
            container.find('.session-form-close').on('click', function() {
                container.remove();
            });
            
            // Bind submit event
            container.find('#session-form').on('submit', function(e) {
                e.preventDefault();
                SubjectManager.saveSession();
            });
        },

        saveSession: function() {
            console.log('💾 Saving session...');
            
            const subjectId = $('#session-subject-id').val();
            const data = {
                subject_id: parseInt(subjectId),
                day_of_week: parseInt($('#session-day').val()),
                start_hour: parseInt($('#session-hour').val()),
                duration: parseInt($('#session-duration').val()),
                venue: $('#session-venue').val().trim(),
                start_date: $('#session-start-date').val(),
                end_date: $('#session-end-date').val() || null
            };

            if (!data.start_date) {
                alert('Please select a start date.');
                return;
            }

            console.log('📤 Session data:', data);

            $.ajax({
                url: window.BASE_PATH + 'public/api/subjects.php?action=session',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                dataType: 'json'
            }).done(function(response) {
                console.log('✅ Session response:', response);
                if (response.success) {
                    alert('✅ Session added!');
                    $('#session-form-container').remove();
                    SubjectManager.loadSubjects();
                } else {
                    alert('❌ Failed to add session: ' + (response.error || 'Unknown error'));
                }
            }).fail(function(xhr) {
                console.error('❌ Session error:', xhr.responseText);
                alert('❌ Error adding session. Check console for details.');
            });
        },

        // ===== GENERATE EVENTS =====
        generateEvents: function(subjectId) {
            const self = this;
            
            // Get subject name for display
            const card = $(`.subject-card[data-id="${subjectId}"]`);
            const subjectName = card.data('name') || 'Subject';
            
            // Prompt for date range
            const startDate = prompt('📅 Enter start date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
            if (!startDate) return;
            
            const endDate = prompt('📅 Enter end date (YYYY-MM-DD):', new Date(Date.now() + 28*24*60*60*1000).toISOString().split('T')[0]);
            if (!endDate) return;

            // Show loading state
            const genBtn = card.find('.btn-generate');
            genBtn.text('⏳ Generating...').prop('disabled', true);

            $.ajax({
                url: window.BASE_PATH + 'public/api/subjects.php?action=generate&subject_id=' + subjectId + '&start_date=' + startDate + '&end_date=' + endDate,
                method: 'GET',
                dataType: 'json'
            }).done(function(response) {
                console.log('✅ Generate response:', response);
                if (response.success) {
                    let message = `✅ ${response.created} events created for "${subjectName}"!`;
                    if (response.errors > 0) {
                        message += `\n⚠️ ${response.errors} duplicates skipped.`;
                    }
                    message += `\n📅 ${response.generated} total occurrences processed.`;
                    alert(message);
                    
                    // Refresh calendar if it's open
                    if (window.Calendar) {
                        window.Calendar.render();
                    }
                } else {
                    alert('❌ Failed to generate events: ' + (response.error || 'Unknown error'));
                }
                
                // Reset button
                genBtn.text('📅 Generate Events').prop('disabled', false);
                // Refresh subject list to show updated info
                self.loadSubjects();
            }).fail(function(xhr) {
                console.error('❌ Generate error:', xhr.responseText);
                alert('❌ Error generating events. Check console for details.');
                genBtn.text('📅 Generate Events').prop('disabled', false);
            });
        },

        // ===== DELETE SUBJECT =====
        deleteSubject: function(id) {
            $.ajax({
                url: window.BASE_PATH + 'public/api/subjects.php?id=' + id,
                method: 'DELETE',
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    alert('Subject deleted.');
                    SubjectManager.loadSubjects();
                } else {
                    alert('Failed to delete subject.');
                }
            }).fail(function() {
                alert('Error deleting subject.');
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

    $(document).ready(function() {
        if ($('#subject-manager-container').length) {
            SubjectManager.init();
        }
    });

})(jQuery);