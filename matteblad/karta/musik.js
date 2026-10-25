// Djuren i Glimmerdal: the music. A tiny chip synth in the browser (pulse waves, a triangle bass and noise drums, like an old
// game console) plays seven songs of our own: three for the day ("Glimmerdal", "Ängsdans" and "Morgondagg") and four for the
// night ("Stjärnnatt", "Månsken", "Nattugglan" and "Serenad"). The songs of the day or of the night take turns. No sound files, nothing downloaded.
//
// A song is a list of bars. Each bar has a chord (the bass and the arpeggio are made from it) and a melody of 8 steps (eighth notes):
// a note such as "E5", "-" holds the note before, "." is a rest. The drums are a pattern of 8 steps per bar.
//
//   Musik.start()   starts (after a click, browsers do not allow sound before that)
//   Musik.stop()
//   Musik.paus(true | false)   pauses while the page is hidden
//   Musik.natt(true | false)   switches between the songs of the day and the songs of the night
//   Musik.spela(ctx, dest, index, t0)   schedules one whole song on any AudioContext (also an OfflineAudioContext), returns its length
(function (root) {
'use strict';

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = name => { const m = /^([A-G]#?)(\d)$/.exec(name); return 440 * 2 ** ((NOTE[m[1]] + 12 * (+m[2] + 1) - 69) / 12); };
const CHORD = {
  C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'],
  Dm: ['D', 'F', 'A'], E: ['E', 'G#', 'B'], Em: ['E', 'G', 'B'], D: ['D', 'F#', 'A'],
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
const ANGSDANS = (() => {
  const intro = [bar('G', '. . . . . . . .'), bar('G', '. . . . . . . .')];
  const A = [
    bar('G', 'B5 - D6 - B5 G5 A5 B5'), bar('D', 'A5 - F#5 - D5 - A5 -'), bar('Em', 'G5 - B5 - E6 - D6 B5'), bar('C', 'C6 - - - G5 - . .'),
    bar('G', 'B5 - D6 - G6 - F#6 E6'), bar('D', 'D6 - A5 - F#5 - A5 -'), bar('C', 'E6 - C6 - G5 - E6 -'), bar('D', 'D6 - - - - - . .'),
  ];
  const B = [
    bar('Em', 'E6 - D6 B5 G5 - B5 -'), bar('C', 'C6 - E6 - G5 - E6 -'), bar('G', 'D6 - B5 - G5 - B5 D6'), bar('D', 'F#6 - - - D6 - A5 -'),
    bar('Em', 'G5 - B5 - E6 - G6 F#6'), bar('C', 'E6 - C6 - G5 - A5 B5'), bar('D', 'C6 - D6 - E6 - F#6 -'), bar('D', 'A6 - - - G6 F#6 E6 D6'),
  ];
  const slut = [...A.slice(0, 7), bar('G', 'G6 - - - - - - -')];
  return {
    namn: 'Ängsdans', bpm: 128, tid: 'dag',
    takter: [...intro, ...A, ...B, ...A, ...B, ...slut],
    trummor: { k: 'k . . . k . k .', s: '. . s . . . s .', h: 'h h h h h h h h' },
    ljud: { lead: { form: .5, vol: .085 }, arp: { form: .25, vol: .03, oktav: 4, takt: 1 }, bas: { vol: .22 }, eko: 0 },
  };
})();
// Månsken: still the night, but lighter and more hopeful (Peter 2026-10-20): F major, a calm tempo, a melody that climbs
const MANSKEN = (() => {
  const intro = [bar('F', '. . . . . . . .'), bar('F', '. . . . . . . .')];
  const A = [bar('F', 'A5 - C6 - F6 - E6 C6'), bar('C', 'E6 - - - D6 - C6 -'), bar('Dm', 'D6 - F6 - A6 - G6 F6'), bar('C', 'E6 - - - - - . .')];
  const A2 = [bar('F', 'A5 - C6 - F6 - G6 A6'), bar('Am', 'G6 - E6 - C6 - E6 -'), bar('G', 'D6 - G6 - B5 - D6 -'), bar('C', 'C6 - - - - - . .')];
  const B = [
    bar('Dm', 'F6 - E6 D6 A5 - D6 -'), bar('Am', 'E6 - C6 - A5 - C6 E6'), bar('F', 'F6 - - - C6 - A5 -'), bar('C', 'G5 - C6 - E6 - G6 -'),
    bar('Dm', 'A6 - G6 F6 D6 - F6 -'), bar('G', 'G6 - D6 - B5 - D6 -'), bar('C', 'E6 - G6 - C6 - E6 -'), bar('C', 'D6 - - - E6 - G6 -'),
  ];
  const slut = [...A.slice(0, 3), bar('F', 'F6 - - - - - - -')];
  return {
    namn: 'Månsken', bpm: 88, tid: 'natt',
    takter: [...intro, ...A, ...A2, ...B, ...A, ...slut],
    trummor: { k: 'k . . . . . . .', s: '. . . . . . . .', h: '. . . . h . . .' },
    ljud: { lead: { form: .25, vol: .07 }, arp: { form: .125, vol: .028, oktav: 4, takt: 1 }, bas: { vol: .17 }, eko: .25 },
  };
})();
// Morgondagg: calm and sparse by day, long notes and air between them, but hopeful (Peter 2026-10-20)
const MORGONDAGG = (() => {
  const intro = [bar('C', '. . . . . . . .'), bar('C', '. . . . . . . .')];
  const A = [bar('C', 'E5 - - - G5 - - -'), bar('G', 'D5 - - - G5 - - -'), bar('Am', 'C6 - - - B5 - A5 -'), bar('F', 'A5 - - - - - . .')];
  const A2 = [bar('C', 'E5 - - - G5 - C6 -'), bar('G', 'D6 - - - B5 - - -'), bar('F', 'A5 - - - C6 - F6 -'), bar('G', 'E6 - - - D6 - . .')];
  const B = [
    bar('Am', 'C6 - - - E6 - - -'), bar('F', 'C6 - - - A5 - - -'), bar('C', 'G5 - - - C6 - E6 -'), bar('G', 'D6 - - - - - . .'),
    bar('Am', 'E6 - - - D6 - C6 -'), bar('F', 'A5 - - - C6 - - -'), bar('G', 'B5 - D6 - G6 - - -'), bar('C', 'E6 - - - - - - -'),
  ];
  const slut = [...A.slice(0, 3), bar('C', 'C6 - - - - - - -')];
  return {
    namn: 'Morgondagg', bpm: 92, tid: 'dag',
    takter: [...intro, ...A, ...A2, ...B, ...A2, ...slut],
    trummor: { k: 'k . . . . . . .', s: '. . . . . . . .', h: '. . . . h . . .' },
    ljud: { lead: { form: .25, vol: .065 }, arp: { form: .125, vol: .025, oktav: 4, takt: 2 }, bas: { vol: .15 }, eko: .15 },
  };
})();
// Nattugglan: a gentle mystery for the night, in A minor with a slow call that answers itself
const NATTUGGLAN = (() => {
  const intro = [bar('Am', '. . . . . . . .'), bar('Am', '. . . . . . . .')];
  const A = [bar('Am', 'A5 - C6 - E6 - - -'), bar('Em', 'B5 - - - G5 - E5 -'), bar('F', 'A5 - C6 - F6 - E6 -'), bar('G', 'D6 - - - - - . .')];
  const A2 = [bar('Am', 'A5 - C6 - E6 - A6 -'), bar('Em', 'G6 - E6 - B5 - - -'), bar('Dm', 'A5 - F5 - D6 - C6 -'), bar('E', 'B5 - - - G#5 - . .')];
  const B = [
    bar('F', 'C6 - - - A5 - C6 -'), bar('C', 'E6 - - - G5 - - -'), bar('Dm', 'F6 - - - E6 - D6 -'), bar('Am', 'C6 - - - - - . .'),
    bar('F', 'A5 - C6 - F6 - - -'), bar('G', 'D6 - B5 - G5 - B5 -'), bar('E', 'G#5 - B5 - E6 - - -'), bar('E', 'D6 - - - B5 - G#5 -'),
  ];
  const slut = [...A.slice(0, 3), bar('Am', 'A5 - - - - - - -')];
  return {
    namn: 'Nattugglan', bpm: 80, tid: 'natt',
    takter: [...intro, ...A, ...A2, ...B, ...A, ...slut],
    trummor: { k: 'k . . . . . . .', s: '. . . . . . . .', h: '. . . . h . . .' },
    ljud: { lead: { form: .5, vol: .068 }, arp: { form: .125, vol: .028, oktav: 5, takt: 2 }, bas: { vol: .16 }, eko: .3 },
  };
})();
// Serenad: a slow night song of our own, a singing melody over soft broken chords like a guitar under a window (Peter 2026-10-25)
const SERENAD = (() => {
  const intro = [bar('G', '. . . . . . . .'), bar('G', '. . . . . . . .')];
  const A = [bar('G', 'D5 - G5 - B5 - - A5'), bar('Em', 'G5 - - - E5 - - -'), bar('C', 'E5 - G5 - C6 - B5 A5'), bar('D', 'A5 - - - - - . .')];
  const A2 = [bar('G', 'D5 - G5 - B5 - D6 -'), bar('Em', 'E6 - D6 - B5 - G5 -'), bar('Am', 'C6 - B5 A5 E5 - A5 -'), bar('D', 'F#5 - - - A5 - D6 -')];
  const B = [
    bar('C', 'E6 - - - D6 - C6 -'), bar('G', 'B5 - - - D6 - G6 -'), bar('Am', 'E6 - D6 C6 A5 - C6 -'), bar('D', 'D6 - - - - - . .'),
    bar('C', 'G6 - E6 - C6 - E6 -'), bar('G', 'D6 - B5 - G5 - B5 -'), bar('Am', 'A5 - C6 - E6 - D6 C6'), bar('D', 'B5 - - - A5 - - -'),
  ];
  const slut = [...A2.slice(0, 3), bar('G', 'G5 - - - - - - -')];
  return {
    namn: 'Serenad', bpm: 76, tid: 'natt',
    takter: [...intro, ...A, ...A2, ...B, ...A, ...slut],
    trummor: { k: 'k . . . . . . .', s: '. . . . . . . .', h: '. . . . . . . .' },
    ljud: { lead: { klang: 'flojt', vol: .06 }, arp: { klang: 'gitarr', vol: .03, oktav: 4, takt: 1 }, bas: { vol: .15 }, eko: .3 },
  };
})();
STJARNNATT.ljud.lead.klang = 'klocka';   // Stjärnnatt rings like a music box (Peter 2026-10-25)
GLIMMERDAL.tid = 'dag'; STJARNNATT.tid = 'natt';
const SONGS = [GLIMMERDAL, STJARNNATT, ANGSDANS, MANSKEN, MORGONDAGG, NATTUGGLAN, SERENAD];

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
// Other sounds a song can choose (klang, Peter 2026-10-25): flöjt (a soft triangle with a slow vibrato), gitarr (a pluck that
// fades fast), klocka (a clear ringing tone with an overtone, like a music box) and strak (fades in and sings, for long notes).
// Without klang it is the old console pulse.
function klang(ctx, dest, kind, { f, t, len, vol }) {
  const g = ctx.createGain(), end = t + Math.max(.05, len);
  const osc = (type, fr) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr; return o; };
  const vibrato = (o, depth, from) => { const l = osc('sine', 5.2), lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * depth, t + from); l.connect(lg).connect(o.frequency); l.start(t); l.stop(end + .3); };
  if (kind === 'flojt') {
    const o = osc('triangle', f); vibrato(o, .007, .25);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 1.8, t + .05); g.gain.setValueAtTime(vol * 1.6, end - .06); g.gain.linearRampToValueAtTime(0, end + .05);
    o.connect(g).connect(dest); o.start(t); o.stop(end + .1);
  } else if (kind === 'gitarr') {
    const o = osc('sawtooth', f), lp = ctx.createBiquadFilter(), ring = Math.min(1.4, len + .5);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + ring);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 1.6, t + .004); g.gain.exponentialRampToValueAtTime(.0005, t + ring);
    o.connect(lp).connect(g).connect(dest); o.start(t); o.stop(t + ring + .05);
  } else if (kind === 'klocka') {
    const ring = Math.max(1.2, len + .6), o = osc('sine', f), o2 = osc('sine', f * 3), g2 = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 2, t + .005); g.gain.exponentialRampToValueAtTime(.0005, t + ring);
    g2.gain.value = .25; o2.connect(g2).connect(g);
    o.connect(g).connect(dest); o.start(t); o2.start(t); o.stop(t + ring + .05); o2.stop(t + ring + .05);
  } else {   // strak
    const o = osc('sawtooth', f), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(2400, f * 4); vibrato(o, .005, .4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 1.1, t + .18); g.gain.setValueAtTime(vol * 1.1, end - .05); g.gain.linearRampToValueAtTime(0, end + .2);
    o.connect(lp).connect(g).connect(dest); o.start(t); o.stop(end + .25);
  }
}
function tone(ctx, dest, { f, t, len, vol, duty, tri, kind }) {
  if (kind) return klang(ctx, dest, kind, { f, t, len, vol });
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
      tone(ctx, out, { f: freq(tok), t: tb + i * step, len: n * step * .92, vol: L.lead.vol, duty: L.lead.form, kind: L.lead.klang });
    });
    // bass: the root on beat 1 and 3, the fifth on beat 2 and 4
    const root = notes[0], fifth = notes[2];
    [root, fifth, root, fifth].forEach((nm, q) => tone(ctx, dest, { f: freq(nm + (NOTE[nm] >= NOTE.F ? '2' : '3')), t: tb + q * 2 * step, len: step * 1.7, vol: L.bas.vol, tri: true }));
    // arpeggio: the chord tones going up, one per step (or every other step in the slow song)
    for (let i = 0; i < 8; i += L.arp.takt) {
      const nm = notes[(i / L.arp.takt) % 3];
      tone(ctx, out, { f: freq(nm + L.arp.oktav), t: tb + i * step, len: step * .8 * L.arp.takt, vol: L.arp.vol, duty: L.arp.form, kind: L.arp.klang });
    }
    // drums, not in the intro
    if (bi >= 2) for (const [k, pat] of Object.entries(song.trummor)) pat.split(' ').forEach((tok, i) => { if (tok === k) drum(ctx, dest, k, tb + i * step, song.bpm < 100); });
  });
  return song.takter.length * 8 * step + 1.5;
}

