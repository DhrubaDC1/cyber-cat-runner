/* ==========================================================================
   CYBER CAT // AUTHENTICATION & NETWORK SYNC ENGINE
   ========================================================================== */

class CyberAuthManager {
  constructor() {
    this.apiBase = '/api';
  }

  // --- FUTURISTIC USERNAME GENERATOR ---
  generateCyberUsername(name) {
    // Sanitize input name (alphanumeric only, remove spaces)
    const sanitized = name.trim().replace(/[^a-zA-Z0-9]/g, '');
    const cleanName = sanitized.substring(0, 10) || 'Runner';

    const prefixes = ['Neon', 'Grid', 'Cyber', 'Vapor', 'Laser', 'Retro', 'Pixel', 'Synth', 'Byte', 'Vector'];
    const suffixes = ['Runner', 'Cat', 'Core', 'Spectre', 'Nova', 'Zero', 'Apex', 'Matrix', 'Nexus', 'Strobe'];
    
    const usePrefix = Math.random() > 0.5;
    const randomNum = Math.floor(100 + Math.random() * 900); // 3 digit number

    if (usePrefix) {
      const pref = prefixes[Math.floor(Math.random() * prefixes.length)];
      return `${pref}_${cleanName}_${randomNum}`;
    } else {
      const suff = suffixes[Math.floor(Math.random() * suffixes.length)];
      return `${cleanName}_${suff}_${randomNum}`;
    }
  }

  // Helper for fetch headers
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = window.CyberStorage.data.authToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- API OPERATIONS ---

