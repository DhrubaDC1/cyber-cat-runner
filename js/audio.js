/* ==========================================================================
   CYBER CAT // WEB AUDIO SYNTHESIZER
   PROGRAMMATIC SCI-FI SFX ENGINE (NO EXTERNAL AUDIO FILES REQUIRED)
   ========================================================================== */

class CyberAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    
    // We will initialize the context on first user gesture
    this.gestures = ['click', 'touchstart', 'keydown'];
    this.setupGestureListeners();
  }

  setupGestureListeners() {
    const initFn = () => {
      this.initContext();
      this.gestures.forEach(g => window.removeEventListener(g, initFn));
    };
    this.gestures.forEach(g => window.addEventListener(g, initFn, { passive: true }));
  }

  initContext() {
    if (this.ctx) return;
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Create master gain control for volume adjustments
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.35 : 0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported in this browser:", e);
    }
  }

  setMute(isMuted) {
    this.enabled = !isMuted;
    this.initContext(); // Ensure initialized
    
    if (this.ctx && this.masterGain) {
      // Smoothly transition volume to avoid popping sounds
      this.masterGain.gain.setTargetAtTime(
        this.enabled ? 0.35 : 0,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  toggleMute() {
    this.setMute(this.enabled);
    return !this.enabled;
  }

  // --- SCI-FI SFX METHODS ---

  playHover() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.setValueAtTime(150, this.ctx.currentTime + 0.02);

    gainNode.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playJump() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    // Use Triangle wave for a warmer classic arcade synth jump
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    // Rapidly sweep frequency upwards to create the jump sweep
    osc.frequency.exponentialRampToValueAtTime(620, this.ctx.currentTime + 0.18);

    gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  playDoubleJump() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Two short rapid frequency sweeps
    const time = this.ctx.currentTime;
    
    // Sweep 1 (higher base pitch)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(350, time);
    osc1.frequency.exponentialRampToValueAtTime(750, time + 0.12);
    gain1.gain.setValueAtTime(0.15, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(time);
    osc1.stop(time + 0.12);

    // Sweep 2 (slightly offset)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(500, time + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(900, time + 0.17);
    gain2.gain.setValueAtTime(0.12, time + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.17);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(time + 0.05);
    osc2.stop(time + 0.17);
  }

  playLand() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    // Deep low frequency sweep for physical landing impact
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playGem() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const time = this.ctx.currentTime;
    
    // Crystalline digital chime using twin sine waves offset in pitch and time
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.50, time); // C6 Note
    osc1.frequency.setValueAtTime(1318.51, time + 0.04); // E6 Note
    gain1.gain.setValueAtTime(0.12, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(time);
    osc1.stop(time + 0.2);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1567.98, time + 0.06); // G6 Note
    gain2.gain.setValueAtTime(0.08, time + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(time + 0.06);
    osc2.stop(time + 0.25);
  }

  playCrash() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const time = this.ctx.currentTime;
    const duration = 0.4;
    
    // 1. Noise Generator for debris explosion sound
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill the buffer with white noise (random values between -1.0 and 1.0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(50, time + duration);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    noiseSource.start(time);
    noiseSource.stop(time + duration);

    // 2. Low boom oscillator to add heavy physical weight
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    
    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(100, time);
    boomOsc.frequency.exponentialRampToValueAtTime(30, time + duration);
    
    boomGain.gain.setValueAtTime(0.25, time);
    boomGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    
    boomOsc.start(time);
    boomOsc.stop(time + duration);
  }

  playUnlock() {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const time = this.ctx.currentTime;
    
    // An upward major arpeggio for rewards
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.08);
      
      gain.gain.setValueAtTime(0.12, time + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(time + idx * 0.08);
      osc.stop(time + idx * 0.08 + 0.25);
    });
  }
}

// Instantiate sound engine globally
const CyberAudio = new CyberAudioEngine();
window.CyberAudio = CyberAudio;
