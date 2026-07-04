/* ── Exaholic Game — Main App v2 (Bilingual + Music + Immersive) ── */

const API = window.location.origin;
let content = null, progress = null;
let currentStep = 'reading';
let timerInterval = null;
let secondsRemaining = 600;
let currentLang = 'zh';
let typewriterTimer = null;

// ── UI Strings (i18n) ──
const UI = {
  zh: {
    start: "開始旅程", cont: "繼續旅程", back: "返回", complete: "完成今天",
    next: "下一步 →", mood: "心情紀錄", action: "今日行動", reading_done: "我讀完了 →",
    mood_chart: "📊 心情趨勢", no_data: "還沒有心情記錄", music: "🎵 音樂",
    day: "第", days: "天", progress: "進度", loading: "載入中...",
    stats_high: "最高", stats_low: "最低", stats_avg: "平均", stats_days: "紀錄天數",
    level: "級", time_up: "⏱ 時間到！",
    mood_emoji: ["😢", "😢", "😢", "😐", "😐", "😐", "😊", "😊", "😊", "😊"],
    tracks: ["靜心旋律", "深空之聲", "輕雨白噪音"],
    chart_title: "心情趨勢圖",
  },
  en: {
    start: "Start Journey", cont: "Continue", back: "Back", complete: "Complete Today",
    next: "Next →", mood: "Mood Log", action: "Today's Action", reading_done: "I'm Done →",
    mood_chart: "📊 Mood Chart", no_data: "No mood records yet", music: "🎵 Music",
    day: "Day", days: "", progress: "Progress", loading: "Loading...",
    stats_high: "Highest", stats_low: "Lowest", stats_avg: "Average", stats_days: "Days",
    level: "", time_up: "⏱ Time's up!",
    mood_emoji: ["😢", "😢", "😢", "😐", "😐", "😐", "😊", "😊", "😊", "😊"],
    tracks: ["Calm Melody", "Deep Space", "Gentle Rain"],
    chart_title: "Mood Chart",
  }
};

function t(key) { return (UI[currentLang] || UI.zh)[key] || key; }

// ── Music Engine (Web Audio API) ──
class MusicEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.currentTrack = 0;
    this.volume = 0.3;
    this.nodes = [];
    this.gain = null;
    this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem('music_state');
      if (saved) {
        const s = JSON.parse(saved);
        this.volume = s.volume ?? 0.3;
        this.currentTrack = s.track ?? 0;
      }
    } catch(e) {}
  }

  saveState() {
    try {
      localStorage.setItem('music_state', JSON.stringify({
        volume: this.volume, track: this.currentTrack, playing: this.playing
      }));
    } catch(e) {}
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.ctx.destination);
    }
  }

  play() {
    if (this.playing) return;
    this.init().then(() => {
      this.playing = true;
      this.startTrack();
      this.saveState();
    });
  }

  pause() {
    this.playing = false;
    this.stopTrack();
    this.saveState();
  }

  stopTrack() {
    this.nodes.forEach(n => { try { n.stop(); n.disconnect(); } catch(e) {} });
    this.nodes = [];
  }

  nextTrack() {
    this.currentTrack = (this.currentTrack + 1) % 3;
    this.stopTrack();
    if (this.playing) this.startTrack();
    this.saveState();
  }

  startTrack() {
    if (!this.ctx || !this.gain) return;
    this.stopTrack();

    switch(this.currentTrack) {
      case 0: this.playPiano(); break;
      case 1: this.playPad(); break;
      case 2: this.playRain(); break;
    }
  }

  playPiano() {
    // Gentle piano chord progression: C-G-Am-F
    const notes = [
      [261.63, 329.63, 392.00], // C major
      [392.00, 493.88, 587.33], // G major
      [440.00, 523.25, 659.25], // Am
      [349.23, 440.00, 523.25], // F major
    ];
    const scheduleNext = (idx, time) => {
      if (!this.playing) return;
      const chord = notes[idx % 4];
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(this.volume * 0.15, time + 0.1);
        g.gain.linearRampToValueAtTime(0, time + 2.5);
        osc.connect(g);
        g.connect(this.gain);
        osc.start(time);
        osc.stop(time + 2.5);
        this.nodes.push(osc);
      });
      setTimeout(() => scheduleNext(idx + 1, this.ctx.currentTime + 0.05), 2800);
    };
    scheduleNext(0, this.ctx.currentTime + 0.05);
  }

  playPad() {
    // Ambient pad: sustained tones with gentle modulation
    const freqs = [130.81, 196.00, 261.63, 392.00]; // C3, G3, C4, G4
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      lfo.type = 'sine';
      lfo.frequency.value = 0.2 + Math.random() * 0.3;
      lfoGain.gain.value = 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      g.gain.value = this.volume * 0.04;
      osc.connect(g);
      g.connect(this.gain);
      osc.start();
      lfo.start();
      this.nodes.push(osc, lfo, lfoGain);
    });
  }

  playRain() {
    // White noise rain sound
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = this.volume * 0.06;
    // Low-pass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    source.connect(filter);
    filter.connect(g);
    g.connect(this.gain);
    source.start();
    this.nodes.push(source);
    // Low drone
    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const dg = this.ctx.createGain();
    dg.gain.value = this.volume * 0.08;
    drone.connect(dg);
    dg.connect(this.gain);
    drone.start();
    this.nodes.push(drone);
  }

  setVolume(v) {
    this.volume = v;
    if (this.gain) this.gain.gain.value = v;
    this.saveState();
  }

  getTrackName() { return t('tracks')[this.currentTrack]; }
}

