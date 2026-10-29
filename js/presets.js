/**
 * THE SOUND GARDEN — Presets, Scales & Node Definitions
 * Defines the Virtual Instruments (Sonic Flora), FX Plugins (Environmental Modifiers),
 * Musical Scales, and Curated 3D Preset Gardens.
 */

window.SoundGarden = window.SoundGarden || {};

(function (SG) {
  'use strict';

  // Musical scales (semitone offsets from root)
  SG.SCALES = {
    bioluminescent: {
      name: 'Bioluminescent Lydian (Dreamy)',
      intervals: [0, 2, 4, 6, 7, 9, 11]
    },
    mycelialMinor: {
      name: 'Mycelial Dorian (Groove)',
      intervals: [0, 2, 3, 5, 7, 9, 10]
    },
    hirajoshi: {
      name: 'Botanical Hirajoshi (Zen)',
      intervals: [0, 2, 3, 7, 8]
    },
    pentatonicMinor: {
      name: 'Nightshade Pentatonic',
      intervals: [0, 3, 5, 7, 10]
    },
    pentatonicMajor: {
      name: 'Sunlit Canopy Pentatonic',
      intervals: [0, 2, 4, 7, 9]
    },
    wholeTone: {
      name: 'Spore Cloud Whole-Tone',
      intervals: [0, 2, 4, 6, 8, 10]
    }
  };

  SG.ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Utility: MIDI note to frequency (Hz)
  SG.midiToFreq = function (midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  // Utility: MIDI note to readable name (e.g., 60 -> "C4")
  SG.midiToName = function (midi) {
    var note = SG.ROOT_NOTES[midi % 12];
    var oct = Math.floor(midi / 12) - 1;
    return note + oct;
  };

  // =========================================================================
  // VIRTUAL INSTRUMENT CATALOG (3D Sonic Flora)
  // =========================================================================
  SG.INSTRUMENT_TYPES = {
    'sub-flora': {
      id: 'sub-flora',
      category: 'instrument',
      name: 'Sub-Flora Bass',
      subtitle: 'Bioluminescent Root & Bulb Sub-Synthesizer',
      badge: 'SYNTH FLORA',
      color: '#00f5d4',
      secondaryColor: '#4361ee',
      icon: '🌷',
      description: 'Deep pulsing subterranean lotus bulb with dual analog-style oscillators, sub-octave root generator, resonant lowpass filter envelope, and warm saturation.',
      defaultOctave: 2,
      params: [
        { key: 'waveform', label: 'Main Wave', type: 'select', options: ['sawtooth', 'square', 'triangle', 'sine'], default: 'sawtooth' },
        { key: 'subLevel', label: 'Sub Root (-1 Oct)', min: 0, max: 1, step: 0.01, default: 0.75, unit: '%' },
        { key: 'detune', label: 'Unison Detune', min: 0, max: 50, step: 0.5, default: 12, unit: 'ct' },
        { key: 'cutoff', label: 'Filter Cutoff', min: 40, max: 6000, step: 1, default: 420, unit: 'Hz', log: true },
        { key: 'resonance', label: 'Resonance (Q)', min: 0.5, max: 18, step: 0.1, default: 5.5, unit: 'Q' },
        { key: 'envMod', label: 'Filter Env Amt', min: 0, max: 5000, step: 10, default: 1800, unit: 'Hz' },
        { key: 'drive', label: 'Root Saturation', min: 0, max: 1, step: 0.01, default: 0.35, unit: '%' },
        { key: 'attack', label: 'Attack', min: 0.005, max: 1.5, step: 0.005, default: 0.015, unit: 's' },
        { key: 'decay', label: 'Decay', min: 0.05, max: 2.5, step: 0.01, default: 0.45, unit: 's' },
        { key: 'sustain', label: 'Sustain', min: 0, max: 1, step: 0.01, default: 0.4, unit: '%' },
        { key: 'release', label: 'Release', min: 0.02, max: 3.0, step: 0.01, default: 0.35, unit: 's' },
        { key: 'gain', label: 'Output Level', min: 0, max: 1.2, step: 0.01, default: 0.85, unit: '' }
      ],
      presets: {
        'Deep Mycelium': { waveform: 'sawtooth', subLevel: 0.78, detune: 12, cutoff: 380, resonance: 6.0, envMod: 1850, drive: 0.38, attack: 0.012, decay: 0.42, sustain: 0.35, release: 0.32, gain: 0.85 },
        'Acid Pitcher Plant': { waveform: 'sawtooth', subLevel: 0.4, detune: 5, cutoff: 260, resonance: 14.5, envMod: 3400, drive: 0.65, attack: 0.005, decay: 0.28, sustain: 0.1, release: 0.18, gain: 0.8 },
        'Warm Moss Drone': { waveform: 'triangle', subLevel: 0.9, detune: 22, cutoff: 650, resonance: 2.2, envMod: 600, drive: 0.2, attack: 0.35, decay: 1.2, sustain: 0.8, release: 1.4, gain: 0.85 }
      }
    },

    'crystal-pad': {
      id: 'crystal-pad',
      category: 'instrument',
      name: 'Crystal Pad',
      subtitle: 'Crystalline Orchid Harmonic Choir Synth',
      badge: 'POLY CRYSTAL',
      color: '#d946ef',
      secondaryColor: '#7209b7',
      icon: '💎',
      description: 'Levitating cluster of resonant amethyst quartz crystals producing lush multi-voice detuned pads, shimmering fifths/octaves, and slow breathing filter modulation.',
      defaultOctave: 4,
      params: [
        { key: 'waveform', label: 'Crystal Wave', type: 'select', options: ['sawtooth', 'triangle', 'sine', 'square'], default: 'sawtooth' },
        { key: 'shimmer', label: 'Harmonic Shimmer', min: 0, max: 1, step: 0.01, default: 0.65, unit: '%' },
        { key: 'spread', label: 'Chorus Detune', min: 2, max: 45, step: 0.5, default: 18, unit: 'ct' },
        { key: 'cutoff', label: 'Prism Cutoff', min: 120, max: 12000, step: 10, default: 2400, unit: 'Hz', log: true },
        { key: 'resonance', label: 'Resonance', min: 0.5, max: 12, step: 0.1, default: 2.2, unit: 'Q' },
        { key: 'lfoRate', label: 'Breath LFO Rate', min: 0.05, max: 8, step: 0.05, default: 0.35, unit: 'Hz' },
        { key: 'lfoDepth', label: 'Breath Depth', min: 0, max: 2400, step: 10, default: 750, unit: 'Hz' },
        { key: 'attack', label: 'Bloom Attack', min: 0.02, max: 3.5, step: 0.02, default: 0.65, unit: 's' },
        { key: 'decay', label: 'Decay', min: 0.1, max: 4.0, step: 0.05, default: 1.5, unit: 's' },
        { key: 'sustain', label: 'Sustain', min: 0.1, max: 1, step: 0.01, default: 0.78, unit: '%' },
        { key: 'release', label: 'Crystal Release', min: 0.1, max: 6.0, step: 0.05, default: 2.4, unit: 's' },
        { key: 'gain', label: 'Output Level', min: 0, max: 1.2, step: 0.01, default: 0.72, unit: '' }
      ],
      presets: {
        'Amethyst Canopy': { waveform: 'sawtooth', shimmer: 0.65, spread: 18, cutoff: 2400, resonance: 2.2, lfoRate: 0.35, lfoDepth: 750, attack: 0.65, decay: 1.5, sustain: 0.78, release: 2.4, gain: 0.72 },
        'Glass Orchid Pluck': { waveform: 'triangle', shimmer: 0.85, spread: 11, cutoff: 4800, resonance: 4.0, lfoRate: 1.8, lfoDepth: 400, attack: 0.015, decay: 0.65, sustain: 0.2, release: 1.2, gain: 0.8 },
        'Astral Solarium Choir': { waveform: 'sawtooth', shimmer: 0.9, spread: 28, cutoff: 1500, resonance: 3.5, lfoRate: 0.18, lfoDepth: 950, attack: 1.4, decay: 2.2, sustain: 0.88, release: 3.6, gain: 0.7 }
      }
    },

    'granular-spore': {
      id: 'granular-spore',
      category: 'instrument',
      name: 'Granular Spore',
      subtitle: 'Bioluminescent Spore Cloud & Texture Synthesizer',
      badge: 'GRANULAR CLOUD',
      color: '#38bdf8',
      secondaryColor: '#10b981',
      icon: '✨',
      description: 'Floating dandelion nebula that scatters dozens of micro-sonic spores per note. Controls grain density, duration, pitch scatter, octave sparkles, and resonant filtering.',
      defaultOctave: 4,
      params: [
        { key: 'grainWave', label: 'Spore Timbre', type: 'select', options: ['sine', 'triangle', 'sawtooth'], default: 'sine' },
        { key: 'density', label: 'Spore Density', min: 4, max: 45, step: 1, default: 22, unit: 'gr/s' },
        { key: 'grainSize', label: 'Grain Duration', min: 0.03, max: 0.45, step: 0.01, default: 0.14, unit: 's' },
        { key: 'scatter', label: 'Pitch Scatter', min: 0, max: 120, step: 1, default: 18, unit: 'ct' },
        { key: 'octaveChance', label: 'Octave Sparkle', min: 0, max: 1, step: 0.01, default: 0.45, unit: '%' },
        { key: 'fifthChance', label: 'Fifth Harmonics', min: 0, max: 1, step: 0.01, default: 0.3, unit: '%' },
        { key: 'cutoff', label: 'Cloud Filter', min: 200, max: 12000, step: 10, default: 4200, unit: 'Hz', log: true },
        { key: 'resonance', label: 'Vapor Resonance', min: 0.5, max: 12, step: 0.1, default: 2.8, unit: 'Q' },
        { key: 'attack', label: 'Swarm Attack', min: 0.02, max: 3.0, step: 0.02, default: 0.35, unit: 's' },
        { key: 'release', label: 'Cloud Dissipation', min: 0.1, max: 5.0, step: 0.05, default: 1.8, unit: 's' },
        { key: 'gain', label: 'Output Level', min: 0, max: 1.2, step: 0.01, default: 0.78, unit: '' }
      ],
      presets: {
        'Glowing Pollen Drift': { grainWave: 'sine', density: 22, grainSize: 0.14, scatter: 18, octaveChance: 0.45, fifthChance: 0.3, cutoff: 4200, resonance: 2.8, attack: 0.35, release: 1.8, gain: 0.78 },
        'Firefly Swarm': { grainWave: 'triangle', density: 38, grainSize: 0.06, scatter: 45, octaveChance: 0.75, fifthChance: 0.5, cutoff: 6800, resonance: 4.5, attack: 0.1, release: 1.2, gain: 0.75 },
        'Nebula Fern Mist': { grainWave: 'sawtooth', density: 16, grainSize: 0.28, scatter: 10, octaveChance: 0.25, fifthChance: 0.4, cutoff: 1800, resonance: 3.2, attack: 0.8, release: 2.8, gain: 0.72 }
      }
    },

    'perc-blooms': {
      id: 'perc-blooms',
      category: 'instrument',
      name: 'Percussion Blooms',
      subtitle: 'Resonant Snap-Pods, Log Drums & Dewdrop Chimes',
      badge: 'ORGANIC PERC',
      color: '#fbbf24',
      secondaryColor: '#f97316',
      icon: '🍄',
      description: 'Physical & FM botanical percussion sculpture combining deep mycelial bass kicks, crisp seed-pod snares, hollow bamboo marimbas, and shimmering dewdrop chimes.',
      defaultOctave: 3,
      params: [
        { key: 'mode', label: 'Bloom Mode', type: 'select', options: ['kit', 'marimba', 'dewdrop', 'taiko-pod'], default: 'kit' },
        { key: 'pitchBend', label: 'Pitch Drop', min: 0, max: 36, step: 1, default: 16, unit: 'st' },
        { key: 'fmIndex', label: 'Wood/Bell FM', min: 0, max: 1, step: 0.01, default: 0.48, unit: '%' },
        { key: 'fmRatio', label: 'Harmonic Ratio', min: 0.5, max: 8, step: 0.05, default: 2.4, unit: 'x' },
        { key: 'snap', label: 'Seed Pod Snap', min: 0, max: 1, step: 0.01, default: 0.55, unit: '%' },
        { key: 'bodyTone', label: 'Hollow Body Filter', min: 150, max: 8000, step: 10, default: 2600, unit: 'Hz', log: true },
        { key: 'resonance', label: 'Cavity Resonance', min: 0.5, max: 15, step: 0.1, default: 4.2, unit: 'Q' },
        { key: 'decay', label: 'Bloom Decay', min: 0.05, max: 2.5, step: 0.01, default: 0.42, unit: 's' },
        { key: 'gain', label: 'Output Level', min: 0, max: 1.2, step: 0.01, default: 0.88, unit: '' }
      ],
      presets: {
        'Botanical Groove Kit': { mode: 'kit', pitchBend: 16, fmIndex: 0.48, fmRatio: 2.4, snap: 0.55, bodyTone: 2600, resonance: 4.2, decay: 0.42, gain: 0.88 },
        'Hollow Bamboo Kalimba': { mode: 'marimba', pitchBend: 3, fmIndex: 0.35, fmRatio: 3.0, snap: 0.25, bodyTone: 3400, resonance: 6.5, decay: 0.65, gain: 0.85 },
        'Crystal Dewdrop Chimes': { mode: 'dewdrop', pitchBend: 0, fmIndex: 0.72, fmRatio: 3.5, snap: 0.15, bodyTone: 7200, resonance: 3.0, decay: 1.35, gain: 0.8 }
      }
    }
  };

  // =========================================================================
  // VIRTUAL FX PLUGIN CATALOG (3D Environmental Modifiers)
  // =========================================================================
  SG.PLUGIN_TYPES = {
    'lush-reverb': {
      id: 'lush-reverb',
      category: 'plugin',
      name: 'Lush Reverb',
      subtitle: 'Mist Canopy & Cavernous Conservatory Reverb',
      badge: 'SPATIAL FX',
      color: '#2dd4bf',
      secondaryColor: '#0284c7',
      icon: '🌊',
      description: 'Floating iridescent mist fountain that bathes connected instruments in lush algorithmic stereo conservatory reflections, high-frequency damping, and shimmer tails.',
      params: [
        { key: 'mix', label: 'Wet / Dry Mix', min: 0, max: 1, step: 0.01, default: 0.48, unit: '%' },
        { key: 'decay', label: 'Canopy Decay', min: 0.4, max: 10.0, step: 0.1, default: 4.2, unit: 's' },
        { key: 'preDelay', label: 'Pre-Delay', min: 0.005, max: 0.25, step: 0.005, default: 0.035, unit: 's' },
        { key: 'damping', label: 'Mist Damping', min: 400, max: 14000, step: 50, default: 5200, unit: 'Hz', log: true },
        { key: 'shimmer', label: 'Canopy Shimmer', min: 0, max: 1, step: 0.01, default: 0.42, unit: '%' },
        { key: 'output', label: 'Output Gain', min: 0, max: 1.5, step: 0.01, default: 1.0, unit: '' }
      ],
      presets: {
        'Glass Dome Cathedral': { mix: 0.52, decay: 5.5, preDelay: 0.04, damping: 5800, shimmer: 0.55, output: 1.0 },
        'Intimate Fern Grotto': { mix: 0.32, decay: 1.8, preDelay: 0.015, damping: 3200, shimmer: 0.15, output: 1.0 },
        'Infinite Starlight Cloud': { mix: 0.72, decay: 8.5, preDelay: 0.08, damping: 7500, shimmer: 0.85, output: 1.05 }
      }
    },

    'echo-vine': {
      id: 'echo-vine',
      category: 'plugin',
      name: 'Echo Vine Delay',
      subtitle: 'Spiraling Tendril Stereo Ping-Pong & Tape Delay',
      badge: 'DELAY FX',
      color: '#4ade80',
      secondaryColor: '#eab308',
      icon: '🌿',
      description: 'Intertwined DNA-like bioluminescent vines creating cascading stereo echoes with warm analog tape filtering, organic flutter modulation, and feedback loops.',
      params: [
        { key: 'mix', label: 'Wet / Dry Mix', min: 0, max: 1, step: 0.01, default: 0.42, unit: '%' },
        { key: 'time', label: 'Delay Time', min: 0.05, max: 1.2, step: 0.005, default: 0.375, unit: 's' },
        { key: 'feedback', label: 'Vine Feedback', min: 0, max: 0.9, step: 0.01, default: 0.56, unit: '%' },
        { key: 'tone', label: 'Tape Warmth Cut', min: 300, max: 10000, step: 50, default: 2800, unit: 'Hz', log: true },
        { key: 'modDepth', label: 'Tendril Flutter', min: 0, max: 1, step: 0.01, default: 0.28, unit: '%' },
        { key: 'pingPong', label: 'Stereo Spread', min: 0, max: 1, step: 0.01, default: 0.75, unit: '%' }
      ],
      presets: {
        'Dotted Eighth Tendril': { mix: 0.42, time: 0.375, feedback: 0.56, tone: 2800, modDepth: 0.28, pingPong: 0.75 },
        'Warm Analog Tape Vine': { mix: 0.38, time: 0.5, feedback: 0.68, tone: 1600, modDepth: 0.55, pingPong: 0.4 },
        'Slapback Dew Echo': { mix: 0.35, time: 0.14, feedback: 0.25, tone: 5400, modDepth: 0.1, pingPong: 0.85 }
      }
    },

    'filter-prism': {
      id: 'filter-prism',
      category: 'plugin',
      name: 'Filter Prism',
      subtitle: 'Refractive Spectral Filter & LFO Modulator',
      badge: 'SPECTRAL FX',
      color: '#a855f7',
      secondaryColor: '#06b6d4',
      icon: '💠',
      description: 'Rotating holographic crystal octahedron that refracts audio frequencies through a multi-mode resonant filter swept by a hypnotic synchronization LFO.',
      params: [
        { key: 'filterType', label: 'Prism Mode', type: 'select', options: ['lowpass', 'bandpass', 'highpass', 'notch'], default: 'lowpass' },
        { key: 'cutoff', label: 'Base Cutoff', min: 60, max: 14000, step: 10, default: 1400, unit: 'Hz', log: true },
        { key: 'resonance', label: 'Prism Peak (Q)', min: 0.5, max: 18, step: 0.1, default: 5.2, unit: 'Q' },
        { key: 'lfoWave', label: 'LFO Shape', type: 'select', options: ['sine', 'triangle', 'sawtooth', 'square'], default: 'sine' },
        { key: 'lfoRate', label: 'Sweep Rate', min: 0.05, max: 14, step: 0.05, default: 0.8, unit: 'Hz' },
        { key: 'lfoDepth', label: 'Sweep Depth', min: 0, max: 4500, step: 20, default: 1200, unit: 'Hz' },
        { key: 'mix', label: 'Wet / Dry Mix', min: 0, max: 1, step: 0.01, default: 0.85, unit: '%' }
      ],
      presets: {
        'Hypnotic Lowpass Sweep': { filterType: 'lowpass', cutoff: 1400, resonance: 5.2, lfoWave: 'sine', lfoRate: 0.8, lfoDepth: 1200, mix: 0.85 },
        'Rhythmic Bandpass Pulse': { filterType: 'bandpass', cutoff: 1100, resonance: 7.5, lfoWave: 'sawtooth', lfoRate: 3.2, lfoDepth: 2200, mix: 0.9 },
        'Phasing Notch Crystal': { filterType: 'notch', cutoff: 1800, resonance: 6.0, lfoWave: 'triangle', lfoRate: 0.45, lfoDepth: 1500, mix: 0.8 }
      }
    },

    'distortion-thorn': {
      id: 'distortion-thorn',
      category: 'plugin',
      name: 'Distortion Thorn',
      subtitle: 'Briar Rose Harmonic Waveshaper & Saturator',
      badge: 'DRIVE FX',
      color: '#f43f5e',
      secondaryColor: '#ec4899',
      icon: '🥀',
      description: 'Crystalline crimson briar crown that injects gritty harmonic saturation, tube-style asymmetry, and biting edge into basslines, synths, and percussion.',
      params: [
        { key: 'drive', label: 'Thorn Drive', min: 0, max: 1, step: 0.01, default: 0.45, unit: '%' },
        { key: 'asymmetry', label: 'Tube Asymmetry', min: 0, max: 1, step: 0.01, default: 0.35, unit: '%' },
        { key: 'tone', label: 'Bite Filter', min: 300, max: 12000, step: 50, default: 4200, unit: 'Hz', log: true },
        { key: 'mix', label: 'Parallel Mix', min: 0, max: 1, step: 0.01, default: 0.65, unit: '%' },
        { key: 'output', label: 'Output Trim', min: 0.1, max: 1.4, step: 0.01, default: 0.85, unit: '' }
      ],
      presets: {
        'Warm Briar Saturation': { drive: 0.38, asymmetry: 0.3, tone: 4600, mix: 0.6, output: 0.88 },
        'Electric Nettle Fuzz': { drive: 0.82, asymmetry: 0.65, tone: 3200, mix: 0.85, output: 0.72 },
        'Subtle Harmonic Glow': { drive: 0.2, asymmetry: 0.15, tone: 6800, mix: 0.45, output: 0.95 }
      }
    }
  };

  // =========================================================================
  // CURATED 3D PRESET GARDENS
  // =========================================================================
  SG.PRESET_GARDENS = {
    midnightBioluminescence: {
      id: 'midnightBioluminescence',
      name: 'Midnight Bioluminescence',
      description: 'Lush evolving ambient conservatory with Crystal Pad, Granular Spore, Sub-Flora Bass, and Percussion Blooms wired through Echo Vine, Filter Prism, Distortion Thorn, and Lush Reverb.',
      bpm: 96,
      scale: 'bioluminescent',
      rootNote: 0, // C
      generativeBloom: true,
      nodes: [
        // Instruments arranged in an outer arc
        {
          id: 'inst_sub_1',
          type: 'sub-flora',
          name: 'Sub-Flora Bass',
          position: { x: -11, y: 0, z: 6 },
          params: { waveform: 'sawtooth', subLevel: 0.78, detune: 14, cutoff: 420, resonance: 5.5, envMod: 1800, drive: 0.35, attack: 0.015, decay: 0.45, sustain: 0.4, release: 0.35, gain: 0.82 },
          pattern: [
            { active: true, degree: 0, octave: 2, prob: 1.0 },
            { active: false, degree: 0, octave: 2, prob: 0.5 },
            { active: false, degree: 4, octave: 2, prob: 0.7 },
            { active: true, degree: 4, octave: 2, prob: 0.8 },
            { active: false, degree: 0, octave: 2, prob: 0.5 },
            { active: false, degree: 2, octave: 2, prob: 0.6 },
            { active: true, degree: 3, octave: 2, prob: 0.9 },
            { active: false, degree: 0, octave: 2, prob: 0.5 },
            { active: true, degree: 0, octave: 2, prob: 1.0 },
            { active: false, degree: 0, octave: 3, prob: 0.6 },
            { active: true, degree: 5, octave: 2, prob: 0.85 },
            { active: false, degree: 4, octave: 2, prob: 0.5 },
            { active: true, degree: 2, octave: 2, prob: 0.9 },
            { active: false, degree: 0, octave: 2, prob: 0.5 },
            { active: true, degree: 4, octave: 2, prob: 0.85 },
            { active: false, degree: 6, octave: 2, prob: 0.6 }
          ]
        },
        {
          id: 'inst_pad_1',
          type: 'crystal-pad',
          name: 'Crystal Pad',
          position: { x: -5, y: 0, z: -11 },
          params: { waveform: 'sawtooth', shimmer: 0.7, spread: 20, cutoff: 2600, resonance: 2.4, lfoRate: 0.35, lfoDepth: 800, attack: 0.55, decay: 1.5, sustain: 0.8, release: 2.5, gain: 0.72 },
          pattern: [
            { active: true, degree: 0, octave: 4, prob: 1.0 },
            { active: false, degree: 2, octave: 4, prob: 0.5 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: false, degree: 6, octave: 4, prob: 0.5 },
            { active: true, degree: 4, octave: 4, prob: 0.9 },
            { active: false, degree: 2, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 3, octave: 4, prob: 0.5 },
            { active: true, degree: 2, octave: 4, prob: 0.95 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: false, degree: 6, octave: 4, prob: 0.5 },
            { active: false, degree: 5, octave: 4, prob: 0.5 },
            { active: true, degree: 6, octave: 4, prob: 0.9 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: false, degree: 2, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 }
          ]
        },
        {
          id: 'inst_spore_1',
          type: 'granular-spore',
          name: 'Granular Spore',
          position: { x: 8, y: 0, z: -9 },
          params: { grainWave: 'sine', density: 24, grainSize: 0.15, scatter: 20, octaveChance: 0.55, fifthChance: 0.35, cutoff: 4800, resonance: 2.8, attack: 0.3, release: 1.9, gain: 0.78 },
          pattern: [
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: false, degree: 6, octave: 4, prob: 0.5 },
            { active: true, degree: 4, octave: 5, prob: 0.9 },
            { active: false, degree: 2, octave: 5, prob: 0.5 },
            { active: false, degree: 0, octave: 5, prob: 0.5 },
            { active: true, degree: 6, octave: 4, prob: 0.85 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: true, degree: 2, octave: 5, prob: 0.8 },
            { active: false, degree: 0, octave: 5, prob: 0.5 },
            { active: false, degree: 4, octave: 5, prob: 0.5 },
            { active: true, degree: 3, octave: 5, prob: 0.9 },
            { active: false, degree: 2, octave: 5, prob: 0.5 },
            { active: false, degree: 0, octave: 5, prob: 0.5 },
            { active: true, degree: 5, octave: 4, prob: 0.85 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: true, degree: 0, octave: 5, prob: 0.75 }
          ]
        },
        {
          id: 'inst_perc_1',
          type: 'perc-blooms',
          name: 'Percussion Blooms',
          position: { x: 11, y: 0, z: 5 },
          params: { mode: 'kit', pitchBend: 16, fmIndex: 0.48, fmRatio: 2.4, snap: 0.55, bodyTone: 2800, resonance: 4.2, decay: 0.42, gain: 0.86 },
          pattern: [
            { active: true, degree: 0, octave: 3, prob: 1.0 },
            { active: false, degree: 5, octave: 4, prob: 0.5 },
            { active: true, degree: 6, octave: 4, prob: 0.85 },
            { active: false, degree: 3, octave: 3, prob: 0.5 },
            { active: true, degree: 2, octave: 3, prob: 0.95 },
            { active: false, degree: 6, octave: 4, prob: 0.5 },
            { active: true, degree: 4, octave: 4, prob: 0.8 },
            { active: true, degree: 5, octave: 3, prob: 0.65 },
            { active: true, degree: 0, octave: 3, prob: 1.0 },
            { active: false, degree: 6, octave: 4, prob: 0.5 },
            { active: true, degree: 4, octave: 4, prob: 0.9 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: true, degree: 2, octave: 3, prob: 0.95 },
            { active: true, degree: 5, octave: 4, prob: 0.75 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: true, degree: 6, octave: 4, prob: 0.85 }
          ]
        },

        // 4 FX Plugins arranged in the inner ring around the Heart Tree
        {
          id: 'fx_thorn_1',
          type: 'distortion-thorn',
          name: 'Distortion Thorn',
          position: { x: -6, y: 0, z: 3 },
          params: { drive: 0.36, asymmetry: 0.3, tone: 3800, mix: 0.55, output: 0.9 }
        },
        {
          id: 'fx_prism_1',
          type: 'filter-prism',
          name: 'Filter Prism',
          position: { x: -3, y: 0, z: -5 },
          params: { filterType: 'lowpass', cutoff: 1800, resonance: 4.5, lfoWave: 'sine', lfoRate: 0.55, lfoDepth: 1100, mix: 0.8 }
        },
        {
          id: 'fx_echo_1',
          type: 'echo-vine',
          name: 'Echo Vine Delay',
          position: { x: 5, y: 0, z: -4 },
          params: { mix: 0.44, time: 0.375, feedback: 0.58, tone: 3000, modDepth: 0.25, pingPong: 0.8 }
        },
        {
          id: 'fx_reverb_1',
          type: 'lush-reverb',
          name: 'Lush Reverb',
          position: { x: 4, y: 0, z: 4 },
          params: { mix: 0.5, decay: 4.8, preDelay: 0.035, damping: 5600, shimmer: 0.5, output: 1.0 }
        }
      ],
      connections: [
        // Sub-Flora -> Distortion Thorn -> Master
        { from: 'inst_sub_1', to: 'fx_thorn_1' },
        { from: 'fx_thorn_1', to: 'master' },
        // Crystal Pad -> Filter Prism -> Lush Reverb -> Master
        { from: 'inst_pad_1', to: 'fx_prism_1' },
        { from: 'fx_prism_1', to: 'fx_reverb_1' },
        // Granular Spore -> Echo Vine -> Lush Reverb -> Master
        { from: 'inst_spore_1', to: 'fx_echo_1' },
        { from: 'fx_echo_1', to: 'fx_reverb_1' },
        { from: 'fx_reverb_1', to: 'master' },
        // Percussion Blooms -> Echo Vine & Direct to Master
        { from: 'inst_perc_1', to: 'master' },
        { from: 'inst_perc_1', to: 'fx_echo_1' }
      ]
    },

    mycelialBassGroove: {
      id: 'mycelialBassGroove',
      name: 'Mycelial Bass Groove',
      description: 'Hypnotic subterranean bass & polyrhythmic percussion driven through Briar Distortion, Resonant Filter Prism, and Ping-Pong Echo Vines.',
      bpm: 118,
      scale: 'mycelialMinor',
      rootNote: 2, // D
      generativeBloom: false,
      nodes: [
        {
          id: 'inst_sub_1',
          type: 'sub-flora',
          name: 'Acid Root Bass',
          position: { x: -10, y: 0, z: 4 },
          params: { waveform: 'sawtooth', subLevel: 0.65, detune: 8, cutoff: 310, resonance: 12.5, envMod: 2900, drive: 0.58, attack: 0.008, decay: 0.3, sustain: 0.2, release: 0.2, gain: 0.85 },
          pattern: [
            { active: true, degree: 0, octave: 2, prob: 1.0 },
            { active: true, degree: 0, octave: 2, prob: 0.9 },
            { active: false, degree: 3, octave: 2, prob: 0.5 },
            { active: true, degree: 0, octave: 3, prob: 0.95 },
            { active: false, degree: 0, octave: 2, prob: 0.5 },
            { active: true, degree: 2, octave: 2, prob: 0.9 },
            { active: true, degree: 4, octave: 2, prob: 1.0 },
            { active: false, degree: 0, octave: 2, prob: 0.5 },
            { active: true, degree: 0, octave: 2, prob: 1.0 },
            { active: false, degree: 0, octave: 2, prob: 0.5 },
            { active: true, degree: 5, octave: 2, prob: 0.95 },
            { active: true, degree: 4, octave: 2, prob: 0.9 },
            { active: false, degree: 2, octave: 2, prob: 0.5 },
            { active: true, degree: 6, octave: 2, prob: 0.95 },
            { active: true, degree: 0, octave: 3, prob: 0.9 },
            { active: false, degree: 4, octave: 2, prob: 0.5 }
          ]
        },
        {
          id: 'inst_perc_1',
          type: 'perc-blooms',
          name: 'Snap-Pod Kit',
          position: { x: 10, y: 0, z: 4 },
          params: { mode: 'kit', pitchBend: 18, fmIndex: 0.52, fmRatio: 2.6, snap: 0.68, bodyTone: 3200, resonance: 5.0, decay: 0.36, gain: 0.9 },
          pattern: [
            { active: true, degree: 0, octave: 3, prob: 1.0 },
            { active: true, degree: 6, octave: 4, prob: 0.8 },
            { active: true, degree: 5, octave: 4, prob: 0.9 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: true, degree: 2, octave: 3, prob: 1.0 },
            { active: false, degree: 6, octave: 4, prob: 0.5 },
            { active: true, degree: 5, octave: 4, prob: 0.9 },
            { active: true, degree: 3, octave: 3, prob: 0.8 },
            { active: true, degree: 0, octave: 3, prob: 1.0 },
            { active: true, degree: 6, octave: 4, prob: 0.8 },
            { active: true, degree: 4, octave: 3, prob: 0.85 },
            { active: false, degree: 5, octave: 4, prob: 0.5 },
            { active: true, degree: 2, octave: 3, prob: 1.0 },
            { active: true, degree: 6, octave: 4, prob: 0.85 },
            { active: true, degree: 4, octave: 4, prob: 0.9 },
            { active: true, degree: 5, octave: 4, prob: 0.85 }
          ]
        },
        {
          id: 'inst_pad_1',
          type: 'crystal-pad',
          name: 'Nightshade Chords',
          position: { x: 0, y: 0, z: -11 },
          params: { waveform: 'triangle', shimmer: 0.8, spread: 15, cutoff: 3400, resonance: 3.5, lfoRate: 1.9, lfoDepth: 900, attack: 0.03, decay: 0.7, sustain: 0.35, release: 0.9, gain: 0.75 },
          pattern: [
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 2, octave: 4, prob: 0.5 },
            { active: true, degree: 0, octave: 4, prob: 0.95 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: false, degree: 2, octave: 4, prob: 0.5 },
            { active: true, degree: 2, octave: 4, prob: 0.9 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: false, degree: 6, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: true, degree: 4, octave: 4, prob: 0.95 },
            { active: false, degree: 5, octave: 4, prob: 0.5 },
            { active: false, degree: 6, octave: 4, prob: 0.5 },
            { active: true, degree: 6, octave: 4, prob: 0.9 },
            { active: false, degree: 4, octave: 4, prob: 0.5 },
            { active: true, degree: 2, octave: 4, prob: 0.75 }
          ]
        },
        {
          id: 'fx_thorn_1',
          type: 'distortion-thorn',
          name: 'Distortion Thorn',
          position: { x: -5, y: 0, z: 2 },
          params: { drive: 0.62, asymmetry: 0.45, tone: 3400, mix: 0.7, output: 0.82 }
        },
        {
          id: 'fx_prism_1',
          type: 'filter-prism',
          name: 'Filter Prism',
          position: { x: -2, y: 0, z: -4 },
          params: { filterType: 'lowpass', cutoff: 1200, resonance: 6.5, lfoWave: 'sawtooth', lfoRate: 1.95, lfoDepth: 1800, mix: 0.85 }
        },
        {
          id: 'fx_echo_1',
          type: 'echo-vine',
          name: 'Echo Vine Delay',
          position: { x: 4, y: 0, z: -3 },
          params: { mix: 0.4, time: 0.25, feedback: 0.52, tone: 3600, modDepth: 0.2, pingPong: 0.85 }
        }
      ],
      connections: [
        { from: 'inst_sub_1', to: 'fx_thorn_1' },
        { from: 'fx_thorn_1', to: 'fx_prism_1' },
        { from: 'fx_prism_1', to: 'master' },
        { from: 'inst_pad_1', to: 'fx_echo_1' },
        { from: 'fx_echo_1', to: 'master' },
        { from: 'inst_perc_1', to: 'master' }
      ]
    },

    crystallineRain: {
      id: 'crystallineRain',
      name: 'Crystalline Rain Conservatory',
      description: 'Delicate Japanese Hirajoshi dewdrop chimes, bamboo marimbas, and shimmering spore clouds cascading through cavernous glass dome reverb.',
      bpm: 84,
      scale: 'hirajoshi',
      rootNote: 4, // E
      generativeBloom: true,
      nodes: [
        {
          id: 'inst_perc_1',
          type: 'perc-blooms',
          name: 'Dewdrop Chimes',
          position: { x: -8, y: 0, z: -6 },
          params: { mode: 'dewdrop', pitchBend: 0, fmIndex: 0.68, fmRatio: 3.5, snap: 0.15, bodyTone: 7400, resonance: 3.2, decay: 1.2, gain: 0.82 },
          pattern: [
            { active: true, degree: 0, octave: 4, prob: 1.0 },
            { active: false, degree: 1, octave: 4, prob: 0.5 },
            { active: true, degree: 2, octave: 4, prob: 0.9 },
            { active: true, degree: 4, octave: 4, prob: 0.85 },
            { active: false, degree: 3, octave: 4, prob: 0.5 },
            { active: true, degree: 0, octave: 5, prob: 0.9 },
            { active: false, degree: 2, octave: 4, prob: 0.5 },
            { active: true, degree: 3, octave: 4, prob: 0.85 },
            { active: true, degree: 1, octave: 4, prob: 0.95 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: true, degree: 4, octave: 4, prob: 0.9 },
            { active: false, degree: 2, octave: 5, prob: 0.5 },
            { active: true, degree: 2, octave: 4, prob: 0.9 },
            { active: true, degree: 3, octave: 4, prob: 0.8 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: true, degree: 1, octave: 5, prob: 0.85 }
          ]
        },
        {
          id: 'inst_spore_1',
          type: 'granular-spore',
          name: 'Mist Spore Cloud',
          position: { x: 8, y: 0, z: -6 },
          params: { grainWave: 'sine', density: 30, grainSize: 0.18, scatter: 14, octaveChance: 0.65, fifthChance: 0.45, cutoff: 5800, resonance: 2.5, attack: 0.5, release: 2.4, gain: 0.78 },
          pattern: [
            { active: true, degree: 0, octave: 4, prob: 1.0 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: true, degree: 3, octave: 4, prob: 0.95 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: true, degree: 2, octave: 4, prob: 0.95 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: true, degree: 4, octave: 4, prob: 0.95 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 },
            { active: false, degree: 0, octave: 4, prob: 0.5 }
          ]
        },
        {
          id: 'inst_pad_1',
          type: 'crystal-pad',
          name: 'Orchid Solarium Pad',
          position: { x: 0, y: 0, z: 10 },
          params: { waveform: 'sawtooth', shimmer: 0.85, spread: 24, cutoff: 1900, resonance: 2.0, lfoRate: 0.22, lfoDepth: 700, attack: 1.1, decay: 2.0, sustain: 0.85, release: 3.2, gain: 0.7 },
          pattern: [
            { active: true, degree: 0, octave: 3, prob: 1.0 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: true, degree: 2, octave: 3, prob: 1.0 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 },
            { active: false, degree: 0, octave: 3, prob: 0.5 }
          ]
        },
        {
          id: 'fx_echo_1',
          type: 'echo-vine',
          name: 'Raindrop Echo Vine',
          position: { x: -4, y: 0, z: -1 },
          params: { mix: 0.48, time: 0.42, feedback: 0.65, tone: 4200, modDepth: 0.3, pingPong: 0.85 }
        },
        {
          id: 'fx_reverb_1',
          type: 'lush-reverb',
          name: 'Starlight Dome Reverb',
          position: { x: 4, y: 0, z: 2 },
          params: { mix: 0.65, decay: 7.2, preDelay: 0.05, damping: 6800, shimmer: 0.75, output: 1.05 }
        }
      ],
      connections: [
        { from: 'inst_perc_1', to: 'fx_echo_1' },
        { from: 'fx_echo_1', to: 'fx_reverb_1' },
        { from: 'inst_spore_1', to: 'fx_reverb_1' },
        { from: 'inst_pad_1', to: 'fx_reverb_1' },
        { from: 'fx_reverb_1', to: 'master' }
      ]
    }
  };
})(window.SoundGarden);
