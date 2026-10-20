// Djuren i Glimmerdal: the music. A tiny chip synth in the browser (pulse waves, a triangle bass and noise drums, like an old
// game console) plays two songs of our own that take turns: "Glimmerdal" and "Stjärnnatt". No sound files, nothing downloaded.
//
// A song is a list of bars. Each bar has a chord (the bass and the arpeggio are made from it) and a melody of 8 steps (eighth notes):
// a note such as "E5", "-" holds the note before, "." is a rest. The drums are a pattern of 8 steps per bar.
//
//   Musik.start()   starts (after a click, browsers do not allow sound before that)
//   Musik.stop()
//   Musik.paus(true | false)   pauses while the page is hidden
//   Musik.natt(true | false)   at night only "Stjärnnatt" is played, by day the two songs take turns
//   Musik.spela(ctx, dest, index, t0)   schedules one whole song on any AudioContext (also an OfflineAudioContext), returns its length
(function (root) {
'use strict';

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = name => { const m = /^([A-G]#?)(\d)$/.exec(name); return 440 * 2 ** ((NOTE[m[1]] + 12 * (+m[2] + 1) - 69) / 12); };
const CHORD = {
  C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'],
  Dm: ['D', 'F', 'A'], E: ['E', 'G#', 'B'], Em: ['E', 'G', 'B'],
};

// ---------- the two songs
const bar = (ch, mel) => ({ ch, mel });
const GLIMMERDAL = (() => {
  const intro = [bar('C', '. . . . . . . .'), bar('C', '. . . . . . . .')];
  const A = [
    bar('C', 'E5 - G5 - C6 - B5 A5'), bar('G', 'G5 - - - D5 - G5 -'), bar('Am', 'A5 - C6 - E5 - A5 G5'), bar('F', 'F5 - - - C5 - . .'),
    bar('C', 'E5 - G5 - C6 - D6 C6'), bar('G', 'B5 - G5 - D5 - G5 -'), bar('F', 'A5 - F5 - C6 - A5 -'), bar('G', 'G5 - - - - - . .'),
  ];
  const B = [
    bar('Am', 'C6 - B5 A5 E5 - A5 -'), bar('F', 'C6 - A5 - F5 - A5 C6'), bar('C', 'E6 - D6 C6 G5 - C6 -'), bar('G', 'D6 - - - B5 - G5 -'),
    bar('Am', 'A5 - C6 - E6 - D6 C6'), bar('F', 'C6 - A5 - F5 - G5 A5'), bar('G', 'B5 - D6 - G5 - B5 -'), bar('G', 'D6 - - - C6 B5 A5 G5'),
  ];
  const slut = [...A.slice(0, 7), bar('C', 'C6 - - - - - - -')];
  return {
    namn: 'Glimmerdal', bpm: 112,
    takter: [...intro, ...A, ...B, ...A, ...B, ...slut],
    trummor: { k: 'k . . . k . . .', s: '. . s . . . s .', h: '. h . h . h . h' },
    ljud: { lead: { form: .25, vol: .10 }, arp: { form: .125, vol: .035, oktav: 4, takt: 1 }, bas: { vol: .22 }, eko: 0 },
  };
})();
const STJARNNATT = (() => {
  const intro = [bar('Am', '. . . . . . . .'), bar('Am', '. . . . . . . .')];
  const A = [bar('Am', 'E5 - - - A5 - B5 -'), bar('F', 'C6 - - - A5 - - -'), bar('C', 'G5 - - - E5 - G5 -'), bar('G', 'D5 - - - - - - -')];
  const A2 = [bar('Am', 'E5 - - - A5 - C6 -'), bar('F', 'B5 - A5 - F5 - - -'), bar('Dm', 'A5 - - - F5 - D5 -'), bar('E', 'E5 - - - G#5 - B5 -')];
  const B = [
    bar('F', 'A5 - C6 - F6 - E6 -'), bar('G', 'D6 - - - B5 - G5 -'), bar('Em', 'B5 - - - G5 - E5 -'), bar('Am', 'A5 - - - - - . .'),
    bar('F', 'A5 - C6 - F6 - A6 -'), bar('G', 'G6 - - - D6 - B5 -'), bar('E', 'G#5 - - - B5 - E6 -'), bar('E', 'D6 - - - B5 - G#5 -'),
  ];
  const slut = [...A2.slice(0, 3), bar('Am', 'A5 - - - - - - -')];
  return {
    namn: 'Stjärnnatt', bpm: 84,
    takter: [...intro, ...A, ...A2, ...B, ...A, ...slut],
    trummor: { k: 'k . . . . . . .', s: '. . . . . . . .', h: '. . h . . . h .' },
    ljud: { lead: { form: .5, vol: .075 }, arp: { form: .125, vol: .03, oktav: 5, takt: 2 }, bas: { vol: .18 }, eko: .32 },
  };
})();
const SONGS = [GLIMMERDAL, STJARNNATT];

// ---------- the instruments
const waves = new WeakMap();
function pulse(ctx, duty) {
  let byDuty = waves.get(ctx); if (!byDuty) waves.set(ctx, byDuty = {});
  if (byDuty[duty]) return byDuty[duty];
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * 1.2;
  return (byDuty[duty] = ctx.createPeriodicWave(re, im));
}
const noiseBuf = new WeakMap();
function noise(ctx) {
  if (noiseBuf.has(ctx)) return noiseBuf.get(ctx);
  const b = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf.set(ctx, b); return b;
}
function tone(ctx, dest, { f, t, len, vol, duty, tri }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  if (tri) o.type = 'triangle'; else o.setPeriodicWave(pulse(ctx, duty));
  o.frequency.value = f;
  const end = t + Math.max(.05, len);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + .008);
  g.gain.linearRampToValueAtTime(vol * .7, t + .08);
  g.gain.setValueAtTime(vol * .7, end - .04);
  g.gain.linearRampToValueAtTime(0, end);
  o.connect(g).connect(dest); o.start(t); o.stop(end + .02);
}
function drum(ctx, dest, kind, t, soft) {
  if (kind === 'k') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + .14);
    g.gain.setValueAtTime(soft ? .25 : .4, t); g.gain.exponentialRampToValueAtTime(.001, t + .16);
    o.connect(g).connect(dest); o.start(t); o.stop(t + .18);
    return;
  }
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise(ctx);
  const len = kind === 's' ? .12 : .035;
  f.type = kind === 's' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 's' ? 1800 : 7000;
  g.gain.setValueAtTime((kind === 's' ? .12 : .05) * (soft ? .6 : 1), t); g.gain.exponentialRampToValueAtTime(.001, t + len);
  s.connect(f).connect(g).connect(dest); s.start(t); s.stop(t + len + .02);
}

// Schedules a whole song from time t0 and returns how long it is, in seconds
function spela(ctx, dest, index, t0) {
  const song = SONGS[index], L = song.ljud, step = 60 / song.bpm / 2;
  let out = dest;
  if (L.eko) {   // a soft echo for the dreamy song
    const mix = ctx.createGain(), d = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    d.delayTime.value = step * 3; fb.gain.value = .3; wet.gain.value = L.eko;
    mix.connect(dest); mix.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(dest);
    out = mix;
  }
  song.takter.forEach((b, bi) => {
    const tb = t0 + bi * 8 * step, notes = CHORD[b.ch];
    // melody: a note lasts until the next note or rest
    const mel = b.mel.split(' ');
    mel.forEach((tok, i) => {
      if (tok === '-' || tok === '.') return;
      let n = 1; while (i + n < 8 && mel[i + n] === '-') n++;
      tone(ctx, out, { f: freq(tok), t: tb + i * step, len: n * step * .92, vol: L.lead.vol, duty: L.lead.form });
    });
    // bass: the root on beat 1 and 3, the fifth on beat 2 and 4
    const root = notes[0], fifth = notes[2];
    [root, fifth, root, fifth].forEach((nm, q) => tone(ctx, dest, { f: freq(nm + (NOTE[nm] >= NOTE.F ? '2' : '3')), t: tb + q * 2 * step, len: step * 1.7, vol: L.bas.vol, tri: true }));
    // arpeggio: the chord tones going up, one per step (or every other step in the slow song)
    for (let i = 0; i < 8; i += L.arp.takt) {
      const nm = notes[(i / L.arp.takt) % 3];
      tone(ctx, out, { f: freq(nm + L.arp.oktav), t: tb + i * step, len: step * .8 * L.arp.takt, vol: L.arp.vol, duty: L.arp.form });
    }
    // drums, not in the intro
    if (bi >= 2) for (const [k, pat] of Object.entries(song.trummor)) pat.split(' ').forEach((tok, i) => { if (tok === k) drum(ctx, dest, k, tb + i * step, song.bpm < 100); });
  });
  return song.takter.length * 8 * step + 1.5;
}

// ---------- the player on the page: the songs take turns with a short pause between them
const P = { ctx: null, master: null, bus: null, next: 0, end: 0, timer: 0, on: false, vol: .35, natt: false };
function start() {
  if (P.on) return;
  const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
  if (!P.ctx) { P.ctx = new AC(); P.master = P.ctx.createGain(); P.master.connect(P.ctx.destination); }
  P.on = true;
  P.master.gain.cancelScheduledValues(P.ctx.currentTime); P.master.gain.setValueAtTime(P.vol, P.ctx.currentTime);
  P.ctx.resume();
  P.end = 0;
  tick();
  P.timer = setInterval(tick, 500);
}
function tick() {
  if (!P.on || P.ctx.state !== 'running') return;
  const now = P.ctx.currentTime;
  if (now >= P.end) {   // the song is over (or none has started): the next one, after a pause of two seconds
    if (P.bus) P.bus.disconnect();
    P.bus = P.ctx.createGain(); P.bus.connect(P.master);
    const t0 = now + (P.end ? 2 : .1);
    const index = P.natt ? 1 : P.next;
    P.end = t0 + spela(P.ctx, P.bus, index, t0);
    if (!P.natt) P.next = (P.next + 1) % SONGS.length;
  }
}
function stop() {
  if (!P.on) return;
  P.on = false; clearInterval(P.timer);
  const t = P.ctx.currentTime;
  P.master.gain.setValueAtTime(P.master.gain.value, t); P.master.gain.linearRampToValueAtTime(0, t + .3);
  const bus = P.bus; P.bus = null;
  setTimeout(() => { if (bus) bus.disconnect(); if (!P.on) P.ctx.suspend(); }, 400);
  P.end = 0;
}
function paus(hidden) { if (!P.ctx || !P.on) return; if (hidden) P.ctx.suspend(); else P.ctx.resume(); }

root.Musik = { start, stop, paus, spela, natt: v => { P.natt = !!v; }, get spelar() { return P.on; }, lattar: SONGS.map(s => s.namn) };
})(typeof window !== 'undefined' ? window : globalThis);
