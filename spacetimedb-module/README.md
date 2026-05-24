# Cyber Cat - SpacetimeDB Database Module

This directory contains the schema declaration for the **Cyber Cat** user accounts and leaderboard rankings. It is built to be deployed on **SpacetimeDB Cloud (free tier)** or a local SpacetimeDB instance.

---

## 🛠 Prerequisites

1. Install the **SpacetimeDB CLI** for your platform:
   ```bash
   # MacOS / Linux
   curl -sSL https://spacetimedb.com/install.sh | sh
   ```
2. Verify installation:
   ```bash
   spacetime --version
   ```

---

## ☁ Deploying to SpacetimeDB Cloud (Free Tier)

### 1. Log In / Create SpacetimeDB Account
Run this command to log into the cloud platform. It will open your web browser to authenticate:
```bash
spacetime login
```

### 2. Publish and Create Your Cloud Database
Deploy this TypeScript module directly to SpacetimeDB Cloud by publishing it under a custom database name of your choice (e.g. `cybercat-runner`):
```bash
# Run this inside the `spacetimedb-module/` directory
spacetime publish cybercat-runner
```

Once published, your database will be live on **MainCloud** (`https://maincloud.spacetimedb.com`).

---

## ⚙ Config Server Integration

After publishing your database, edit the configuration constants in the root `server.js` or define them via environment variables to point to your new cloud database:

```javascript
const SPACETIMEDB_URI = "https://maincloud.spacetimedb.com";
const SPACETIMEDB_DB_NAME = "cybercat-runner"; // Replace with your published database name
```

Our Express backend server will automatically connect to it and route all user registrations, logins, and ranking queries over HTTP!