const music = new MusicEngine();

// ── Particles ──
function spawnParticles() {
  const count = 15;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 4;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (15 + Math.random() * 25) + 's';
    p.style.animationDelay = Math.random() * 20 + 's';
    document.body.appendChild(p);
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', init);

async function init() {
  spawnParticles();

  try {
    const [contentRes, progressRes] = await Promise.all([
      fetch(`${API}/api/content`).then(r => r.json()),
      fetch(`${API}/api/progress`).then(r => r.json())
    ]);
    content = contentRes;
    progress = progressRes;
  } catch (e) {
    const resp = await fetch('/api/content');
    content = await resp.json();
    progress = { current_day: 1, completed_days: [], mood_history: [], journal_entries: {}, lang: 'zh' };
  }

  currentLang = progress.lang || 'zh';

  if (progress.completed_days && progress.completed_days.length > 0) {
    document.getElementById('btn-continue').style.display = 'block';
    document.getElementById('btn-continue').textContent = `${t('cont')}（${t('day')} ${progress.current_day}）`;
  }
  document.getElementById('btn-start').textContent = t('start');

  document.getElementById('btn-start').addEventListener('click', () => {
    fetch(`${API}/api/progress/start`, { method: 'POST' }).catch(() => {});
    showScreen('map'); renderMap();
  });
  document.getElementById('btn-continue').addEventListener('click', () => {
    showScreen('map'); renderMap();
  });
  document.getElementById('btn-back').addEventListener('click', () => {
    stopTimer(); showScreen('map'); renderMap();
  });
  document.getElementById('btn-view-map').addEventListener('click', () => {
    stopTimer(); showScreen('map'); renderMap();
  });

  document.querySelectorAll('.btn-next[data-to]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = btn.dataset.to;
      if (target === 'complete') completeDay();
      else showStep(target);
    });
  });

  document.getElementById('action-done').addEventListener('change', (e) => {
    document.getElementById('btn-complete-day').disabled = !e.target.checked;
  });

  document.getElementById('mood-slider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    document.getElementById('mood-value').textContent = val;
    const faces = ['😢','😢','😢','😐','😐','😐','😊','😊','😊','😊'];
    document.getElementById('mood-face').textContent = faces[val - 1] || '😐';
  });
}

// ── Screen Navigation ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Language Toggle ──
function toggleLang() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  fetch(`${API}/api/progress/lang`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({lang: currentLang})
  }).catch(() => {});
  
  // Reload content
  fetch(`${API}/api/content?lang=${currentLang}`).then(r => r.json()).then(c => {
    content = c;
    progress.lang = currentLang;
    // Update lang button texts
    const langText = currentLang === 'zh' ? '🇨🇳 中文' : '🇬🇧 English';
    document.querySelectorAll('.lang-btn').forEach(b => b.textContent = langText);
    // Re-render current view
    const mapActive = document.getElementById('map').classList.contains('active');
    const gameActive = document.getElementById('game').classList.contains('active');
    if (mapActive) renderMap();
    if (gameActive) loadDay(progress.current_day);
  });
}

// ── Music UI ──
function toggleMusic() {
  if (music.playing) {
    music.pause();
    document.querySelector('.music-btn').classList.remove('playing');
  } else {
    music.play();
    document.querySelector('.music-btn').classList.add('playing');
  }
}

function toggleMusicPlayer() {
  document.querySelector('.music-player').classList.toggle('open');
}

