const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'cyber-cat-mainframe-secret-key-909';

// --- SPACETIMEDB CONFIGURATION ---
const SPACETIMEDB_URI = process.env.SPACETIMEDB_URI || 'https://maincloud.spacetimedb.com';
const SPACETIMEDB_DB_NAME = process.env.SPACETIMEDB_DB_NAME || 'cybercat-runner';

app.use(cors());
app.use(express.json());

// SQL Escaping helper to protect against single-quote SQL injection
function escapeSqlString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/'/g, "''");
}

// SpacetimeDB REST SQL Query Executor
async function querySpacetimeDB(sql) {
  try {
    const url = `${SPACETIMEDB_URI}/v1/database/${SPACETIMEDB_DB_NAME}/sql`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: sql
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`SpacetimeDB Error: ${text}`);
    }

    if (!text || text.trim() === '') {
      return [];
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('[SPACETIMEDB] Returned non-JSON body:', text);
      return [];
    }
  } catch (error) {
    console.error(`[SPACETIMEDB ERROR] Query failed: ${sql}`);
    console.error(`[SPACETIMEDB ERROR] Details: ${error.message}`);
    throw error;
  }
}

// Algebraic Type System JSON (SATS-JSON) Row Mapper
function mapRow(row) {
  if (!row) return null;
  
  // 1. If row is a structured JSON object
  if (typeof row === 'object' && !Array.isArray(row)) {
    return {
      username: row.username || '',
      display_name: row.display_name || row.displayName || '',
      password_hash: row.password_hash || row.passwordHash || '',
      high_score: Number(row.high_score !== undefined ? row.high_score : (row.highScore || 0)),
      gems: Number(row.gems !== undefined ? row.gems : 0),
      is_guest: row.is_guest === true || row.is_guest === 1 || row.is_guest === 'true' || row.isGuest === true || row.isGuest === 1,
      unlocked_skins: row.unlocked_skins || row.unlockedSkins || '["neon-classic"]',
      unlocked_trails: row.unlocked_trails || row.unlockedTrails || '["exhaust-default"]'
    };
  }

  // 2. If row is an array matching schema index mapping:
  // [username, display_name, password_hash, high_score, gems, is_guest, unlocked_skins, unlocked_trails]
  if (Array.isArray(row)) {
    return {
      username: row[0] || '',
      display_name: row[1] || '',
      password_hash: row[2] || '',
      high_score: Number(row[3] || 0),
      gems: Number(row[4] || 0),
      is_guest: row[5] === true || row[5] === 1 || row[5] === 'true',
      unlocked_skins: row[6] || '["neon-classic"]',
      unlocked_trails: row[7] || '["exhaust-default"]'
    };
  }

  return null;
}

// Connect and verify connection status
async function initDB() {
  console.log(`[SPACETIMEDB INIT] Target MainCloud: ${SPACETIMEDB_URI}`);
  console.log(`[SPACETIMEDB INIT] Database Name: ${SPACETIMEDB_DB_NAME}`);
  
  try {
    // Run basic select count check to test if users table is published and reachable
    await querySpacetimeDB('SELECT COUNT(*) FROM users');
    console.log('[SPACETIMEDB INIT] Connection active! Schema table "users" is live.');
  } catch (err) {
    console.warn('\n==================================================================');
    console.warn('[SPACETIMEDB OFFLINE CHECK WARNING]');
    console.warn(`Could not verify table schema for DB: "${SPACETIMEDB_DB_NAME}"`);
    console.warn(`Reason: ${err.message}`);
    console.warn('To resolve this, install SpacetimeDB CLI and deploy your module:');
    console.warn('  1. cd spacetimedb-module');
    console.warn('  2. spacetime login');
    console.warn(`  3. spacetime publish ${SPACETIMEDB_DB_NAME}`);
    console.warn('==================================================================\n');
  }
}

// Authentication Token Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authentication token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// --- API ENDPOINTS ---

