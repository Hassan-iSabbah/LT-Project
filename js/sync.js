// /js/sync.js
(function($) {
    'use strict';

    window.SyncManager = {
        currentEventId: null,
        plannedDuration: 0,

        init: function() {
            this.bindEvents();
        },

        bindEvents: function() {
            const self = this;

            // Close modal
            $(document).on('click', '.sync-close', function() {
                self.close();
            });

            // Click outside to close
            $(document).on('click', '.sync-overlay', function(e) {
                if ($(e.target).is('.sync-overlay')) {
                    self.close();
                }
            });

            // Live preview on input
            $(document).on('input', '#sync-duration', function() {
                const actual = parseInt($(this).val()) || 0;
                self.updatePreview(actual);
            });

            // Submit
            $(document).on('click', '#sync-submit', function() {
                self.save();
            });

            // Enter key to submit
            $(document).on('keydown', '#sync-duration', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    self.save();
                }
            });
        },

        open: function(eventId, plannedDuration) {
            this.currentEventId = eventId;
            this.plannedDuration = plannedDuration || 60; // Default to 60 minutes

            $('#sync-duration').val('');
            $('#sync-preview').hide();
            $('#sync-modal').show();

            // Focus the input
            setTimeout(function() {
                $('#sync-duration').focus();
            }, 200);
        },

        close: function() {
            $('#sync-modal').hide();
            $('#sync-duration').val('');
            $('#sync-preview').hide();
            this.currentEventId = null;
        },

        updatePreview: function(actual) {
            const planned = this.plannedDuration;
            if (actual > 0) {
                const percentage = Math.min(100, Math.round((planned / actual) * 100));
                $('#sync-planned').text(planned);
                $('#sync-actual').text(actual);
                $('#sync-percentage-display').text(percentage + '%');
                $('#sync-preview').show();
            } else {
                $('#sync-preview').hide();
            }
        },

        save: function() {
            const id = this.currentEventId;
            const actualDuration = parseInt($('#sync-duration').val());

            if (!actualDuration || actualDuration <= 0) {
                alert('Please enter a valid duration (minutes).');
                return;
            }

            // Show loading state
            const submitBtn = $('#sync-submit');
            submitBtn.text('⏳ Saving...').prop('disabled', true);

            $.ajax({
                url: window.BASE_PATH + 'public/api/events.php?action=complete-with-sync',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    id: id,
                    actual_duration: actualDuration
                }),
                dataType: 'json'
            }).done(function(response) {
                if (response.success) {
                    const percentage = response.sync_percentage;
                    let emoji = '✅';
                    if (percentage < 50) emoji = '⚠️';
                    else if (percentage < 80) emoji = '📊';
                    else emoji = '🎯';

                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast(emoji + ' Sync: ' + percentage + '% — ' + actualDuration + 'min actual', 'success');
                    }

                    self.close();
                    if (window.Calendar) {
                        window.Calendar.render();
                    }
                } else {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('❌ Failed to save sync data', 'error');
                    }
                }
            }).fail(function(xhr) {
                console.error('❌ Sync error:', xhr.responseText);
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('❌ Error saving sync data', 'error');
                }
            }).always(function() {
                submitBtn.text('✅ Complete & Save').prop('disabled', false);
            });
        }
    };

    $(document).ready(function() {
        SyncManager.init();
    });

    window.SyncManager = SyncManager;

})(jQuery);