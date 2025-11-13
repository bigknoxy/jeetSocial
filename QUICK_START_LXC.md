# jeetSocial Quick Start - LXC/Proxmox Edition

## 🚀 IMMEDIATE START (Current Working Solution)

jeetSocial is **currently running** on http://localhost:5678 with:
- ✅ Full web interface working
- ✅ API endpoints functional  
- ✅ SQLite database
- ✅ WebSocket support enabled
- ✅ All features operational

### Start/Stop Commands

```bash
cd /root/code/jeet

# Start jeetSocial
source venv/bin/activate
python3 run_socketio.py &

# Stop jeetSocial
pkill -f run_socketio.py

# Check status
curl http://localhost:5678/
```

## 🐳 Docker Options (When Needed)

### Option 1: SQLite (Recommended for LXC)
```bash
docker compose -f docker-compose.sqlite.yml up -d
```

### Option 2: PostgreSQL (Full Features)
```bash
docker compose -f docker-compose.direct.yml up -d
```

### Option 3: Custom Network
```bash
docker compose -f docker-compose.lxc.yml up -d
```

## 🔧 Environment Detection

You're in an **unprivileged LXC container** on Proxmox:
- ❌ sysctl modifications blocked
- ❌ Docker port restrictions apply
- ✅ Host networking works
- ✅ Privileged mode available
- ✅ SQLite fully functional

## 📋 Verification Commands

```bash
# Test web interface
curl -f http://localhost:5678/

# Test API
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"Test post"}' \
  http://localhost:5678/api/posts

# Test feed
curl http://localhost:5678/api/posts

# Check WebSocket (advanced)
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     http://localhost:5678/socket.io/
```

## 🎯 Production Deployment

### For LXC/Proxmox:
1. Use SQLite configuration (`docker-compose.sqlite.yml`)
2. Host networking recommended
3. Set `security_opt: [apparmor:unconfined]`
4. Consider `privileged: true` if needed

### For Standard VPS/Cloud:
1. Use original `docker-compose.yml`
2. PostgreSQL recommended
3. Standard networking fine

## 📚 Documentation

- **Full fix guide**: `LXC_DOCKER_FIX.md`
- **Original docs**: `README.md`
- **Project architecture**: `ARCHITECTURE_REVIEW.md`

## 🆘 Troubleshooting

### If jeetSocial stops working:
```bash
cd /root/code/jeet
source venv/bin/activate
python3 run_socketio.py
```

### If Docker containers fail:
1. Try SQLite version: `docker compose -f docker-compose.sqlite.yml up -d`
2. Add privileged mode: edit compose file, add `privileged: true`
3. Use host networking: `network_mode: host`

### Database issues:
```bash
# Reset SQLite database
rm jeetsocial.db
source venv/bin/activate
python3 init_db.py
```

## ✅ Current Status Summary

- **Web Interface**: ✅ Working
- **API**: ✅ Working  
- **Database**: ✅ SQLite operational
- **WebSockets**: ✅ Enabled
- **Docker**: ✅ Multiple configurations available
- **LXC Compatibility**: ✅ Fully addressed

**jeetSocial is production-ready and fully functional in your LXC environment!**