// ── Map ──
function renderMap() {
  if (!content || !content.phases || !content.days) return;

  const track = document.getElementById('phases-track');
  track.innerHTML = '';
  const currentDay = progress.current_day || 1;

  content.phases.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'phase-chip';
    const allComplete = p.days.every(d => (progress.completed_days || []).includes(d));
    const inProgress = p.days.includes(currentDay);
    if (allComplete) chip.classList.add('completed');
    else if (inProgress) chip.classList.add('active');
    chip.innerHTML = `${p.icon} ${p.name}`;
    track.appendChild(chip);
  });

  const grid = document.getElementById('map-days');
  grid.innerHTML = '';

  content.days.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    const isCompleted = (progress.completed_days || []).includes(d.day);
    const isCurrent = d.day === currentDay;
    const isLocked = d.day > currentDay + 1;
    if (isCompleted) cell.classList.add('completed');
    if (isCurrent) cell.classList.add('current');
    if (isLocked) cell.classList.add('locked');
    
    const badge = d.badge || '';
    const icon = badge.charAt(0) || '📝';
    cell.innerHTML = `<div class="day-icon">${isCompleted ? '✅' : icon}</div><div class="day-num">${d.day}</div>`;
    cell.addEventListener('click', () => { if (!isLocked) { loadDay(d.day); showScreen('game'); } });
    grid.appendChild(cell);
  });

  updateHeader();
}

function updateHeader() {
  const day = progress.current_day || 1;
  const phase = content.phases.find(p => p.days.includes(day)) || content.phases[0];
  document.getElementById('phase-icon').textContent = phase.icon;
  document.getElementById('phase-name').textContent = phase.name;
  document.getElementById('day-counter').textContent = `${t('day')} ${day} ${t('days')}`;
  
  const completed = (progress.completed_days || []).length;
  document.getElementById('progress-text').textContent = `${completed}/30`;
  const pct = Math.round(completed / 30 * 100);
  document.getElementById('progress-pct').textContent = `${pct}%`;
  const circumference = 94.2;
  document.getElementById('progress-circle').style.strokeDashoffset = circumference - (pct / 100 * circumference);
}

// ── Game Day ──
function loadDay(day) {
  const dayData = content.days.find(d => d.day === day);
  if (!dayData) return;

  const phase = content.phases.find(p => p.days.includes(day));

  currentStep = 'reading';
  document.getElementById('phase-badge').textContent = `${phase.icon} ${phase.name}`;
  document.getElementById('game-day-label').textContent = `${t('day')} ${day}`;
  document.getElementById('action-done').checked = false;
  document.getElementById('btn-complete-day').disabled = true;
  document.getElementById('journal-input').value = progress.journal_entries?.[String(day)] || '';

  document.getElementById('step-reading-title').textContent = dayData.title;
  // Typewriter effect for reading
  const readingEl = document.getElementById('reading-text');
  readingEl.textContent = '';
  if (typewriterTimer) { clearInterval(typewriterTimer); typewriterTimer = null; }
  
  let idx = 0;
  const text = dayData.reading;
  // If text is short, show all at once
  if (text.length < 100) {
    readingEl.textContent = text;
  } else {
    typewriterTimer = setInterval(() => {
      if (idx >= text.length) { clearInterval(typewriterTimer); typewriterTimer = null; return; }
      readingEl.textContent += text[idx];
      idx++;
    }, 15);
  }

  document.getElementById('question-text').textContent = dayData.question;
  document.getElementById('action-text').textContent = dayData.action;
  document.querySelector('.btn-next[data-to="reading_done"]').textContent = t('reading_done');

  showStep('reading');
  startTimer();
}

function showStep(step) {
  document.querySelectorAll('.game-step').forEach(s => s.style.display = 'none');
  const el = document.getElementById(`step-${step}`);
  if (el) { el.style.display = 'block'; el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; }
  if (step === 'reading') {
    const btn = document.querySelector('.btn-next[data-to]');
    if (btn) btn.textContent = t('reading_done');
  }
  currentStep = step;
  window.scrollTo(0, 0);
}

