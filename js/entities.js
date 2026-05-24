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
    this.clouds = [];
    this.hovercars = [];
    this.trains = [];
    this.trainSpawnTimer = 0;
    this.trainSpawnInterval = 6000; // spawn a monorail every 6 seconds
    
    this.animTime = 0;
    this.init();
  }

  init() {
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 400;

    // 1. Generate star field
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.45),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.04 + 0.01,
        brightness: Math.random() * 0.5 + 0.5
      });
    }

    // 2. Generate soft background drifting clouds
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.35),
        width: Math.random() * 120 + 80,
        height: Math.random() * 30 + 15,
        speed: Math.random() * 0.06 + 0.02,
        alpha: Math.random() * 0.05 + 0.02
      });
    }

    // 3. Generate background flying hovercars
    this.hovercars = [];
    for (let i = 0; i < 6; i++) {
      this.hovercars.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.4) + h * 0.15,
        speed: (Math.random() * 0.4 + 0.15) * (Math.random() > 0.5 ? 1 : -1),
        width: Math.random() * 6 + 6,
        height: Math.random() * 2 + 1.5,
        color: Math.random() > 0.5 ? '#00f0ff' : '#ff007f'
      });
    }

    // 4. Generate skyline buildings (15 far dark ones, 8 midground detailed ones)
    this.buildings = [];
    // Far layer (slower, darker purple)
    for (let i = 0; i < 15; i++) {
      this.buildings.push({
        x: i * 110 + Math.random() * 30,
        width: Math.random() * 90 + 70,
        height: Math.random() * 180 + 120,
        speed: 0.12,
        color: 'rgba(24, 8, 48, 0.5)', 
        gridColor: 'rgba(255, 0, 127, 0.03)',
        layer: 'far'
      });
    }
    // Mid layer (medium speed, detailed outline, neon trims, holograms)
    for (let i = 0; i < 8; i++) {
      const bannerColor = Math.random() > 0.5 ? '#ff007f' : '#00f0ff';
      this.buildings.push({
        x: i * 200 + Math.random() * 60,
        width: Math.random() * 110 + 90,
        height: Math.random() * 120 + 80,
        speed: 0.35,
        color: 'rgba(12, 4, 30, 0.85)',
        gridColor: 'rgba(0, 240, 255, 0.05)',
        laserTrim: Math.random() > 0.3,
        laserTrimColor: Math.random() > 0.5 ? '#00f0ff' : '#ff007f',
        hologram: Math.random() > 0.4,
        hologramColor: bannerColor,
        hologramType: Math.floor(Math.random() * 3), // 0: vertical kanji, 1: cyber visor mask, 2: digital bar
        layer: 'mid'
      });
    }

    // 5. Monorails pool
    this.trains = [];
    this.trainSpawnTimer = 0;
  }

  resize(width, height) {
    this.init();
  }

  update(gameSpeed, deltaTime) {
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 400;
    const dtRatio = deltaTime / 16.6;
    
    this.animTime += deltaTime * 0.015;

    // 1. Update stars
    this.stars.forEach(star => {
      star.x -= gameSpeed * star.speed * dtRatio;
      if (star.x < -10) star.x = w + 10;
      
      // Twinkle
      star.brightness += (Math.random() - 0.5) * 0.06;
      star.brightness = Math.max(0.3, Math.min(1.0, star.brightness));
    });

    // 2. Update clouds
    this.clouds.forEach(cloud => {
      cloud.x -= gameSpeed * cloud.speed * dtRatio;
      if (cloud.x + cloud.width < -50) {
        cloud.x = w + Math.random() * 50;
        cloud.y = Math.random() * (h * 0.35);
      }
    });

    // 3. Update hovercars
    this.hovercars.forEach(car => {
      car.x += car.speed * dtRatio;
      if (car.speed > 0 && car.x > w + 20) {
        car.x = -20;
        car.y = Math.random() * (h * 0.4) + h * 0.15;
      } else if (car.speed < 0 && car.x < -20) {
        car.x = w + 20;
        car.y = Math.random() * (h * 0.4) + h * 0.15;
      }
    });

    // 4. Update parallax skyline buildings
    this.buildings.forEach(b => {
      b.x -= gameSpeed * b.speed * dtRatio;
      if (b.x + b.width < -10) {
        b.x = w + Math.random() * 40;
      }
    });

    // 5. Update Monorail trains
    this.trainSpawnTimer += deltaTime;
    if (this.trainSpawnTimer >= this.trainSpawnInterval) {
      this.trainSpawnTimer = 0;
      // Spawn a new bullet train moving left-to-right or right-to-left
      const direction = Math.random() > 0.5 ? 1 : -1;
      this.trains.push({
        x: direction > 0 ? -120 : w + 20,
        width: 100,
        height: 6,
        speed: (gameSpeed * 1.5 + Math.random() * 2 + 1) * direction,
        direction: direction,
        active: true
      });
    }

    this.trains.forEach(t => {
      t.x += t.speed * dtRatio;
    });
    // Filter off-screen trains
    this.trains = this.trains.filter(t => {
      if (t.speed > 0) return t.x < w + 200;
      return t.x > -200;
    });
  }

  draw(themeId) {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const groundY = h * 0.82;
    
    // Theme details
    let primaryGlow = '#ff007f';
    let accentGlow = '#00f0ff';
    if (themeId === 'laser-green') { primaryGlow = '#39ff14'; accentGlow = '#0088ff'; }
    if (themeId === 'frozen-grid') { primaryGlow = '#00f5ff'; accentGlow = '#bd00ff'; }
    if (themeId === 'cyber-gold') { primaryGlow = '#ffd700'; accentGlow = '#ff003c'; }

    // 1. Draw Twinkling Stars
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(star => {
      ctx.globalAlpha = star.brightness;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;

    // 2. Draw Drifting Ambient Clouds
    this.clouds.forEach(c => {
      ctx.save();
      ctx.globalAlpha = c.alpha;
      const grad = ctx.createRadialGradient(
        c.x + c.width/2, c.y + c.height/2, 5,
        c.x + c.width/2, c.y + c.height/2, c.width/2
      );
      grad.addColorStop(0, accentGlow);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(c.x + c.width/2, c.y + c.height/2, c.width/2, c.height/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 3. Draw Giant Floating Crystalline Reactor Core (Upper Right Sky)
    ctx.save();
    const rx = w * 0.74;
    const ry = h * 0.28;
    const rSize = Math.min(w, h) * 0.12;
    
    // Slow float bobbing offset
    const bobOffset = Math.sin(this.animTime * 0.5) * 5;
    const coreY = ry + bobOffset;
    
    // Draw background nebula aura
    const auraGrad = ctx.createRadialGradient(rx, coreY, 2, rx, coreY, rSize * 1.8);
    auraGrad.addColorStop(0, 'rgba(189, 0, 255, 0.12)'); 
    auraGrad.addColorStop(0.4, `rgba(${themeId === 'cyber-gold' ? '255, 0, 60' : '0, 240, 255'}, 0.05)`);
    auraGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(rx, coreY, rSize * 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw outer rotating triangle (clockwise)
    ctx.strokeStyle = primaryGlow;
    ctx.lineWidth = 1.5;
    ctx.save();
    ctx.translate(rx, coreY);
    ctx.rotate(this.animTime * 0.08);
    drawGlow(ctx, primaryGlow, 10, () => {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const theta = (i / 3) * Math.PI * 2;
        const tx = Math.cos(theta) * rSize;
        const ty = Math.sin(theta) * rSize;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.closePath();
      ctx.stroke();
    });
    ctx.restore();

    // Draw inner rotating triangle (counter-clockwise)
    ctx.strokeStyle = accentGlow;
    ctx.lineWidth = 1.2;
    ctx.save();
    ctx.translate(rx, coreY);
    ctx.rotate(-this.animTime * 0.12);
    drawGlow(ctx, accentGlow, 8, () => {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const theta = (i / 3) * Math.PI * 2 + Math.PI; 
        const tx = Math.cos(theta) * (rSize * 0.65);
        const ty = Math.sin(theta) * (rSize * 0.65);
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.closePath();
      ctx.stroke();
    });
    ctx.restore();

    // Draw central electric plasma sphere
    const sphereGrad = ctx.createRadialGradient(rx, coreY, 1, rx, coreY, rSize * 0.35);
    sphereGrad.addColorStop(0, '#ffffff');
    sphereGrad.addColorStop(0.3, accentGlow);
    sphereGrad.addColorStop(0.8, primaryGlow);
    sphereGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sphereGrad;
    drawGlow(ctx, accentGlow, 12, () => {
      ctx.beginPath();
      ctx.arc(rx, coreY, rSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw electric spark arcs branching out
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + this.animTime * 0.2;
      const len = rSize * (0.6 + Math.random() * 0.25);
      const bx = rx + Math.cos(angle) * (rSize * 0.2);
      const by = coreY + Math.sin(angle) * (rSize * 0.2);
      const ex = rx + Math.cos(angle) * len;
      const ey = coreY + Math.sin(angle) * len;
      
      ctx.moveTo(bx, by);
      const mx = (bx + ex) / 2 + (Math.random() - 0.5) * 8;
      const my = (by + ey) / 2 + (Math.random() - 0.5) * 8;
      ctx.lineTo(mx, my);
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();
    ctx.restore();

    // 4. Draw Thick Sweeping Cyber Cables (Bezier drops in far background)
    ctx.strokeStyle = 'rgba(15, 6, 36, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.15);
    ctx.bezierCurveTo(w * 0.2, h * 0.45, w * 0.35, h * 0.45, w * 0.5, h * 0.2);
    ctx.moveTo(w * 0.25, h * 0.25);
    ctx.bezierCurveTo(w * 0.45, h * 0.55, w * 0.65, h * 0.55, w * 0.8, h * 0.25);
    ctx.stroke();

    // 5. Draw Parallax silhouetted Skyline Buildings
    this.buildings.forEach(b => {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.strokeStyle = b.gridColor;
      ctx.lineWidth = b.layer === 'far' ? 1.0 : 1.5;
      
      ctx.beginPath();
      ctx.rect(b.x, groundY - b.height, b.width, b.height);
      ctx.fill();
      ctx.stroke();

      if (b.layer === 'mid') {
        ctx.beginPath();
        ctx.rect(b.x, groundY - b.height, b.width, b.height);
        ctx.clip();

        ctx.strokeStyle = b.gridColor;
        ctx.lineWidth = 0.5;
        for (let y = groundY - b.height + 12; y < groundY; y += 14) {
          ctx.beginPath();
          ctx.moveTo(b.x, y);
          ctx.lineTo(b.x + b.width, y);
          ctx.stroke();
        }
        for (let x = b.x + 12; x < b.x + b.width; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, groundY - b.height);
          ctx.lineTo(x, groundY);
          ctx.stroke();
        }

        if (b.laserTrim) {
          ctx.strokeStyle = b.laserTrimColor;
          ctx.lineWidth = 2.0;
          drawGlow(ctx, b.laserTrimColor, 6, () => {
            ctx.beginPath();
            ctx.moveTo(b.x, groundY - b.height);
            ctx.lineTo(b.x + b.width, groundY - b.height);
            ctx.stroke();
          });
        }

        if (b.hologram) {
          ctx.save();
          ctx.globalAlpha = 0.55 + Math.sin(this.animTime * 4 + b.x) * 0.15; 
          ctx.fillStyle = b.hologramColor;
          ctx.strokeStyle = b.hologramColor;
          
          const bx = b.x + b.width * 0.35;
          const by = groundY - b.height * 0.75;
          const bw = 20;
          const bh = b.height * 0.5;
          
          if (b.hologramType === 0) {
            ctx.fillStyle = 'rgba(12, 4, 30, 0.45)';
            ctx.strokeStyle = b.hologramColor;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.roundRect(bx - 4, by, bw + 8, bh, 3);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = b.hologramColor;
            ctx.font = '700 8px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            drawGlow(ctx, b.hologramColor, 5, () => {
              const chars = ['マ', 'ン', 'デ', 'ル', 'キ', 'テ', 'ィ'];
              for (let i = 0; i < chars.length; i++) {
                ctx.fillText(chars[i], bx + bw/2, by + 12 + i * 9);
              }
            });
          } else if (b.hologramType === 1) {
            const cx = b.x + b.width * 0.5;
            const cy = groundY - b.height * 0.6;
            ctx.strokeStyle = b.hologramColor;
            ctx.lineWidth = 1.5;
            drawGlow(ctx, b.hologramColor, 8, () => {
              ctx.beginPath();
              ctx.arc(cx, cy, 10, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = b.hologramColor;
              ctx.fillRect(cx - 7, cy - 2, 14, 4);
            });
          } else {
            const ax = b.x + b.width * 0.2;
            const ay = groundY - b.height * 0.65;
            ctx.fillStyle = b.hologramColor;
            drawGlow(ctx, b.hologramColor, 6, () => {
              for (let i = 0; i < 4; i++) {
                const barH = 15 + Math.sin(this.animTime * 5 + i * 1.5) * 12;
                ctx.fillRect(ax + i * 8, ay + (25 - barH), 4, barH);
              }
            });
          }
          ctx.restore();
        }
      }
      ctx.restore();
    });

    // 6. Draw Far Background Drifting Hovercars
    this.hovercars.forEach(car => {
      ctx.save();
      ctx.fillStyle = car.color;
      drawGlow(ctx, car.color, 4, () => {
        ctx.fillRect(car.x, car.y, car.width, car.height);
        ctx.fillStyle = '#ffffff';
        const headlightX = car.speed > 0 ? car.x + car.width : car.x;
        ctx.fillRect(headlightX - 1, car.y + 0.5, 1.5, car.height - 1);
      });
      ctx.restore();
    });

    // 7. Draw Elevated Monorail Track Horizontal Beams
    ctx.save();
    const trackY = groundY - 110;
    ctx.strokeStyle = '#1b142c';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, trackY);
    ctx.lineTo(w, trackY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, trackY + 3);
    ctx.lineTo(w, trackY + 3);
    ctx.stroke();

    for (let x = 60; x < w; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, trackY);
      ctx.lineTo(x, groundY);
      ctx.stroke();
    }
    ctx.restore();

    // 8. Draw Drifting Monorail Trains
    this.trains.forEach(t => {
      ctx.save();
      ctx.fillStyle = 'rgba(12, 4, 30, 0.95)';
      ctx.strokeStyle = accentGlow;
      ctx.lineWidth = 1.5;
      
      const ty = trackY - t.height;
      drawGlow(ctx, accentGlow, 8, () => {
        ctx.beginPath();
        ctx.roundRect(t.x, ty, t.width, t.height, 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.fillStyle = accentGlow;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const wx = t.x + 8 + i * 22;
        ctx.roundRect(wx, ty + 1.5, 15, 2.5, 0.5);
      }
      ctx.fill();
      ctx.restore();
    });

    // 9. Ground Horizon Blend line (Dark boundary)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, groundY, w, h - groundY);
    const floorGrad = ctx.createLinearGradient(0, groundY, 0, h);
    floorGrad.addColorStop(0, '#000000');
    floorGrad.addColorStop(0.12, 'rgba(8,3,24,0.92)');
    floorGrad.addColorStop(1, 'rgba(0,0,0,0.98)');
    ctx.fillStyle = floorGrad;
    ctx.fill();
    ctx.restore();
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
