// /js/reflection.js
(function($) {
    'use strict';

    window.Reflection = {
        currentType: null,
        currentEventId: null,

        init: function() {
            this.bindEvents();
        },

        bindEvents: function() {
            const self = this;

            // Close modal
            $(document).on('click', '.reflection-close', function() {
                self.close();
            });

            // Click outside to close
            $(document).on('click', '.reflection-overlay', function(e) {
                if ($(e.target).is('.reflection-overlay')) {
                    self.close();
                }
            });

            // Submit reflection
            $(document).on('click', '#reflection-submit', function() {
                self.save();
            });
        },

        open: function(type, eventId) {
            this.currentType = type;
            this.currentEventId = eventId || null;

            const questions = this.getQuestions(type);
            const title = this.getTitle(type);

            $('#reflection-title').text(title);
            $('#reflection-questions').empty();

            questions.forEach((q, index) => {
                const html = `
                    <div class="reflection-question">
                        <label for="reflection-q-${index}">${q}</label>
                        <textarea id="reflection-q-${index}" rows="2" placeholder="Write your reflection..."></textarea>
                    </div>
                `;
                $('#reflection-questions').append(html);
            });

            $('#reflection-modal').show();
        },

        close: function() {
            $('#reflection-modal').hide();
            $('#reflection-questions').empty();
            this.currentType = null;
            this.currentEventId = null;
        },

        getTitle: function(type) {
            const titles = {
                daily: '🌅 Daily Reflection',
                weekly: '📅 Weekly Reflection',
                monthly: '📆 Monthly Reflection',
                event: '📝 Event Reflection',
                goal: '🎯 Goal Reflection'
            };
            return titles[type] || 'Reflection';
        },

        getQuestions: function(type) {
            const questions = {
                daily: [
                    'What went well today?',
                    'What could have gone better?',
                    // === GOAL QUESTION ADDED ===
                    'How are you progressing toward your goals today?'
                ],
                weekly: [
                    'What was your biggest win this week?',
                    'What drained your energy?',
                    // === GOAL QUESTION ADDED ===
                    'How are your goals looking this week? Any neglected events?'
                ],
                monthly: [
                    'What patterns do you notice?',
                    'What will you change next month?',
                    // === GOAL QUESTION ADDED ===
                    'What progress did you make on your goals this month?'
                ],
                event: [
                    'What did you learn from this event?'
                ],
                goal: [
                    'What progress did you make on this goal?',
                    'What\'s the next step?',
                    'Any obstacles you need to overcome?'
                ]
            };
            return questions[type] || ['How do you feel about this?'];
        },

        save: function() {
            const self = this;
            const answers = [];

            $('#reflection-questions .reflection-question').each(function(index) {
                const question = $(this).find('label').text();
                const answer = $(this).find('textarea').val().trim();
                answers.push({ question, answer });
            });

            // Check if all answered
            const empty = answers.some(a => !a.answer);
            if (empty) {
                alert('Please answer all questions.');
                return;
            }

            // Save each answer
            let saved = 0;
            let total = answers.length;

            answers.forEach(function(item) {
                $.ajax({
                    url: window.BASE_PATH + 'public/api/reflections.php',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        type: self.currentType,
                        event_id: self.currentEventId,
                        question: item.question,
                        answer: item.answer
                    }),
                    dataType: 'json'
                }).done(function(response) {
                    if (response.success) {
                        saved++;
                        if (saved === total) {
                            if (typeof Utils !== 'undefined' && Utils.showToast) {
                                Utils.showToast('✅ Reflection saved!', 'success');
                            }
                            self.close();
                            if (window.Calendar) {
                                window.Calendar.render();
                            }
                        }
                    }
                }).fail(function() {
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('❌ Failed to save reflection', 'error');
                    }
                });
            });
        }
    };

    $(document).ready(function() {
        Reflection.init();
    });

})(jQuery);