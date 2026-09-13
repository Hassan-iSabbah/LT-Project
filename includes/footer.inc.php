</main>
    <footer>
        <p>Schedule App — Built for My Liege</p>
    </footer>

    <!-- Floating Panel // event panel -->
    <div id="event-panel" class="floating-panel" style="display:none;">
        <div class="panel-header">
            <h4 id="panel-title">Add Event</h4>
            <button class="close-btn" id="panel-close">&times;</button>
        </div>
        <form id="event-form" novalidate>
            <input type="hidden" id="event-id" value="">

            <div class="panel-field">
                <label for="event-title">Title *</label>
                <input type="text" id="event-title" placeholder="e.g., MAM152 Lecture" required>
            </div>

            <div class="panel-field">
                <label for="event-venue">Venue</label>
                <input type="text" id="event-venue" placeholder="e.g., Prefabs OA">
            </div>

            <!-- Single Date Group -->
            <div id="single-date-group">
                <div class="panel-field" style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <label for="event-date">Date</label>
                        <input type="date" id="event-date">
                    </div>
                    <div style="flex:1;">
                        <label for="event-hour">Hour</label>
                        <select id="event-hour">
                            <?php for ($h = 0; $h < 24; $h++): 
                                $ampm = $h >= 12 ? 'PM' : 'AM';
                                $hour12 = $h % 12 ?: 12;
                            ?>
                            <option value="<?= $h ?>"><?= sprintf('%02d:00 %s', $hour12, $ampm) ?></option>
                            <?php endfor; ?>
                        </select>
                    </div>
                    <div style="flex:0 0 70px;">
                        <label for="event-duration">Hours</label>
                        <select id="event-duration">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Schedule Builder Group -->
            <div id="schedule-group" style="display:none;">
                <div class="panel-field">
                    <label>Select Days &amp; Times (Click to add/remove)</label>
                    <div id="schedule-builder" style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; margin-bottom:10px;">
                        <div style="text-align:center; font-weight:500; font-size:0.8rem; color:#8B949E;">Mon</div>
                        <div style="text-align:center; font-weight:500; font-size:0.8rem; color:#8B949E;">Tue</div>
                        <div style="text-align:center; font-weight:500; font-size:0.8rem; color:#8B949E;">Wed</div>
                        <div style="text-align:center; font-weight:500; font-size:0.8rem; color:#8B949E;">Thu</div>
                        <div style="text-align:center; font-weight:500; font-size:0.8rem; color:#8B949E;">Fri</div>
                        <div style="text-align:center; font-weight:500; font-size:0.8rem; color:#8B949E;">Sat</div>
                        <div style="text-align:center; font-weight:500; font-size:0.8rem; color:#8B949E;">Sun</div>
                    </div>
                    <div id="schedule-times" style="margin-top:10px; padding:10px; background:#0d1117; border-radius:6px; max-height:150px; overflow-y:auto;">
                        <div style="color:#8B949E; font-size:0.9rem;">No times added yet</div>
                    </div>
                </div>
                <div class="panel-field" style="display:flex; gap:10px;">
                    <select id="schedule-day" style="flex:1;">
                        <option value="">Select Day</option>
                        <option value="0">Monday</option>
                        <option value="1">Tuesday</option>
                        <option value="2">Wednesday</option>
                        <option value="3">Thursday</option>
                        <option value="4">Friday</option>
                        <option value="5">Saturday</option>
                        <option value="6">Sunday</option>
                    </select>
                    <select id="schedule-hour" style="flex:1;">
                        <option value="">Select Time</option>
                        <?php for ($h = 0; $h < 24; $h++): 
                            $ampm = $h >= 12 ? 'PM' : 'AM';
                            $hour12 = $h % 12 ?: 12;
                        ?>
                        <option value="<?= $h ?>"><?= sprintf('%02d:00 %s', $hour12, $ampm) ?></option>
                        <?php endfor; ?>
                    </select>
                    <button type="button" id="schedule-add-btn" style="padding:8px 16px; background:#238636; color:#fff; border:none; border-radius:6px; cursor:pointer;">+ Add</button>
                </div>
                <div class="panel-field">
                    <label for="schedule-start-date">Start Date</label>
                    <input type="date" id="schedule-start-date">
                </div>
            </div>

            <!-- Category & Priority -->
            <div class="panel-field" style="display:flex; gap:10px;">
                <div style="flex:1;">
                    <label for="event-category">Category</label>
                    <select id="event-category">
                        <?php
                        try {
                            $db = Database::getInstance()->getConnection();
                            $stmt = $db->query("SELECT id, name FROM categories WHERE user_id IS NULL ORDER BY name");
                            $cats = $stmt->fetchAll();
                            foreach ($cats as $cat):
                        ?>
                        <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option>
                        <?php 
                            endforeach;
                        } catch (Exception $e) {
                            echo '<option value="1">Work</option>';
                            echo '<option value="2">Personal</option>';
                            echo '<option value="3">Health</option>';
                            echo '<option value="4">Family</option>';
                            echo '<option value="5">Errands</option>';
                            echo '<option value="6">UNI</option>';
                        }
                        ?>
                    </select>
                </div>
                <div style="flex:1;">
                    <label for="event-priority">Priority</label>
                    <select id="event-priority">
                        <option value="1">1 — Attend</option>
                        <option value="2" selected>2 — Catch up</option>
                        <option value="3">3 — Review</option>
                    </select>
                </div>
            </div>

            <!-- Description -->
            <div class="panel-field">
                <label for="event-description">Description</label>
                <textarea id="event-description" rows="2" placeholder="Optional notes..."></textarea>
            </div>

            <!-- Completed Checkbox -->
            <div class="panel-field" style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:400; cursor:pointer;">
                    <input type="checkbox" id="event-completed"> Completed
                </label>
            </div>

            <!-- Recurrence -->
            <div class="panel-field">
                <label for="event-recurrence">Recurrence</label>
                <select id="event-recurrence" style="width:100%;">
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                </select>
            </div>

            <div id="recur-end-group" style="display:none;">
                <label for="event-recur-end" style="font-weight:400; font-size:0.75rem;">End date (optional)</label>
                <input type="date" id="event-recur-end" style="width:auto; padding:4px 8px;">
            </div>

            <!-- Actions -->
            <div class="panel-actions">
                <div>
                    <button type="submit" class="btn btn-primary" id="panel-save">💾 Save</button>
                    <button type="button" class="btn btn-secondary" id="panel-cancel">Cancel</button>
                </div>
                <button type="button" class="btn btn-danger" id="panel-delete" style="display:none;">🗑️ Delete</button>
            </div>
        </form>
    </div>

    <!-- Reflection Modal -->
    <div id="reflection-modal" class="reflection-overlay" style="display:none;">
        <div class="reflection-modal">
            <div class="reflection-header">
                <h3 id="reflection-title">Reflection</h3>
                <button class="reflection-close">&times;</button>
            </div>
            <div id="reflection-questions">
                <!-- Dynamically populated -->
            </div>
            <div class="reflection-actions">
                <button class="btn-primary" id="reflection-submit">💾 Save Reflection</button>
                <button class="btn-secondary reflection-close">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Sync Modal -->
    <div id="sync-modal" class="sync-overlay" style="display:none;">
        <div class="sync-modal">
            <div class="sync-header">
                <h3>⏱️ How long did this actually take?</h3>
                <button class="sync-close">&times;</button>
            </div>
            <div class="sync-body">
                <p style="color: #8B949E; margin-bottom: 12px;">
                    Enter the actual time you spent on this task (in minutes).
                </p>
                <div class="sync-input-group">
                    <label for="sync-duration">Actual Duration (minutes)</label>
                    <input type="number" id="sync-duration" min="1" step="1" placeholder="e.g., 45" required>
                </div>
                <div id="sync-preview" style="display:none; margin-top: 12px; padding: 12px; background: #0D1117; border-radius: 6px; border-left: 3px solid #58A6FF;">
                    <span style="font-size:0.85rem; color:#8B949E;">📊 Planned: <span id="sync-planned">0</span> min · Actual: <span id="sync-actual">0</span> min</span>
                    <br>
                    <span style="font-size:1.1rem; font-weight:700;" id="sync-percentage-display">—%</span>
                </div>
            </div>
            <div class="sync-actions">
                <button class="btn-primary" id="sync-submit">✅ Complete &amp; Save</button>
                <button class="btn-secondary sync-close">Cancel</button>
            </div>
        </div>
    </div>
    <!-- Goal -->
    <div class="panel-field">
        <label for="event-goal">🎯 Goal</label>
        <select id="event-goal" style="width:100%;">
            <option value="">— No Goal —</option>
            <!-- Populated dynamically -->
        </select>
    </div>
    <script src="<?= BASE_PATH ?>js/app.js"></script>
    <script src="<?= BASE_PATH ?>js/utils.js"></script>
    <script src="<?= BASE_PATH ?>js/sync.js"></script>
    <script src="<?= BASE_PATH ?>js/panel.js"></script>
    <script src="<?= BASE_PATH ?>js/subject.js"></script>  
    <script src="<?= BASE_PATH ?>js/views/view-engine.js"></script>   
    <script src="<?= BASE_PATH ?>js/views/task.js"></script>      
    <script src="<?= BASE_PATH ?>js/views/hour.js"></script>   
    <script src="<?= BASE_PATH ?>js/views/day.js"></script>   
    <script src="<?= BASE_PATH ?>js/views/week.js"></script>   
    <script src="<?= BASE_PATH ?>js/views/month.js"></script>   
    <script src="<?= BASE_PATH ?>js/views/year.js"></script>  
    <script src="<?= BASE_PATH ?>js/hindsight.js"></script>  
    <script src="<?= BASE_PATH ?>js/reflection.js"></script> 
    <script src="<?= BASE_PATH ?>js/goals.js"></script>
    <script src="<?= BASE_PATH ?>js/calendar.js"></script>
    <script src="<?= BASE_PATH ?>js/events.js"></script>
    <script src="<?= BASE_PATH ?>js/autopush.js"></script>
</body>
</html>