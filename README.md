# 🦞 OpenClaw Reminder Engine v2.0

**Universal LMS Assignment Reminder** — Auto-detect any database schema, send Telegram notifications for new assignments and upcoming deadlines.

```
┌─────────────────────────────────────────┐
│  Any Database  →  Auto-Detect Schema   │
│  MySQL · PostgreSQL · MongoDB          │
│                 ↓                       │
│  🔍 Scan new assignments              │
│  ⏰ Check deadlines (H-3, H-1, H-0)  │
│                 ↓                       │
│  📱 Telegram Notification             │
└─────────────────────────────────────────┘
```

## ✨ Features

- 🔌 **Multi-Database** — MySQL/MariaDB, PostgreSQL, MongoDB
- 🔍 **Auto-Detect Schema** — Automatically maps columns from any table structure
- ✏️ **Manual Override** — Override auto-detection via `.env` (COL_TITLE, COL_DEADLINE, etc.)
- ⏰ **Deadline Reminders** — Configurable H-3, H-1, H-0 notifications
- 📱 **Telegram Bot** — Zero-dependency HTTPS sender (no `node-telegram-bot-api` needed)
- 🌐 **REST API** — Built-in Express server (`/api/tugas`, `/api/status`)
- 🛠 **CLI Setup Wizard** — Interactive configuration generator
- 🚀 **VPS Ready** — One-command installer with PM2 auto-setup

---

## 🚀 Quick Start (Installation)

Candalena Claw is now a global CLI tool. You can install it directly via NPM and run it anywhere on your system.

### 1. Global Installation

Install the package globally using npm:
```bash
npm install -g candalena-claw
```

### 2. Initialize Project

Create a new directory for your reminder engine and run the initialization command. This will generate the necessary `.env` template and config folders.
```bash
mkdir my-reminder-bot
cd my-reminder-bot

candalena-claw init
```

### 3. Interactive Setup

Run the setup wizard. It will ask you for your database credentials, auto-detect your table columns, and validate your Telegram bot token in real-time.
```bash
candalena-claw setup
```
> **Tip:** If the wizard detects that your table is missing a required column (like `deadline` or `title`), it will output the exact SQL command you need to run to fix it!

### 4. Verify & Start

Make sure everything is correctly configured by running the built-in doctor command:
```bash
candalena-claw doctor
```

If all systems are green, start the engine:
```bash
candalena-claw start
```
The engine will now run in your terminal, actively scanning for new assignments and upcoming deadlines to send via Telegram.

---

## 🛠️ CLI Command Reference

Once installed, the `candalena-claw` binary provides the following commands:

| Command | Description |
|---------|-------------|
| `candalena-claw init` | Bootstraps a new project directory |
| `candalena-claw setup` | Interactive wizard to configure DB & Telegram |
| `candalena-claw doctor` | Diagnoses your configuration and database connection |
| `candalena-claw start` | Starts the automation engine & API server |
| `candalena-claw status` | Displays a quick dashboard of running services |
| `candalena-claw test` | Sends a test message to your Telegram |
| `candalena-claw logs` | Streams realtime logs of the running engine |
| `candalena-claw config` | Displays your current config (passwords hidden) |
| `candalena-claw update` | Checks for and installs the latest version |
| `candalena-claw uninstall`| Removes all local configs and uninstalls globally |

---

## 🔧 Manual Configuration (.env)

```env
# Database — pilih: mysql | postgres | mongodb
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=openclaw

# MongoDB URI (optional, override host/port/user/pass)
# DB_URI=mongodb://user:pass@cluster.mongodb.net/openclaw

# Schema mapping (kosong = auto-detect)
TABLE_NAME=tugas
COL_TITLE=
COL_DEADLINE=
COL_TELEGRAM=
COL_NOTIFIED=

# Telegram
TELEGRAM_BOT_TOKEN=your_token_here

# Scheduler
CRON_SCHEDULE=*/5 * * * *
DEADLINE_REMIND_DAYS=3,1,0

# Server
PORT=3000
```

---

## 📚 Database Setup

### MySQL / MariaDB

```sql
CREATE DATABASE openclaw;
USE openclaw;

CREATE TABLE tugas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course VARCHAR(255),
  lecturer VARCHAR(255),
  semester INT,
  kelas VARCHAR(50),
  deadline DATETIME,
  telegram_channel VARCHAR(100),
  notified TINYINT DEFAULT 0
);
```

