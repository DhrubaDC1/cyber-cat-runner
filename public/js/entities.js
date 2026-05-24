/* ==========================================================================
   CYBER CAT // GAME ENTITIES & PHYSICS
   PROCEDURAL VECTOR GRAPHICS & CANVAS COLLISION MATH
   ========================================================================== */

// --- GLOBAL UTILITIES FOR VECTOR RENDERING ---
function drawGlow(ctx, color, blur, fn) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

/* ==========================================================================
   1. PARALLAX BACKGROUND SYSTEM
   ========================================================================== */
class ParallaxBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.stars = [];
    this.buildings = [];
    this.init();
  }

  init() {
    // Generate star field
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.clientWidth,
        y: Math.random() * (this.canvas.clientHeight * 0.5),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.05 + 0.01,
        brightness: Math.random() * 0.5 + 0.5
      });
    }

    // Generate parallax skyline structures
    this.buildings = [];
    // Far layer (darker, slower)
    for (let i = 0; i < 15; i++) {
      this.buildings.push({
        x: i * 110 + Math.random() * 30,
        width: Math.random() * 80 + 60,
        height: Math.random() * 150 + 100,
        speed: 0.15,
        color: 'rgba(36, 0, 70, 0.25)', // Deep Purple outline
        gridColor: 'rgba(255, 0, 127, 0.04)'
      });
    }
    // Mid layer (brighter, medium speed)
    for (let i = 0; i < 10; i++) {
      this.buildings.push({
        x: i * 180 + Math.random() * 50,
        width: Math.random() * 100 + 80,
        height: Math.random() * 100 + 60,
        speed: 0.4,
        color: 'rgba(13, 2, 33, 0.65)',
        gridColor: 'rgba(0, 240, 255, 0.08)',
        laserTrim: Math.random() > 0.5
      });
    }
  }

  resize(width, height) {
    // Reinitialize positions to fit the new aspect ratios
    this.init();
  }

  update(gameSpeed, deltaTime) {
    // Update stars
    this.stars.forEach(star => {
      star.x -= gameSpeed * star.speed * (deltaTime / 16.6);
      if (star.x < 0) star.x = this.canvas.clientWidth;
      
      // Star twinkling
      star.brightness += (Math.random() - 0.5) * 0.05;
      star.brightness = Math.max(0.3, Math.min(1, star.brightness));
    });

    // Update buildings
    this.buildings.forEach(b => {
      b.x -= gameSpeed * b.speed * (deltaTime / 16.6);
      const bWidth = b.width;
      if (b.x + bWidth < 0) {
        // Reset behind screen
        b.x = this.canvas.clientWidth + Math.random() * 40;
      }
    });
  }

  draw(themeId) {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    
    // Theme details
    let primaryGlow = '#ff007f';
    let accentGlow = '#00f0ff';
    if (themeId === 'laser-green') { primaryGlow = '#39ff14'; accentGlow = '#0088ff'; }
    if (themeId === 'frozen-grid') { primaryGlow = '#00f5ff'; accentGlow = '#bd00ff'; }
    if (themeId === 'cyber-gold') { primaryGlow = '#ffd700'; accentGlow = '#ff003c'; }

    // 1. Draw Twinkling Star Field
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(star => {
      ctx.globalAlpha = star.brightness;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;

    // 2. Draw Sun / Cyber Disc
    ctx.save();
    const sunX = w * 0.75;
    const sunY = h * 0.35;
    const sunR = Math.min(w, h) * 0.15;
    
    // Draw retro sunset bands
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sunGrad.addColorStop(0, '#ffd700');
    sunGrad.addColorStop(0.5, primaryGlow);
    sunGrad.addColorStop(1, '#1b003a');
    ctx.fillStyle = sunGrad;
    
    drawGlow(ctx, primaryGlow, 15, () => {
      ctx.fill();
    });

    // Retro lines slice
    ctx.fillStyle = '#000000';
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 1; i < 8; i++) {
      const sliceY = sunY - sunR + (sunR * 2) * (i / 8);
      const sliceH = i * 1.5;
      ctx.fillRect(sunX - sunR - 10, sliceY, sunR * 2 + 20, sliceH);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    // 3. Draw Buildings (Parallax layers)
    this.buildings.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.strokeStyle = b.gridColor;
      ctx.lineWidth = 1.5;
      
      // Draw building base structure
      ctx.beginPath();
      ctx.rect(b.x, h - b.height, b.width, b.height);
      ctx.fill();
      ctx.stroke();

      // Cyber grid lines inside the building
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x, h - b.height, b.width, b.height);
      ctx.clip();
      
      // Draw horizontal window lines
      ctx.strokeStyle = b.gridColor;
      ctx.lineWidth = 0.5;
      for (let y = h - b.height + 15; y < h; y += 12) {
        ctx.beginPath();
        ctx.moveTo(b.x, y);
        ctx.lineTo(b.x + b.width, y);
        ctx.stroke();
      }
      // Draw vertical columns
      for (let x = b.x + 15; x < b.x + b.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, h - b.height);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.restore();

      // Top glowing neon trim for medium building layers
      if (b.laserTrim) {
        ctx.strokeStyle = accentGlow;
        ctx.lineWidth = 2;
        drawGlow(ctx, accentGlow, 6, () => {
          ctx.beginPath();
          ctx.moveTo(b.x, h - b.height);
          ctx.lineTo(b.x + b.width, h - b.height);
          ctx.stroke();
        });
      }
    });

    // 4. Ground Grid Horizon Blur Blend
    const groundY = h * 0.85;
    ctx.beginPath();
    ctx.rect(0, groundY, w, h - groundY);
    const floorGrad = ctx.createLinearGradient(0, groundY, 0, h);
    floorGrad.addColorStop(0, '#000000');
    floorGrad.addColorStop(0.1, 'rgba(10,5,30,0.85)');
    floorGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = floorGrad;
    ctx.fill();
  }
}

