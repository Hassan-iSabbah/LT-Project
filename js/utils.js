// /js/utils.js
window.Utils = {
    formatHour: (h) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:00 ${ampm}`;
    },

    formatDate: (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getWeekRange: (date = new Date()) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay() + 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
            start: Utils.formatDate(start),
            end: Utils.formatDate(end)
        };
    },

    getMonthRange: (date = new Date()) => {
        const d = new Date(date);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return {
            start: Utils.formatDate(start),
            end: Utils.formatDate(end)
        };
    },

    getYearRange: (date = new Date()) => {
        const year = date.getFullYear();
        return {
            start: `${year}-01-01`,
            end: `${year}-12-31`
        };
    },

    groupEventsByHour: (events) => {
        const map = {};
        events.forEach(ev => {
            const key = `${ev.event_date}_${ev.start_hour}`;
            if (!map[key]) map[key] = [];
            map[key].push(ev);
        });
        for (let key in map) {
            map[key].sort((a, b) => a.priority_rank - b.priority_rank);
        }
        return map;
    },

    // ============================================================
    // TOAST NOTIFICATION
    // ============================================================

    showToast: function(message, type = 'info') {
        $('.toast-notification').remove();

        const colors = {
            success: '#3FB950',
            error: '#F85149',
            info: '#58A6FF',
            warning: '#D29922'
        };

        const bgColor = colors[type] || colors.info;

        const toast = $(`
            <div class="toast-notification" style="
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: #161B22;
                color: #F0F6FC;
                padding: 12px 24px;
                border-radius: 8px;
                border-left: 4px solid ${bgColor};
                box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                z-index: 99999;
                font-size: 0.9rem;
                font-weight: 500;
                animation: slideUpToast 0.3s ease;
                max-width: 90%;
                text-align: center;
            ">
                ${message}
            </div>
        `);

        $('body').append(toast);

        setTimeout(function() {
            toast.fadeOut(300, function() {
                $(this).remove();
            });
        }, 3000);
    },

    // ============================================================
    // SYNC BAR RENDERER — ALWAYS VISIBLE
    // ============================================================

    renderSyncBar: function(syncPercentage, isCompleted) {
        console.log('🔧 renderSyncBar called with:', syncPercentage, isCompleted);

        // If sync data exists AND event is completed, render the full colored bar
        if (syncPercentage !== null && syncPercentage !== undefined && syncPercentage >= 0 && isCompleted === true) {
            const sync = Math.max(0, Math.min(100, syncPercentage));
            const longTicks = Math.round(sync / 10);
            const shortTicks = 10 - longTicks;

            let html = '<span class="sync-container">';
            html += '<span class="sync-label">Sync</span>';
            html += '<span class="sync-bar">';

            for (let i = 0; i < longTicks; i++) {
                html += '<span class="sync-tick long"></span>';
            }
            for (let i = 0; i < shortTicks; i++) {
                html += '<span class="sync-tick short"></span>';
            }

            html += '</span></span>';
            return html;
        }

        // Otherwise, render placeholder bar (always visible)
        let html = '<span class="sync-container">';
        html += '<span class="sync-label">Sync</span>';
        html += '<span class="sync-bar">';

        for (let i = 0; i < 10; i++) {
            html += '<span class="sync-tick placeholder"></span>';
        }

        html += '</span></span>';
        return html;
    }
};