### PostgreSQL

```sql
CREATE DATABASE openclaw;

CREATE TABLE tugas (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course VARCHAR(255),
  lecturer VARCHAR(255),
  semester INT,
  kelas VARCHAR(50),
  deadline TIMESTAMP,
  telegram_channel VARCHAR(100),
  notified INT DEFAULT 0
);
```

Install the driver:
```bash
npm install pg
```

### MongoDB

```js
db.createCollection("tugas");
db.tugas.insertOne({
  title: "Tugas Machine Learning",
  course: "Machine Learning",
  lecturer: "Dr. Ahmad",
  semester: 4,
  kelas: "TI-4A",
  deadline: new Date("2026-05-10"),
  telegram_channel: "@remind0106",
  notified: 0
});
```

Install the driver:
```bash
npm install mongodb
```

---

## 🔍 Auto-Detect Schema

OpenClaw can automatically detect your table's column purposes using smart hints:

| Purpose | Auto-detected column names |
|---------|---------------------------|
| Title | `title`, `judul`, `nama_tugas`, `task`, `assignment` |
| Deadline | `deadline`, `due_date`, `batas_waktu`, `duedate` |
| Notified | `notified`, `sent`, `is_sent`, `terkirim` |
| Telegram | `telegram`, `telegram_channel`, `channel`, `tele` |
| Course | `course`, `mata_kuliah`, `matkul`, `subject` |
| Lecturer | `lecturer`, `dosen`, `pengajar`, `teacher` |
| Semester | `semester`, `term`, `period` |
| Class | `kelas`, `class`, `room`, `group` |

If your column names don't match, use `COL_*` overrides in `.env`.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/tugas` | List all tasks |
| GET | `/api/status` | Engine status & schema info |

---

## 🖥 VPS Deployment (Production)

Deploying Candalena Claw to a server is extremely simple now that it is an NPM package.

### Step-by-Step Server Setup

1. **Install Node.js 18+ and PM2:**
```bash
# Install Node.js (Ubuntu/Debian example)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager) globally
sudo npm install -g pm2
```

2. **Install Candalena Claw:**
```bash
sudo npm install -g candalena-claw
```

3. **Initialize & Configure:**
```bash
mkdir /opt/candalena-bot
cd /opt/candalena-bot

# Initialize project
candalena-claw init

# Run setup (Enter DB credentials & Telegram Token)
candalena-claw setup
```

4. **Run in Background with PM2:**
```bash
# Find where the CLI is installed
whereis candalena-claw

# Start the engine in the background using PM2
pm2 start candalena-claw --name "reminder-engine" -- start

# Save PM2 process so it restarts if the server reboots
pm2 save
pm2 startup
```

To monitor the bot's background logs on your VPS at any time, run:
```bash
pm2 logs reminder-engine
```

### Database Connection Scenarios

| Scenario | DB_HOST value |
|----------|---------------|
| Database on same VPS | `127.0.0.1` or `localhost` |
| Database on another server | `192.168.1.100` or `db.example.com` |
| Cloud database (AWS RDS, etc.) | `your-db.region.rds.amazonaws.com` |
| MongoDB Atlas | Use `DB_URI=mongodb+srv://...` |

---

## 📁 Project Structure

```
src/
├── index.ts                    # Entry point
├── server.ts                   # Express API server
├── config/
│   └── env.ts                  # Environment config
├── core/
│   ├── engine.ts               # Main engine
│   ├── scheduler.ts            # Cron scheduler
│   ├── schema-detector.ts      # Auto-detect columns
│   └── deadline.ts             # Deadline reminders
├── adapters/
│   ├── adapter.interface.ts    # DB adapter interface
│   ├── adapter.factory.ts      # Factory pattern
│   ├── mysql.adapter.ts        # MySQL/MariaDB
│   ├── postgres.adapter.ts     # PostgreSQL
│   └── mongodb.adapter.ts      # MongoDB
├── telegram/
│   ├── bot.ts                  # Telegram sender
│   ├── formatter.ts            # Message formatter
│   └── reminder.ts             # Scan & notify pipeline
├── api/
│   ├── task.route.ts           # Task API
│   └── status.route.ts         # Status API
└── cli/
    └── setup.ts                # Setup wizard
```

---

## 📄 License

ISC