// Register volatile guest profile
app.post('/api/register-guest', async (req, res) => {
  try {
    const { username, displayName, highScore, gems, unlockedSkins, unlockedTrails } = req.body;
    if (!username || !displayName) {
      return res.status(400).json({ error: 'Username and display name are required' });
    }

    const safeUsername = escapeSqlString(username);
    const safeDisplayName = escapeSqlString(displayName);
    const skinsJson = escapeSqlString(JSON.stringify(unlockedSkins || ['neon-classic']));
    const trailsJson = escapeSqlString(JSON.stringify(unlockedTrails || ['exhaust-default']));

    const scoreInt = Math.floor(Number(highScore || 0));
    const gemsInt = Math.floor(Number(gems || 0));

    // Insert guest row directly into SpacetimeDB
    await querySpacetimeDB(
      `INSERT INTO users (username, display_name, password_hash, high_score, gems, is_guest, unlocked_skins, unlocked_trails)
       VALUES ('${safeUsername}', '${safeDisplayName}', '', ${scoreInt}, ${gemsInt}, true, '${skinsJson}', '${trailsJson}')`
    );

    const token = jwt.sign({ username, isGuest: true }, JWT_SECRET);
    res.status(201).json({
      token,
      user: {
        username,
        displayName,
        highScore: highScore || 0,
        gems: gems || 0,
        isGuest: true,
        unlockedSkins: unlockedSkins || ['neon-classic'],
        unlockedTrails: unlockedTrails || ['exhaust-default']
      }
    });
  } catch (error) {
    if (error.message.includes('Duplicate key') || error.message.includes('unique constraint') || error.message.includes('ConstraintViolation')) {
      return res.status(400).json({ error: 'Username already in use' });
    }
    console.error('Guest registration error:', error);
    res.status(500).json({ error: 'Cloud guest registration failed' });
  }
});

