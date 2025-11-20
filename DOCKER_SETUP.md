# Docker PostgreSQL Setup

Quick setup for local PostgreSQL database using Docker.

## 🚀 Quick Start

### 1. Start PostgreSQL
```bash
docker-compose up -d
```

### 2. Add to `.env.local`
```env
DATABASE_URL="postgresql://syns:syns_dev_password@localhost:5432/syns?schema=public"
```

### 3. Run Prisma
```bash
npx prisma generate
npx prisma db push
```

### 4. Start Your App
```bash
npm run dev
```

## 📋 Useful Commands

### Start database
```bash
docker-compose up -d
```

### Stop database
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f postgres
```

### Connect to database (psql)
```bash
docker exec -it syns-postgres psql -U syns -d syns
```

### Reset database (⚠️ deletes all data)
```bash
docker-compose down -v
docker-compose up -d
npx prisma db push
```

## 🔍 Check if it's running

```bash
docker ps
```

Should show `syns-postgres` running on port 5432.

## 🛠️ Troubleshooting

### Port 5432 already in use
```bash
# Check what's using port 5432
lsof -i :5432

# Kill existing PostgreSQL
brew services stop postgresql
# or
sudo systemctl stop postgresql
```

### Can't connect
```bash
# Make sure container is running
docker ps

# Restart container
docker-compose restart
```

### Reset everything
```bash
# Stop and remove everything
docker-compose down -v

# Remove Docker image
docker rmi postgres:16-alpine

# Start fresh
docker-compose up -d
```

## 📊 Database Credentials

- **Host**: localhost
- **Port**: 5432
- **Database**: syns
- **User**: syns
- **Password**: syns_dev_password

⚠️ **These are dev credentials only!** Change for production.

## 🎉 Done!

Your PostgreSQL is running in Docker. Data persists in a Docker volume even if you restart the container.

