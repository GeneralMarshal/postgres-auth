# STEP 01: Docker Setup

**Goal**: Set up PostgreSQL and Redis using Docker

## Why Docker?

Before we start, let's understand **why** we use Docker:

### The Problem Without Docker

- Installing PostgreSQL locally can conflict with existing installations
- Different developers might have different versions
- Hard to clean up when done
- Setup is different on Windows, Mac, Linux

### The Solution: Docker

Docker runs databases in **containers** - isolated environments that:
- Work the same on any machine
- Don't affect your system
- Are easy to start/stop/delete
- Can be shared with exact same configuration

## What We're Creating

We'll create a `docker-compose.yml` file that defines:
- PostgreSQL database (for storing users, sessions, etc.)
- Redis (for session storage - we'll use this in Lesson 04)

## Step-by-Step Instructions

### 1. Create docker-compose.yml

In the root of your project (where you'll create the NestJS app), create a file called `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: auth-tutorial-postgres
    environment:
      POSTGRES_USER: auth_user
      POSTGRES_PASSWORD: auth_password
      POSTGRES_DB: auth_tutorial
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U auth_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis for Session Storage
  redis:
    image: redis:7-alpine
    container_name: auth-tutorial-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 2. Understanding the Configuration

Let's break down what each part does:

#### PostgreSQL Service

```yaml
postgres:
  image: postgres:15-alpine
```
- `image`: Which Docker image to use (PostgreSQL version 15, Alpine Linux - smaller size)
- `alpine` = minimal Linux distribution (smaller, faster)

```yaml
container_name: auth-tutorial-postgres
```
- Name of the container (easier to identify)

```yaml
environment:
  POSTGRES_USER: auth_user
  POSTGRES_PASSWORD: auth_password
  POSTGRES_DB: auth_tutorial
```
- Database credentials (we'll use these in NestJS)
- **Note**: These are for development only. Never use these in production!

```yaml
ports:
  - "5432:5432"
```
- Maps container port 5432 to your machine's port 5432
- Format: `"host:container"`

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```
- Persists database data even if container stops
- Without this, data is lost when container is deleted

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U auth_user"]
```
- Checks if database is ready before marking container as healthy

#### Redis Service

```yaml
redis:
  image: redis:7-alpine
```
- Redis version 7 (latest stable)

```yaml
ports:
  - "6379:6379"
```
- Redis default port

### 3. Start the Containers

Open your terminal in the project root and run:

```bash
docker-compose up -d
```

**What this does:**
- `up`: Start containers
- `-d`: Run in "detached" mode (background)

**Expected output:**
```
Creating network "tutorial_default" ... done
Creating auth-tutorial-postgres ... done
Creating auth-tutorial-redis ... done
```

### 4. Verify Containers Are Running

Check that containers are running:

```bash
docker-compose ps
```

**Expected output:**
```
NAME                      STATUS
auth-tutorial-postgres    Up (healthy)
auth-tutorial-redis       Up (healthy)
```

### 5. Test PostgreSQL Connection (Optional)

You can test the connection using Docker:

```bash
docker exec -it auth-tutorial-postgres psql -U auth_user -d auth_tutorial
```

This opens a PostgreSQL prompt. Type `\q` to exit.

### 6. Test Redis Connection (Optional)

Test Redis:

```bash
docker exec -it auth-tutorial-redis redis-cli ping
```

**Expected output:** `PONG`

## Understanding What Happened

1. **Docker downloaded images**: PostgreSQL and Redis images from Docker Hub
2. **Created containers**: Isolated environments running the databases
3. **Exposed ports**: Made databases accessible on your machine
4. **Created volumes**: Persistent storage for data

## Common Issues

### Port Already in Use

**Error**: `port is already allocated`

**Solution**: 
- Check if PostgreSQL/Redis is already running locally
- Stop local services or change ports in docker-compose.yml
- For PostgreSQL, change `"5432:5432"` to `"5433:5432"`
- For Redis, change `"6379:6379"` to `"6380:6379"`

### Docker Not Running

**Error**: `Cannot connect to the Docker daemon`

**Solution**: Start Docker Desktop

### Container Won't Start

**Error**: Container keeps restarting

**Solution**:
```bash
docker-compose logs postgres
```
Check the logs to see what's wrong.

## Useful Docker Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v

# View logs
docker-compose logs postgres
docker-compose logs redis

# Restart a container
docker-compose restart postgres

# Check container status
docker-compose ps
```

## Environment Variables

We'll need these connection details in NestJS:

- **PostgreSQL**:
  - Host: `localhost`
  - Port: `5432`
  - Username: `auth_user`
  - Password: `auth_password`
  - Database: `auth_tutorial`

- **Redis**:
  - Host: `localhost`
  - Port: `6379`

## What's Next?

✅ **You've completed**: Docker setup with PostgreSQL and Redis

➡️ **Next step**: [STEP-02-nestjs-setup.md](./STEP-02-nestjs-setup.md) - Initialize NestJS project

## Key Takeaways

1. **Docker provides isolation**: Databases run in containers, not on your system
2. **docker-compose.yml defines services**: One file configures everything
3. **Volumes persist data**: Data survives container restarts
4. **Ports expose services**: Make databases accessible to your app
5. **Health checks verify readiness**: Ensures databases are ready before use

---

**Ready for the next step?** Let's set up NestJS!