  // Register Guest
  async registerGuest(displayName) {
    try {
      const generatedUsername = this.generateCyberUsername(displayName);
      const payload = {
        username: generatedUsername,
        displayName: displayName,
        highScore: window.CyberStorage.getHighScore(),
        gems: window.CyberStorage.getGems(),
        unlockedSkins: window.CyberStorage.getSkins().filter(s => s.unlocked).map(s => s.id),
        unlockedTrails: window.CyberStorage.getTrails().filter(t => t.unlocked).map(t => t.id)
      };

      const res = await fetch(`${this.apiBase}/register-guest`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Guest registration failed');

      // Update local storage
      window.CyberStorage.data.authToken = data.token;
      window.CyberStorage.data.username = data.user.username;
      window.CyberStorage.data.displayName = data.user.displayName;
      window.CyberStorage.data.isGuest = true;
      window.CyberStorage.data.isRegistered = true;
      window.CyberStorage.save();

      return { success: true, user: data.user };
    } catch (err) {
      console.warn("Guest registration failed, using local offline fallback:", err);
      // Fallback: register locally offline
      const localUsername = `Offline_${displayName.trim().substring(0,8)}_${Math.floor(Math.random()*1000)}`;
      window.CyberStorage.data.username = localUsername;
      window.CyberStorage.data.displayName = displayName;
      window.CyberStorage.data.isGuest = true;
      window.CyberStorage.data.isRegistered = true;
      window.CyberStorage.save();
      
      return { success: true, offline: true, username: localUsername };
    }
  }

  // Register Secure Account
  async registerSecure(displayName, username, password) {
    try {
      const payload = {
        username: username,
        displayName: displayName,
        password: password,
        highScore: window.CyberStorage.getHighScore(),
        gems: window.CyberStorage.getGems(),
        unlockedSkins: window.CyberStorage.getSkins().filter(s => s.unlocked).map(s => s.id),
        unlockedTrails: window.CyberStorage.getTrails().filter(t => t.unlocked).map(t => t.id)
      };

      const res = await fetch(`${this.apiBase}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mainframe registration failed');

      // Update local storage
      window.CyberStorage.data.authToken = data.token;
      window.CyberStorage.data.username = data.user.username;
      window.CyberStorage.data.displayName = data.user.displayName;
      window.CyberStorage.data.isGuest = false;
      window.CyberStorage.data.isRegistered = true;
      window.CyberStorage.save();

      return { success: true, user: data.user };
    } catch (err) {
      console.error("Mainframe secure registration failed:", err);
      return { success: false, error: err.message };
    }
  }

  // Login
  async login(username, password) {
    try {
      const res = await fetch(`${this.apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication denied');

      // Sync and merge down local progress with server profile values
      window.CyberStorage.data.authToken = data.token;
      window.CyberStorage.data.username = data.user.username;
      window.CyberStorage.data.displayName = data.user.displayName;
      window.CyberStorage.data.isGuest = false;
      window.CyberStorage.data.isRegistered = true;

      // Merge scores and gems
      const localHighScore = window.CyberStorage.getHighScore();
      const serverHighScore = data.user.highScore;
      if (serverHighScore > localHighScore) {
        window.CyberStorage.data.highScore = serverHighScore;
      }
      
      const localGems = window.CyberStorage.getGems();
      const serverGems = data.user.gems;
      if (serverGems > localGems) {
        window.CyberStorage.data.gems = serverGems;
      }

      // Sync skins (unlock server unlocked skins locally)
      const skins = window.CyberStorage.getSkins();
      const serverSkins = data.user.unlockedSkins || [];
      skins.forEach(s => {
        if (serverSkins.includes(s.id)) {
          s.unlocked = true;
        }
      });

      // Sync trails
      const trails = window.CyberStorage.getTrails();
      const serverTrails = data.user.unlockedTrails || [];
      trails.forEach(t => {
        if (serverTrails.includes(t.id)) {
          t.unlocked = true;
        }
      });

      window.CyberStorage.save();

      // Trigger automatic background sync back to push local high scores if they were higher
      if (localHighScore > serverHighScore || localGems > serverGems) {
        this.syncProgress().catch(console.warn);
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error("Mainframe login failed:", err);
      return { success: false, error: err.message };
    }
  }

  // Secure / Upgrade Guest Account
  async upgradeGuest(password) {
    try {
      const res = await fetch(`${this.apiBase}/secure-account`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mainframe securing failed');

      // Update local storage
      window.CyberStorage.data.authToken = data.token;
      window.CyberStorage.data.isGuest = false;
      window.CyberStorage.save();

      // Run sync to ensure latest scores are saved permanently
      await this.syncProgress();

      return { success: true };
    } catch (err) {
      console.error("Core upgrade failed:", err);
      return { success: false, error: err.message };
    }
  }

  // Synchronization with database
  async syncProgress() {
    // Only sync if they are registered and have an active server connection token
    if (!window.CyberStorage.data.isRegistered || !window.CyberStorage.data.authToken) {
      return { success: false, reason: 'LOCAL_MODE' };
    }

    try {
      const payload = {
        highScore: window.CyberStorage.getHighScore(),
        gems: window.CyberStorage.getGems(),
        unlockedSkins: window.CyberStorage.getSkins().filter(s => s.unlocked).map(s => s.id),
        unlockedTrails: window.CyberStorage.getTrails().filter(t => t.unlocked).map(t => t.id)
      };

      const res = await fetch(`${this.apiBase}/sync`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync protocol failed');

      // Update local storage values if server tells us we have higher stats
      let saveNeeded = false;
      
      if (data.highScore > window.CyberStorage.data.highScore) {
        window.CyberStorage.data.highScore = data.highScore;
        saveNeeded = true;
      }
      if (data.gems > window.CyberStorage.data.gems) {
        window.CyberStorage.data.gems = data.gems;
        saveNeeded = true;
      }

      // Sync unlocked skins
      const skins = window.CyberStorage.getSkins();
      const serverSkins = data.unlockedSkins || [];
      skins.forEach(s => {
        if (serverSkins.includes(s.id) && !s.unlocked) {
          s.unlocked = true;
          saveNeeded = true;
        }
      });

      // Sync unlocked trails
      const trails = window.CyberStorage.getTrails();
      const serverTrails = data.unlockedTrails || [];
      trails.forEach(t => {
        if (serverTrails.includes(t.id) && !t.unlocked) {
          t.unlocked = true;
          saveNeeded = true;
        }
      });

      if (saveNeeded) {
        window.CyberStorage.save();
      }

      return { success: true };
    } catch (err) {
      console.warn("Mainframe sync offline, using local buffers:", err.message);
      return { success: false, error: err.message };
    }
  }

  // Fetch Rankings
  async getLeaderboard() {
    try {
      const res = await fetch(`${this.apiBase}/leaderboard`);
      if (!res.ok) throw new Error('Could not contact rankings database');
      return await res.json();
    } catch (err) {
      console.error("Leaderboard retrieval failed:", err);
      return null;
    }
  }
}

const CyberAuth = new CyberAuthManager();
window.CyberAuth = CyberAuth;
