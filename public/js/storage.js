/* ==========================================================================
   CYBER CAT // SAVESTATE MANAGER
   LOCALSTORAGE ADAPTER & DATA SCHEMAS
   ========================================================================== */

const CYBER_STORAGE_KEY = 'cyber_cat_save_v1';

const DEFAULT_SKINS = [
  {
    id: 'neon-classic',
    name: 'Neon Classic',
    desc: 'Standard tactical cyber-feline shell. Fitted with dual-stage micro thrusters.',
    cost: 0,
    unlocked: true,
    equipped: true,
    colors: {
      body: '#ffffff',
      glow: '#ff007f', // Pink glow
      visor: '#00f0ff'  // Cyan visor
    }
  },
  {
    id: 'cyber-punk',
    name: 'Glitch Runner',
    desc: 'Anarchy-hacked shell featuring custom heads-up visors and digital pixel smoke.',
    cost: 50,
    unlocked: false,
    equipped: false,
    colors: {
      body: '#121214',
      glow: '#00f0ff', // Cyan glow
      visor: '#ff007f'  // Pink visor
    }
  },
  {
    id: 'robo-cat',
    name: 'Robo Chrome',
    desc: 'Experimental liquid chrome shell with integrated blue superconducting circuits.',
    cost: 150,
    unlocked: false,
    equipped: false,
    colors: {
      body: '#a0a0a5',
      glow: '#39ff14', // Green glow
      visor: '#0088ff'  // Blue visor
    }
  },
  {
    id: 'laser-kitty',
    name: 'Solar Overlord',
    desc: 'Legendary prototype forged in stellar fire. Emits highly unstable golden trails.',
    cost: 300,
    unlocked: false,
    equipped: false,
    colors: {
      body: '#302605',
      glow: '#ffd700', // Gold glow
      visor: '#ff003c'  // Crimson visor
    }
  }
];

const DEFAULT_TRAILS = [
  {
    id: 'exhaust-default',
    name: 'Classic Jetfire',
    desc: 'Standard cyan thruster plume accented with glowing pink trailing sparks.',
    cost: 0,
    unlocked: true,
    equipped: true
  },
  {
    id: 'trail-sparkles',
    name: 'Glitter Flare',
    desc: 'Replaces flame with a dense streaming trail of crystalline white sparks.',
    cost: 40,
    unlocked: false,
    equipped: false
  },
  {
    id: 'trail-rainbow',
    name: 'Prism Stream',
    desc: 'A gorgeous multi-color exhaust trail shifting dynamically through the full RGB spectrum.',
    cost: 90,
    unlocked: false,
    equipped: false
  },
  {
    id: 'trail-matrix',
    name: 'Matrix Digital',
    desc: 'Hacks the coordinate grid to drop a falling stream of neon-green binary computer codes.',
    cost: 160,
    unlocked: false,
    equipped: false
  }
];

