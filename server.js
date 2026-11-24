const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(data) {
  data.workspace.updated_at = new Date().toISOString();
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_PATH);
}

function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// Get full workspace payload
app.get('/api/data', (req, res) => {
  try {
    res.json(readDB());
  } catch (err) {
    res.status(500).json({ error: 'Failed to read database.' });
  }
});

// Update weekly target or theme
app.patch('/api/workspace', (req, res) => {
  try {
    const db = readDB();
    const { weekly_target_hours, theme_mode } = req.body;
    if (weekly_target_hours !== undefined) {
      const val = Number(weekly_target_hours);
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ error: 'Weekly target hours must be greater than 0.' });
      }
      db.workspace.weekly_target_hours = val;
    }
    if (theme_mode === 'light' || theme_mode === 'dark') {
      db.workspace.theme_mode = theme_mode;
    }
    writeDB(db);
    res.json(db.workspace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update workspace.' });
  }
});

// Create a new study task
app.post('/api/tasks', (req, res) => {
  try {
    const { title, subject, priority, dueDate, estimatedHours } = req.body;
    const est = Number(estimatedHours);
    if (!title || !title.trim() || !subject || !subject.trim()) {
      return res.status(400).json({ error: 'Title and subject are required.' });
    }
    if (!isValidDate(dueDate)) {
      return res.status(400).json({ error: 'Due date must be YYYY-MM-DD.' });
    }
    if (isNaN(est) || est <= 0) {
      return res.status(400).json({ error: 'Estimated hours must be positive.' });
    }

    const db = readDB();
    const newTask = {
      id: `tsk-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim(),
      priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
      dueDate,
      estimatedHours: est,
      loggedHours: 0,
      completed: false
    };
    db.tasks.unshift(newTask);
    writeDB(db);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save task.' });
  }
});

// Toggle or update task
app.patch('/api/tasks/:id', (req, res) => {
  try {
    const db = readDB();
    const task = db.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (typeof req.body.completed === 'boolean') task.completed = req.body.completed;
    if (req.body.loggedHours !== undefined) task.loggedHours = Math.max(0, Number(req.body.loggedHours));
    writeDB(db);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const db = readDB();
    db.tasks = db.tasks.filter(t => t.id !== req.params.id);
    writeDB(db);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// Log a study / focus session
app.post('/api/sessions', (req, res) => {
  try {
    const { subject, topic, minutes, date } = req.body;
    const mins = Number(minutes);
    if (!subject || !subject.trim() || !topic || !topic.trim()) {
      return res.status(400).json({ error: 'Subject and topic are required.' });
    }
    if (isNaN(mins) || mins <= 0) {
      return res.status(400).json({ error: 'Minutes must be greater than 0.' });
    }
    const sessionDate = isValidDate(date) ? date : new Date().toISOString().slice(0, 10);

    const db = readDB();
    const newSession = {
      id: `ses-${Date.now()}`,
      subject: subject.trim(),
      topic: topic.trim(),
      minutes: mins,
      date: sessionDate
    };
    db.sessions.unshift(newSession);
    writeDB(db);
    res.status(201).json(newSession);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log session.' });
  }
});

// Toggle habit
app.patch('/api/habits/:id', (req, res) => {
  try {
    const db = readDB();
    const habit = db.habits.find(h => h.id === req.params.id);
    if (!habit) return res.status(404).json({ error: 'Habit not found.' });
    habit.doneToday = !habit.doneToday;
    writeDB(db);
    res.json(habit);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update habit.' });
  }
});

app.listen(PORT, () => {
  console.log(`ChronoPulse running at http://localhost:${PORT}`);
});
