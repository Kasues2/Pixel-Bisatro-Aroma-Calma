/**
 * Simple Web Audio API Synthesizer for Cozy SFX
 * No external files needed.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private volume: number = 0.3;
  private isMuted: boolean = false;
  
  // Ambience nodes
  private ambienceGain: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private clinkInterval: number | null = null;

  constructor() {
    try {
      // Initialize on user interaction usually, but we set up the object first
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, slideTo?: number) {
    if (this.isMuted || !this.ctx) return;
    
    // Resume context if suspended (browser policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // --- AMBIENCE GENERATOR ---
  
  startAmbience() {
    if (this.isMuted || !this.ctx || this.ambienceSource) return;

    if (this.ctx.state === 'suspended') this.ctx.resume();

    // 1. Generate Brown Noise (Simulates distant chatter/HVAC rumble)
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter integration
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Compensate for gain loss
    }

    this.ambienceSource = this.ctx.createBufferSource();
    this.ambienceSource.buffer = buffer;
    this.ambienceSource.loop = true;

    // Filter to make it sound muffled (background)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = 0.15; // Low volume background

    this.ambienceSource.connect(filter);
    filter.connect(this.ambienceGain);
    this.ambienceGain.connect(this.ctx.destination);
    
    this.ambienceSource.start();

    // 2. Schedule random "Clinks" (Cutlery/Plates)
    this.scheduleClinks();
  }

  stopAmbience() {
    if (this.ambienceSource) {
        this.ambienceSource.stop();
        this.ambienceSource = null;
    }
    if (this.clinkInterval) {
        window.clearTimeout(this.clinkInterval);
        this.clinkInterval = null;
    }
  }

  private scheduleClinks() {
      if (!this.ctx || this.isMuted) return;

      const randomTime = 500 + Math.random() * 3000; // 0.5s to 3.5s
      
      this.clinkInterval = window.setTimeout(() => {
          if (!this.isMuted) this.playClink();
          this.scheduleClinks();
      }, randomTime);
  }

  private playClink() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // High pitch, metallic sine
      osc.frequency.setValueAtTime(2000 + Math.random() * 1000, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
  }

  // --- SFX ---

  playPop() {
    this.playTone(600, 'sine', 0.1);
  }

  playKeyType() {
    // Soft woodblock sound
    this.playTone(300 + Math.random() * 50, 'triangle', 0.05);
  }

  playCookStart() {
    // Sizzle-ish
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playOrderUp() {
    // Ding!
    this.playTone(800, 'sine', 1.5);
    setTimeout(() => this.playTone(1200, 'sine', 1.5), 100);
  }

  playCash() {
    // Ca-ching
    this.playTone(1000, 'square', 0.1);
    setTimeout(() => this.playTone(1500, 'square', 0.2), 100);
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.3, 100);
  }

  playTrash() {
    this.playTone(100, 'sawtooth', 0.2, 50);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
        this.stopAmbience();
    } else {
        // If we are supposed to be playing ambience (game logic should handle this, 
        // but for simplicity, if we unmute, we don't auto-restart unless game calls start)
    }
    return this.isMuted;
  }
}

export const audioManager = new AudioManager();