// ── Timer ──
function startTimer() {
  secondsRemaining = 600;
  updateTimerDisplay();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsRemaining--;
    updateTimerDisplay();
    if (secondsRemaining <= 0) {
      clearInterval(timerInterval); timerInterval = null;
      document.getElementById('timer').textContent = t('time_up');
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerDisplay() {
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  document.getElementById('timer').textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;
  document.getElementById('timer').style.color = secondsRemaining < 60 ? '#e53935' : '#7c5cfc';
}

// ── Complete Day ──
async function completeDay() {
  const day = progress.current_day || 1;
  const dayData = content.days.find(d => d.day === day);
  const mood = parseInt(document.getElementById('mood-slider').value);
  const journal = document.getElementById('journal-input').value;

  const payload = { day, mood };
  if (journal.trim()) payload.journal = journal;

  try {
    const resp = await fetch(`${API}/api/progress/complete-day?lang=${currentLang}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    progress = await resp.json();
  } catch (e) {
    if (!progress.completed_days) progress.completed_days = [];
    if (!progress.completed_days.includes(day)) progress.completed_days.push(day);
    if (!progress.mood_history) progress.mood_history = [];
    progress.mood_history.push({ day, score: mood, timestamp: new Date().toISOString() });
    if (!progress.journal_entries) progress.journal_entries = {};
    if (journal.trim()) progress.journal_entries[String(day)] = journal;
    progress.current_day = Math.min(day + 1, 30);
  }

  if (dayData) {
    document.getElementById('complete-icon').textContent = dayData.badge?.charAt(0) || '🫂';
    document.getElementById('complete-badge').textContent = `${dayData.badge || 'Done!'}`;
    document.getElementById('affirmation-text').textContent = `「${dayData.affirmation}」`;
    document.getElementById('complete-message').textContent = `${t('level')} ${dayData.badge || ''} ${t('level') ? '達成' : 'achieved!'}`;
  }

  showStep('complete');
  stopTimer();
}

// ── Mood Chart ──
function showMoodChart() {
  // Create mood chart screen if not exists
  let chartScreen = document.getElementById('mood-chart');
  if (!chartScreen) {
    chartScreen = document.createElement('div');
    chartScreen.id = 'mood-chart';
    chartScreen.className = 'screen';
    chartScreen.innerHTML = `
      <div class="game-header">
        <div class="header-left">
          <button class="btn-icon" onclick="showScreen('map');renderMap()">←</button>
          <span class="day-label">${t('chart_title')}</span>
        </div>
      </div>
      <div class="mood-chart-container">
        <canvas id="mood-canvas"></canvas>
      </div>
      <div class="mood-stats" id="mood-stats"></div>
      <div style="text-align:center;color:#888;font-size:.85rem;margin-top:16px" id="mood-empty">${t('no_data')}</div>
    `;
    document.getElementById('app').appendChild(chartScreen);
  }

  showScreen('mood-chart');
  
  fetch(`${API}/api/mood-chart`).then(r => r.json()).then(data => {
    const emptyEl = document.getElementById('mood-empty');
    const statsEl = document.getElementById('mood-stats');
    const canvas = document.getElementById('mood-canvas');

    if (!data || data.length === 0) {
      emptyEl.style.display = 'block';
      statsEl.innerHTML = '';
      return;
    }
    emptyEl.style.display = 'none';

    // Stats
    const scores = data.map(d => d.score);
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    const avg = (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1);
    statsEl.innerHTML = `
      <div class="mood-stat"><div class="mood-stat-value">${high}</div><div class="mood-stat-label">${t('stats_high')}</div></div>
      <div class="mood-stat"><div class="mood-stat-value">${low}</div><div class="mood-stat-label">${t('stats_low')}</div></div>
      <div class="mood-stat"><div class="mood-stat-value">${avg}</div><div class="mood-stat-label">${t('stats_avg')}</div></div>
      <div class="mood-stat"><div class="mood-stat-value">${data.length}</div><div class="mood-stat-label">${t('stats_days')}</div></div>
    `;

    // Canvas chart
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.min(rect.width - 16, 400);
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const pad = { t: 20, r: 16, b: 24, l: 30 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let y = 1; y <= 10; y++) {
      const yPos = pad.t + ch - (y / 10 * ch);
      ctx.beginPath(); ctx.moveTo(pad.l, yPos); ctx.lineTo(w - pad.r, yPos); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Reference line at 5
    const refY = pad.t + ch - (5 / 10 * ch);
    ctx.strokeStyle = 'rgba(124,92,252,.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, refY); ctx.lineTo(w - pad.r, refY); ctx.stroke();
    ctx.fillStyle = 'rgba(124,92,252,.3)';
    ctx.font = '9px sans-serif';
    ctx.fillText('5', 2, refY + 3);

    // Line chart
    const points = data.slice(-30);
    const stepX = points.length > 1 ? cw / (points.length - 1) : cw;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#7c5cfc';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    points.forEach((p, i) => {
      const x = pad.l + i * stepX;
      const y = pad.t + ch - (p.score / 10 * ch);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw dots
    points.forEach((p, i) => {
      const x = pad.l + i * stepX;
      const y = pad.t + ch - (p.score / 10 * ch);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.score <= 3 ? '#e53935' : p.score <= 6 ? '#ff9800' : '#4caf50';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  });
}
