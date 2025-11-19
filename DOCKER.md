# Docker Setup for StepUp

This document explains how StepUp uses Docker for local PostgreSQL development.

## Why Docker?

- ✅ **No local PostgreSQL installation needed** - PostgreSQL runs in a container
- ✅ **Consistent environment** - Same database as production (PostgreSQL)
- ✅ **Easy to start/stop** - Simple docker-compose commands
- ✅ **Data persistence** - Your data survives container restarts
- ✅ **Clean isolation** - Doesn't interfere with other projects

## Prerequisites

- Docker Desktop installed and running
  - Mac: https://www.docker.com/products/docker-desktop/
  - Windows: https://www.docker.com/products/docker-desktop/
  - Linux: https://docs.docker.com/engine/install/

## Quick Start

### Start PostgreSQL

```bash
docker-compose up -d
```

This command:
- Downloads PostgreSQL 16 image (first time only)
- Starts PostgreSQL container in background
- Creates a database named `stepup_dev`
- Exposes port 5432 to localhost

### Stop PostgreSQL

```bash
docker-compose down
```

This command:
- Stops the PostgreSQL container
- Removes the container
- **Keeps your data** (stored in Docker volume)

### View Logs

```bash
docker-compose logs -f postgres
```

Press `Ctrl+C` to stop viewing logs.

### Check Status

```bash
docker ps
```

You should see `stepup-postgres` running.

## Configuration

The `docker-compose.yml` file configures:

```yaml
services:
  postgres:
    image: postgres:16-alpine        # PostgreSQL 16 (lightweight)
    container_name: stepup-postgres  # Container name
    ports:
      - "5432:5432"                  # Port mapping
    environment:
      POSTGRES_USER: stepup          # Database user
      POSTGRES_PASSWORD: stepup_dev_password
      POSTGRES_DB: stepup_dev        # Database name
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Persistent storage
```

## Database Connection

Your `.env` file contains:

```env
DATABASE_URL=postgresql://stepup:stepup_dev_password@localhost:5432/stepup_dev
```

Breaking this down:
- `postgresql://` - Protocol
- `stepup` - Username
- `stepup_dev_password` - Password
- `localhost:5432` - Host and port
- `stepup_dev` - Database name

## Common Tasks

### Reset Database (Delete All Data)

**WARNING: This deletes all your data!**

```bash
docker-compose down -v
docker-compose up -d
npm run db:push
```

### Access PostgreSQL CLI

```bash
docker exec -it stepup-postgres psql -U stepup -d stepup_dev
```

Useful commands once inside:
- `\dt` - List all tables
- `\d table_name` - Describe table structure
- `SELECT * FROM "User";` - Query users
- `\q` - Quit

### Backup Database

```bash
docker exec stepup-postgres pg_dump -U stepup stepup_dev > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i stepup-postgres psql -U stepup -d stepup_dev
```

### View Database Size

```bash
docker exec stepup-postgres psql -U stepup -d stepup_dev -c "SELECT pg_size_pretty(pg_database_size('stepup_dev'));"
```

## Data Persistence

Your data is stored in a Docker volume named `stepup_postgres_data`.

### View Volumes

```bash
docker volume ls
```

### Inspect Volume

```bash
docker volume inspect stepup_postgres_data
```

### Where is the data?

Docker volumes are stored at:
- **Mac**: `~/Library/Containers/com.docker.docker/Data/vms/0/`
- **Windows**: `\\wsl$\docker-desktop-data\data\docker\volumes\`
- **Linux**: `/var/lib/docker/volumes/`

You generally don't need to access this directly - use Docker commands instead.

## Troubleshooting

### Port 5432 Already in Use

If you have another PostgreSQL instance running:

**Option 1: Stop the other PostgreSQL**
```bash
# Mac (Homebrew)
brew services stop postgresql

# Linux
sudo systemctl stop postgresql
```

**Option 2: Change the port**

Edit `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Use port 5433 instead
```

Then update `.env`:
```env
DATABASE_URL=postgresql://stepup:stepup_dev_password@localhost:5433/stepup_dev
```

### Container Won't Start

```bash
# View error logs
docker-compose logs postgres

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Can't Connect to Database

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **Check container is healthy:**
   ```bash
   docker-compose ps
   ```

3. **Restart PostgreSQL:**
   ```bash
   docker-compose restart postgres
   ```

4. **Check connection from host:**
   ```bash
   docker exec stepup-postgres pg_isready -U stepup
   ```

### Database Tables Don't Exist

```bash
npm run db:push
```

This creates all tables based on your Prisma schema.

## Performance

Docker PostgreSQL is suitable for development but has some considerations:

### Mac (M1/M2)
- Uses native ARM64 image (fast)
- No emulation overhead
- Similar performance to native PostgreSQL

### Mac (Intel)
- Runs natively (fast)
- Minimal overhead

### Windows
- Runs in WSL2 (fast enough for development)
- Slightly slower than Linux but acceptable

### Improving Performance

Add to `docker-compose.yml` under postgres service:

```yaml
command:
  - "postgres"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "max_connections=200"
```

## Production vs Development

| Aspect | Development (Docker) | Production (Vercel) |
|--------|---------------------|---------------------|
| Database | PostgreSQL 16 in Docker | Neon/Vercel Postgres |
| Connection | localhost:5432 | SSL required |
| Data | Local volume | Cloud storage |
| Backups | Manual | Automatic |
| Scaling | Single instance | Auto-scaling |

Both use PostgreSQL, so your schema and queries work the same!

## Docker Commands Cheat Sheet

```bash
# Start PostgreSQL
docker-compose up -d

# Stop PostgreSQL (keep data)
docker-compose down

# Stop PostgreSQL (delete data!)
docker-compose down -v

# View logs
docker-compose logs -f postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check status
docker-compose ps

# Access database CLI
docker exec -it stepup-postgres psql -U stepup -d stepup_dev

# Run any PostgreSQL command
docker exec stepup-postgres psql -U stepup -d stepup_dev -c "YOUR SQL HERE"

# Backup database
docker exec stepup-postgres pg_dump -U stepup stepup_dev > backup.sql

# Restore database
cat backup.sql | docker exec -i stepup-postgres psql -U stepup -d stepup_dev
```

## Switching to Production

When deploying to Vercel:

1. Keep `docker-compose.yml` (for local development)
2. Update `.env` on Vercel with Neon/Vercel Postgres URL
3. Run `npm run db:push` once on production
4. Your local and production databases are separate

## Further Reading

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. View Docker logs: `docker-compose logs postgres`
3. Check Docker Desktop dashboard
4. Restart Docker Desktop
5. Check [SETUP.md](./SETUP.md) for general troubleshooting