// ---------- the player on the page: the songs take turns with a short pause between them
// Each time the game starts, the first song of the day and of the night is picked at random (Peter 2026-10-22), then they take turns
const P = { ctx: null, master: null, bus: null, next: { dag: Math.floor(Math.random() * 60), natt: Math.floor(Math.random() * 60) }, end: 0, timer: 0, on: false, vol: .35, natt: false };
// Off and on again carries on in the same song where it stopped (the sound is only paused). Day and night switch the song at once.
function start() {
  if (P.on) return;
  const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
  // Phones: play as media so the music is heard even with the ringer switched off (iPhone), and wake the sound at once
  // inside the tap with a tiny silent buffer, which Safari needs before it lets an AudioContext make sound
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older browsers */ }
  if (!P.ctx) { P.ctx = new AC(); P.master = P.ctx.createGain(); P.master.gain.value = 0; P.master.connect(P.ctx.destination); }
  try { const s = P.ctx.createBufferSource(); s.buffer = P.ctx.createBuffer(1, 1, 22050); s.connect(P.ctx.destination); s.start(0); } catch (e) { /* not needed */ }
  P.on = true;
  P.ctx.resume().then(() => {
    const t = P.ctx.currentTime;
    P.master.gain.cancelScheduledValues(t); P.master.gain.setValueAtTime(P.master.gain.value, t); P.master.gain.linearRampToValueAtTime(P.vol, t + .4);
    tick();
  });
  if (!P.timer) P.timer = setInterval(tick, 500);
}
function tick() {
  if (!P.on || P.ctx.state !== 'running') return;
  const now = P.ctx.currentTime;
  if (now >= P.end) {   // the song is over (or none has started): the next one, after a short pause
    if (P.bus) P.bus.disconnect();
    P.bus = P.ctx.createGain(); P.bus.connect(P.master);
    const t0 = now + (P.end ? 2 : .1);
    // the songs of the day, or of the night, take turns
    const tid = P.natt ? 'natt' : 'dag', list = SONGS.map((s, i) => i).filter(i => SONGS[i].tid === tid);
    const index = list[P.next[tid] % list.length];
    P.next[tid] = (P.next[tid] + 1) % list.length;
    P.end = t0 + spela(P.ctx, P.bus, index, t0); P.lat = SONGS[index].namn;
  }
}
function stop() {
  if (!P.on) return;
  P.on = false;
  const t = P.ctx.currentTime;
  P.master.gain.cancelScheduledValues(t); P.master.gain.setValueAtTime(P.master.gain.value, t); P.master.gain.linearRampToValueAtTime(0, t + .3);
  setTimeout(() => { if (!P.on) P.ctx.suspend(); }, 350);
}
// The song that is playing fades out, and the right one for day or night starts
function natt(v) {
  v = !!v; if (P.natt === v) return;
  P.natt = v;
  if (!P.ctx) return;
  const old = P.bus; P.bus = null; P.end = 0;
  if (old) { const t = P.ctx.currentTime; old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + .8); setTimeout(() => old.disconnect(), 1000); }
  tick();
}
// Skip to the next song of the day or the night (a debug button): the song fades out and the next one starts
function nasta() {
  if (!P.ctx || !P.on) return;
  const old = P.bus; P.bus = null; P.end = 0;
  if (old) { const t = P.ctx.currentTime; old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + .4); setTimeout(() => old.disconnect(), 600); }
  tick();
}
function paus(hidden) { if (!P.ctx || !P.on) return; if (hidden) P.ctx.suspend(); else P.ctx.resume(); }