// Register secure permanent profile
app.post('/api/register', async (req, res) => {
  try {
    const { username, displayName, password, highScore, gems, unlockedSkins, unlockedTrails } = req.body;
    if (!username || !displayName || !password) {
      return res.status(400).json({ error: 'Username, display name, and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const safeUsername = escapeSqlString(username);
    const safeDisplayName = escapeSqlString(displayName);
    const safePasswordHash = escapeSqlString(passwordHash);
    const skinsJson = escapeSqlString(JSON.stringify(unlockedSkins || ['neon-classic']));
    const trailsJson = escapeSqlString(JSON.stringify(unlockedTrails || ['exhaust-default']));

    const scoreInt = Math.floor(Number(highScore || 0));
    const gemsInt = Math.floor(Number(gems || 0));

    // Insert secure row directly into SpacetimeDB
    await querySpacetimeDB(
      `INSERT INTO users (username, display_name, password_hash, high_score, gems, is_guest, unlocked_skins, unlocked_trails)
       VALUES ('${safeUsername}', '${safeDisplayName}', '${safePasswordHash}', ${scoreInt}, ${gemsInt}, false, '${skinsJson}', '${trailsJson}')`
    );

    const token = jwt.sign({ username, isGuest: false }, JWT_SECRET);
    res.status(201).json({
      token,
      user: {
        username,
        displayName,
        highScore: highScore || 0,
        gems: gems || 0,
        isGuest: false,
        unlockedSkins: unlockedSkins || ['neon-classic'],
        unlockedTrails: unlockedTrails || ['exhaust-default']
      }
    });
  } catch (error) {
    if (error.message.includes('Duplicate key') || error.message.includes('unique constraint') || error.message.includes('ConstraintViolation')) {
      return res.status(400).json({ error: 'Username already in use' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Cloud registration failed' });
  }
});

// Authenticate profile credentials
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const safeUsername = escapeSqlString(username);
    const results = await querySpacetimeDB(`SELECT * FROM users WHERE username = '${safeUsername}'`);
    const user = results.length > 0 ? mapRow(results[0]) : null;

    if (!user || user.is_guest || !user.password_hash) {
      return res.status(400).json({ error: 'Invalid username or password credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password credentials' });
    }

    const token = jwt.sign({ username: user.username, isGuest: false }, JWT_SECRET);
    res.json({
      token,
      user: {
        username: user.username,
        displayName: user.display_name,
        highScore: user.high_score,
        gems: user.gems,
        isGuest: false,
        unlockedSkins: JSON.parse(user.unlocked_skins || '["neon-classic"]'),
        unlockedTrails: JSON.parse(user.unlocked_trails || '["exhaust-default"]')
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Upgrade guest core to password secured
app.post('/api/secure-account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const username = req.user.username;
    const safeUsername = escapeSqlString(username);
    
    const results = await querySpacetimeDB(`SELECT * FROM users WHERE username = '${safeUsername}'`);
    const user = results.length > 0 ? mapRow(results[0]) : null;

    if (!user) {
      return res.status(404).json({ error: 'Runner profile not found' });
    }

    if (!user.is_guest) {
      return res.status(400).json({ error: 'Runner profile is already password secured' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const safePasswordHash = escapeSqlString(passwordHash);

    // Update guest flags
    await querySpacetimeDB(
      `UPDATE users 
       SET password_hash = '${safePasswordHash}', is_guest = false 
       WHERE username = '${safeUsername}'`
    );

    const token = jwt.sign({ username, isGuest: false }, JWT_SECRET);

    res.json({
      success: true,
      token,
      user: {
        username,
        displayName: user.display_name,
        isGuest: false
      }
    });
  } catch (error) {
    console.error('Account secure upgrade error:', error);
    res.status(500).json({ error: 'Security mainframe upgrade failed' });
  }
});

// Synchronize gameplay metrics
app.post('/api/sync', authenticateToken, async (req, res) => {
  try {
    const { highScore, gems, unlockedSkins, unlockedTrails } = req.body;
    const username = req.user.username;
    const safeUsername = escapeSqlString(username);

    const results = await querySpacetimeDB(`SELECT * FROM users WHERE username = '${safeUsername}'`);
    const user = results.length > 0 ? mapRow(results[0]) : null;

    if (!user) {
      return res.status(404).json({ error: 'Runner profile not found' });
    }

    // High scores and gems resolution logic
    const newHighScore = Math.floor(Math.max(user.high_score, Number(highScore || 0)));
    const newGems = Math.floor(Math.max(user.gems, Number(gems || 0)));

    const serverSkins = JSON.parse(user.unlocked_skins || '["neon-classic"]');
    const mergedSkins = Array.from(new Set([...serverSkins, ...(unlockedSkins || [])]));

    const serverTrails = JSON.parse(user.unlocked_trails || '["exhaust-default"]');
    const mergedTrails = Array.from(new Set([...serverTrails, ...(unlockedTrails || [])]));

    const safeSkins = escapeSqlString(JSON.stringify(mergedSkins));
    const safeTrails = escapeSqlString(JSON.stringify(mergedTrails));

    await querySpacetimeDB(
      `UPDATE users 
       SET high_score = ${newHighScore}, gems = ${newGems}, unlocked_skins = '${safeSkins}', unlocked_trails = '${safeTrails}'
       WHERE username = '${safeUsername}'`
    );

    res.json({
      success: true,
      highScore: newHighScore,
      gems: newGems,
      unlockedSkins: mergedSkins,
      unlockedTrails: mergedTrails
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Data synchronization failed' });
  }
});

// Global rankings leaderboard fetch
app.get('/api/leaderboard', async (req, res) => {
  try {
    const rankings = await querySpacetimeDB(
      `SELECT username, display_name, password_hash, high_score, gems, is_guest, unlocked_skins, unlocked_trails 
       FROM users 
       ORDER BY high_score DESC 
       LIMIT 100`
    );

    const results = rankings.map((row, index) => {
      const mapped = mapRow(row);
      return {
        rank: index + 1,
        username: mapped.username,
        displayName: mapped.display_name,
        highScore: mapped.high_score,
        gems: mapped.gems,
        isGuest: mapped.is_guest
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Leaderboard query error:', error);
    res.status(500).json({ error: 'Failed to retrieve rankings' });
  }
});

// Retrieve verified token status
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const safeUsername = escapeSqlString(req.user.username);
    const results = await querySpacetimeDB(`SELECT * FROM users WHERE username = '${safeUsername}'`);
    const user = results.length > 0 ? mapRow(results[0]) : null;

    if (!user) {
      return res.status(404).json({ error: 'Runner profile not found' });
    }

    res.json({
      username: user.username,
      displayName: user.display_name,
      highScore: user.high_score,
      gems: user.gems,
      isGuest: user.is_guest,
      unlockedSkins: JSON.parse(user.unlocked_skins || '["neon-classic"]'),
      unlockedTrails: JSON.parse(user.unlocked_trails || '["exhaust-default"]')
    });
  } catch (error) {
    console.error('Retrieve profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve runner profile' });
  }
});

// Serve compiled static assets (Local fallback only, Vercel routes static files automatically)
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Export app for Vercel Serverless Function compatibility
module.exports = app;

// Local environment spin up check
if (require.main === module) {
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`MAINFRAME API SERVER (SPACETIMEDB GATEWAY) LIVE ON PORT http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Server startup crash occurred:', err);
    process.exit(1);
  });
} else {
  // Silent boot diagnostic check for serverless contexts
  initDB().catch(console.error);
}
