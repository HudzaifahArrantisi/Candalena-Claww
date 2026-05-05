#!/bin/bash
# ═══════════════════════════════════════════════
#  OpenClaw Reminder Engine — VPS Installer
#  Supports: Ubuntu 20+, Debian 11+, CentOS 8+
# ═══════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/opt/openclaw"
SERVICE_NAME="openclaw"

echo ""
echo -e "${BLUE}🦞 ══════════════════════════════════════${NC}"
echo -e "${BLUE}   OpenClaw Reminder Engine — Installer${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

# ── Check root ──
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run as root: sudo bash install.sh${NC}"
  exit 1
fi

# ── Detect OS ──
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  echo -e "${GREEN}✅ OS detected: $PRETTY_NAME${NC}"
else
  echo -e "${RED}❌ Cannot detect OS${NC}"
  exit 1
fi

# ── Install Node.js (if needed) ──
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}📦 Installing Node.js 20 LTS...${NC}"
  
  if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  else
    echo -e "${YELLOW}⚠️  Auto-install not supported for $OS.${NC}"
    echo "   Please install Node.js 20+ manually."
    exit 1
  fi
fi

NODE_VER=$(node -v)
echo -e "${GREEN}✅ Node.js: $NODE_VER${NC}"

# ── Install PM2 (process manager) ──
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}📦 Installing PM2 (process manager)...${NC}"
  npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 installed${NC}"

# ── Clone / Download OpenClaw ──
echo ""
echo -e "${BLUE}📂 Installing OpenClaw to $INSTALL_DIR${NC}"

if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}⚠️  Directory exists. Updating...${NC}"
  cd "$INSTALL_DIR"
  # If it's a git repo, pull
  if [ -d ".git" ]; then
    git pull origin main || true
  fi
else
  echo -e "${YELLOW}Choose installation method:${NC}"
  echo "  1. Git clone (recommended)"
  echo "  2. Manual (copy files yourself)"
  read -p "  Choice [1]: " INSTALL_METHOD
  INSTALL_METHOD=${INSTALL_METHOD:-1}
  
  if [ "$INSTALL_METHOD" = "1" ]; then
    read -p "  Git repository URL: " GIT_URL
    git clone "$GIT_URL" "$INSTALL_DIR"
  else
    mkdir -p "$INSTALL_DIR"
    echo -e "${YELLOW}📂 Created $INSTALL_DIR${NC}"
    echo "   Copy your OpenClaw files there, then re-run this script."
    exit 0
  fi
fi

cd "$INSTALL_DIR"

# ── Install dependencies ──
echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# ── Database driver selection ──
echo ""
echo -e "${BLUE}📦 Database driver setup${NC}"
echo "  Which database will you use?"
echo "  1. MySQL / MariaDB (already included)"
echo "  2. PostgreSQL"
echo "  3. MongoDB"
echo "  4. Skip (already installed)"
read -p "  Choice [1]: " DB_CHOICE
DB_CHOICE=${DB_CHOICE:-1}

case $DB_CHOICE in
  2)
    echo -e "${YELLOW}Installing PostgreSQL driver...${NC}"
    npm install pg
    ;;
  3)
    echo -e "${YELLOW}Installing MongoDB driver...${NC}"
    npm install mongodb
    ;;
  *)
    echo -e "${GREEN}✅ Using existing database driver${NC}"
    ;;
esac

# ── Run setup wizard ──
echo ""
echo -e "${BLUE}🔧 Running setup wizard...${NC}"
echo ""
npx ts-node src/cli/setup.ts

# ── Build TypeScript ──
echo ""
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build

# ── Setup PM2 service ──
echo ""
echo -e "${BLUE}🚀 Setting up PM2 service...${NC}"
pm2 delete "$SERVICE_NAME" 2>/dev/null || true
pm2 start dist/index.js --name "$SERVICE_NAME"
pm2 save
pm2 startup

# ── Setup firewall ──
PORT=$(grep "^PORT=" .env | cut -d'=' -f2)
PORT=${PORT:-3000}

if command -v ufw &> /dev/null; then
  ufw allow "$PORT"/tcp 2>/dev/null || true
  echo -e "${GREEN}✅ Firewall: port $PORT opened${NC}"
fi

# ── Done! ──
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  🦞 OpenClaw installed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Useful commands:${NC}"
echo "  ─────────────────────────────────────"
echo "  pm2 status              # Check status"
echo "  pm2 logs $SERVICE_NAME  # View logs"
echo "  pm2 restart $SERVICE_NAME  # Restart"
echo "  pm2 stop $SERVICE_NAME     # Stop"
echo ""
echo -e "  ${BLUE}API endpoints:${NC}"
echo "  ─────────────────────────────────────"
echo "  http://YOUR_IP:$PORT/          # Health check"
echo "  http://YOUR_IP:$PORT/api/tugas  # List tasks"
echo "  http://YOUR_IP:$PORT/api/status # Engine status"
echo ""
echo -e "  ${BLUE}Config file:${NC}"
echo "  $INSTALL_DIR/.env"
echo ""
echo -e "  ${YELLOW}⚠️  Don't forget:${NC}"
echo "  1. Make sure your database is accessible from this server"
echo "  2. If DB is on another server, update DB_HOST in .env"
echo "  3. Revoke & regenerate your Telegram bot token if exposed"
echo ""