// ---------- the flute: a few short tunes, a soft sine tone with a little vibrato. It plays even when the music is off, and the
// music is turned down while it plays. Musik.flojt(index) plays one tune and returns its length in seconds.
const FLOJT = [
  'E5 G5 A5 - G5 E5 D5 - - .',
  'C6 B5 A5 G5 A5 - - . . .',
  'G5 A5 B5 D6 - B5 G5 - - .',
  'A5 C6 E6 - D6 C6 A5 - - .',
  'D6 - C6 A5 G5 A5 C6 - D6 -',
];
function flojt(index) {
  const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return 0;
  if (!P.ctx) { P.ctx = new AC(); P.master = P.ctx.createGain(); P.master.gain.value = 0; P.master.connect(P.ctx.destination); }
  P.ctx.resume();
  const ctx = P.ctx, out = ctx.createGain(); out.gain.value = .26; out.connect(ctx.destination);
  const toks = FLOJT[((index % FLOJT.length) + FLOJT.length) % FLOJT.length].split(' '), step = .27, t0 = ctx.currentTime + .05;
  toks.forEach((tok, i) => {
    if (tok === '-' || tok === '.') return;
    let n = 1; while (i + n < toks.length && toks[i + n] === '-') n++;
    const t = t0 + i * step, len = n * step * .95;
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
    const f = freq(tok) * .5;   // an octave lower than written: a calm, deep flute
    o.type = 'sine'; o.frequency.value = f;
    lfo.frequency.value = 4.5; depth.gain.value = f * .004; lfo.connect(depth).connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .09); g.gain.setValueAtTime(.8, t + len - .1); g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(g).connect(out); o.start(t); lfo.start(t); o.stop(t + len + .02); lfo.stop(t + len + .02);
  });
  const dur = toks.length * step + .1;
  if (P.on) { const t = ctx.currentTime; P.master.gain.cancelScheduledValues(t); P.master.gain.setValueAtTime(P.master.gain.value, t); P.master.gain.linearRampToValueAtTime(P.vol * .3, t + .2); P.master.gain.setValueAtTime(P.vol * .3, t + dur); P.master.gain.linearRampToValueAtTime(P.vol, t + dur + .6); }
  return dur;
}

root.Musik = { flojt, nasta, antalFlojt: FLOJT.length, start, stop, paus, spela, natt, get spelar() { return P.on; }, get lat() { return P.lat || ''; }, lattar: SONGS.map(s => s.namn) };
})(typeof window !== 'undefined' ? window : globalThis);
