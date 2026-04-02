/* Browser-synthesized sound effects using Web Audio API */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** Short percussive drumroll — plays for ~0.6s */
export function playDrumroll() {
  const ctx = getCtx();
  const duration = 0.55;
  const hits = 18;

  for (let i = 0; i < hits; i++) {
    const t = ctx.currentTime + (i / hits) * duration;
    // noise burst
    const bufSize = 800;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let s = 0; s < bufSize; s++) data[s] = (Math.random() * 2 - 1) * 0.4;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gain = ctx.createGain();
    const vol = 0.08 + (i / hits) * 0.18; // crescendo
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 200 + Math.random() * 100;
    filter.Q.value = 1.5;

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.05);
  }
}

/** Bright fanfare — two rising tones + shimmer */
export function playFanfare() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const notes = [
    { freq: 523.25, start: 0, dur: 0.18 },     // C5
    { freq: 659.25, start: 0.12, dur: 0.18 },   // E5
    { freq: 783.99, start: 0.24, dur: 0.35 },   // G5
    { freq: 1046.5, start: 0.38, dur: 0.5 },    // C6 (hold)
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.15, now + start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.01);
  });

  // shimmer overtone
  const shimmer = ctx.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.value = 2093;
  const sGain = ctx.createGain();
  sGain.gain.setValueAtTime(0, now + 0.4);
  sGain.gain.linearRampToValueAtTime(0.06, now + 0.5);
  sGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
  shimmer.connect(sGain).connect(ctx.destination);
  shimmer.start(now + 0.4);
  shimmer.stop(now + 1.2);
}

/** Victory confetti fanfare — fuller, longer */
export function playVictoryFanfare() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const chords = [
    [523.25, 659.25, 783.99],   // C major
    [587.33, 739.99, 880],       // D major
    [659.25, 830.61, 987.77],   // E major (resolve)
    [783.99, 987.77, 1174.66],  // G major (finale)
  ];

  chords.forEach((chord, ci) => {
    const start = ci * 0.2;
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = ci === 3 ? "triangle" : "square";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const vol = ci === 3 ? 0.1 : 0.07;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + (ci === 3 ? 0.8 : 0.3));

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + 1);
    });
  });
}

/** Swoosh sound — quick frequency sweep for rank shifts */
export function playSwoosh() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // White noise swoosh
  const bufSize = ctx.sampleRate * 0.25;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(3000, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);
  filter.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.25);

  // Subtle tonal swoosh
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.18);

  const oGain = ctx.createGain();
  oGain.gain.setValueAtTime(0.08, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(oGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
}
