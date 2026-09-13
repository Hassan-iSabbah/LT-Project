// /js/views/day.js
(function($) {
    'use strict';

    window.DayView = {
        render: function(calendar) {
            const html = window.ViewEngine.renderDay(calendar);
            $('#app-calendar').append(html);
            this.bindEvents(calendar);
        },

        bindEvents: function(calendar) {
            // Click on hour cell
            $(document).on('click', '.day-view .hour-cell', function(e) {
                if ($(e.target).closest('.event-pill, .more-badge, .cycle-arrow').length) return;
                const hour = $(this).data('hour');
                const date = $(this).data('date');
                if (window.Panel) window.Panel.showAdd(date, hour);
            });

            // Click on hour label -> zoom to Hour View
            $(document).on('click', '.day-view .day-hour-row .hour-label', function(e) {
                e.stopPropagation();
                const hour = $(this).closest('.day-hour-row').data('hour');
                const dateStr = $(this).closest('.day-hour-row').find('.hour-cell').data('date');
                if (window.Calendar) {
                    const parts = dateStr.split('-');
                    window.Calendar.currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    window.Calendar.currentHour = hour;
                    window.Calendar.currentView = 'hour';
                    window.Calendar.render();
                }
            });

            // Click on event pill
            $(document).on('click', '.day-view .event-pill', function(e) {
                if ($(e.target).closest('.cycle-arrow, .more-badge').length) return;
                const id = $(this).data('event-id');
                const event = calendar.events.find(ev => ev.id == id);
                if (event && window.Panel) window.Panel.showEdit(event);
            });
        }
    };

})(jQuery);