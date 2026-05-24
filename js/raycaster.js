/* ==========================================================================
   CYBER CAT // 2D NEON RAY TRACING ENGINE
   ENDPOINT RAY CASTING, DYNAMIC SHADOWS & LIGHTMAP BLENDING
   ========================================================================== */

class LightSource {
  constructor(x, y, radius, color, intensity, isPulsing = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.baseIntensity = intensity;
    this.intensity = intensity;
    
    this.isPulsing = isPulsing;
    this.pulseSpeed = Math.random() * 3 + 2;
    this.pulseOffset = Math.random() * 10;
  }

  update(animTime) {
    if (this.isPulsing) {
      // Sinusoidal intensity glow pulse
      const wave = Math.sin(animTime * this.pulseSpeed + this.pulseOffset) * 0.25;
      this.intensity = Math.max(0.05, this.baseIntensity + wave);
    }
  }
}

class RaycastEngine {
  constructor(canvas) {
    this.mainCanvas = canvas;
    
    // Create dedicated offscreen lightmap canvas for composite drawing
    this.lightmapCanvas = document.createElement('canvas');
    this.ctx = this.lightmapCanvas.getContext('2d');
    
    this.resize(canvas.clientWidth, canvas.clientHeight);
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    
    this.lightmapCanvas.width = w;
    this.lightmapCanvas.height = h;
  }

  clear() {
    // Clear lightmap layer
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // Linear vector parametric ray-segment intersection solver
  getIntersection(ray, segment) {
    const r_px = ray.x;
    const r_py = ray.y;
    const r_dx = Math.cos(ray.angle);
    const r_dy = Math.sin(ray.angle);
    
    const s_px = segment.p1.x;
    const s_py = segment.p1.y;
    const s_dx = segment.p2.x - segment.p1.x;
    const s_dy = segment.p2.y - segment.p1.y;
    
    // Solve: r_px + r_dx * T1 = s_px + s_dx * T2
    const denominator = s_dx * r_dy - s_dy * r_dx;
    if (Math.abs(denominator) < 0.0001) {
      return null; // Rays are parallel
    }
    
    const T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / denominator;
    const T1 = Math.abs(r_dx) > 0.0001 
      ? (s_px + s_dx * T2 - r_px) / r_dx 
      : (s_py + s_dy * T2 - r_py) / r_dy;
    
    if (T1 < 0) return null; // Intersection behind ray origin
    if (T2 < 0 || T2 > 1) return null; // Intersection outside segment bounds
    
    return {
      x: r_px + r_dx * T1,
      y: r_py + r_dy * T1,
      param: T1
    };
  }

  calculateVisibilityPolygon(lx, ly, radius, segments) {
    const uniqueAngles = [];
    
    // 1. Gather all segment endpoints and get their angles
    segments.forEach(seg => {
      // Calculate angle from light source center
      const a1 = Math.atan2(seg.p1.y - ly, seg.p1.x - lx);
      const a2 = Math.atan2(seg.p2.y - ly, seg.p2.x - lx);
      
      uniqueAngles.push(a1, a1 - 0.0001, a1 + 0.0001);
      uniqueAngles.push(a2, a2 - 0.0001, a2 + 0.0001);
    });

    // Add screen boundary corners to close open polygons
    const bounds = [
      Math.atan2(0 - ly, 0 - lx),
      Math.atan2(0 - ly, this.width - lx),
      Math.atan2(this.height - ly, this.width - lx),
      Math.atan2(this.height - ly, 0 - lx)
    ];
    uniqueAngles.push(...bounds);

    const hitPoints = [];
    
    // 2. Cast rays along all unique angles
    uniqueAngles.forEach(angle => {
      const ray = { x: lx, y: ly, angle: angle };
      let closestHit = null;
      
      // Perform ray-segment sweep
      segments.forEach(seg => {
        const hit = this.getIntersection(ray, seg);
        if (hit) {
          if (!closestHit || hit.param < closestHit.param) {
            closestHit = hit;
          }
        }
      });
      
      if (closestHit && closestHit.param <= radius) {
        closestHit.angle = angle;
        hitPoints.push(closestHit);
      } else {
        // Ray doesn't hit segments, projects out to maximum light radius boundary
        hitPoints.push({
          x: lx + Math.cos(angle) * radius,
          y: ly + Math.sin(angle) * radius,
          angle: angle,
          param: radius
        });
      }
    });

    // 3. Sort hit points by angle to form continuous outer border
    hitPoints.sort((a, b) => a.angle - b.angle);
    return hitPoints;
  }

  drawLightSource(light, segments) {
    const ctx = this.ctx;
    const lx = light.x;
    const ly = light.y;
    const radius = light.radius;
    const intensity = light.intensity;
    const color = light.color;
    
    // Filter active segments to only check those near light area (speed optimization!)
    const activeSegments = segments.filter(seg => {
      const d1 = Math.hypot(seg.p1.x - lx, seg.p1.y - ly);
      const d2 = Math.hypot(seg.p2.x - lx, seg.p2.y - ly);
      return d1 <= radius + 10 || d2 <= radius + 10;
    });

    // Calculate light visibility points
    const polygon = this.calculateVisibilityPolygon(lx, ly, radius, activeSegments);
    if (polygon.length < 3) return;

    ctx.save();
    
    // 1. Draw light visibility mask shape
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x, polygon[i].y);
    }
    ctx.closePath();
    
    // Create soft fading radial gradient centered at source
    const gradient = ctx.createRadialGradient(lx, ly, 2, lx, ly, radius);
    
    // Parse color dynamically to HSL/RGBA for transparency decay
    let colorRgb = '0, 240, 255'; // Cyan default
    if (color && color.startsWith('#')) {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = color.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      if (result) {
        colorRgb = `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
      }
    } else if (color && (color.includes('rgba') || color.includes('rgb'))) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        colorRgb = `${matches[0]}, ${matches[1]}, ${matches[2]}`;
      }
    } else {
      if (color === '#ff007f' || color.includes('255, 0, 127')) colorRgb = '255, 0, 127'; // Pink
      if (color === '#39ff14' || color.includes('57, 255, 20')) colorRgb = '57, 255, 20';   // Green
      if (color === '#ffd700' || color.includes('255, 215, 0')) colorRgb = '255, 215, 0';   // Gold
      if (color === '#ff003c' || color.includes('255, 0, 60')) colorRgb = '255, 0, 60';    // Red
    }
    
    gradient.addColorStop(0, `rgba(${colorRgb}, ${intensity})`);
    gradient.addColorStop(0.3, `rgba(${colorRgb}, ${intensity * 0.45})`);
    gradient.addColorStop(1, `rgba(${colorRgb}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.restore();
  }

  // Draw lightmap layer onto the main game canvas
  blendLightmap(mainCtx) {
    mainCtx.save();
    // Use 'screen' or 'lighter' blend mode for dynamic glowing light overlay compositing
    mainCtx.globalCompositeOperation = 'lighter';
    mainCtx.drawImage(this.lightmapCanvas, 0, 0);
    mainCtx.restore();
  }
}

// Bind to window context
window.LightSource = LightSource;
window.RaycastEngine = RaycastEngine;
