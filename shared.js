/**
 * CHARGEGUARD - Shared Configuration & Utilities
 * Multi-Edge Charging Station Security & Battery Estimator
 */

// Status Definition Constants
const STATUS_CONFIG = {
  1: {
    code: 1,
    name: 'AMAN / MENGISI DAYA',
    desc: 'Aliran listrik aktif, baterai sedang diisi, tidak ada getaran mencurigakan.',
    color: '#10b981', // Emerald green
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    icon: '⚡',
    faIcon: 'fa-solid fa-bolt'
  },
  2: {
    code: 2,
    name: 'BATERAI PENUH (SIAP DICABUT)',
    desc: 'Baterai telah mencapai ambang batas >= 95%. Siap dicabut oleh pemilik.',
    color: '#06b6d4', // Cyan
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    icon: '🔋',
    faIcon: 'fa-solid fa-battery-full'
  },
  3: {
    code: 3,
    name: 'PERINGATAN: KABEL LEPAS / PADAM',
    desc: 'Pengisian terputus tetapi sensor gerak tidak mendeteksi sentakan fisik.',
    color: '#f59e0b', // Amber / Orange
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    icon: '⚠️',
    faIcon: 'fa-solid fa-triangle-exclamation'
  },
  4: {
    code: 4,
    name: 'BAHAYA: PENCABUTAN PAKSA / PENCURIAN!',
    desc: 'Kabel charger terputus bersamaan dengan lonjakan getaran gerak fisik (SMV > Threshold)!',
    color: '#ef4444', // Red
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse',
    icon: '🚨',
    faIcon: 'fa-solid fa-triangle-exclamation'
  }
};

// Default MQTT Configuration (Public WebSockets Broker)
const DEFAULT_MQTT_CONFIG = {
  // HiveMQ public WSS broker: broker.hivemq.com port 8884 (path: /mqtt)
  host: 'broker.hivemq.com',
  port: 8884,
  path: '/mqtt',
  useSSL: true,
  clientIdPrefix: 'chargeguard_'
};

// Automatic cleanup of legacy/unstable brokers from localStorage
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('cg_mqtt_host') === 'broker.emqx.io') {
    localStorage.removeItem('cg_mqtt_host');
    localStorage.removeItem('cg_mqtt_port');
  }
} catch (e) {}

/**
 * Helper to get or generate Room ID from URL query params or localStorage
 */
function getRoomId() {
  const urlParams = new URLSearchParams(window.location.search);
  let room = urlParams.get('room');
  if (!room) {
    room = localStorage.getItem('chargeguard_room') || 'iot-lab-101';
  }
  localStorage.setItem('chargeguard_room', room);
  return room;
}

/**
 * Generate standard MQTT topics for a given Room ID
 */
function getTopics(roomId) {
  const cleanRoom = (roomId || 'default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return {
    telemetry: `chargeguard/${cleanRoom}/node1/telemetry`,
    alert: `chargeguard/${cleanRoom}/node1/alert`,
    command: `chargeguard/${cleanRoom}/command`,
    heartbeat: `chargeguard/${cleanRoom}/node1/heartbeat`
  };
}

/**
 * Web Audio API Siren Synthesizer
 * Generates an alarming sound without needing external MP3 audio files.
 */
class SirenSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.timer = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  startAlarm() {
    this.init();
    if (!this.audioCtx || this.isPlaying) return;

    this.isPlaying = true;
    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.type = 'sawtooth';
    this.gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.oscillator.start();

    // Frequency modulation for police siren (600Hz -> 1300Hz ramp)
    let freqUp = true;
    const sweep = () => {
      if (!this.isPlaying || !this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      if (freqUp) {
        this.oscillator.frequency.linearRampToValueAtTime(1250, now + 0.35);
      } else {
        this.oscillator.frequency.linearRampToValueAtTime(650, now + 0.35);
      }
      freqUp = !freqUp;
      this.timer = setTimeout(sweep, 350);
    };
    sweep();
  }

  stopAlarm() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {}
      this.oscillator = null;
    }
  }

  testBeep(freq = 880, duration = 200) {
    this.init();
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration / 1000);
    } catch (e) {
      console.warn('Audio test beep error:', e);
    }
  }
}

/**
 * Screen Wake Lock Utility
 */
class WakeLockManager {
  constructor() {
    this.wakeLock = null;
    this.isSupported = 'wakeLock' in navigator;
    this.shouldKeepAlive = false;

    // Otomatis minta ulang wakeLock saat tab kembali terlihat di layar
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (this.shouldKeepAlive && document.visibilityState === 'visible') {
          await this.acquire();
        }
      });
    }
  }

  async acquire() {
    this.shouldKeepAlive = true;
    if (!this.isSupported) {
      console.warn('Screen Wake Lock API not supported on this browser.');
      return false;
    }
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        console.log('Screen Wake Lock released.');
      });
      console.log('Screen Wake Lock acquired successfully.');
      return true;
    } catch (err) {
      console.warn('Wake Lock error:', err.message);
      return false;
    }
  }

  release() {
    this.shouldKeepAlive = false;
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }
}

/**
 * Linear Regression Calculator
 * Computes slope (m) and intercept (c) for time-series battery points:
 * (t, level) where t is in minutes, level is in % (0 - 100)
 */
function calculateLinearRegression(points) {
  // points = [ { t: minutes, level: percent }, ... ]
  if (!points || points.length < 2) {
    return null;
  }

  const n = points.length;
  let sumT = 0;
  let sumL = 0;
  let sumTL = 0;
  let sumT2 = 0;

  for (let i = 0; i < n; i++) {
    const t = points[i].t;
    const l = points[i].level;
    sumT += t;
    sumL += l;
    sumTL += t * l;
    sumT2 += t * t;
  }

  const denominator = n * sumT2 - sumT * sumT;
  if (Math.abs(denominator) < 1e-6) {
    return null; // slope undefined or zero variation in time
  }

  const m = (n * sumTL - sumT * sumL) / denominator;
  const c = (sumL - m * sumT) / n;

  // Predict time t when level = 100%
  // 100 = m * t_full + c  =>  t_full = (100 - c) / m
  let tFull = null;
  let remainingMinutes = null;

  if (m > 0.001) {
    tFull = (100 - c) / m;
    const latestT = points[points.length - 1].t;
    remainingMinutes = Math.max(0, tFull - latestT);
  }

  return {
    slope: m, // % battery per minute
    intercept: c,
    pointsCount: n,
    tFullMinutes: tFull,
    remainingMinutes: remainingMinutes ? Math.round(remainingMinutes) : null
  };
}

// Export to window
window.ChargeGuard = {
  STATUS_CONFIG,
  DEFAULT_MQTT_CONFIG,
  getRoomId,
  getTopics,
  SirenSynthesizer,
  WakeLockManager,
  calculateLinearRegression
};
