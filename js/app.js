// /js/app.js
console.log('App initialized');
$(document).ready(function() {
    console.log('jQuery ready');
});

// /js/app.js
console.log('App initialized');

$(document).ready(function() {
    console.log('jQuery ready');
    
    // Keyboard shortcuts: C = Calendar, S = Subjects
    $(document).on('keydown', function(e) {
        // Ignore if typing in input/textarea/select
        if ($(e.target).is('input, textarea, select')) return;
        
        if (e.key === 'c' || e.key === 'C') {
            window.location.href = window.BASE_PATH + '?page=calendar';
        }
        if (e.key === 's' || e.key === 'S') {
            window.location.href = window.BASE_PATH + '?page=subjects';
        }
    });
});