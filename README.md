# ChronoPulse — Academic Study Planner & Focus Tracker

ChronoPulse is a lightweight, local-first web application built with Node.js, Express, and vanilla HTML/CSS/JavaScript to organize coursework deadlines, daily study habits, and deep-work Pomodoro sessions.

## Features
- **Course & Assignment Tracker:** Log tasks by subject, priority, due date, and estimated study hours.
- **Weekly Study Target & Runway:** Set a weekly study goal and monitor daily target hours remaining.
- **Interactive Analytics:** Visualizes daily study hours across the week and time distribution per subject using Chart.js.
- **Built-in Focus Timer:** Configurable 25m / 50m Pomodoro timer with Web Audio API chime notifications and automatic session logging.
- **Daily Habit Checklist:** Track daily academic habits alongside recurring study routines.
- **Data Portability:** Filter, search, edit, and export study logs as CSV or full JSON backups.

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), Chart.js, Web Audio API
- **Backend:** Node.js, Express.js
- **Storage:** Structured local JSON datastore (`data/db.json`) + browser `localStorage`

## Project Structure
```text
chronopulse-study-planner/
├── server.js
├── package.json
├── .gitignore
├── README.md
├── data/
│   └── db.json
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open in browser:**
   Navigate to `http://localhost:3000`

## Author
**Aditya G Atok**
