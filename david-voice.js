(function () {
  let audioCtx = null;
  let unlocked = true;
  let voices = [];
  let humNodes = null;

  if (window.speechSynthesis) window.speechSynthesis.cancel();

  function refreshVoices() {
    if (!window.speechSynthesis) return;
    voices = window.speechSynthesis.getVoices();
  }

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audioCtx = new AudioContext();
    return audioCtx;
  }

  function unlockAudio() {
    unlocked = true;
    refreshVoices();
    const ctx = ensureAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function speak(text) {
    if (!text) return Promise.resolve();
    return new Promise((resolve) => {
      if (speakWithSynthesis(text, resolve)) {
      addElectronicTexture(text);
      return;
      }
      speakWithFallbackTone(text);
      const fallbackTime = Math.min(1500, Math.max(320, text.length * 36));
      window.setTimeout(resolve, fallbackTime);
    });
  }

  function pickVoice() {
    // Windows usually has "David"; keep fallbacks because school computers are mysterious
    refreshVoices();
    const preferred = [
      'Microsoft David',
      'Microsoft Mark',
      'Google UK English Male',
      'Daniel',
      'Alex',
      'Fred'
    ];
    for (const name of preferred) {
      const voice = voices.find((item) => item.name.toLowerCase().includes(name.toLowerCase()));
      if (voice) return voice;
    }
    return voices.find((item) => /male|david|mark|daniel|alex|fred/i.test(item.name))
      || voices.find((item) => /^en[-_]/i.test(item.lang))
      || voices[0]
      || null;
  }

  function speakWithSynthesis(text, done) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice ? voice.lang : 'en-US';
    utterance.rate = 1.08;
    utterance.pitch = 0.5;
    utterance.volume = 0.92;
    utterance.onend = () => {
      if (done) done();
    };
    utterance.onerror = () => {
      if (done) done();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function addElectronicTexture(text) {
    // very low in the mix, just enough to make the voice feel wrong
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      if (ctx.state === 'suspended') return;
    }

    const now = ctx.currentTime;
    const duration = Math.min(1.4, Math.max(0.18, text.length * 0.016));
    const master = ctx.createGain();
    const carrier = ctx.createOscillator();
    const pulse = ctx.createOscillator();
    const pulseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.018, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    carrier.type = 'square';
    carrier.frequency.setValueAtTime(930, now);
    pulse.type = 'square';
    pulse.frequency.setValueAtTime(22, now);
    pulseGain.gain.setValueAtTime(18, now);
    pulse.connect(pulseGain);
    pulseGain.connect(carrier.frequency);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(620, now);
    carrier.connect(filter);
    filter.connect(master);
    master.connect(ctx.destination);

    pulse.start(now);
    carrier.start(now);
    pulse.stop(now + duration);
    carrier.stop(now + duration);
  }

  function speakWithFallbackTone(text) {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      if (ctx.state === 'suspended') return;
    }

    const clean = text.replace(/[^a-z0-9]+/gi, ' ').trim();
    const syllables = Math.min(18, Math.max(2, clean.split(/\s+/).length));
    const start = ctx.currentTime;
    for (let i = 0; i < syllables; i++) {
      const t = start + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = i % 2 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(160 + (i % 5) * 42, t);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(720 + (i % 4) * 160, t);
      filter.Q.setValueAtTime(4, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.08, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  function buzz(duration = 0.28, gain = 0.018, frequency = 118) {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      if (ctx.state === 'suspended') return;
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const trem = ctx.createOscillator();
    const tremGain = ctx.createGain();
    const output = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, now);
    trem.type = 'sine';
    trem.frequency.setValueAtTime(31, now);
    tremGain.gain.setValueAtTime(8, now);
    trem.connect(tremGain);
    tremGain.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency * 3.2, now);
    filter.Q.setValueAtTime(2.8, now);
    output.gain.setValueAtTime(0.0001, now);
    output.gain.linearRampToValueAtTime(gain, now + 0.035);
    output.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(output);
    output.connect(ctx.destination);
    trem.start(now);
    osc.start(now);
    trem.stop(now + duration);
    osc.stop(now + duration);
  }

  function startHum(duration = 6.4, maxGain = 0.028) {
    const ctx = ensureAudio();
    if (!ctx || humNodes) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      if (ctx.state === 'suspended') return;
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const wobble = ctx.createOscillator();
    const wobbleGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(82, now);
    wobble.type = 'sine';
    wobble.frequency.setValueAtTime(7.5, now);
    wobbleGain.gain.setValueAtTime(5, now);
    wobble.connect(wobbleGain);
    wobbleGain.connect(osc.frequency);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);
    filter.Q.setValueAtTime(1.8, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(maxGain, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    wobble.start(now);
    humNodes = { osc, wobble, gain };
  }

  function stopHum() {
    if (!humNodes || !audioCtx) return;
    const now = audioCtx.currentTime;
    humNodes.gain.gain.cancelScheduledValues(now);
    humNodes.gain.gain.setValueAtTime(humNodes.gain.gain.value || 0.0001, now);
    humNodes.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    humNodes.osc.stop(now + 0.28);
    humNodes.wobble.stop(now + 0.28);
    humNodes = null;
  }

  function cancel() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopHum();
  }

  function estimateDuration(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length || 1;
    return Math.min(5200, Math.max(760, words * 390));
  }

  function estimateMouthDuration(text) {
    return Math.max(320, estimateDuration(text) - 1000);
  }

  window.DAVIDVoice = { speak, unlock: unlockAudio, buzz, startHum, stopHum, cancel, estimateDuration, estimateMouthDuration };
  window.addEventListener('pointerdown', unlockAudio, { capture: true });
  window.addEventListener('keydown', unlockAudio, { capture: true });
  window.addEventListener('pagehide', cancel);
  window.addEventListener('beforeunload', cancel);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel();
  });
  refreshVoices();
  if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = refreshVoices;
})();
