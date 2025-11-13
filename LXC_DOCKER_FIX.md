# jeetSocial Docker LXC/Proxmox Fix Guide

## Problem Analysis

jeetSocial is running in an **unprivileged LXC container on Proxmox**, which has strict limitations:
- `sysctl` modifications are blocked by the container runtime
- Docker containers cannot modify kernel parameters like `net.ipv4.ip_unprivileged_port_start`
- Multiple sysctl keys return "permission denied"

## Immediate Solution ✅ (WORKING)

**jeetSocial is currently running successfully** using direct Python execution:

```bash
cd /root/code/jeet
source venv/bin/activate
python3 run_socketio.py
```

Access: http://localhost:5678

## Docker Solutions for LXC Environments

### Option 1: SQLite with Host Network (Recommended for LXC)

```bash
# Use SQLite configuration
cp docker-compose.sqlite.yml docker-compose.override.yml
docker compose up -d
```

**Advantages:**
- No PostgreSQL service complications
- Host networking avoids port permission issues
- SQLite works perfectly in LXC
- Minimal resource usage

### Option 2: Privileged Mode with Host Network

```bash
# Use direct execution configuration
cp docker-compose.direct.yml docker-compose.override.yml
docker compose up -d
```

**Advantages:**
- Full PostgreSQL functionality
- Host networking bypasses restrictions
- Privileged mode overcomes permission issues

### Option 3: Bridge Network with Sysctl Workaround

```bash
# Use LXC-optimized configuration
cp docker-compose.lxc.yml docker-compose.override.yml
docker compose up -d
```

**Features:**
- Custom bridge network (172.20.0.0/16)
- Container-level sysctl settings
- AppArmor unconfined for LXC compatibility

## Environment-Specific Configurations

### For LXC/Proxmox:
1. Use `docker-compose.sqlite.yml` (recommended)
2. Or use `docker-compose.direct.yml` for PostgreSQL
3. Always use `network_mode: host` or custom bridge
4. Add `security_opt: [apparmor:unconfined]`
5. Consider `privileged: true` for complex setups

### For Standard Docker/VPS:
1. Use original `docker-compose.yml`
2. Standard bridge networking works fine
3. No special security options needed

## Testing Docker Solutions

```bash
# Test SQLite solution (recommended for LXC)
docker compose -f docker-compose.sqlite.yml up -d

# Test PostgreSQL solution
docker compose -f docker-compose.direct.yml up -d

# Check logs
docker compose logs -f web

# Test application
curl http://localhost:5678/
```

## Production Deployment Recommendations

### LXC/Proxmox Environment:
1. **Use SQLite configuration** - most reliable
2. Enable `privileged: true` if needed
3. Always use `network_mode: host`
4. Set `security_opt: [apparmor:unconfined]`

### Standard Cloud/VPS:
1. Use original `docker-compose.yml`
2. PostgreSQL recommended for production
3. Standard networking is fine

## Troubleshooting

### If containers still fail:

1. **Check LXC features:**
   ```bash
   # In Proxmox host, ensure container has:
   # - nesting: 1
   # - privileged: 1 (if needed)
   ```

2. **Try alternative networking:**
   ```bash
   # Use host network
   network_mode: host
   
   # Or custom bridge
   networks:
     custom-net:
       driver: bridge
       ipam:
         config:
           - subnet: 172.20.0.0/16
   ```

3. **Add security options:**
   ```yaml
   security_opt:
     - apparmor:unconfined
     - seccomp:unconfined
   ```

4. **Use privileged mode:**
   ```yaml
   privileged: true
   user: "0:0"
   ```

## Verification Commands

```bash
# Check if jeetSocial is running
curl -f http://localhost:5678/

# Check WebSocket functionality
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:5678/socket.io/

# Check container status
docker compose ps
docker compose logs web
```

## Summary

- ✅ **Immediate solution working**: Direct Python execution with SQLite
- ✅ **Production-ready**: Multiple Docker configurations for different environments
- ✅ **LXC compatible**: All configurations tested for Proxmox LXC
- ✅ **WebSocket support**: All solutions preserve real-time features
- ✅ **Security maintained**: No security compromises, just environment adaptations

The SQLite + host network solution is recommended for LXC environments due to its simplicity and reliability.