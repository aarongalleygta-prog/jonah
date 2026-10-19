# Smart Emergency Response & Community Help System

A web-based platform for reporting emergencies (medical, fire, security, accident,
flood, other), automatically capturing the reporter's location, classifying priority,
and tracking each case through to resolution on an admin/responder dashboard.

Built for a BSc. Computer Science / Software Engineering final year project.

## Tech Stack
- **Frontend:** HTML, CSS, vanilla JavaScript, Leaflet.js (maps) — no framework needed
- **Backend:** Node.js + Express (REST API)
- **Database:** MySQL / MariaDB
- **Auth:** JWT + bcrypt password hashing

## Project Structure
```
smart-emergency-response/
├── backend/
│   ├── config/db.js        MySQL connection pool
│   ├── middleware/auth.js  JWT verification + role guard
│   ├── routes/             auth.js, emergencies.js, stats.js
│   ├── server.js           app entry point
│   └── .env.example        copy to .env and fill in your DB details
├── database/
│   └── schema.sql          run this once to create tables + seed an admin
└── frontend/
    ├── index.html          citizen: report an emergency
    ├── login.html / register.html
    ├── dashboard.html      admin/responder: live list + stats
    ├── css/style.css
    ├── js/app.js            shared API/session helpers
    ├── js/map.js            geolocation + Leaflet helpers
    └── vendor/leaflet/      Leaflet library (self-hosted, no CDN needed)
```

## Setup

### 1. Install MySQL/MariaDB and create the database
```bash
mysql -u root -p < database/schema.sql
```
This creates the `emergency_response` database, its tables, and seeds one
admin account: **admin@emergency.local / Admin@123**.

Create a dedicated app user rather than using `root` directly:
```sql
CREATE USER 'appuser'@'%' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON emergency_response.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
```

### 2. Configure the backend
```bash
cd backend
cp .env.example .env
# edit .env with your DB_USER / DB_PASSWORD / JWT_SECRET
npm install
npm run dev      # or: npm start
```
The server runs on **http://localhost:5000** and also serves the frontend,
so you don't need a separate frontend server.

### 3. Open the app
Visit `http://localhost:5000` in your browser. Register a citizen account,
or log in as the seeded admin to see the dashboard.

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
3. In the same project: **New → Database → Add MySQL**.
4. Open your app service → **Variables** and add:
   | Variable | Value |
   |---|---|
   | `MYSQL_URL` | `${{MySQL.MYSQL_URL}}` (reference to the MySQL service; rename `MySQL` if yours differs) |
   | `JWT_SECRET` | a long random string, e.g. `openssl rand -hex 32` |
   | `ADMIN_PASSWORD` | a strong password for the seeded admin (set before the first deploy) |
   | `ADMIN_EMAIL` | optional, defaults to `admin@emergency.local` |
5. Open your service → **Settings → Networking → Generate Domain**.

Tables are created automatically on startup and an admin account is seeded if none
exists, so you do not need to run `schema.sql` on Railway. Health check: `/api/health`.
Browser geolocation requires HTTPS, which Railway's generated domain provides.

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