/* ==========================================================================
   2. PLAYER (NEON CYBER CAT) ENTITY
   ========================================================================== */
class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Size and coordinate specs
    this.width = 72;
    this.height = 48;
    this.x = 80;
    this.groundY = 0; // Configured dynamically on resize
    this.y = 0;
    
    // Physics variables
    this.vy = 0;
    this.gravity = 0.95;
    this.jumpForce = -15.5;
    this.doubleJumpForce = -12.5;
    
    // States
    this.state = 'RUNNING'; // RUNNING, JUMPING, DOUBLE_JUMPING, SLIDING, CRASHED
    this.animTime = 0;
    this.shieldRotation = 0;
    
    // Visual cosmetics (customized via active skin in CyberStorage)
    this.skinColors = {
      body: '#ffffff',
      glow: '#ff007f',
      visor: '#00f0ff'
    };
  }

  resize(groundY) {
    this.groundY = groundY;
    if (this.state === 'RUNNING' || this.state === 'SLIDING' || this.state === 'CRASHED') {
      this.y = this.groundY - this.height;
    }
  }

  equipSkin(skin) {
    if (skin && skin.colors) {
      this.skinColors = skin.colors;
    }
  }

  jump() {
    if (this.state === 'RUNNING' || this.state === 'SLIDING') {
      this.vy = this.jumpForce;
      this.state = 'JUMPING';
      window.CyberAudio.playJump();
      return true;
    } else if (this.state === 'JUMPING') {
      this.vy = this.doubleJumpForce;
      this.state = 'DOUBLE_JUMPING';
      window.CyberAudio.playDoubleJump();
      return true;
    }
    return false;
  }

  slide(active) {
    if (this.state === 'CRASHED') return;
    
    if (active) {
      if (this.state === 'RUNNING') {
        this.state = 'SLIDING';
        this.height = 24; // Shrink size height by 50%
        this.y = this.groundY - this.height;
      }
    } else {
      if (this.state === 'SLIDING') {
        this.state = 'RUNNING';
        this.height = 48; // Restore size height
        this.y = this.groundY - this.height;
      }
    }
  }

  crash() {
    this.state = 'CRASHED';
    this.vy = -6; // Little hop on impact
    window.CyberAudio.playCrash();
  }

  update(deltaTime) {
    this.animTime += deltaTime * 0.015;
    this.shieldRotation += deltaTime * 0.003;
    
    // Apply gravity
    if (this.state === 'JUMPING' || this.state === 'DOUBLE_JUMPING' || this.state === 'CRASHED') {
      this.vy += this.gravity * (deltaTime / 16.6);
      this.y += this.vy * (deltaTime / 16.6);
      
      // Check floor landing
      if (this.y >= this.groundY - this.height) {
        this.y = this.groundY - this.height;
        this.vy = 0;
        
        if (this.state !== 'CRASHED') {
          this.state = 'RUNNING';
          window.CyberAudio.playLand();
        }
      }
    }
  }

  // Exact hitbox rectangle for collision detection
  getHitbox() {
    // Inset collision padding margin to feel fair
    const insetX = this.width * 0.12;
    const insetY = this.height * 0.08;
    return {
      x: this.x + insetX,
      y: this.y + insetY,
      width: this.width - insetX * 2,
      height: this.height - insetY * 2
    };
  }

  getShadowSegments() {
    const box = this.getHitbox();
    const x = box.x;
    const y = box.y;
    const w = box.width;
    const h = box.height;
    return [
      { p1: { x: x, y: y }, p2: { x: x + w, y: y } },
      { p1: { x: x + w, y: y }, p2: { x: x + w, y: y + h } },
      { p1: { x: x, y: y + h }, p2: { x: x + w, y: y + h } },
      { p1: { x: x, y: y }, p2: { x: x, y: y + h } }
    ];
  }

  draw() {
    const ctx = this.ctx;
    const cx = this.x;
    const cy = this.y;
    const w = this.width;
    const h = this.height;
    
    const bodyColor = this.skinColors.body;
    const glowColor = this.skinColors.glow;
    const visorColor = this.skinColors.visor;
    
    ctx.save();

    // 1. Draw Jetpack Flame/Neon Exhaust
    if (this.state === 'JUMPING' || this.state === 'DOUBLE_JUMPING') {
      ctx.beginPath();
      const fireGrad = ctx.createLinearGradient(cx - 10, cy + h * 0.4, cx - 35, cy + h * 0.6);
      fireGrad.addColorStop(0, '#ffffff');
      fireGrad.addColorStop(0.3, glowColor);
      fireGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = fireGrad;
      
      drawGlow(ctx, glowColor, 10, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + h * 0.35);
        ctx.quadraticCurveTo(cx - 30 - Math.random() * 15, cy + h * 0.5, cx - 5, cy + h * 0.65);
        ctx.closePath();
        ctx.fill();
      });
    }

    // 2. Draw Body base shape (Stylized Cyber Cat)
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    if (this.state === 'SLIDING') {
      // Crouched/flattened sleek kitty capsule
      drawGlow(ctx, glowColor, 8, () => {
        ctx.beginPath();
        // Body Capsule
        ctx.roundRect(cx, cy + 4, w, h - 6, 8);
        ctx.fill();
        ctx.stroke();
      });

      // Visor glow
      ctx.fillStyle = visorColor;
      drawGlow(ctx, visorColor, 6, () => {
        ctx.beginPath();
        ctx.roundRect(cx + w * 0.7, cy + 9, w * 0.22, 5, 2);
        ctx.fill();
      });

      // Tail trailing behind low
      ctx.strokeStyle = glowColor;
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy + h * 0.6);
      ctx.quadraticCurveTo(cx - 15, cy + h * 0.2 + Math.sin(this.animTime * 3) * 3, cx - 25, cy + h * 0.4);
      ctx.stroke();

    } else {
      // Standard running/jumping full feline shape
      drawGlow(ctx, glowColor, 8, () => {
        ctx.beginPath();
        // Torso
        ctx.roundRect(cx + 8, cy + 12, w - 24, h - 22, 12);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(cx + w * 0.72, cy + 18, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ears (Cyber Triangle spikes)
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
      });

      // Visor details
      ctx.fillStyle = visorColor;
      drawGlow(ctx, visorColor, 10, () => {
        ctx.beginPath();
        // Sleek cyber visor band
        ctx.roundRect(cx + w * 0.74, cy + 13, 11, 7, 2);
        ctx.fill();
      });

      // Jetpack unit on back
      ctx.fillStyle = '#222227';
      ctx.strokeStyle = visorColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx + 16, cy + 3, 24, 11, 3);
      ctx.fill();
      ctx.stroke();

      // Tail
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy + h * 0.5);
      const tailOsc = Math.sin(this.animTime * 2.5) * 6;
      ctx.bezierCurveTo(
        cx - 5, cy + h * 0.4 + tailOsc, 
        cx - 8, cy + 5 - tailOsc, 
        cx - 20, cy + 10 + tailOsc
      );
      ctx.stroke();

      // Paw legs running animation
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      
      const legCycle = this.animTime;
      const leg1Offset = Math.sin(legCycle * 5) * 8;
      const leg2Offset = -Math.sin(legCycle * 5) * 8;
      
      if (this.state === 'RUNNING') {
        // Front leg 1
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.65, cy + h - 12);
        ctx.lineTo(cx + w * 0.65 + leg1Offset, cy + h - 2);
        ctx.stroke();

        // Front leg 2
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.52, cy + h - 12);
        ctx.lineTo(cx + w * 0.52 + leg2Offset, cy + h - 2);
        ctx.stroke();

        // Back leg 1
        ctx.beginPath();
        ctx.moveTo(cx + 26, cy + h - 12);
        ctx.lineTo(cx + 26 + leg2Offset, cy + h - 2);
        ctx.stroke();

        // Back leg 2
        ctx.beginPath();
        ctx.moveTo(cx + 16, cy + h - 12);
        ctx.lineTo(cx + 16 + leg1Offset, cy + h - 2);
        ctx.stroke();
      } else {
        // Jumping legs drawn angled back
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.6, cy + h - 12);
        ctx.lineTo(cx + w * 0.5, cy + h - 4);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + 20, cy + h - 12);
        ctx.lineTo(cx + 10, cy + h - 4);
        ctx.stroke();
      }
    }

    // Draw active bubble shield if player has shield active
    if (window.CyberEngine && window.CyberEngine.powerups && window.CyberEngine.powerups.shield > 0) {
      ctx.save();
      ctx.translate(cx + w/2, cy + h/2);
      ctx.rotate(this.shieldRotation);
      
      const shieldRadius = Math.max(w, h) * 0.72;
      
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.0;
      
      drawGlow(ctx, '#00f0ff', 12, () => {
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius - 4, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = '#00f0ff';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const theta = (i / 6) * Math.PI * 2;
        const rx = Math.cos(theta) * shieldRadius;
        const ry = Math.sin(theta) * shieldRadius;
        ctx.moveTo(rx - 3, ry);
        ctx.lineTo(rx + 3, ry);
      }
      ctx.stroke();
      
      ctx.restore();
    }

    ctx.restore();
  }
}

