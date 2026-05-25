/* ==========================================================================
   CYBER CAT // MAIN GAME ENGINE CONTROLLER
   GAME STATE MACHINES, DYNAMIC PHYSICS LOOPS & DOM INTERACTION
   ========================================================================== */

class CyberGameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Game Sizing
    this.width = 800;
    this.height = 400;
    this.groundY = 0; // Set dynamically on sizing
    
    // Core Engine States
    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, SHOP
    this.lastTime = 0;
    this.fpsLastTime = 0;
    this.fpsCount = 0;
    
    // Gameplay Speed Specs
    this.baseSpeed = 5.5;
    this.currentSpeed = 5.5;
    this.maxSpeed = 14.0;
    this.acceleration = 0.00015; // Speed increase per millisecond
    
    // Spawning timers
    this.obstacleTimer = 0;
    this.obstacleMinInterval = 1200; // ms between obstacle spawns
    this.obstacleVarInterval = 1800; // random variable addition
    this.obstacleNextSpawn = 1500;
    
    this.gemTimer = 0;
    this.gemInterval = 900;
    
    // Active Power-ups State Managers
    this.powerups = { shield: 0, magnet: 0, boost: 0 };
    this.powerupDurations = { shield: 8000, magnet: 8000, boost: 6000 };
    this.powerupSpawnTimer = 0;
    this.powerupSpawnInterval = 10000; // 10 seconds between spawn rolls
    this.isInvulnerable = false;
    
    // Shop Tab States
    this.activeTab = 'skins'; // skins, trails
    
    // Gameplay Data Metrics
    this.distance = 0;
    this.score = 0;
    this.gemsThisRun = 0;
    
    // Mobile Touch Identifier
    this.rightTouchId = null;
    
    // Debug Visual Bounds
    this.debugMode = false;
    
    // Entities Instance Pools
    this.background = null;
    this.player = null;
    this.obstacles = [];
    this.collectibles = [];
    this.powerupsPool = [];
    this.particles = null;
    
    // Pre-initialize Elements
    this.initDOMReferences();
    this.initEntities();
    this.setupResizeHandler();
    this.setupInputListeners();
    this.setupAuthListeners();
    this.loadHighscoreAndStats();
    this.renderShopSkins();
    this.updateActiveThemeStyle(window.CyberStorage.getActiveTheme());
    
    // Check Core Identity registration on startup
    if (!window.CyberStorage.data.isRegistered) {
      setTimeout(() => this.switchScreen('register'), 100);
    } else {
      // Offline background sync syncs local progress if server is reachable
      setTimeout(() => window.CyberAuth.syncProgress().then(() => this.loadHighscoreAndStats()).catch(console.warn), 1000);
    }

    // Start Menu Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    
    // Pre-draw menu runner sprite
    this.menuSpriteCanvas = document.getElementById('menu-sprite-canvas');
    this.menuSpriteCtx = this.menuSpriteCanvas?.getContext('2d');
    this.menuSpriteTime = 0;
  }

  // --- 1. SETUP & UTILITIES ---

  initDOMReferences() {
    this.screens = {
      menu: document.getElementById('screen-menu'),
      shop: document.getElementById('screen-shop'),
      hud: document.getElementById('hud-overlay'),
      pause: document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
      credits: document.getElementById('screen-credits'),
      portraitLock: document.getElementById('portrait-lock-overlay'),
      shopSkinsSection: document.getElementById('shop-skins-section'),
      shopTrailsSection: document.getElementById('shop-trails-section'),
      leaderboard: document.getElementById('screen-leaderboard'),
      register: document.getElementById('screen-register')
    };
    
    this.buttons = {
      play: document.getElementById('btn-play'),
      shopToggle: document.getElementById('btn-shop-toggle'),
      shopClose: document.getElementById('btn-shop-close'),
      creditsToggle: document.getElementById('btn-credits-toggle'),
      creditsClose: document.getElementById('btn-credits-close'),
      resume: document.getElementById('btn-resume'),
      pauseRestart: document.getElementById('btn-pause-restart'),
      pauseMenu: document.getElementById('btn-pause-menu'),
      restart: document.getElementById('btn-restart'),
      goShop: document.getElementById('btn-gameover-shop'),
      goMenu: document.getElementById('btn-gameover-menu'),
      mute: document.getElementById('mute-btn'),
      rt: document.getElementById('rt-btn'),
      theme: document.getElementById('theme-btn'),
      fullscreen: document.getElementById('fullscreen-btn'),
      tabSkins: document.getElementById('tab-skins'),
      tabTrails: document.getElementById('tab-trails'),
      leaderboardToggle: document.getElementById('btn-leaderboard-toggle'),
      leaderboardClose: document.getElementById('btn-leaderboard-close')
    };

    this.hud = {
      score: document.getElementById('hud-score'),
      multiplier: document.getElementById('hud-multiplier'),
      gems: document.getElementById('hud-gems-count'),
      globalGems: document.getElementById('global-gems'),
      globalHiScore: document.getElementById('global-hi-score'),
      fps: document.getElementById('fps-counter'),
      warningFlash: document.getElementById('warning-flash'),
      powerupsList: document.getElementById('hud-powerups-list'),
      trailsGrid: document.getElementById('trails-grid')
    };
    
    this.overStats = {
      distance: document.getElementById('over-distance'),
      score: document.getElementById('over-score'),
      gems: document.getElementById('over-gems'),
      highScoreBadge: document.getElementById('new-high-score-badge'),
      pauseScore: document.getElementById('pause-score'),
      activeSkinName: document.getElementById('active-skin-name'),
      activeSkinDesc: document.getElementById('active-skin-desc')
    };
  }

  initEntities() {
    this.background = new window.ParallaxBackground(this.canvas);
    this.player = new window.Player(this.canvas);
    this.particles = new window.ParticleEngine(this.canvas);
    
    this.player.equipSkin(window.CyberStorage.getActiveSkin());
    this.obstacles = [];
    this.collectibles = [];
    this.powerupsPool = [];
    
    // Initialize dynamic 2D neon ray-traced lighting engine
    this.raycaster = new window.RaycastEngine(this.canvas);
  }

  setupResizeHandler() {
    const handleResize = () => {
      const parent = this.canvas.parentElement;
      const rect = parent.getBoundingClientRect();
      
      // Calculate optimized high DPI resolution
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      
      this.width = rect.width;
      this.height = rect.height;
      
      this.groundY = this.height * 0.82;
      
      // Adjust entities constraints
      if (this.background) this.background.resize(this.width, this.height);
      if (this.player) this.player.resize(this.groundY);
      if (this.raycaster) this.raycaster.resize(this.width, this.height);
    };

    window.addEventListener('resize', handleResize);
    // Double trigger resize to ensure parent CSS margins have fully rendered
    setTimeout(handleResize, 100);
    setTimeout(handleResize, 500);
  }

  loadHighscoreAndStats() {
    this.hud.globalHiScore.innerText = String(Math.floor(window.CyberStorage.getHighScore())).padStart(5, '0');
    this.hud.globalGems.innerText = window.CyberStorage.getGems();
    
    const isMuted = !window.CyberStorage.isAudioEnabled();
    this.updateMuteButtonUI(isMuted);
    window.CyberAudio.setMute(isMuted);

    const isRtEnabled = window.CyberStorage.isRayTracingEnabled();
    this.updateRayTracingButtonUI(isRtEnabled);

    this.updateHeaderProfileBadge();
  }

  updateMuteButtonUI(isMuted) {
    if (this.buttons.mute) {
      this.buttons.mute.innerHTML = isMuted ? '<span>🔇</span>' : '<span>🔊</span>';
      this.buttons.mute.classList.toggle('muted', isMuted);
    }
  }

  updateRayTracingButtonUI(isEnabled) {
    if (this.buttons.rt) {
      this.buttons.rt.classList.toggle('active-setting', isEnabled);
    }
  }

  // --- 2. INPUT HANDLERS & LISTENERS ---

  setupInputListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return; // Prevent double-triggering hold keys
      
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.triggerPlayerJump();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.triggerPlayerSlide(true);
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.triggerPauseToggle();
      }
      if (e.code === 'KeyD') {
        this.debugMode = !this.debugMode; // Toggle hitbox outlines
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.triggerPlayerSlide(false);
      }
    });

    // Mobile split-screen tap zones
    window.addEventListener('touchstart', (e) => {
      // Ignore clicks on buttons/cards
      if (e.target.closest('button') || e.target.closest('.skin-item') || e.target.closest('.theme-card')) return;
      if (this.state !== 'PLAYING') return;

      const touch = e.changedTouches[0];
      if (touch.clientX < window.innerWidth / 2) {
        // LEFT HALF -> JUMP
        this.triggerPlayerJump();
      } else {
        // RIGHT HALF -> SLIDE
        this.triggerPlayerSlide(true);
        this.rightTouchId = touch.identifier;
      }
    });

    window.addEventListener('touchend', (e) => {
      if (this.state !== 'PLAYING') return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.rightTouchId) {
          this.triggerPlayerSlide(false);
          this.rightTouchId = null;
        }
      }
    });

    window.addEventListener('touchcancel', (e) => {
      if (this.state !== 'PLAYING') return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.rightTouchId) {
          this.triggerPlayerSlide(false);
          this.rightTouchId = null;
        }
      }
    });

    // Mobile Portrait warning lock overlay triggers
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      if (this.screens.portraitLock) {
        this.screens.portraitLock.classList.toggle('active', isPortrait);
      }
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation(); // Initial check

    // Standard Buttons Click binds
    this.buttons.play.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.startRun();
    });
    this.buttons.shopToggle.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.switchScreen('shop');
    });
    this.buttons.shopClose.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.switchScreen('menu');
    });
    this.buttons.creditsToggle.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.switchScreen('credits');
    });
    this.buttons.creditsClose.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.switchScreen('menu');
    });
    this.buttons.resume.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.resumeRun();
    });
    this.buttons.pauseRestart.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.startRun();
    });
    this.buttons.pauseMenu.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.quitToMenu();
    });
    this.buttons.restart.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.startRun();
    });
    this.buttons.goShop.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.switchScreen('shop');
    });
    this.buttons.goMenu.addEventListener('click', () => {
      window.CyberAudio.playClick();
      this.quitToMenu();
    });
    this.buttons.mute.addEventListener('click', () => {
      const isMuted = window.CyberAudio.toggleMute();
      window.CyberStorage.setAudioEnabled(!isMuted);
      this.updateMuteButtonUI(isMuted);
    });
    this.buttons.rt.addEventListener('click', () => {
      window.CyberAudio.playClick();
      const nextState = !window.CyberStorage.isRayTracingEnabled();
      window.CyberStorage.setRayTracingEnabled(nextState);
      this.updateRayTracingButtonUI(nextState);
    });
    this.buttons.theme.addEventListener('click', () => {
      this.cycleTheme();
    });
    if (this.buttons.fullscreen) {
      this.buttons.fullscreen.addEventListener('click', () => {
        window.CyberAudio.playClick();
        this.toggleFullscreen();
      });
    }

    // Theme Picker listeners
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const theme = card.getAttribute('data-theme');
        window.CyberStorage.setActiveTheme(theme);
        this.updateActiveThemeStyle(theme);
        
        // Update active class
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        window.CyberAudio.playClick();
      });
    });


    // Rankings Overlays triggers
    if (this.buttons.leaderboardToggle) {
      this.buttons.leaderboardToggle.addEventListener('click', () => {
        window.CyberAudio.playClick();
        this.switchScreen('leaderboard');
      });
    }
    if (this.buttons.leaderboardClose) {
      this.buttons.leaderboardClose.addEventListener('click', () => {
        window.CyberAudio.playClick();
        this.switchScreen('menu');
      });
    }

    // Shop tabs togglers
    this.buttons.tabSkins.addEventListener('click', () => {
      this.activeTab = 'skins';
      this.buttons.tabSkins.classList.add('active');
      this.buttons.tabTrails.classList.remove('active');
      this.screens.shopSkinsSection.classList.add('active-tab-content');
      this.screens.shopTrailsSection.classList.remove('active-tab-content');
      this.renderShopSkins();
      window.CyberAudio.playClick();
    });

    this.buttons.tabTrails.addEventListener('click', () => {
      this.activeTab = 'trails';
      this.buttons.tabSkins.classList.remove('active');
      this.buttons.tabTrails.classList.add('active');
      this.screens.shopSkinsSection.classList.remove('active-tab-content');
      this.screens.shopTrailsSection.classList.add('active-tab-content');
      this.renderShopTrails();
      window.CyberAudio.playClick();
    });

    this.setupFullscreenListener();
  }

  cycleTheme() {
    window.CyberAudio.playClick();
    const themes = ['neon-sunset', 'laser-green', 'frozen-grid', 'cyber-gold'];
    const currentTheme = window.CyberStorage.getActiveTheme();
    let index = themes.indexOf(currentTheme);
    if (index === -1) index = 0;
    
    const nextTheme = themes[(index + 1) % themes.length];
    window.CyberStorage.setActiveTheme(nextTheme);
    this.updateActiveThemeStyle(nextTheme);
    
    // Update theme card active styles in shop to keep UI fully in sync
    document.querySelectorAll('.theme-card').forEach(card => {
      const themeAttr = card.getAttribute('data-theme');
      card.classList.toggle('active', themeAttr === nextTheme);
    });
  }

  toggleFullscreen() {
    const doc = window.document;
    const docEl = doc.documentElement;

    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    const isFullscreen = !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);

    if (!isFullscreen) {
      if (requestFullScreen) {
        requestFullScreen.call(docEl).catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    } else {
      if (cancelFullScreen) {
        cancelFullScreen.call(doc);
      }
    }
  }

  setupFullscreenListener() {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
      
      if (this.buttons.fullscreen) {
        this.buttons.fullscreen.classList.toggle('active-setting', isFullscreen);
        const iconSpan = this.buttons.fullscreen.querySelector('.icon-fullscreen');
        if (iconSpan) {
          iconSpan.innerHTML = isFullscreen ? '🗗' : '⛶';
        }
        this.buttons.fullscreen.setAttribute('title', isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen');
        this.buttons.fullscreen.setAttribute('aria-label', isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  }

  updateActiveThemeStyle(themeId) {
    document.body.className = ''; // Wipe themes classes
    document.body.classList.add(`${themeId}-theme`);
  }

  triggerPlayerJump() {
    if (this.state === 'PLAYING') {
      this.player.jump();
    }
  }

  triggerPlayerSlide(isActive) {
    if (this.state === 'PLAYING') {
      this.player.slide(isActive);
    }
  }

  triggerPauseToggle() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.overStats.pauseScore.innerText = Math.floor(this.score);
      this.screens.pause.classList.add('active');
    } else if (this.state === 'PAUSED') {
      this.resumeRun();
    }
  }

  // --- 3. RUNTIME OPERATION SCREENS ---

  switchScreen(screenName) {
    // Deactivate all overlays
    Object.values(this.screens).forEach(scr => {
      if (scr) scr.classList.remove('active');
    });
    
    // Activate target
    if (screenName === 'menu') {
      this.state = 'MENU';
      this.screens.menu.classList.add('active');
      this.updateMenuPreviewCard();
      this.loadHighscoreAndStats();
    } else if (screenName === 'shop') {
      this.state = 'SHOP';
      this.screens.shop.classList.add('active');
      
      // Default to skins tab on entry
      this.activeTab = 'skins';
      this.buttons.tabSkins.classList.add('active');
      this.buttons.tabTrails.classList.remove('active');
      this.screens.shopSkinsSection.classList.add('active-tab-content');
      this.screens.shopTrailsSection.classList.remove('active-tab-content');
      this.renderShopSkins();
    } else if (screenName === 'credits') {
      this.screens.credits.classList.add('active');
    } else if (screenName === 'leaderboard') {
      this.state = 'LEADERBOARD';
      this.screens.leaderboard.classList.add('active');
      this.renderLeaderboardTable();
    } else if (screenName === 'register') {
      this.state = 'REGISTER';
      this.screens.register.classList.add('active');
    }
  }

  updateMenuPreviewCard() {
    const skin = window.CyberStorage.getActiveSkin();
    this.overStats.activeSkinName.innerText = skin.name;
    this.overStats.activeSkinDesc.innerText = skin.desc;
  }

  startRun() {
    this.state = 'PLAYING';
    
    // Clear overlay screens
    Object.values(this.screens).forEach(scr => {
      if (scr && scr.id !== 'portrait-lock-overlay') scr.classList.remove('active');
    });
    this.screens.hud.classList.add('active');
    
    // Reset configurations
    this.currentSpeed = this.baseSpeed;
    this.distance = 0;
    this.score = 0;
    this.gemsThisRun = 0;
    
    this.obstacleTimer = 0;
    this.obstacleNextSpawn = 1200;
    this.gemTimer = 0;
    
    // Reset active power-ups and pools
    this.powerups = { shield: 0, magnet: 0, boost: 0 };
    this.powerupSpawnTimer = 0;
    this.powerupsPool = [];
    this.isInvulnerable = false;
    
    // Purge entity pools
    this.obstacles = [];
    this.collectibles = [];
    this.particles.clear();
    
    this.player.equipSkin(window.CyberStorage.getActiveSkin());
    this.player.state = 'RUNNING';
    this.player.y = this.groundY - this.player.height;
    this.player.vy = 0;
  }

  resumeRun() {
    this.state = 'PLAYING';
    this.screens.pause.classList.remove('active');
    this.screens.hud.classList.add('active');
  }

  quitToMenu() {
    if (this.gemsThisRun > 0) {
      window.CyberStorage.addGems(this.gemsThisRun);
      this.gemsThisRun = 0;
      window.CyberAuth.syncProgress().catch(console.warn);
    }
    this.switchScreen('menu');
  }

  handlePlayerCrash() {
    this.state = 'GAMEOVER';
    this.screens.hud.classList.remove('active');
    
    // Trigger physical explosion particles
    const skin = window.CyberStorage.getActiveSkin();
    this.particles.spawnCrashExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      skin.colors.body,
      skin.colors.glow
    );
    
    this.player.crash();
    
    // Sync statistics
    const isNewRecord = window.CyberStorage.updateHighScore(this.score);
    window.CyberStorage.addGems(this.gemsThisRun);
    
    // Trigger transparent score upload to db Rankings
    window.CyberAuth.syncProgress().catch(console.warn);
    
    // Update GameOver screen data
    this.overStats.distance.innerText = Math.floor(this.distance);
    this.overStats.score.innerText = String(Math.floor(this.score)).padStart(5, '0');
    this.overStats.gems.innerText = this.gemsThisRun;
    
    this.overStats.highScoreBadge.style.display = isNewRecord ? 'block' : 'none';
    this.loadHighscoreAndStats(); // refresh globals
    
    setTimeout(() => {
      if (this.state === 'GAMEOVER') {
        this.screens.gameover.classList.add('active');
      }
    }, 900);
  }

  // --- 4. PROCEDURAL SPANNING ENGINE ---

  spawnObstacleProcedural() {
    const obstacleTypes = ['LASER_WALL'];
    if (this.score > 200) obstacleTypes.push('DRONE');
    if (this.score > 500) obstacleTypes.push('SHIELD_BARRIER');
    
    const index = Math.floor(Math.random() * obstacleTypes.length);
    const type = obstacleTypes[index];
    
    this.obstacles.push(new window.Obstacle(this.canvas, type, this.currentSpeed));
  }

  spawnCollectibleLine() {
    const shapes = ['LINE', 'ARC', 'SINGLE'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    const count = shape === 'SINGLE' ? 1 : Math.floor(Math.random() * 3) + 3;
    const startX = this.width + 50;
    const heightLevels = [this.groundY - 15, this.groundY - 45, this.groundY - 80];
    
    if (shape === 'SINGLE') {
      const y = heightLevels[Math.floor(Math.random() * 2)];
      this.collectibles.push(new window.Collectible(this.canvas, startX, y, this.currentSpeed));
    } else if (shape === 'LINE') {
      const y = heightLevels[Math.floor(Math.random() * heightLevels.length)];
      for (let i = 0; i < count; i++) {
        this.collectibles.push(new window.Collectible(this.canvas, startX + i * 36, y, this.currentSpeed));
      }
    } else if (shape === 'ARC') {
      const baseY = heightLevels[1];
      for (let i = 0; i < count; i++) {
        const theta = (i / (count - 1)) * Math.PI;
        const y = baseY - Math.sin(theta) * 35;
        this.collectibles.push(new window.Collectible(this.canvas, startX + i * 36, y, this.currentSpeed));
      }
    }
  }

  activatePowerUp(type) {
    this.powerups[type] = this.powerupDurations[type];
    window.CyberAudio.playUnlock(); // Play nice trigger chime
    
    // Spawn tiny activation trail sparkles around cat
    const skin = window.CyberStorage.getActiveSkin();
    this.particles.spawnGemCollect(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      type === 'shield' ? '#00f0ff' : (type === 'magnet' ? '#ff007f' : '#ffd700')
    );
  }

  // --- 5. SHOP RENDERS & TRANSACTIONS ---

  renderShopSkins() {
    const grid = document.getElementById('skins-grid');
    if (!grid) return;
    
    const skins = window.CyberStorage.getSkins();
    grid.innerHTML = '';
    
    skins.forEach(skin => {
      const card = document.createElement('div');
      card.className = `skin-item ${skin.equipped ? 'equipped' : ''}`;
      card.setAttribute('data-id', skin.id);
      
      let priceMarkup = '';
      if (skin.equipped) {
        priceMarkup = '<span class="equipped-tag">ACTIVE IN SLOT</span>';
      } else if (skin.unlocked) {
        priceMarkup = '<span class="equipped-tag" style="color:var(--accent-color)">COMPATIBLE</span>';
      } else {
        priceMarkup = `<span class="skin-price">💎 ${skin.cost} GEMS</span>`;
      }

      card.innerHTML = `
        <div class="skin-thumb">
          <canvas class="shop-thumb-canvas" width="60" height="60" data-id="${skin.id}"></canvas>
        </div>
        <div class="skin-details">
          <h4>${skin.name}</h4>
          <p>${skin.desc}</p>
          ${priceMarkup}
        </div>
      `;

      card.addEventListener('click', () => this.handleSkinClick(skin));
      grid.appendChild(card);
      
      const canvas = card.querySelector('.shop-thumb-canvas');
      this.drawSkinThumbnail(canvas, skin);
    });
  }

  drawSkinThumbnail(canvas, skin) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,60,60);
    
    ctx.save();
    ctx.fillStyle = skin.colors.body;
    ctx.strokeStyle = skin.colors.glow;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = skin.colors.glow;
    ctx.shadowBlur = 4;
    
    ctx.beginPath();
    ctx.arc(30, 32, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(20, 15);
    ctx.lineTo(28, 23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(38, 26);
    ctx.lineTo(40, 15);
    ctx.lineTo(32, 23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = skin.colors.visor;
    ctx.shadowColor = skin.colors.visor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(28, 28, 10, 5, 1);
    ctx.fill();
    
    ctx.restore();
  }

  handleSkinClick(skin) {
    if (skin.equipped) return;

    if (skin.unlocked) {
      window.CyberStorage.equipSkin(skin.id);
      window.CyberAudio.playClick();
      this.player.equipSkin(skin);
      this.renderShopSkins();
    } else {
      const gems = window.CyberStorage.getGems();
      if (gems >= skin.cost) {
        const res = window.CyberStorage.unlockSkin(skin.id);
        if (res.success) {
          window.CyberAudio.playUnlock();
          window.CyberStorage.equipSkin(skin.id);
          this.player.equipSkin(skin);
          this.loadHighscoreAndStats();
          this.renderShopSkins();
          window.CyberAuth.syncProgress().catch(console.warn);
        }
      } else {
        window.CyberAudio.playClick();
        const activeCard = document.querySelector(`.skin-item[data-id="${skin.id}"]`);
        activeCard?.classList.add('animate-pulse');
        setTimeout(() => activeCard?.classList.remove('animate-pulse'), 500);
      }
    }
  }

  renderShopTrails() {
    const grid = this.hud.trailsGrid;
    if (!grid) return;
    
    const trails = window.CyberStorage.getTrails();
    grid.innerHTML = '';
    
    trails.forEach(trail => {
      const card = document.createElement('div');
      card.className = `skin-item ${trail.equipped ? 'equipped' : ''}`;
      card.setAttribute('data-id', trail.id);
      
      let priceMarkup = '';
      if (trail.equipped) {
        priceMarkup = '<span class="equipped-tag">ACTIVE IN SLOT</span>';
      } else if (trail.unlocked) {
        priceMarkup = '<span class="equipped-tag" style="color:var(--accent-color)">COMPATIBLE</span>';
      } else {
        priceMarkup = `<span class="skin-price">💎 ${trail.cost} GEMS</span>`;
      }

      card.innerHTML = `
        <div class="skin-thumb" style="display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,0.3)">
          <span style="font-size:24px">${this.getTrailSymbol(trail.id)}</span>
        </div>
        <div class="skin-details">
          <h4>${trail.name}</h4>
          <p>${trail.desc}</p>
          ${priceMarkup}
        </div>
      `;

      card.addEventListener('click', () => this.handleTrailClick(trail));
      grid.appendChild(card);
    });
  }

  getTrailSymbol(id) {
    if (id === 'exhaust-default') return '🔥';
    if (id === 'trail-sparkles') return '✨';
    if (id === 'trail-rainbow') return '🌈';
    if (id === 'trail-matrix') return '👾';
    return '🔥';
  }

  handleTrailClick(trail) {
    if (trail.equipped) return;

    if (trail.unlocked) {
      window.CyberStorage.equipTrail(trail.id);
      window.CyberAudio.playClick();
      this.renderShopTrails();
    } else {
      const gems = window.CyberStorage.getGems();
      if (gems >= trail.cost) {
        const res = window.CyberStorage.unlockTrail(trail.id);
        if (res.success) {
          window.CyberAudio.playUnlock();
          window.CyberStorage.equipTrail(trail.id);
          this.loadHighscoreAndStats();
          this.renderShopTrails();
          window.CyberAuth.syncProgress().catch(console.warn);
        }
      } else {
        window.CyberAudio.playClick();
        const activeCard = document.querySelector(`.skin-item[data-id="${trail.id}"]`);
        activeCard?.classList.add('animate-pulse');
        setTimeout(() => activeCard?.classList.remove('animate-pulse'), 500);
      }
    }
  }

  // --- 6. CORE 60FPS GAME LOOP ---

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));
    
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    if (deltaTime > 100) deltaTime = 16.6;

    this.calculateFPS(currentTime);

    if (this.state === 'PLAYING') {
      this.updatePlaying(deltaTime, currentTime);
    } else if (this.state === 'MENU') {
      this.updateMenuPassiveScroll(deltaTime);
    }
    
    this.draw();
  }

  calculateFPS(currentTime) {
    this.fpsCount++;
    if (currentTime - this.fpsLastTime >= 1000) {
      if (this.hud.fps) {
        this.hud.fps.innerText = `${this.fpsCount} FPS`;
      }
      this.fpsCount = 0;
      this.fpsLastTime = currentTime;
    }
  }

  updatePlaying(deltaTime, currentTime) {
    // Dynamic Speed Calculations
    if (this.currentSpeed < this.maxSpeed) {
      this.currentSpeed += this.acceleration * deltaTime;
    }
    
    const limitBreak = this.currentSpeed > 10.5;
    this.hud.warningFlash.classList.toggle('active', limitBreak);

    // Apply booster speed score rate
    const scoreRate = this.powerups.boost > 0 ? 2.0 : 1.0;
    this.distance += (this.currentSpeed * 0.05 * scoreRate) * (deltaTime / 16.6);
    this.score = this.distance * 1.25;
    
    // Update Score display
    this.hud.score.innerText = String(Math.floor(this.score)).padStart(5, '0');
    this.hud.multiplier.innerText = `${(this.currentSpeed / this.baseSpeed).toFixed(1)}x`;
    this.hud.gems.innerText = `💎 ${this.gemsThisRun}`;

    // Update Parallax Skyline
    this.background.update(this.currentSpeed, deltaTime);

    // Update Player & generate CUSTOM particle trails based on Equipped trail selection
    this.player.update(deltaTime);
    
    const skin = window.CyberStorage.getActiveSkin();
    const trail = window.CyberStorage.getActiveTrail();
    
    if (this.player.state === 'RUNNING') {
      this.particles.spawnRunDust(this.player.x + 8, this.groundY - 3, skin.colors.glow);
    }
    
    // Trail particles hook (Classic exhaust only JUMPS, premium trails spawn CONTINUOUSLY!)
    const isJumping = (this.player.state === 'JUMPING' || this.player.state === 'DOUBLE_JUMPING');
    const isBoosting = this.powerups.boost > 0;
    
    if (isJumping || isBoosting || (trail.id !== 'exhaust-default' && this.player.state === 'RUNNING')) {
      const px = this.player.x + (this.player.state === 'SLIDING' ? 4 : 20);
      const py = this.player.y + (this.player.state === 'SLIDING' ? 16 : 14);
      
      if (trail.id === 'exhaust-default') {
        this.particles.spawnJetpackFlame(px, py, skin.colors.visor);
      } else if (trail.id === 'trail-sparkles') {
        this.particles.spawnTrailSparkles(px, py);
      } else if (trail.id === 'trail-rainbow') {
        this.particles.spawnTrailRainbow(px, py, currentTime * 0.001);
      } else if (trail.id === 'trail-matrix') {
        this.particles.spawnTrailMatrix(px, py);
      }
    }

    // Spawn Obstacles
    this.obstacleTimer += deltaTime;
    if (this.obstacleTimer >= this.obstacleNextSpawn) {
      this.spawnObstacleProcedural();
      this.obstacleTimer = 0;
      this.obstacleNextSpawn = this.obstacleMinInterval + Math.random() * this.obstacleVarInterval - (this.currentSpeed * 30);
    }

    // Spawn Gems
    this.gemTimer += deltaTime;
    if (this.gemTimer >= this.gemInterval) {
      if (Math.random() > 0.4 && this.obstacles.every(obs => obs.x < this.width + 100)) {
        this.spawnCollectibleLine();
      }
      this.gemTimer = 0;
    }

    // Spawn Power-up Capsules (Rare)
    this.powerupSpawnTimer += deltaTime;
    if (this.powerupSpawnTimer >= this.powerupSpawnInterval) {
      if (Math.random() > 0.45 && this.obstacles.every(obs => obs.x < this.width + 100)) {
        const types = ['shield', 'magnet', 'boost'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        this.powerupsPool.push(new window.PowerUp(this.canvas, randomType, this.currentSpeed));
      }
      this.powerupSpawnTimer = 0;
    }

    const playerHitbox = this.player.getHitbox();
    
    // Update active power-up timers
    Object.keys(this.powerups).forEach(key => {
      if (this.powerups[key] > 0) {
        this.powerups[key] -= deltaTime;
        if (this.powerups[key] < 0) this.powerups[key] = 0;
      }
    });
    this.updatePowerupsHUD();

    // Update floating power-ups
    this.powerupsPool.forEach(pu => {
      pu.update(this.currentSpeed, deltaTime);
      if (!pu.collected && this.checkCollision(playerHitbox, pu.getHitbox())) {
        pu.collected = true;
        this.activatePowerUp(pu.type);
      }
    });
    this.powerupsPool = this.powerupsPool.filter(pu => !pu.collected && !pu.isOffscreen());

    // Update Obstacles & resolve shield absorption crash buffers
    this.obstacles.forEach(obs => {
      obs.update(this.currentSpeed, deltaTime);
      
      if (this.checkCollision(playerHitbox, obs.getHitbox())) {
        if (this.powerups.shield > 0) {
          // Consume Shield
          this.powerups.shield = 0;
          this.particles.spawnShieldShatter(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2
          );
          window.CyberAudio.playCrash(); // Shatter sound
          obs.x = -200; // dispose obstacle offscreen
          this.triggerInvulnerabilityFrame();
        } else if (!this.isInvulnerable) {
          this.handlePlayerCrash();
        }
      }
    });
    this.obstacles = this.obstacles.filter(obs => !obs.isOffscreen());

    // Update Collectibles & Magnet pull checking
    this.collectibles.forEach(gem => {
      if (this.powerups.magnet > 0) {
        gem.isMagnetized = true;
      }
      gem.update(this.currentSpeed, this.player, deltaTime);
      
      if (!gem.collected && this.checkCollision(playerHitbox, gem.getHitbox())) {
        gem.collected = true;
        
        // Double reward if score boost is active
        const increment = this.powerups.boost > 0 ? 2 : 1;
        this.gemsThisRun += increment;
        
        window.CyberAudio.playGem();
        this.particles.spawnGemCollect(
          gem.x + gem.width / 2, 
          gem.y + gem.height / 2,
          skin.colors.visor
        );
      }
    });
    this.collectibles = this.collectibles.filter(gem => !gem.collected && !gem.isOffscreen());

    // Update Particle lists
    this.particles.update(deltaTime);
    
    // --- DYNAMIC 2D NEON RAY TRACING ENGINE INTEGRATION ---
    if (this.raycaster && window.CyberStorage.isRayTracingEnabled()) {
      // 1. Clear offscreen lightmap canvas
      this.raycaster.clear();
      
      // 2. Gather segments from the player and active screen obstacles
      const segments = [];
      if (this.player.state !== 'CRASHED') {
        segments.push(...this.player.getShadowSegments());
      }
      this.obstacles.forEach(obs => {
        if (obs.x + obs.width > 0 && obs.x < this.width) {
          segments.push(...obs.getShadowSegments());
        }
      });
      
      // 3. Collect active light sources candidates
      const lights = [];
      const isJumping = (this.player.state === 'JUMPING' || this.player.state === 'DOUBLE_JUMPING');
      const isBoosting = this.powerups.boost > 0;
      
      // Player Visor Light (attached to sleek visor offset coordinates)
      if (this.player.state !== 'CRASHED') {
        const visorX = this.player.x + (this.player.state === 'SLIDING' ? this.player.width * 0.81 : this.player.width * 0.79);
        const visorY = this.player.y + (this.player.state === 'SLIDING' ? 11 : 16);
        lights.push(new window.LightSource(visorX, visorY, 150, this.player.skinColors.visor, 0.75, true));
      }
      
      // Player Thruster Light (attached to double jump / boost engine exhaust)
      if (this.player.state !== 'CRASHED' && (isJumping || isBoosting)) {
        const px = this.player.x + (this.player.state === 'SLIDING' ? 4 : 20);
        const py = this.player.y + (this.player.state === 'SLIDING' ? 16 : 14);
        lights.push(new window.LightSource(px, py, 170, this.player.skinColors.glow, 0.7, false));
      }
      
      // Obstacle Lights (limit to first 2 active obstacles on screen)
      const screenObstacles = this.obstacles
        .filter(obs => obs.x + obs.width > 0 && obs.x < this.width)
        .sort((a, b) => a.x - b.x);
        
      screenObstacles.slice(0, 2).forEach(obs => {
        const cx = obs.x + obs.width / 2;
        const cy = obs.y + obs.height / 2;
        lights.push(new window.LightSource(cx, cy, obs.type === 'LASER_WALL' ? 190 : 150, obs.glowColor, 0.6, true));
      });
      
      // Gem Lights (limit to closest 1 active gem on screen)
      const screenGems = this.collectibles
        .filter(gem => !gem.collected && gem.x + gem.width > 0 && gem.x < this.width)
        .sort((a, b) => a.x - b.x);
        
      if (screenGems.length > 0) {
        const gem = screenGems[0];
        const cx = gem.x + gem.width / 2;
        const cy = gem.y + gem.height / 2;
        lights.push(new window.LightSource(cx, cy, 110, '#00f0ff', 0.55, true));
      }
      
      // 4. Render active raymarched visibility lights onto offscreen lightmap
      const activeLights = lights.slice(0, 4); // Peak concurrent cap for 60 FPS safety
      activeLights.forEach(light => {
        light.update(currentTime * 0.001);
        this.raycaster.drawLightSource(light, segments);
      });
    }
  }

  triggerInvulnerabilityFrame() {
    this.isInvulnerable = true;
    let flash = 0;
    const interval = setInterval(() => {
      if (this.state !== 'PLAYING') {
        clearInterval(interval);
        this.isInvulnerable = false;
        return;
      }
      flash++;
      // Render translucent flashes
      this.ctx.globalAlpha = flash % 2 === 0 ? 0.35 : 0.85;
      if (flash > 8) {
        clearInterval(interval);
        this.isInvulnerable = false;
        this.ctx.globalAlpha = 1.0;
      }
    }, 120);
  }

  updatePowerupsHUD() {
    if (!this.hud.powerupsList) return;
    this.hud.powerupsList.innerHTML = '';
    
    Object.keys(this.powerups).forEach(key => {
      const duration = this.powerups[key];
      if (duration > 0) {
        const badge = document.createElement('div');
        badge.className = `powerup-badge badge-${key}`;
        
        let name = 'SHIELD';
        let icon = '🛡️';
        let color = '#00f0ff';
        if (key === 'magnet') { name = 'MAGNET'; icon = '🧲'; color = '#ff007f'; }
        if (key === 'boost') { name = 'BOOST'; icon = '⚡'; color = '#ffd700'; }
        
        const max = this.powerupDurations[key];
        const percent = (duration / max) * 100;
        
        badge.innerHTML = `
          <span class="pu-icon">${icon}</span>
          <div class="pu-progress-wrapper">
            <span class="pu-name">${name}</span>
            <div class="pu-bar-container">
              <div class="pu-bar-fill" style="width: ${percent}%; background-color: ${color}"></div>
            </div>
          </div>
        `;
        this.hud.powerupsList.appendChild(badge);
      }
    });
  }

  updateMenuPassiveScroll(deltaTime) {
    this.background.update(this.baseSpeed * 0.4, deltaTime);
    this.particles.update(deltaTime);
    
    this.menuSpriteTime += deltaTime * 0.015;
    this.drawMenuSpriteThumbnail();
  }

  drawMenuSpriteThumbnail() {
    if (!this.menuSpriteCtx || !this.menuSpriteCanvas) return;
    const ctx = this.menuSpriteCtx;
    ctx.clearRect(0, 0, 120, 80);
    
    const skin = window.CyberStorage.getActiveSkin();
    
    ctx.save();
    
    const cx = 24;
    const cy = 20;
    const w = 72;
    const h = 48;
    
    const cycle = this.menuSpriteTime;
    const lOffset1 = Math.sin(cycle * 6.5) * 8;
    const lOffset2 = -Math.sin(cycle * 6.5) * 8;
    
    if (Math.random() > 0.6) {
      ctx.beginPath();
      const fire = ctx.createLinearGradient(cx + 16, cy + 12, cx - 15, cy + 24);
      fire.addColorStop(0, '#ffffff');
      fire.addColorStop(0.5, skin.colors.glow);
      fire.addColorStop(1, 'transparent');
      ctx.fillStyle = fire;
      ctx.beginPath();
      ctx.moveTo(cx + 20, cy + 8);
      ctx.lineTo(cx - 20, cy + 16);
      ctx.lineTo(cx + 20, cy + 24);
      ctx.fill();
    }

    ctx.fillStyle = skin.colors.body;
    ctx.strokeStyle = skin.colors.glow;
    ctx.lineWidth = 2.5;
    
    ctx.shadowColor = skin.colors.glow;
    ctx.shadowBlur = 8;
    
    // Torso
    ctx.beginPath();
    ctx.roundRect(cx + 8, cy + 12, w - 24, h - 22, 12);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(cx + w * 0.72, cy + 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.64, cy + 10);
    ctx.lineTo(cx + w * 0.68, cy - 2);
    ctx.lineTo(cx + w * 0.73, cy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.72, cy + 9);
    ctx.lineTo(cx + w * 0.76, cy - 3);
    ctx.lineTo(cx + w * 0.81, cy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Visor
    ctx.fillStyle = skin.colors.visor;
    ctx.shadowColor = skin.colors.visor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(cx + w * 0.74, cy + 13, 11, 7, 2);
    ctx.fill();
    
    // Jetpack
    ctx.fillStyle = '#222227';
    ctx.strokeStyle = skin.colors.visor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx + 16, cy + 3, 24, 11, 3);
    ctx.fill();
    ctx.stroke();
    
    // Legs running
    ctx.strokeStyle = skin.colors.body;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.65, cy + h - 12);
    ctx.lineTo(cx + w * 0.65 + lOffset1, cy + h - 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + w * 0.52, cy + h - 12);
    ctx.lineTo(cx + w * 0.52 + lOffset2, cy + h - 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 26, cy + h - 12);
    ctx.lineTo(cx + 26 + lOffset2, cy + h - 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 16, cy + h - 12);
    ctx.lineTo(cx + 16 + lOffset1, cy + h - 2);
    ctx.stroke();

    ctx.restore();
  }

  checkCollision(r1, r2) {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  }

  // --- 7. CANVAS RENDER ROUTINES ---

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.background.draw(window.CyberStorage.getActiveTheme());
    
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const groundY = this.groundY;
    
    let floorColor = '#ff007f';
    let accentGlow = '#00f0ff';
    const activeTheme = window.CyberStorage.getActiveTheme();
    if (activeTheme === 'laser-green') { floorColor = '#39ff14'; accentGlow = '#0088ff'; }
    if (activeTheme === 'frozen-grid') { floorColor = '#00f5ff'; accentGlow = '#bd00ff'; }
    if (activeTheme === 'cyber-gold') { floorColor = '#ffd700'; accentGlow = '#ff003c'; }

    ctx.save();
    ctx.strokeStyle = floorColor;
    ctx.lineWidth = 3.5;
    
    drawGlow(ctx, floorColor, 15, () => {
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();
    });

    ctx.strokeStyle = accentGlow;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 4);
    ctx.lineTo(w, groundY + 4);
    ctx.stroke();
    ctx.restore();

    // Render pools
    this.collectibles.forEach(gem => gem.draw());
    this.powerupsPool.forEach(pu => pu.draw());
    this.obstacles.forEach(obs => obs.draw());
    
    if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'GAMEOVER') {
      this.player.draw();
    }
    
    // Blend dynamic 2D neon ray-traced lighting overlay
    if (this.raycaster && window.CyberStorage.isRayTracingEnabled() && (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'GAMEOVER')) {
      this.raycaster.blendLightmap(this.ctx);
    }
    
    this.particles.draw();

    // Debug bounds
    if (this.debugMode) {
      ctx.save();
      ctx.lineWidth = 1;
      
      const pHit = this.player.getHitbox();
      ctx.strokeStyle = '#39ff14';
      ctx.strokeRect(pHit.x, pHit.y, pHit.width, pHit.height);
      
      ctx.strokeStyle = '#ff003c';
      this.obstacles.forEach(obs => {
        const oHit = obs.getHitbox();
        ctx.strokeRect(oHit.x, oHit.y, oHit.width, oHit.height);
      });
      
      ctx.strokeStyle = '#00f0ff';
      this.collectibles.forEach(gem => {
        const gHit = gem.getHitbox();
        ctx.strokeRect(gHit.x, gHit.y, gHit.width, gHit.height);
      });
      
      ctx.strokeStyle = '#ffd700';
      this.powerupsPool.forEach(pu => {
        const pHit = pu.getHitbox();
        ctx.strokeRect(pHit.x, pHit.y, pHit.width, pHit.height);
      });

      ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
      ctx.font = '10px Courier New';
      ctx.fillText(`OBSTACLES: ${this.obstacles.length}`, 15, 105);
      ctx.fillText(`PARTICLES: ${this.particles.particles.length}`, 15, 120);
      ctx.fillText(`POWERUPS : ${this.powerupsPool.length}`, 15, 135);
      ctx.restore();
    }
  }

  // --- 7. NEW CYBER CREDENTIALS & RANKINGS SYSTEM CONTROLLERS ---

  updateHeaderProfileBadge() {
    const badge = document.getElementById('header-profile-badge');
    const usernameEl = document.getElementById('header-username');
    const secureBtn = document.getElementById('btn-header-secure');

    if (!badge) return;

    if (window.CyberStorage.data.isRegistered) {
      badge.style.display = 'inline-flex';
      usernameEl.innerText = window.CyberStorage.data.username;
      
      if (window.CyberStorage.data.isGuest) {
        secureBtn.style.display = 'inline-block';
        badge.style.borderColor = 'rgba(255, 0, 127, 0.3)';
        usernameEl.style.color = '#ffffff';
      } else {
        secureBtn.style.display = 'none';
        badge.style.borderColor = 'rgba(57, 255, 20, 0.35)';
        usernameEl.style.color = '#39ff14';
      }
    } else {
      badge.style.display = 'none';
    }
  }

  setupAuthListeners() {
    const nextBtn = document.getElementById('btn-register-next');
    const secureBtn = document.getElementById('btn-auth-secure');
    const skipBtn = document.getElementById('btn-auth-skip');
    const submitBtn = document.getElementById('btn-auth-submit');
    const regBackBtn = document.getElementById('btn-auth-back');
    const loginSubmitBtn = document.getElementById('btn-login-submit');
    const loginBackBtn = document.getElementById('btn-login-back');
    
    const showLoginLink = document.getElementById('link-show-login');
    const choiceBackLink = document.getElementById('link-choice-back');
    const headerSecureBtn = document.getElementById('btn-header-secure');

    const nameInput = document.getElementById('input-display-name');
    const pwdInput = document.getElementById('input-password');
    const loginUser = document.getElementById('input-login-username');
    const loginPwd = document.getElementById('input-login-password');

    const switchAuthStep = (stepName) => {
      document.querySelectorAll('.auth-step').forEach(step => {
        step.classList.remove('active');
      });
      document.getElementById(`register-step-${stepName}`).classList.add('active');
    };

    // Show Login screen trigger
    if (showLoginLink) {
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.CyberAudio.playClick();
        document.getElementById('login-error-msg').innerText = '';
        switchAuthStep('login');
      });
    }

    // Login screen return trigger
    if (loginBackBtn) {
      loginBackBtn.addEventListener('click', () => {
        window.CyberAudio.playClick();
        switchAuthStep('name');
      });
    }

    // Step 1: Input Name -> Generate Handle & Choice step
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const errorEl = document.getElementById('name-error-msg');
        if (!name) {
          errorEl.innerText = 'ENTER INITIALIZATION DESIG TO INITIATE CORE';
          return;
        }
        errorEl.innerText = '';
        window.CyberAudio.playClick();

        const username = window.CyberAuth.generateCyberUsername(name);
        document.getElementById('generated-username').innerText = username;
        document.getElementById('password-target-username').innerText = username;
        
        switchAuthStep('choice');
      });
    }

    // Choice back return trigger
    if (choiceBackLink) {
      choiceBackLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.CyberAudio.playClick();
        switchAuthStep('name');
      });
    }

    // Choice Skip -> Skip & Play as Guest
    if (skipBtn) {
      skipBtn.addEventListener('click', async () => {
        window.CyberAudio.playClick();
        const displayName = nameInput.value.trim() || 'Runner';
        
        skipBtn.innerText = 'CONNECTING...';
        skipBtn.disabled = true;

        const res = await window.CyberAuth.registerGuest(displayName);
        
        skipBtn.innerText = 'SKIP & PLAY (GUEST)';
        skipBtn.disabled = false;

        if (res.success) {
          this.switchScreen('menu');
          this.loadHighscoreAndStats();
        }
      });
    }

    // Choice -> Secure core passcode screen
    if (secureBtn) {
      secureBtn.addEventListener('click', () => {
        window.CyberAudio.playClick();
        document.getElementById('register-error-msg').innerText = '';
        switchAuthStep('password');
      });
    }

    // Register Back trigger
    if (regBackBtn) {
      regBackBtn.addEventListener('click', () => {
        window.CyberAudio.playClick();
        switchAuthStep('choice');
      });
    }

    // Step 3 Submit -> Register Secure Account
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const password = pwdInput.value;
        const errorEl = document.getElementById('register-error-msg');
        if (!password || password.length < 4) {
          errorEl.innerText = 'PASSCODE KEY MUST EXCEED 3 SYMBOLS';
          return;
        }
        errorEl.innerText = '';
        window.CyberAudio.playClick();

        submitBtn.innerText = 'ENCRYPTING CORE...';
        submitBtn.disabled = true;

        const username = document.getElementById('generated-username').innerText;
        const displayName = nameInput.value.trim();

        const res = await window.CyberAuth.registerSecure(displayName, username, password);

        submitBtn.innerText = 'ENCRYPT PROFILE';
        submitBtn.disabled = false;

        if (res.success) {
          pwdInput.value = '';
          this.switchScreen('menu');
          this.loadHighscoreAndStats();
        } else {
          errorEl.innerText = res.error.toUpperCase();
        }
      };
    }

    // Step 4 Submit -> Login to Secure Account
    if (loginSubmitBtn) {
      loginSubmitBtn.addEventListener('click', async () => {
        const username = loginUser.value.trim();
        const password = loginPwd.value;
        const errorEl = document.getElementById('login-error-msg');
        
        if (!username || !password) {
          errorEl.innerText = 'CREDENTIAL FIELD INCOMPLETE';
          return;
        }
        errorEl.innerText = '';
        window.CyberAudio.playClick();

        loginSubmitBtn.innerText = 'CONNECTING CORE...';
        loginSubmitBtn.disabled = true;

        const res = await window.CyberAuth.login(username, password);

        loginSubmitBtn.innerText = 'CONNECT CORE';
        loginSubmitBtn.disabled = false;

        if (res.success) {
          loginUser.value = '';
          loginPwd.value = '';
          this.switchScreen('menu');
          this.loadHighscoreAndStats();
        } else {
          errorEl.innerText = res.error.toUpperCase();
        }
      });
    }

    // Main Menu Profile Secure button trigger -> Upgrade current Guest profile
    if (headerSecureBtn) {
      headerSecureBtn.addEventListener('click', () => {
        window.CyberAudio.playClick();
        
        const currentUsername = window.CyberStorage.data.username;
        document.getElementById('generated-username').innerText = currentUsername;
        document.getElementById('password-target-username').innerText = currentUsername;
        nameInput.value = window.CyberStorage.data.displayName;

        document.getElementById('register-error-msg').innerText = '';
        pwdInput.value = '';
        
        this.switchScreen('register');
        switchAuthStep('password');
        
        // Custom Back button context for active upgrades
        const originalRegBack = regBackBtn.onclick;
        regBackBtn.onclick = (e) => {
          e.preventDefault();
          window.CyberAudio.playClick();
          this.switchScreen('menu');
          // Restore default back click handler
          regBackBtn.onclick = originalRegBack; 
        };

        // Custom passcode encrypt button context for active upgrades
        const originalRegSubmit = submitBtn.onclick;
        submitBtn.onclick = async () => {
          const password = pwdInput.value;
          const errorEl = document.getElementById('register-error-msg');
          if (!password || password.length < 4) {
            errorEl.innerText = 'PASSCODE KEY MUST EXCEED 3 SYMBOLS';
            return;
          }
          errorEl.innerText = '';
          window.CyberAudio.playClick();

          submitBtn.innerText = 'SECURING CORE...';
          submitBtn.disabled = true;

          const res = await window.CyberAuth.upgradeGuest(password);

          submitBtn.innerText = 'ENCRYPT PROFILE';
          submitBtn.disabled = false;

          if (res.success) {
            pwdInput.value = '';
            // Restore default submit handler
            submitBtn.onclick = originalRegSubmit;
            this.switchScreen('menu');
            this.loadHighscoreAndStats();
          } else {
            errorEl.innerText = res.error.toUpperCase();
          }
        };
      });
    }
  }

  async renderLeaderboardTable() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="leaderboard-empty">CONTACTING MAINFRAME RANKINGS...</div>';

    const rankings = await window.CyberAuth.getLeaderboard();
    
    if (!rankings || rankings.length === 0) {
      listEl.innerHTML = '<div class="leaderboard-empty">RANKINGS DATABASE OFFLINE. CORE STACK EMPTY.</div>';
      return;
    }

    listEl.innerHTML = '';
    const currentUsername = window.CyberStorage.data.username;

    rankings.forEach(row => {
      const rowEl = document.createElement('div');
      
      const isSelf = row.username === currentUsername;
      const isTopRank = row.rank <= 3;
      
      rowEl.className = `leaderboard-row ${isSelf ? 'current-player' : ''} ${isTopRank ? 'rank-' + row.rank : ''}`;
      
      let rankDisplay = `#${row.rank}`;
      if (row.rank === 1) rankDisplay = '🥇 #1';
      else if (row.rank === 2) rankDisplay = '🥈 #2';
      else if (row.rank === 3) rankDisplay = '🥉 #3';

      const statusTag = row.isGuest ? ' [GUEST]' : '';

      rowEl.innerHTML = `
        <span class="rank-col">${rankDisplay}</span>
        <span class="runner-col" title="${row.username}">${row.displayName}${statusTag}</span>
        <span class="score-col font-digit">${String(row.highScore).padStart(5, '0')}</span>
        <span class="gems-col font-digit">💎 ${row.gems}</span>
      `;
      listEl.appendChild(rowEl);
    });
  }
}

// Start the engine on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.CyberEngine = new CyberGameEngine();
});
