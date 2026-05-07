# 🦞 Candalena Claw v4.0.1

> **Universal LMS Reminder Engine** — Standalone Background Daemon for Multi-Database & Telegram Integration.

[![Version](https://img.shields.io/badge/version-4.0.1-7C3AED)](https://github.com/HudzaifahArrantisi/Candalena-Claww)
[![Node](https://img.shields.io/badge/node-20.0%2B-339933)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)

---

## ✨ Features
* **100% Standalone & Lightweight**: No external AI provider (OpenAI/Gemini) required! It runs natively on Node.js using an efficient background scheduler.
* **Multi-Database Support**: Connects seamlessly to PostgreSQL (Supabase, Neon), MySQL, and MongoDB.
* **Real-time & Scheduled Monitoring**:
  * **Phase 1 (Every minute)**: Scans for newly created assignments/tasks and instantly notifies the class.
  * **Phase 2 (Daily 07:00)**: Scans for approaching deadlines and sends H-3, H-1, and H-0 reminders.
* **Smart Telegram Routing**: Automatically routes reminders to specific Telegram groups based on the class (e.g., TI-01 gets TI-01 reminders).
* **VPS & Docker Ready**: Designed to run seamlessly alongside your existing backend infrastructure without any port conflicts.

---

## 🏗 Architecture

**Candalena Claw** operates in two phases:
1. **Interactive Setup Wizard**: Run `candalena-claw setup` (or `install-ai`) to easily map your database structure and configure your Telegram bot credentials. It automatically creates an `.env` file.
2. **Background Daemon**: Run `candalena-claw start` (or deploy via Docker). The daemon operates completely in the background without exposing any network ports.

---

## 🚀 Step-by-Step Installation & Setup

### 1. Installation
Make sure you have Node.js installed. You can install Candalena Claw either globally or locally.

**Global Installation (Recommended for easy CLI access)**
```bash
npm install -g candalena-claw
# or shorter:
npm -g candalena-claw
```

**Local Installation (For project-specific usage)**
```bash
npm i candalena-claw
```
*(If installed locally, use `npx candalena-claw` to run the commands).*

### 2. Configure Telegram Bot
1. Open Telegram and search for **@BotFather**.
2. Send `/newbot`, name your bot, and get your **Bot Token**.
3. Create Telegram groups for your classes (e.g., TI-01, TI-02).
4. Add the bot to those groups.
5. Get the Group Chat ID (you can use bots like `@getidsbot`).

### 3. Run the Setup Wizard
Navigate to the directory where you want to store your configuration, and run:
```bash
candalena-claw install-ai
```
> *Note: The wizard is completely standalone and will bypass any AI requirements.*

**The wizard will ask you to:**
* Paste your Database URL (e.g., your Supabase PostgreSQL connection string).
* Input your Telegram Bot Token.
* Map your Class Names to their respective Telegram Chat IDs.

### 4. Running Locally
To test if it works on your local machine:
```bash
candalena-claw start
```
You should see the daemon connect to the database and start scanning. Press `Ctrl+C` to stop.

---

## 🐳 VPS Deployment with Docker (Highly Recommended)

The best way to run Candalena Claw on a VPS is by using **Docker Compose**. Because it is a background daemon (no exposed ports), it can run safely alongside your primary backend (Express, Laravel, Go, etc.) without any `EADDRINUSE` port conflicts.

### Option A: Merge with your Backend's `docker-compose.yml`
If you already have a `docker-compose.yml` for your backend, simply add the `candalena-daemon` service to it:

```yaml
services:
  # Your existing backend service
  my-backend-api:
    image: my-backend:latest
    ports:
      - "3000:3000"

  # 🦞 Add Candalena Claw Daemon here
  candalena-daemon:
    build: ./openclaw-reminder  # Path to this Candalena folder
    container_name: candalena-claw
    restart: unless-stopped
    env_file:
      - ./openclaw-reminder/.env # Path to the generated .env file
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```
Then run: `docker compose up -d --build`

### Option B: Run Standalone via Docker
If you just want to run Candalena Claw in its own Docker container:
1. Upload this project folder (with the generated `.env` file) to your VPS.
2. Inside the folder, run:
```bash
docker compose up -d --build
```
3. To view logs and monitor reminders in real-time:
```bash
docker logs -f candalena-claw
```

---

## 💻 CLI Commands Reference

| Command | Description |
|---------|-------------|
| `candalena-claw install-ai` | Run the main setup wizard to configure DB and Telegram. |
| `candalena-claw start` | Start the reminder engine daemon in the foreground. |
| `candalena-claw status` | Show current system/daemon status. |
| `candalena-claw config` | View the current mapped configuration. |
| `candalena-claw uninstall` | Clean up global packages and configuration files. |

---

## 🔧 Troubleshooting

**1. "Request path contains unescaped characters" Error**
* **Cause**: You pasted invalid characters (like a database URL chunk or emojis) into the Telegram Bot Token field.
* **Fix**: Open the `.env` file and replace `TELEGRAM_BOT_TOKEN` with your actual token from `@BotFather`, then restart the daemon.

**2. "relation does not exist" Error**
* **Cause**: The daemon is looking for a table that doesn't exist in your schema.
* **Fix**: Ensure your database has the table `tugas` or configure the table mapping correctly in `.env`.

**3. "tsc not found" during Docker Build**
* **Fix**: Ensure you are using the latest `Dockerfile` which properly uses `npm ci` before running `npm run build`, and `npm prune --omit=dev` afterwards.

---

## 📄 License
ISC © Candalena Claw Contributors
