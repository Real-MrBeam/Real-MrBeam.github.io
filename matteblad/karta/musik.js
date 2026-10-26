// Djuren i Glimmerdal: the music. A tiny chip synth in the browser (pulse waves, a triangle bass and noise drums, like an old
// game console) plays seven songs of our own: three for the day ("Glimmerdal", "Ängsdans" and "Morgondagg"), three for the
// night ("Månsken", "Nattugglan" and "Nattviol") and one for the caves ("Droppsten", the old night song Stjärnnatt on an organ). The songs of the day or of the night take turns. No sound files, nothing downloaded.
//
// A song is a list of bars. Each bar has a chord (the bass and the arpeggio are made from it) and a melody of 8 steps (eighth notes):
// a note such as "E5", "-" holds the note before, "." is a rest. The drums are a pattern of 8 steps per bar.
//
//   Musik.start()   starts (after a click, browsers do not allow sound before that)
//   Musik.stop()
//   Musik.paus(true | false)   pauses while the page is hidden
//   Musik.natt(true | false)   switches between the songs of the day and the songs of the night
//   Musik.grotta(true | false)   the cave song while he is in a level
//   Musik.jingel(sort)   a short tune when he gets something, 'djur' a longer one for a new animal, 'fisk' one for a new fish
//                        in the fish book, 'stjarnor' or 'stoft' for stars and stardust (the same) (only when the sound is on)
//   Musik.trad(sort)   the tree's melody: 'flojt', 'fiol' (Näcken), 'vind' (the wind in the oak) or 'borjan' (the flute
//                      before he has learnt it), returns its length
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
// Nattviol (first called Serenad): a slow night song of our own, a singing melody over soft broken chords like a guitar under a window (Peter 2026-10-25)
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
    namn: 'Nattviol', bpm: 76, tid: 'natt',
    takter: [...intro, ...A, ...A2, ...B, ...A, ...slut],
    trummor: { k: 'k . . . . . . .', s: '. . . . . . . .', h: '. . . . . . . .' },
    ljud: { lead: { klang: 'flojt', vol: .06 }, arp: { klang: 'gitarr', vol: .03, oktav: 4, takt: 1 }, bas: { vol: .15 }, eko: .3 },
  };
})();
// Droppsten: Stjärnnatt on a soft organ, the song of the caves (Peter 2026-10-25). It plays only inside a level (Musik.grotta).
const DROPPSTEN = { ...STJARNNATT, namn: 'Droppsten', tid: 'grotta', ljud: { ...STJARNNATT.ljud, lead: { ...STJARNNATT.ljud.lead, klang: 'orgel' }, arp: { ...STJARNNATT.ljud.arp, klang: 'orgel' } } };
MORGONDAGG.ljud.lead.klang = 'marimba'; MORGONDAGG.ljud.arp.klang = 'marimba';   // Morgondagg on a marimba (Peter 2026-10-25)
GLIMMERDAL.tid = 'dag'; STJARNNATT.tid = 'natt';
const SONGS = [GLIMMERDAL, ANGSDANS, MANSKEN, MORGONDAGG, NATTUGGLAN, SERENAD, DROPPSTEN];   // Stjärnnatt itself no longer plays (Peter 2026-10-25), only as Droppsten

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
// fades fast), klocka (a clear ringing tone with an overtone, like a music box), strak (fades in and sings, for long notes) and
// piano (a soft hammer with overtones that die away), elpiano (FM like an electric piano), marimba (wood), synt (an
// analogue synth with two detuned saws and a filter) and orgel (stacked sines like an organ).
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
  } else if (kind === 'orgel') {   // an organ, kept for the caves: sines stacked like drawbars, held level, with a slow sway
    const bars = [[.5, .5], [1, 1], [2, .7], [3, .35], [4, .3], [6, .12]], trem = osc('sine', 5.8), tg = ctx.createGain(), sway = ctx.createGain();
    sway.gain.value = 1; tg.gain.value = .12; trem.connect(tg).connect(sway.gain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * .45, t + .02); g.gain.setValueAtTime(vol * .45, end); g.gain.linearRampToValueAtTime(0, end + .06);
    for (const [h, a] of bars) { const o = osc('sine', f * h), pg = ctx.createGain(); pg.gain.value = a; o.connect(pg).connect(g); o.start(t); o.stop(end + .1); }
    g.connect(sway).connect(dest); trem.start(t); trem.stop(end + .1);
  } else if (kind === 'elpiano') {   // FM like an electric piano: a sine whose brightness (the modulation) fades, plus a small tine
    const ring = Math.min(2.6, len + 1), c = osc('sine', f), m = osc('sine', f), mg = ctx.createGain(), tine = osc('sine', f * 14), tg = ctx.createGain(), tm = ctx.createGain();
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * .25, t + .6); m.connect(mg).connect(c.frequency);
    tm.gain.setValueAtTime(f * 3, t); tm.gain.exponentialRampToValueAtTime(1, t + .08); tine.connect(tm).connect(c.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 2.2, t + .005); g.gain.exponentialRampToValueAtTime(vol * 1.1, t + .3);
    g.gain.setValueAtTime(vol * 1.1, end); g.gain.exponentialRampToValueAtTime(.0005, Math.min(t + ring, end + .4));
    c.connect(g).connect(dest); for (const o of [c, m, tine]) { o.start(t); o.stop(t + ring + .05); }
  } else if (kind === 'marimba') {   // wood: a sine and a high partial that dies very fast
    const ring = .7, o = osc('sine', f), o2 = osc('sine', f * 3.9), g2 = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 2.4, t + .003); g.gain.exponentialRampToValueAtTime(.0005, t + ring);
    g2.gain.setValueAtTime(.5, t); g2.gain.exponentialRampToValueAtTime(.001, t + .07); o2.connect(g2).connect(g);
    o.connect(g).connect(dest); for (const x of [o, o2]) { x.start(t); x.stop(t + ring + .05); }
  } else if (kind === 'synt') {   // an analogue synth: two slightly detuned saws through a filter that opens and closes
    const o = osc('sawtooth', f), o2 = osc('sawtooth', f * 1.006), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(f * 1.5, t); lp.frequency.exponentialRampToValueAtTime(f * 7, t + .06); lp.frequency.exponentialRampToValueAtTime(f * 2.5, t + .5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 1.1, t + .015); g.gain.setValueAtTime(vol * .9, end - .05); g.gain.linearRampToValueAtTime(0, end + .12);
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(dest); for (const x of [o, o2]) { x.start(t); x.stop(end + .15); }
  } else if (kind === 'piano') {   // a soft hammer: a few overtones that die away, the higher ones first (Peter 2026-10-25)
    const ring = Math.min(2.4, len + 1.2), parts = [[1, 1, 1], [2, .35, .5], [3, .12, .35], [4, .05, .25]];
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 2.2, t + .006); g.gain.exponentialRampToValueAtTime(vol * .9, t + .25);
    g.gain.setValueAtTime(vol * .9, end); g.gain.exponentialRampToValueAtTime(.0005, Math.min(t + ring, end + .45));
    for (const [h, a, d] of parts){
      const o = osc('sine', f * h * (h > 1 ? 1.0015 : 1)), pg = ctx.createGain();
      pg.gain.setValueAtTime(a, t); pg.gain.exponentialRampToValueAtTime(a * .02, t + ring * d);
      o.connect(pg).connect(g); o.start(t); o.stop(t + ring + .05);
    }
    g.connect(dest);
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
function spela(ctx, dest, index, t0, skip = 0) {
  const song = SONGS[index], L = song.ljud, step = 60 / song.bpm / 2;
  let out = dest;
  if (L.eko) {   // a soft echo for the dreamy song
    const mix = ctx.createGain(), d = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    d.delayTime.value = step * 3; fb.gain.value = .3; wet.gain.value = L.eko;
    mix.connect(dest); mix.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(dest);
    out = mix;
  }
  song.takter.forEach((b, bi) => {
    if (bi < skip) return;   // the first bars (the quiet intro) are left out
    const tb = t0 + (bi - skip) * 8 * step, notes = CHORD[b.ch];
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
  return (song.takter.length - skip) * 8 * step + 1.5;
}

// ---------- the player on the page: the songs take turns with a short pause between them
// Each time the game starts, the first song of the day and of the night is picked at random (Peter 2026-10-22), then they take turns
const LAST_KEY = 'glimmerdal:senastLat';
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
    // the songs of the day, or of the night, take turns. The first one after the page has loaded is never the one that was
    // last heard (remembered in the browser), and it begins with its tune, without the quiet bars at the start (Peter 2026-10-25)
    const tid = P.grotta ? 'grotta' : P.natt ? 'natt' : 'dag', list = SONGS.map((s, i) => i).filter(i => SONGS[i].tid === tid);
    const first = !P.played;
    let index = list[P.next[tid] % list.length];
    if (first && list.length > 1){ let last = null; try { last = localStorage.getItem(LAST_KEY); } catch (e) { /* no memory */ } if (SONGS[index].namn === last) { P.next[tid]++; index = list[P.next[tid] % list.length]; } }
    P.next[tid] = (P.next[tid] + 1) % list.length;
    P.end = t0 + spela(P.ctx, P.bus, index, t0, first ? 2 : 0); P.lat = SONGS[index].namn; P.played = true;
    try { localStorage.setItem(LAST_KEY, P.lat); } catch (e) { /* only this time */ }
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
// In a cave (a level) the cave songs play, whatever the time of day
function grotta(v) {
  v = !!v; if (!!P.grotta === v) return;
  P.grotta = v;
  if (P.ctx){ const old = P.bus; P.bus = null; P.end = 0; if (old) { const t = P.ctx.currentTime; old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + .8); setTimeout(() => old.disconnect(), 1000); } tick(); }
}
function natt(v) {
  v = !!v; if (P.natt === v) return;
  P.natt = v;
  if (!P.ctx || P.grotta) return;
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

// ---------- the jingle when he gets something (Peter 2026-10-26): four quick chip notes up and a bell on top. Only when the
// sound is on; the music is turned down for a moment while it plays.
const JINGEL = [['G5', 0], ['C6', .08], ['E6', .16], ['G6', .24]];
// A new animal has its own, longer jingle (Peter 2026-10-26): a little tune on the chip with a triangle bass under it, and
// three bells together at the end. [note, start in eighths, length in eighths]
const JINGEL_DJUR = { step: .11, lead: [['C6', 0, 1], ['E6', 1, 1], ['G6', 2, 1], ['C7', 3, 2], ['A6', 5, 1], ['B6', 6, 1], ['G6', 7, 1], ['A6', 8, 1], ['B6', 9, 1], ['D7', 10, 1]],
  bas: [['C4', 0, 4], ['F3', 4, 2], ['G3', 6, 4]], slut: ['C7', 'E7', 'G7'], slutAt: 11 };
// A new fish in the fish book (Peter 2026-10-26): quick marimba notes up like bubbles, and two bells
const JINGEL_FISK = [['G5', 0], ['C6', .07], ['E6', .14], ['G6', .21], ['C7', .28]];
// Stars and stardust share one jingle of their own, unlike all the others (Peter 2026-10-26: longer, grander and lower, then
// more like the fanfare of an old role-playing game when a battle is won). Our own tune, not a copy: a triplet run up on
// brass with a snare under it, then the victory cadence A flat, B flat and C, a triplet again and a long last note, over
// strings, a deep bass and a kick. [note or chord, start in seconds, length in seconds]
const JINGEL_SKATT = {
  lead: [['E5', 0, .12], ['F5', .13, .12], ['G5', .26, .12], ['C6', .39, .48], ['D#6', .9, .34], ['F6', 1.27, .34],
    ['D6', 1.64, .12], ['E6', 1.77, .12], ['F6', 1.9, .12], ['G6', 2.03, 1.1]],
  strak: [[['C4', 'E4', 'G4'], .39, .5], [['G#3', 'C4', 'D#4'], .9, .37], [['A#3', 'D4', 'F4'], 1.27, .37], [['C4', 'E4', 'G4', 'C5'], 2.03, 1.3]],
  bas: [['C3', .39, .48], ['G#2', .9, .35], ['A#2', 1.27, .35], ['C3', 2.03, 1.1], ['C2', 2.03, 1.1]],
  kick: [.39, .9, 1.27, 2.03], snare: [0, .13, .26, 1.64, 1.77, 1.9], klockor: [['G6', 2.1], ['C7', 2.2], ['E7', 2.3]] };
// jingelPa(ctx, dest, t0, sort) schedules it on any AudioContext (also an OfflineAudioContext, to make a sound file of it)
// and returns its gain node
function jingelPa(ctx, dest, t0, sort) {
  const out = ctx.createGain(); out.gain.value = .5; out.connect(dest);
  if (sort === 'stjarnor' || sort === 'stoft') {
    const J = JINGEL_SKATT;
    for (const [n, a, l] of J.lead) { tone(ctx, out, { f: freq(n), t: t0 + a, len: l, vol: .12, kind: 'synt' }); tone(ctx, out, { f: freq(n) / 2, t: t0 + a, len: l, vol: .08, kind: 'synt' }); }
    for (const [ch, a, l] of J.strak) for (const n of ch) tone(ctx, out, { f: freq(n), t: t0 + a, len: l, vol: .05, kind: 'strak' });
    for (const [n, a, l] of J.bas) tone(ctx, out, { f: freq(n), t: t0 + a, len: l, vol: .24, tri: true });
    for (const a of J.kick) drum(ctx, out, 'k', t0 + a, false);
    for (const a of J.snare) drum(ctx, out, 's', t0 + a, false);
    for (const [n, a] of J.klockor) tone(ctx, out, { f: freq(n), t: t0 + a, len: 1, vol: .04, kind: 'klocka' });
    return out;
  }
  if (sort === 'fisk') {
    for (const [n, d] of JINGEL_FISK) tone(ctx, out, { f: freq(n), t: t0 + d, len: .25, vol: .1, kind: 'marimba' });
    tone(ctx, out, { f: freq('E7'), t: t0 + .4, len: .7, vol: .1, kind: 'klocka' });
    tone(ctx, out, { f: freq('C7'), t: t0 + .43, len: .7, vol: .1, kind: 'klocka' });
    return out;
  }
  if (sort === 'djur') {
    const J = JINGEL_DJUR, s = J.step;
    for (const [n, a, l] of J.lead) tone(ctx, out, { f: freq(n), t: t0 + a * s, len: l * s * .9, vol: .11, duty: .25 });
    for (const [n, a, l] of J.bas) tone(ctx, out, { f: freq(n), t: t0 + a * s, len: l * s * .9, vol: .2, tri: true });
    J.slut.forEach((n, i) => tone(ctx, out, { f: freq(n), t: t0 + J.slutAt * s + i * .03, len: 1.2, vol: .1, kind: 'klocka' }));
    tone(ctx, out, { f: freq('C4'), t: t0 + J.slutAt * s, len: .9, vol: .2, tri: true });
    return out;
  }
  for (const [n, d] of JINGEL) tone(ctx, out, { f: freq(n), t: t0 + d, len: .09, vol: .12, duty: .25 });
  tone(ctx, out, { f: freq('C7'), t: t0 + .34, len: .5, vol: .16, kind: 'klocka' });
  tone(ctx, out, { f: freq('G6'), t: t0 + .34, len: .5, vol: .1, kind: 'klocka' });
  return out;
}
function jingel(sort) {
  if (!P.on || !P.ctx || P.ctx.state !== 'running') return;
  const ctx = P.ctx, out = jingelPa(ctx, ctx.destination, ctx.currentTime + .03, sort);
  setTimeout(() => out.disconnect(), 5000);
  const t = ctx.currentTime, dur = sort === 'stjarnor' || sort === 'stoft' ? 3.2 : sort === 'djur' ? 2.2 : sort === 'fisk' ? 1.1 : .9;
  P.master.gain.cancelScheduledValues(t); P.master.gain.setValueAtTime(P.master.gain.value, t); P.master.gain.linearRampToValueAtTime(P.vol * .4, t + .05); P.master.gain.setValueAtTime(P.vol * .4, t + dur); P.master.gain.linearRampToValueAtTime(P.vol, t + dur + .5);
}

// ---------- the tree's melody (Peter 2026-10-26): the wind whistles its beginning in Ihåliga eken, Näcken answers the flute at
// Norra bron at night with the whole of it on his fiddle, and after that the flute always plays it. A calm, a little wistful
// tune in A minor, 64 eighths; under the flute a guitar picks the chords, one per 8 steps.
const TRAD = { step: .22,
  mel: ('A4 - C5 D5 E5 - - - G5 E5 D5 - E5 - - - A4 - C5 D5 E5 - G5 A5 B5 - A5 G5 E5 - - - '
    + 'D5 - E5 G5 A5 - G5 E5 D5 - C5 D5 E5 - - - G5 - E5 D5 C5 - D5 B4 A4 - - - - - - -').trim().split(' '),
  ack: [['A2', 'E3', 'A3', 'C4'], ['E2', 'B2', 'E3', 'G3'], ['A2', 'E3', 'A3', 'C4'], ['E2', 'B2', 'E3', 'G3'],
    ['D3', 'A3', 'D4', 'F4'], ['A2', 'E3', 'A3', 'C4'], ['C3', 'G3', 'C4', 'E4'], ['A2', 'E3', 'A3', 'C4']],
  vind: 16 };   // the wind (and the flute away from the oak) only gets this far (Peter 2026-10-26: three more notes, the first phrase), and stops, as if it waits for the rest
// tradPa(ctx, dest, t0, sort) schedules it on any AudioContext: 'flojt' (the flute with the guitar), 'fiol' (Näcken's fiddle
// over a low drone), 'vind' (the beginning, whistled by the wind) or 'borjan' (the beginning on the flute, all he can play
// before he has learnt it, Peter 2026-10-26). Returns its length in seconds.
function tradPa(ctx, dest, t0, sort) {
  const st = TRAD.step, toks = sort === 'vind' || sort === 'borjan' ? TRAD.mel.slice(0, TRAD.vind) : TRAD.mel;
  toks.forEach((tok, i) => {
    if (tok === '-') return;
    let n = 1; while (i + n < toks.length && toks[i + n] === '-') n++;
    const t = t0 + i * st, len = n * st * .95, f = freq(tok);
    if (sort === 'fiol') tone(ctx, dest, { f, t, len: len + .05, vol: .14, kind: 'strak' });
    else if (sort === 'vind') tone(ctx, dest, { f: f * 2, t, len: len * 1.2, vol: .05, kind: 'flojt' });
    else tone(ctx, dest, { f, t, len, vol: .16, kind: 'flojt' });
  });
  if (sort === 'flojt') TRAD.ack.forEach((ch, b) => [0, 1, 2, 3, 2, 1].forEach((k, q) =>
    tone(ctx, dest, { f: freq(ch[k]), t: t0 + (b * 8 + [0, 1, 2, 3, 5, 6][q]) * st, len: st * 2.5, vol: .07, kind: 'gitarr' })));
  if (sort === 'fiol') [['A2', 0, 32], ['D3', 32, 8], ['A2', 40, 24]].forEach(([n, a, l]) => tone(ctx, dest, { f: freq(n), t: t0 + a * st, len: l * st, vol: .06, kind: 'strak' }));
  return toks.length * st + (toks.length < TRAD.mel.length ? .8 : 1.2);
}
// Musik.trad(sort) plays it now and returns its length. The flute and the fiddle play even when the music is off (like the
// flute did), the wind only when the sound is on. The music is turned down while it plays.
function trad(sort) {
  if (sort === 'vind' && !P.on) return 0;
  const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return 0;
  if (!P.ctx) { P.ctx = new AC(); P.master = P.ctx.createGain(); P.master.gain.value = 0; P.master.connect(P.ctx.destination); }
  P.ctx.resume();
  const ctx = P.ctx, out = ctx.createGain(); out.gain.value = .5; out.connect(ctx.destination);
  const dur = tradPa(ctx, out, ctx.currentTime + .05, sort);
  setTimeout(() => out.disconnect(), (dur + 3) * 1000);
  if (P.on) { const t = ctx.currentTime, low = sort === 'vind' ? .5 : .2; P.master.gain.cancelScheduledValues(t); P.master.gain.setValueAtTime(P.master.gain.value, t); P.master.gain.linearRampToValueAtTime(P.vol * low, t + .3); P.master.gain.setValueAtTime(P.vol * low, t + dur); P.master.gain.linearRampToValueAtTime(P.vol, t + dur + 1); }
  return dur;
}

root.Musik = { trad, tradPa, jingel, jingelPa, nasta, grotta, start, stop, paus, spela, natt, get spelar() { return P.on; }, get lat() { return P.lat || ''; }, lattar: SONGS.map(s => s.namn) };
})(typeof window !== 'undefined' ? window : globalThis);
