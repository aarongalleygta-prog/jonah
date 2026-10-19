# Smart Emergency Response & Community Help System

A web-based platform for reporting emergencies (medical, fire, security, accident,
flood, other), automatically capturing the reporter's location, classifying priority,
and tracking each case through to resolution on an admin/responder dashboard.

Built for a BSc. Computer Science / Software Engineering final year project.

## Tech Stack
- **Frontend:** HTML, CSS, vanilla JavaScript, Leaflet.js (maps) — no framework needed
- **Backend:** Node.js + Express (REST API)
- **Database:** SQLite (built into Node 22.13+, single file on a Railway volume)
- **Auth:** JWT + bcrypt password hashing

## Project Structure
```
smart-emergency-response/
├── backend/
│   ├── config/db.js        SQLite connection (file on the volume)
│   ├── config/migrate.js   creates tables + seeds the admin on startup
│   ├── middleware/auth.js  JWT verification + role guard
│   ├── routes/             auth.js, emergencies.js, stats.js
│   ├── server.js           app entry point
│   └── .env.example        copy to .env and fill in your DB details
└── frontend/
    ├── index.html          citizen: report an emergency
    ├── login.html / register.html
    ├── dashboard.html      admin/responder: live list + stats
    ├── css/style.css
    ├── js/app.js            shared API/session helpers
    ├── js/map.js            geolocation + Leaflet helpers
    └── vendor/leaflet/      Leaflet library (self-hosted, no CDN needed)
```

## Local setup
```bash
cd backend
cp .env.example .env     # set JWT_SECRET (and optionally ADMIN_PASSWORD)
npm install
npm start
```
Visit **http://localhost:5000**. Tables are created automatically in `backend/data/emergency.db`
and an admin is seeded: **admin@emergency.local / Admin@123** (or your `ADMIN_PASSWORD`).

## Deploying to Railway (via GitHub)

1. **Push to GitHub** (from the project root, so `frontend/` and `backend/` stay together):
   ```bash
   git init
   git add .
   git commit -m "Prepare for Railway"
   git branch -M main
   git remote add origin https://github.com/<you>/smart-emergency-response.git
   git push -u origin main
   ```
2. In Railway: **New Project → Deploy from GitHub repo** and pick the repo. Leave the root directory as `/`.
3. **Add a volume** to that service: right-click the service on the canvas (or press `Ctrl/Cmd+K`) → **Add Volume**, mount path `/data`.
4. Open the service → **Variables** and add:
   | Variable | Value |
   |---|---|
   | `JWT_SECRET` | a long random string, e.g. `openssl rand -hex 32` |
   | `ADMIN_PASSWORD` | a strong password for the seeded admin (set before the first deploy) |
   | `ADMIN_EMAIL` | optional, defaults to `admin@emergency.local` |
5. **Settings → Networking → Generate Domain**.

Railway sets `RAILWAY_VOLUME_MOUNT_PATH` automatically, and the app stores its database
there, so data survives redeploys. Keep the service at **one replica** (SQLite is a single-file database).
Health check: `/api/health`. Browser geolocation needs HTTPS, which the Railway domain provides.

## How Priority Classification Works
`backend/routes/emergencies.js` contains `classifyPriority(type, description)`:
it assigns a base priority by emergency type (fire → critical, medical/accident/
security → high, flood → medium, other → low), then scans the description for
high-risk keywords ("unconscious," "trapped," "children," etc.) and escalates
the priority by one tier if found. This is a simple, explainable rule-based
system — a defensible "intelligent decision-making" component for your project
write-up, with AI-based classification noted as future work.

## Known Limitations (by design, for a first academic version)
- Notifications are not yet wired to email/SMS (structure is ready to add Twilio,
  as used in the RedLine project).
- No native mobile app yet — the web app is fully responsive on mobile browsers.
- Map tiles come from the public OpenStreetMap tile servers, so an internet
  connection is required to see the map background (the Leaflet library itself
  is bundled locally, so it works even if a CDN is unreachable).

## Suggested Demo Flow for Your Defense
1. Register a citizen account, report a "Fire" emergency with "children trapped"
   in the description → show it gets classified as **Critical** automatically.
2. Log in as admin (`admin@emergency.local` / `Admin@123`) → show it appear at
   the top of the dashboard, sorted by priority.
3. Click through Accept → Responding → Resolved → show the status badge and
   stats update live.
4. Point to the "Most Common Emergency Types" chart and average response time
   as your analytics component.