class CyberSaveManager {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(CYBER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // 1. Ensure skins merge safely
        if (parsed.skins && parsed.skins.length < DEFAULT_SKINS.length) {
          const skinMap = new Map(parsed.skins.map(s => [s.id, s]));
          parsed.skins = DEFAULT_SKINS.map(orig => {
            if (skinMap.has(orig.id)) {
              const savedSkin = skinMap.get(orig.id);
              return { ...orig, unlocked: savedSkin.unlocked, equipped: savedSkin.equipped };
            }
            return orig;
          });
        }
        
        // 2. Ensure trails database seeds and merges safely
        if (!parsed.trails || parsed.trails.length < DEFAULT_TRAILS.length) {
          const trailMap = new Map((parsed.trails || []).map(t => [t.id, t]));
          parsed.trails = DEFAULT_TRAILS.map(orig => {
            if (trailMap.has(orig.id)) {
              const savedTrail = trailMap.get(orig.id);
              return { ...orig, unlocked: savedTrail.unlocked, equipped: savedTrail.equipped };
            }
            return orig;
          });
        }

        // 3. Backward compatible credentials initializations
        if (parsed.isRegistered === undefined) {
          parsed.authToken = null;
          parsed.username = '';
          parsed.displayName = '';
          parsed.isGuest = true;
          parsed.isRegistered = false;
        }
        
        return parsed;
      }
    } catch (e) {
      console.warn("Could not read LocalStorage, running in sandboxed volatile memory:", e);
    }

    return this.getInitialState();
  }

  getInitialState() {
    return {
      highScore: 0,
      gems: 0,
      activeTheme: 'neon-sunset',
      audioEnabled: true,
      rayTracingEnabled: false, // Default to off
      skins: JSON.parse(JSON.stringify(DEFAULT_SKINS)),
      trails: JSON.parse(JSON.stringify(DEFAULT_TRAILS)),
      authToken: null,
      username: '',
      displayName: '',
      isGuest: true,
      isRegistered: false
    };
  }

  save() {
    try {
      localStorage.setItem(CYBER_STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Could not write LocalStorage:", e);
    }
  }

  getHighScore() {
    return this.data.highScore;
  }

  updateHighScore(score) {
    if (score > this.data.highScore) {
      this.data.highScore = Math.floor(score);
      this.save();
      return true; // New High Score!
    }
    return false;
  }

  getGems() {
    return this.data.gems;
  }

  addGems(amount) {
    this.data.gems += amount;
    this.save();
    return this.data.gems;
  }

  spendGems(amount) {
    if (this.data.gems >= amount) {
      this.data.gems -= amount;
      this.save();
      return true;
    }
    return false;
  }

  // --- SKINS INVENTORY ACTIONS ---

  getSkins() {
    return this.data.skins;
  }

  getActiveSkin() {
    return this.data.skins.find(s => s.equipped) || this.data.skins[0];
  }

  equipSkin(skinId) {
    const skin = this.data.skins.find(s => s.id === skinId);
    if (skin && skin.unlocked) {
      this.data.skins.forEach(s => s.equipped = (s.id === skinId));
      this.save();
      return true;
    }
    return false;
  }

  unlockSkin(skinId) {
    const skin = this.data.skins.find(s => s.id === skinId);
    if (skin && !skin.unlocked && this.data.gems >= skin.cost) {
      this.data.gems -= skin.cost;
      skin.unlocked = true;
      this.save();
      return { success: true, remainingGems: this.data.gems };
    }
    return { success: false, reason: 'INSUFFICIENT_FUNDS' };
  }

  // --- ENGINE TRAILS INVENTORY ACTIONS ---

  getTrails() {
    return this.data.trails || DEFAULT_TRAILS;
  }

  getActiveTrail() {
    if (!this.data.trails) return DEFAULT_TRAILS[0];
    return this.data.trails.find(t => t.equipped) || this.data.trails[0];
  }

  equipTrail(trailId) {
    if (!this.data.trails) this.data.trails = JSON.parse(JSON.stringify(DEFAULT_TRAILS));
    const trail = this.data.trails.find(t => t.id === trailId);
    if (trail && trail.unlocked) {
      this.data.trails.forEach(t => t.equipped = (t.id === trailId));
      this.save();
      return true;
    }
    return false;
  }

  unlockTrail(trailId) {
    if (!this.data.trails) this.data.trails = JSON.parse(JSON.stringify(DEFAULT_TRAILS));
    const trail = this.data.trails.find(t => t.id === trailId);
    if (trail && !trail.unlocked && this.data.gems >= trail.cost) {
      this.data.gems -= trail.cost;
      trail.unlocked = true;
      this.save();
      return { success: true, remainingGems: this.data.gems };
    }
    return { success: false, reason: 'INSUFFICIENT_FUNDS' };
  }

  getActiveTheme() {
    return this.data.activeTheme;
  }

  setActiveTheme(themeId) {
    this.data.activeTheme = themeId;
    this.save();
  }

  isAudioEnabled() {
    return this.data.audioEnabled;
  }

  setAudioEnabled(enabled) {
    this.data.audioEnabled = enabled;
    this.save();
  }

  isRayTracingEnabled() {
    return this.data.rayTracingEnabled !== undefined ? this.data.rayTracingEnabled : false;
  }

  setRayTracingEnabled(enabled) {
    this.data.rayTracingEnabled = enabled;
    this.save();
  }

}

// Instantiate storage globally
const CyberStorage = new CyberSaveManager();
window.CyberStorage = CyberStorage;
