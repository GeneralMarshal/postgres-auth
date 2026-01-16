# Lesson 01: Setup and Fundamentals

**Goal**: Set up your complete development environment and understand NestJS architecture

## What You'll Learn

By the end of this lesson, you will:

- ✅ Understand why we use Docker for development
- ✅ Set up PostgreSQL and Redis with Docker
- ✅ Initialize a NestJS project
- ✅ Configure Prisma with PostgreSQL
- ✅ Understand NestJS modules and dependency injection
- ✅ Create your first User model

## Lesson Structure

This lesson is broken into 4 main steps:

1. **STEP-01-docker-setup.md** - Set up Docker with PostgreSQL and Redis
2. **STEP-02-nestjs-setup.md** - Initialize NestJS project and install dependencies
3. **STEP-03-prisma-config.md** - Configure Prisma and create User model
4. **STEP-04-nestjs-fundamentals.md** - Understand NestJS architecture

## Prerequisites

Before starting, make sure you have:

- ✅ Node.js (v18 or higher) installed
- ✅ npm or yarn installed
- ✅ Docker Desktop installed (recommended)
- ✅ A code editor (VS Code recommended)
- ✅ Basic TypeScript knowledge

## Why Docker?

**Question**: Why use Docker instead of installing PostgreSQL and Redis locally?

**Answer**: Docker provides:

1. **Consistent Environment**: Same setup on any machine
2. **Easy Cleanup**: Delete containers when done, no leftover files
3. **Isolation**: Doesn't affect your system's PostgreSQL/Redis
4. **Reproducible**: Same versions every time
5. **Quick Setup**: One command to start everything

**Alternative**: If you prefer local install, we provide instructions, but Docker is recommended.

## What We're Building

In this lesson, we'll create:

- A NestJS application
- Docker setup with PostgreSQL and Redis
- Prisma configuration
- A User model (foundation for authentication)
- Basic module structure

## Key Concepts You'll Learn

### 1. NestJS Modules
Modules are containers that organize related code. Think of them as "feature boxes" that hold controllers, services, and other providers together.

### 2. Dependency Injection
NestJS automatically provides dependencies to classes. You don't create instances manually - NestJS does it for you.

### 3. Prisma Models
Prisma models represent database tables. They define the structure of your data in the schema file.

### 4. Docker Compose
A tool to run multiple containers (PostgreSQL, Redis) with one command.

## Time Estimate

- **STEP 01**: 15 minutes
- **STEP 02**: 20 minutes
- **STEP 03**: 30 minutes
- **STEP 04**: 30 minutes

**Total**: ~90 minutes

## Getting Started

1. Start with **STEP-01-docker-setup.md**
2. Follow each step in order
3. Don't skip ahead - each step builds on the previous
4. Test everything as you go

## Troubleshooting

If you run into issues:

1. Check the error message carefully
2. Verify Docker is running (if using Docker)
3. Check that ports aren't already in use
4. Review the step you're on
5. Check `final-code/` folder for reference

## Next Steps

After completing this lesson, you'll move to **Lesson 02: Password Security** where you'll implement user registration and login with password hashing.

---

**Ready?** Let's start with [STEP-01-docker-setup.md](./STEP-01-docker-setup.md)!