/* ==========================================================================
   3. OBSTACLES (LASER WALLS & SECURITY DRONES)
   ========================================================================== */
class Obstacle {
  constructor(canvas, type, speed) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = type; // 'LASER_WALL', 'DRONE', 'SHIELD_BARRIER'
    
    this.x = canvas.clientWidth + 50;
    this.speed = speed;
    this.animTime = 0;
    
    // Configurations depending on type
    this.initType();
  }

  initType() {
    const h = this.canvas.clientHeight;
    const groundY = h * 0.85;

    switch (this.type) {
      case 'LASER_WALL':
        // Tall ground barrier - must jump
        this.width = 28;
        this.height = 54;
        this.y = groundY - this.height;
        this.color = '#ff003c'; // Solar Crimson/Red
        this.glowColor = '#ff003c';
        break;

      case 'DRONE':
        // Hovering security robot - must slide/crouch
        this.width = 44;
        this.height = 30;
        this.y = groundY - 70; // High gap for cat to slide under!
        this.color = '#00f0ff'; // Cyber Cyan
        this.glowColor = '#00f0ff';
        break;

      case 'SHIELD_BARRIER':
        // Floating mid-height shield - requires double jump or precision jump
        this.width = 32;
        this.height = 36;
        this.y = groundY - 45; // Must double jump or time a single jump perfectly
        this.color = '#ffd700'; // Golden laser
        this.glowColor = '#ffd700';
        break;
    }
  }

  update(gameSpeed, deltaTime) {
    this.speed = gameSpeed;
    this.x -= this.speed * (deltaTime / 16.6);
    this.animTime += deltaTime * 0.015;
  }

  isOffscreen() {
    return this.x + this.width < -100;
  }

  getHitbox() {
    // Standard slightly smaller hitbox buffer for a fair game balance feel
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 4
    };
  }

  getShadowSegments() {
    const box = this.getHitbox();
    const x = box.x;
    const y = box.y;
    const w = box.width;
    const h = box.height;
    return [
      { p1: { x: x, y: y }, p2: { x: x + w, y: y } },
      { p1: { x: x + w, y: y }, p2: { x: x + w, y: y + h } },
      { p1: { x: x, y: y + h }, p2: { x: x + w, y: y + h } },
      { p1: { x: x, y: y }, p2: { x: x, y: y + h } }
    ];
  }

  draw() {
    const ctx = this.ctx;
    const cx = this.x;
    const cy = this.y;
    const w = this.width;
    const h = this.height;
    
    ctx.save();

    if (this.type === 'LASER_WALL') {
      // 1. Draw Ground Laser Projector Nodes
      ctx.fillStyle = '#222227';
      ctx.strokeStyle = '#55555d';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.roundRect(cx, cy + h - 10, w, 10, 2);
      ctx.fill();
      ctx.stroke();

      // Top energy emitter
      ctx.beginPath();
      ctx.roundRect(cx + 4, cy, w - 8, 8, 2);
      ctx.fill();
      ctx.stroke();

      // Pulsing laser beams connecting node
      const pulseWidth = 3 + Math.sin(this.animTime * 6) * 1.2;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = pulseWidth;
      
      drawGlow(ctx, this.glowColor, 12, () => {
        ctx.beginPath();
        ctx.moveTo(cx + w/2, cy + 6);
        ctx.lineTo(cx + w/2, cy + h - 8);
        ctx.stroke();
      });

      // Side energy sparks
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const sparkY = cy + 10 + (Math.sin(this.animTime * 10) * 0.5 + 0.5) * (h - 25);
      ctx.moveTo(cx + w/2 - 6, sparkY);
      ctx.lineTo(cx + w/2 + 6, sparkY);
      ctx.stroke();

    } else if (this.type === 'DRONE') {
      // 2. Draw Floating Security Drone
      // Spinning red sensor light
      const blink = Math.sin(this.animTime * 8) > 0;
      
      ctx.fillStyle = '#1c1b22';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;

      // Base body shell
      drawGlow(ctx, this.glowColor, 8, () => {
        ctx.beginPath();
        ctx.roundRect(cx, cy + 6, w, h - 12, 6);
        ctx.fill();
        ctx.stroke();
      });

      // Camera lens
      ctx.fillStyle = blink ? '#ff003c' : '#0a6a7c';
      ctx.beginPath();
      ctx.arc(cx + w * 0.7, cy + h/2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Side wings / Rotors (rotating via sine wave scales)
      ctx.strokeStyle = '#88888d';
      ctx.lineWidth = 1.5;
      
      const rotorScale = Math.sin(this.animTime * 12);
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.1, cy + 6);
      ctx.lineTo(cx + w * 0.1 - 8 * rotorScale, cy - 2);
      ctx.lineTo(cx + w * 0.1 + 8 * rotorScale, cy - 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.9, cy + 6);
      ctx.lineTo(cx + w * 0.9 - 8 * rotorScale, cy - 2);
      ctx.lineTo(cx + w * 0.9 + 8 * rotorScale, cy - 2);
      ctx.stroke();

      // Light trail hanging below
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + w/2, cy + h - 5);
      ctx.lineTo(cx + w/2, cy + h + 15);
      ctx.stroke();

    } else if (this.type === 'SHIELD_BARRIER') {
      // 3. Floating hexagonal magic shield
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5;

      drawGlow(ctx, this.glowColor, 12, () => {
        ctx.beginPath();
        // Hexagonal coordinates
        ctx.moveTo(cx + w/2, cy);
        ctx.lineTo(cx + w, cy + h * 0.25);
        ctx.lineTo(cx + w, cy + h * 0.75);
        ctx.lineTo(cx + w/2, cy + h);
        ctx.lineTo(cx, cy + h * 0.75);
        ctx.lineTo(cx, cy + h * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // Internal wire details
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cx + w/2, cy);
      ctx.lineTo(cx + w/2, cy + h);
      ctx.moveTo(cx, cy + h/2);
      ctx.lineTo(cx + w, cy + h/2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/* ==========================================================================
   4. COLLECTIBLES (NEON GEMS)
   ========================================================================== */
class Collectible {
  constructor(canvas, x, y, speed) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.x = x;
    this.baseY = y;
    this.y = y;
    this.width = 16;
    this.height = 20;
    this.speed = speed;
    
    this.animTime = Math.random() * 10;
    this.collected = false;
    
    // Magnet pull variables
    this.isMagnetized = false;
    this.magnetSpeed = 16;
  }

  update(gameSpeed, player, deltaTime) {
    this.speed = gameSpeed;
    this.animTime += deltaTime * 0.015;

    // Sinusoidal bobbing hover
    this.y = this.baseY + Math.sin(this.animTime * 3.5) * 6;

    // Magnet mechanics: pull gem towards player if they are nearby
    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 160 && player.state !== 'CRASHED') {
      this.isMagnetized = true;
    }

    if (this.isMagnetized && player.state !== 'CRASHED') {
      // Pull heavily to player center coordinates
      this.x += (dx / distance) * this.magnetSpeed * (deltaTime / 16.6);
      this.baseY += (dy / distance) * this.magnetSpeed * (deltaTime / 16.6);
    } else {
      // Standard scrolling left
      this.x -= this.speed * (deltaTime / 16.6);
    }
  }

  isOffscreen() {
    return this.x + this.width < -50;
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  draw() {
    if (this.collected) return;

    const ctx = this.ctx;
    const cx = this.x;
    const cy = this.y;
    const w = this.width;
    const h = this.height;
    
    ctx.save();

    // Draw Glowing Cyber Diamond Gem
    ctx.fillStyle = 'rgba(0, 240, 255, 0.45)'; // Aqua Cyan
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    drawGlow(ctx, '#00f0ff', 10, () => {
      ctx.beginPath();
      ctx.moveTo(cx + w/2, cy); // Top center
      ctx.lineTo(cx + w, cy + h * 0.35); // Top right
      ctx.lineTo(cx + w/2, cy + h); // Bottom center
      ctx.lineTo(cx, cy + h * 0.35); // Top left
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // High reflection spark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx + w/2, cy + 3);
    ctx.lineTo(cx + w - 4, cy + h * 0.35);
    ctx.lineTo(cx + w/2, cy + h * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// Bind to window context
window.ParallaxBackground = ParallaxBackground;
window.Player = Player;
window.Obstacle = Obstacle;
window.Collectible = Collectible;

/* ==========================================================================
   5. POWER-UP CAPSULES (SHIELD, MAGNET, BOOSTER)
   ========================================================================== */
class PowerUp {
  constructor(canvas, type, speed) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = type; // 'shield', 'magnet', 'boost'
    
    this.x = canvas.clientWidth + 50;
    
    // Position floating in mid-air (easy to jump or slide into)
    const h = canvas.clientHeight;
    const groundY = h * 0.85;
    this.baseY = groundY - 55;
    this.y = this.baseY;
    
    this.width = 30;
    this.height = 30;
    this.speed = speed;
    this.animTime = Math.random() * 10;
    this.collected = false;
    
    this.initColors();
  }

  initColors() {
    switch(this.type) {
      case 'shield':
        this.color = '#00f0ff'; // Cyan bubble shield
        this.symbol = '🛡️';
        break;
      case 'magnet':
        this.color = '#ff007f'; // Pink magnet
        this.symbol = '🧲';
        break;
      case 'boost':
        this.color = '#ffd700'; // Golden lightning boost
        this.symbol = '⚡';
        break;
    }
  }

  update(gameSpeed, deltaTime) {
    this.speed = gameSpeed;
    this.x -= this.speed * (deltaTime / 16.6);
    this.animTime += deltaTime * 0.015;
    
    // Wave-like floating motion
    this.y = this.baseY + Math.sin(this.animTime * 3) * 6;
  }

  isOffscreen() {
    return this.x + this.width < -50;
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  draw() {
    if (this.collected) return;
    const ctx = this.ctx;
    const cx = this.x;
    const cy = this.y;
    const w = this.width;
    const h = this.height;
    
    ctx.save();
    
    // 1. Draw glowing outer glass capsule capsule
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;
    
    drawGlow(ctx, this.color, 12, () => {
      ctx.beginPath();
      // Draw smooth capsule shell
      ctx.roundRect(cx, cy, w, h, h/2);
      ctx.fill();
      ctx.stroke();
    });

    // 2. Draw interior details
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add dynamic bobbing/rotating effect to symbol inside capsule
    ctx.save();
    ctx.translate(cx + w/2, cy + h/2);
    ctx.scale(1 + Math.sin(this.animTime * 4.5) * 0.08, 1 + Math.sin(this.animTime * 4.5) * 0.08);
    ctx.fillText(this.symbol, 0, 0);
    ctx.restore();
    
    ctx.restore();
  }
}

// Bind to window context
window.PowerUp = PowerUp;
