/* ==========================================================================
   CYBER CAT // PARTICLE PHYSICS ENGINE
   DYNAMIC VISUAL EFFECTS, FX TRAILS & EXPLOSIONS
   ========================================================================== */

class Particle {
  constructor(options) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    
    this.size = options.size || Math.random() * 4 + 2;
    this.color = options.color || '#ff007f';
    this.alpha = 1.0;
    
    // Character glyph for matrix trails
    this.char = options.char || null;
    
    // Physical attributes
    this.decay = options.decay || Math.random() * 0.03 + 0.015;
    this.gravity = options.gravity || 0;
    this.friction = options.friction || 0.98;
    this.glow = options.glow || false;
    this.shape = options.shape || 'circle'; // 'circle', 'square', 'star', 'matrix', 'ring'
  }

  update(deltaTime) {
    // Apply velocities and forces
    this.vx *= this.friction;
    this.vy += this.gravity * (deltaTime / 16.6);
    this.vy *= this.friction;
    
    this.x += this.vx * (deltaTime / 16.6);
    this.y += this.vy * (deltaTime / 16.6);
    
    // Custom expansion physics for ring shockwaves
    if (this.shape === 'ring') {
      this.size += 3.8 * (deltaTime / 16.6);
    }
    
    // Decay alpha
    this.alpha -= this.decay * (deltaTime / 16.6);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    
    // Ultra-performant translucent neon glow halo (avoid shadowBlur CPU lags)
    if (this.glow) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.alpha * 0.22;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = this.alpha; // restore
    }

    ctx.beginPath();
    
    if (this.shape === 'circle') {
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'square') {
      ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
    } else if (this.shape === 'star') {
      // Small 4-point diamond star
      ctx.moveTo(this.x, this.y - this.size);
      ctx.lineTo(this.x + this.size * 0.7, this.y);
      ctx.lineTo(this.x, this.y + this.size);
      ctx.lineTo(this.x - this.size * 0.7, this.y);
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === 'matrix') {
      // Falling binary/hex code glyph
      ctx.font = `bold ${Math.floor(this.size * 2.2)}px monospace`;
      ctx.fillText(this.char || (Math.random() > 0.5 ? '1' : '0'), this.x, this.y);
    } else if (this.shape === 'ring') {
      // Expanding light ring shockwave
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3.0;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class ParticleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
  }

  clear() {
    this.particles = [];
  }

  update(deltaTime) {
    // Update all active particles and clean up dead ones
    this.particles.forEach(p => p.update(deltaTime));
    this.particles = this.particles.filter(p => p.alpha > 0);
  }

  draw() {
    const ctx = this.ctx;
    this.particles.forEach(p => p.draw(ctx));
  }

  // --- SPECIFIC FX EMITTERS ---

  // 1. Dust puff at cat's feet when running on ground
  spawnRunDust(x, y, color) {
    // Spawn 1-2 subtle smoke particles
    if (Math.random() > 0.45) return;
    
    this.particles.push(new Particle({
      x: x,
      y: y,
      vx: -Math.random() * 2.5 - 1.0, // Shoot backward
      vy: -Math.random() * 0.8,
      size: Math.random() * 5 + 3,
      color: color || '#ff007f',
      decay: Math.random() * 0.04 + 0.02,
      friction: 0.95,
      shape: 'circle'
    }));
  }

  // 2. Jetpack exhaust flames when jumping (Default Trail)
  spawnJetpackFlame(x, y, color) {
    const count = Math.random() > 0.5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: -Math.random() * 5 - 3.5, // Forcefully backward
        vy: Math.random() * 4 - 2, // Slight spread
        size: Math.random() * 4 + 2,
        color: color || '#00f0ff',
        decay: Math.random() * 0.06 + 0.035,
        gravity: 0.1, // Fall down slightly
        friction: 0.97,
        glow: true,
        shape: 'circle'
      }));
    }
  }

  // 3. Custom Trail Emitter 1: Crystalline white sparkles
  spawnTrailSparkles(x, y) {
    if (Math.random() > 0.35) return;
    
    this.particles.push(new Particle({
      x: x,
      y: y + Math.random() * 10 - 5,
      vx: -Math.random() * 3.5 - 1.5,
      vy: Math.random() * 2 - 1,
      size: Math.random() * 4 + 1.5,
      color: '#ffffff',
      decay: Math.random() * 0.045 + 0.02,
      friction: 0.96,
      glow: true,
      shape: 'star'
    }));
  }

  // 4. Custom Trail Emitter 2: Shifting rainbow smoke
  spawnTrailRainbow(x, y, timeInSeconds) {
    if (Math.random() > 0.3) return;
    
    const hue = Math.floor(timeInSeconds * 240) % 360;
    const color = `hsl(${hue}, 100%, 60%)`;
    
    this.particles.push(new Particle({
      x: x,
      y: y + Math.random() * 6 - 3,
      vx: -Math.random() * 4.0 - 2.0,
      vy: Math.random() * 1.5 - 0.75,
      size: Math.random() * 5 + 4,
      color: color,
      decay: Math.random() * 0.035 + 0.015,
      friction: 0.95,
      shape: 'circle'
    }));
  }

  // 5. Custom Trail Emitter 3: falling Matrix digital characters
  spawnTrailMatrix(x, y) {
    if (Math.random() > 0.25) return;
    
    const glyphs = ['0', '1', 'Ø', 'Ξ', 'Σ', 'λ', '1', '0'];
    const randomGlyph = glyphs[Math.floor(Math.random() * glyphs.length)];
    
    this.particles.push(new Particle({
      x: x,
      y: y + Math.random() * 10 - 5,
      vx: -Math.random() * 2.0 - 0.5,
      vy: Math.random() * 1.5 + 0.6, // Drift down slightly
      size: Math.random() * 4 + 3.5,
      color: '#39ff14', // Neon Green
      char: randomGlyph,
      decay: Math.random() * 0.032 + 0.015,
      friction: 0.97,
      glow: true,
      shape: 'matrix'
    }));
  }

  // 6. Diamond sparkles when gathering a neon gem
  spawnGemCollect(x, y, color) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 3.5;
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 3,
        color: color || '#00f0ff',
        decay: Math.random() * 0.025 + 0.015,
        friction: 0.95,
        glow: true,
        shape: 'star'
      }));
    }
  }

  // 7. Large impact explosion on obstacle collision
  spawnCrashExplosion(x, y, bodyColor, glowColor) {
    const count = 35;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      const useBody = Math.random() > 0.4;
      
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5, // Add upward thrust bias
        size: Math.random() * 6 + 3,
        color: useBody ? bodyColor : glowColor,
        decay: Math.random() * 0.02 + 0.008,
        gravity: 0.35,
        friction: 0.96,
        glow: !useBody,
        shape: Math.random() > 0.5 ? 'square' : 'circle'
      }));
    }
  }

  // 8. Expanding shockwave ring when the Energy Shield shatters
  spawnShieldShatter(x, y) {
    // A: Spawns a ring of 18 floating stars
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = Math.random() * 5 + 4;
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 3,
        color: '#00f0ff', // Cyan sparks
        decay: Math.random() * 0.03 + 0.012,
        friction: 0.96,
        glow: true,
        shape: 'star'
      }));
    }

    // B: Pushes the expanding ring wave
    this.particles.push(new Particle({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      size: 15, // Starts small, grows in update()
      color: '#00f0ff',
      decay: 0.038,
      friction: 1.0,
      glow: true,
      shape: 'ring'
    }));
  }
}

// Bind to window context
window.ParticleEngine = ParticleEngine;
