// /js/hindsight.js
(function($) {
    'use strict';

    window.HindsightView = {
        filters: {
            search: '',
            dateRange: 'all',
            category: 'all',
            recurrence: 'all',
            completion: 'all',
            customStartDate: null
        },

        render: function(calendar) {
            console.log('🔍 HindsightView.render() called');
            
            const self = this;
            
            // Build query string from filters
            const params = new URLSearchParams({
                search: this.filters.search || '',
                category: this.filters.category || 'all',
                recurrence: this.filters.recurrence || 'all',
                completion: this.filters.completion || 'all',
                date_range: this.filters.dateRange || 'all',
                custom_start_date: this.filters.customStartDate || ''
            });
            
            const apiUrl = window.BASE_PATH + 'public/api/hindsight.php?' + params.toString();
            console.log('📡 Fetching from:', apiUrl);
            
            $.ajax({
                url: apiUrl,
                method: 'GET',
                dataType: 'json'
            }).done(function(response) {
                console.log('✅ Hindsight API response:', response);
                console.log('📊 Events:', response.events ? response.events.length : 0);
                
                // Clear the container
                $('#app-calendar').empty();
                
                // Load reflection banner
                if (calendar.loadReflectionBanner) {
                    calendar.loadReflectionBanner();
                }
                
                // Generate HTML using the ViewEngine
                const events = response.events || [];
                const html = window.ViewEngine.renderHindsight(calendar, events, self.filters);
                console.log('📄 HTML length:', html.length);
                
                $('#app-calendar').append(html);
                self.bindEvents(calendar, events);
            }).fail(function(xhr, status, error) {
                console.error('❌ Hindsight API error:', status, error);
                console.error('📄 Response:', xhr.responseText);
                $('#app-calendar').html('<div style="padding:40px;text-align:center;color:#8B949E;">Failed to load hindsight data. Check console.</div>');
            });
        },

        applyFilters: function(events) {
            // Filters are now applied server-side
            return events;
        },

        bindEvents: function(calendar, pastEvents) {
            const self = this;

            // --- Search Input ---
            $(document).on('input', '.hindsight-search', function() {
                self.filters.search = $(this).val().trim();
                self.render(calendar);
            });

            // --- Category Filter ---
            $(document).on('change', '.hindsight-filter-category', function() {
                self.filters.category = $(this).val();
                self.render(calendar);
            });

            // --- Recurrence Filter ---
            $(document).on('change', '.hindsight-filter-recurrence', function() {
                self.filters.recurrence = $(this).val();
                self.render(calendar);
            });

            // --- Completion Filter ---
            $(document).on('change', '.hindsight-filter-completion', function() {
                self.filters.completion = $(this).val();
                self.render(calendar);
            });

            // --- Date Range Filter ---
            $(document).on('change', '.hindsight-filter-daterange', function() {
                self.filters.dateRange = $(this).val();
                if (self.filters.dateRange === 'custom') {
                    $('.custom-date-range').show();
                } else {
                    $('.custom-date-range').hide();
                    self.filters.customStartDate = null;
                    self.render(calendar);
                }
            });

            // --- Custom Date Apply ---
            $(document).on('click', '.custom-date-apply', function() {
                const startDate = $('.custom-date-start').val();
                if (startDate) {
                    self.filters.customStartDate = startDate;
                    self.render(calendar);
                }
            });

            // --- Reset Filters ---
            $(document).on('click', '.hindsight-reset-filters', function() {
                self.filters = {
                    search: '',
                    dateRange: 'all',
                    category: 'all',
                    recurrence: 'all',
                    completion: 'all',
                    customStartDate: null
                };
                $('.hindsight-search').val('');
                $('.hindsight-filter-category').val('all');
                $('.hindsight-filter-recurrence').val('all');
                $('.hindsight-filter-completion').val('all');
                $('.hindsight-filter-daterange').val('all');
                $('.custom-date-range').hide();
                self.render(calendar);
            });

            // --- Card Click ---
            $(document).on('click', '.hindsight-card', function(e) {
                if ($(e.target).closest('.card-actions, .snapshot-close, .snapshot-save').length) return;
                const id = $(this).data('event-id');
                const event = calendar.events.find(ev => ev.id == id);
                if (event) {
                    self.openSnapshot(calendar, event);
                }
            });

            // --- Snapshot Close ---
            $(document).on('click', '.snapshot-close', function(e) {
                self.closeSnapshot();
            });
            $(document).on('click', '.snapshot-overlay', function(e) {
                if ($(e.target).is('.snapshot-overlay')) {
                    self.closeSnapshot();
                }
            });

            // --- Snapshot Save ---
            $(document).on('click', '.snapshot-save', function(e) {
                e.stopPropagation();
                const eventId = $(this).data('event-id');
                const wellAnswer = $('#snapshot-well').val().trim();
                const betterAnswer = $('#snapshot-better').val().trim();

                if (!wellAnswer && !betterAnswer) {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('Please write at least one reflection.', 'info');
                    }
                    return;
                }

                let saved = 0;
                let total = 0;

                if (wellAnswer) {
                    total++;
                    $.ajax({
                        url: window.BASE_PATH + 'public/api/reflections.php',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            type: 'event',
                            event_id: eventId,
                            question: 'What went well?',
                            answer: wellAnswer
                        }),
                        dataType: 'json'
                    }).done(function(response) {
                        if (response.success) saved++;
                        if (saved === total || !betterAnswer) {
                            self.handleSnapshotSaveComplete(calendar);
                        }
                    });
                }

                if (betterAnswer) {
                    total++;
                    $.ajax({
                        url: window.BASE_PATH + 'public/api/reflections.php',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            type: 'event',
                            event_id: eventId,
                            question: 'What could have gone better?',
                            answer: betterAnswer
                        }),
                        dataType: 'json'
                    }).done(function(response) {
                        if (response.success) saved++;
                        if (saved === total) {
                            self.handleSnapshotSaveComplete(calendar);
                        }
                    });
                }
            });

            // --- Escape key ---
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape' && $('.snapshot-overlay').is(':visible')) {
                    self.closeSnapshot();
                }
            });
        },

        handleSnapshotSaveComplete: function(calendar) {
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('✅ Reflection saved!', 'success');
            }
            this.closeSnapshot();
            calendar.render();
        },

        openSnapshot: function(calendar, event) {
            $('.snapshot-overlay').remove();

            const html = window.ViewEngine.renderSnapshot(calendar, event);
            $('body').append(html);
            $('.snapshot-overlay').fadeIn(300);

            $.ajax({
                url: window.BASE_PATH + 'public/api/reflections.php?action=event&event_id=' + event.id,
                method: 'GET',
                dataType: 'json'
            }).done(function(reflection) {
                if (reflection && reflection.answer) {
                    $.ajax({
                        url: window.BASE_PATH + 'public/api/reflections.php?type=event&limit=10',
                        method: 'GET',
                        dataType: 'json'
                    }).done(function(reflections) {
                        const eventReflections = reflections.filter(r => r.event_id == event.id);
                        eventReflections.forEach(r => {
                            if (r.question === 'What went well?') {
                                $('#snapshot-well').val(r.answer);
                            } else if (r.question === 'What could have gone better?') {
                                $('#snapshot-better').val(r.answer);
                            }
                        });
                    });
                }
            });
        },

        closeSnapshot: function() {
            $('.snapshot-overlay').fadeOut(300, function() {
                $(this).remove();
            });
        }
    };

})(jQuery);