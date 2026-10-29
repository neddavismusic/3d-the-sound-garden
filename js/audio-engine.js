/**
 * THE SOUND GARDEN — Real-Time Web Audio Synthesizer & Modular DSP Plugin Engine
 * Powers 4 Virtual Instruments (Sonic Flora), 4 Modular FX Plugins (Environmental Modifiers),
 * 3D Spatial Panning, Signal Metering, and Live Studio Audio Recording.
 */

window.SoundGarden = window.SoundGarden || {};

(function (SG) {
  'use strict';

  function AudioEngine() {
    this.ctx = null;
    this.isInitialized = false;
    this.masterGain = null;
    this.compressor = null;
    this.masterAnalyser = null;
    this.recorderDest = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;

    // Graph state
    this.nodes = {};        // id -> NodeInstance
    this.connections = [];  // Array of { from: id, to: id }
    this.activeVoices = {}; // key -> voice cleanup handle

    // Master buffers for visualization
    this.freqData = new Uint8Array(128);
    this.timeData = new Uint8Array(256);
    this.tempMeterBuf = new Uint8Array(64);

    // Event listeners for visual pulse callbacks
    this.onNoteTriggered = null; // function(nodeId, midiNote, velocity)
  }

  AudioEngine.prototype.init = function () {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    }

    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master Dynamics Compressor (prevents clipping with rich polyphonic patches)
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.2;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 512;
    this.masterAnalyser.smoothingTimeConstant = 0.82;
    this.freqData = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.masterAnalyser.fftSize);

    // Connect Master Chain
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Setup recording stream destination
    if (this.ctx.createMediaStreamDestination) {
      this.recorderDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.recorderDest);
    }

    this.isInitialized = true;

    // Re-instantiate any pending nodes that were loaded before AudioContext started
    this._rebuildAudioGraph();
    return this.ctx;
  };

  AudioEngine.prototype.resume = function () {
    if (!this.isInitialized) {
      this.init();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  };

  AudioEngine.prototype.setMasterVolume = function (val) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.02);
    }
  };

  // =========================================================================
  // NODE GRAPH MANAGEMENT (INSTRUMENTS & FX PLUGINS)
  // =========================================================================
  AudioEngine.prototype.createNode = function (config) {
    var catalog = SG.INSTRUMENT_TYPES[config.type] || SG.PLUGIN_TYPES[config.type];
    if (!catalog) {
      console.error('Unknown node type:', config.type);
      return null;
    }

    // Merge default params with config.params
    var params = {};
    catalog.params.forEach(function (p) {
      params[p.key] = (config.params && config.params[p.key] !== undefined)
        ? config.params[p.key]
        : p.default;
    });

    // Default 16-step pattern for instruments
    var pattern = [];
    if (catalog.category === 'instrument') {
      for (var i = 0; i < 16; i++) {
        if (config.pattern && config.pattern[i]) {
          pattern.push({
            active: !!config.pattern[i].active,
            degree: config.pattern[i].degree || 0,
            octave: config.pattern[i].octave !== undefined ? config.pattern[i].octave : catalog.defaultOctave,
            prob: config.pattern[i].prob !== undefined ? config.pattern[i].prob : 1.0
          });
        } else {
          pattern.push({
            active: (i % 4 === 0),
            degree: (i * 2) % 7,
            octave: catalog.defaultOctave,
            prob: 1.0
          });
        }
      }
    }

    var nodeObj = {
      id: config.id || (catalog.category + '_' + Date.now() + '_' + Math.floor(Math.random() * 999)),
      type: config.type,
      category: catalog.category,
      name: config.name || catalog.name,
      color: catalog.color,
      secondaryColor: catalog.secondaryColor,
      position: {
        x: (config.position && config.position.x !== undefined) ? config.position.x : (Math.random() * 16 - 8),
        y: (config.position && config.position.y !== undefined) ? config.position.y : 0,
        z: (config.position && config.position.z !== undefined) ? config.position.z : (Math.random() * 16 - 8)
      },
      params: params,
      pattern: pattern,
      muted: !!config.muted,
      bypassed: !!config.bypassed,
      signalLevel: 0,
      lastTriggeredTime: 0,
      audio: null // Populated when AudioContext is active
    };

    this.nodes[nodeObj.id] = nodeObj;

    if (this.isInitialized) {
      this._buildNodeAudio(nodeObj);
      this._rewireConnections();
    }

    return nodeObj;
  };

  AudioEngine.prototype.removeNode = function (nodeId) {
    var node = this.nodes[nodeId];
    if (!node) return;

    // Remove connections involving this node
    this.connections = this.connections.filter(function (c) {
      return c.from !== nodeId && c.to !== nodeId;
    });

    if (node.audio) {
      try {
        if (node.audio.cleanup) node.audio.cleanup();
        node.audio.outputGain.disconnect();
      } catch (e) {}
    }

    delete this.nodes[nodeId];
    if (this.isInitialized) {
      this._rewireConnections();
    }
  };

  AudioEngine.prototype.clearGraph = function () {
    var self = this;
    Object.keys(this.nodes).forEach(function (id) {
      var n = self.nodes[id];
      if (n && n.audio) {
        try {
          if (n.audio.cleanup) n.audio.cleanup();
          n.audio.outputGain.disconnect();
        } catch (e) {}
      }
    });
    this.nodes = {};
    this.connections = [];
  };

  AudioEngine.prototype.updateNodePosition = function (nodeId, x, y, z) {
    var node = this.nodes[nodeId];
    if (!node) return;
    node.position.x = x;
    node.position.y = y;
    node.position.z = z;

    if (node.audio && this.ctx) {
      var now = this.ctx.currentTime;
      // Map X (-18..+18) to Stereo Pan (-0.88..+0.88)
      var pan = Math.max(-0.88, Math.min(0.88, x / 16));
      if (node.audio.panner) {
        node.audio.panner.pan.setTargetAtTime(pan, now, 0.03);
      }
      // Subtle distance attenuation from center (0,0,0)
      var dist = Math.sqrt(x * x + z * z);
      var distFactor = Math.max(0.45, Math.min(1.15, 1.1 - (dist / 42)));
      node.audio.spatialGainFactor = distFactor;
      this._applyNodeOutputGain(node);
    }
  };

  AudioEngine.prototype.updateNodeParam = function (nodeId, key, value) {
    var node = this.nodes[nodeId];
    if (!node) return;
    node.params[key] = value;

    if (!this.isInitialized || !node.audio) return;

    if (node.category === 'instrument') {
      this._applyNodeOutputGain(node);
    } else if (node.category === 'plugin') {
      this._updatePluginDSP(node, key, value);
    }
  };

  AudioEngine.prototype.setNodeMute = function (nodeId, muted) {
    var node = this.nodes[nodeId];
    if (!node) return;
    node.muted = muted;
    this._applyNodeOutputGain(node);
  };

  AudioEngine.prototype.setNodeBypass = function (nodeId, bypassed) {
    var node = this.nodes[nodeId];
    if (!node || node.category !== 'plugin') return;
    node.bypassed = bypassed;
    this._updatePluginDSP(node, 'bypass', bypassed);
  };

  AudioEngine.prototype._applyNodeOutputGain = function (node) {
    if (!node.audio || !this.ctx) return;
    var now = this.ctx.currentTime;
    if (node.muted) {
      node.audio.outputGain.gain.setTargetAtTime(0, now, 0.02);
      return;
    }
    var baseGain = node.params.gain !== undefined ? node.params.gain : (node.params.output !== undefined ? node.params.output : 1.0);
    var spatial = node.audio.spatialGainFactor || 1.0;
    node.audio.outputGain.gain.setTargetAtTime(baseGain * spatial, now, 0.02);
  };

  // =========================================================================
  // PATCH CABLE CONNECTIONS (3D MYCELIAL ROUTING)
  // =========================================================================
  AudioEngine.prototype.connectNodes = function (fromId, toId) {
    if (fromId === toId) return false;
    if (fromId === 'master') return false;

    var fromNode = this.nodes[fromId];
    var toNode = toId === 'master' ? { id: 'master', category: 'master' } : this.nodes[toId];
    if (!fromNode || !toNode) return false;

    // Instruments cannot receive audio inputs
    if (toNode.category === 'instrument') return false;

    // Prevent duplicate connection
    var exists = this.connections.some(function (c) {
      return c.from === fromId && c.to === toId;
    });
    if (exists) return false;

    // Prevent cycles in plugin graph
    if (toId !== 'master' && this._createsCycle(fromId, toId)) {
      console.warn('Prevented audio feedback cycle between', fromId, 'and', toId);
      return false;
    }

    this.connections.push({ from: fromId, to: toId });
    if (this.isInitialized) {
      this._rewireConnections();
    }
    return true;
  };

  AudioEngine.prototype.disconnectNodes = function (fromId, toId) {
    var before = this.connections.length;
    this.connections = this.connections.filter(function (c) {
      return !(c.from === fromId && c.to === toId);
    });
    if (this.connections.length !== before && this.isInitialized) {
      this._rewireConnections();
      return true;
    }
    return false;
  };

  AudioEngine.prototype._createsCycle = function (fromId, toId) {
    // Check if there is already a path from toId -> ... -> fromId
    var visited = {};
    var stack = [toId];
    while (stack.length > 0) {
      var curr = stack.pop();
      if (curr === fromId) return true;
      if (visited[curr]) continue;
      visited[curr] = true;
      for (var i = 0; i < this.connections.length; i++) {
        if (this.connections[i].from === curr && this.connections[i].to !== 'master') {
          stack.push(this.connections[i].to);
        }
      }
    }
    return false;
  };

  AudioEngine.prototype._rebuildAudioGraph = function () {
    var self = this;
    Object.keys(this.nodes).forEach(function (id) {
      self._buildNodeAudio(self.nodes[id]);
    });
    this._rewireConnections();
  };

  AudioEngine.prototype._rewireConnections = function () {
    if (!this.isInitialized || !this.ctx) return;
    var self = this;

    // Disconnect all node outputGain nodes first
    Object.keys(this.nodes).forEach(function (id) {
      var n = self.nodes[id];
      if (n && n.audio && n.audio.outputGain) {
        try {
          n.audio.outputGain.disconnect();
          // Keep analyser connected to outputGain for per-node metering
          n.audio.outputGain.connect(n.audio.analyser);
        } catch (e) {}
      }
    });

    // Connect according to this.connections
    this.connections.forEach(function (conn) {
      var fromNode = self.nodes[conn.from];
      if (!fromNode || !fromNode.audio) return;

      if (conn.to === 'master') {
        fromNode.audio.outputGain.connect(self.compressor);
      } else {
        var toNode = self.nodes[conn.to];
        if (toNode && toNode.audio && toNode.audio.inputNode) {
          fromNode.audio.outputGain.connect(toNode.audio.inputNode);
        }
      }
    });
  };

  // =========================================================================
  // BUILD AUDIO NODES & DSP PLUGIN PROCESSORS
  // =========================================================================
  AudioEngine.prototype._buildNodeAudio = function (node) {
    var ctx = this.ctx;
    var panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (panner.pan) {
      panner.pan.value = Math.max(-0.88, Math.min(0.88, node.position.x / 16));
    }

    var outputGain = ctx.createGain();
    var analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.65;

    panner.connect(outputGain);
    outputGain.connect(analyser);

    var dist = Math.sqrt(node.position.x * node.position.x + node.position.z * node.position.z);
    var spatialGainFactor = Math.max(0.45, Math.min(1.15, 1.1 - (dist / 42)));

    if (node.category === 'instrument') {
      var instInput = ctx.createGain();
      instInput.connect(panner);
      node.audio = {
        inputNode: instInput,
        panner: panner,
        outputGain: outputGain,
        analyser: analyser,
        spatialGainFactor: spatialGainFactor
      };
      this._applyNodeOutputGain(node);
    } else if (node.category === 'plugin') {
      node.audio = this._createPluginProcessor(node, panner, outputGain, analyser, spatialGainFactor);
      this._applyNodeOutputGain(node);
    }
  };

  AudioEngine.prototype._createPluginProcessor = function (node, panner, outputGain, analyser, spatialGainFactor) {
    var ctx = this.ctx;
    var p = node.params;
    var inputNode = ctx.createGain();
    var dryGain = ctx.createGain();
    var wetGain = ctx.createGain();
    var sumNode = ctx.createGain();

    inputNode.connect(dryGain);
    dryGain.connect(sumNode);
    wetGain.connect(sumNode);
    sumNode.connect(panner);

    var dsp = {
      inputNode: inputNode,
      dryGain: dryGain,
      wetGain: wetGain,
      sumNode: sumNode,
      panner: panner,
      outputGain: outputGain,
      analyser: analyser,
      spatialGainFactor: spatialGainFactor,
      cleanup: null
    };

    var mix = node.bypassed ? 0 : (p.mix !== undefined ? p.mix : 0.5);
    dryGain.gain.value = 1 - mix * 0.65;
    wetGain.gain.value = mix;

    if (node.type === 'lush-reverb') {
      var preDelay = ctx.createDelay(0.5);
      preDelay.delayTime.value = p.preDelay || 0.035;

      var convolver = ctx.createConvolver();
      convolver.buffer = this._generateReverbImpulse(p.decay || 4.2, p.shimmer || 0.42);

      var dampingFilter = ctx.createBiquadFilter();
      dampingFilter.type = 'lowpass';
      dampingFilter.frequency.value = p.damping || 5200;

      inputNode.connect(preDelay);
      preDelay.connect(convolver);
      convolver.connect(dampingFilter);
      dampingFilter.connect(wetGain);

      dsp.preDelay = preDelay;
      dsp.convolver = convolver;
      dsp.dampingFilter = dampingFilter;

    } else if (node.type === 'echo-vine') {
      var delayL = ctx.createDelay(2.0);
      var delayR = ctx.createDelay(2.0);
      var baseTime = p.time || 0.375;
      var spread = (p.pingPong || 0.75) * 0.045;
      delayL.delayTime.value = baseTime;
      delayR.delayTime.value = Math.min(1.9, baseTime + spread);

      var fbL = ctx.createGain();
      var fbR = ctx.createGain();
      fbL.gain.value = p.feedback || 0.56;
      fbR.gain.value = p.feedback || 0.56;

      var toneFilter = ctx.createBiquadFilter();
      toneFilter.type = 'lowpass';
      toneFilter.frequency.value = p.tone || 2800;

      // Subtle tape flutter LFO
      var flutterLfo = ctx.createOscillator();
      var flutterGain = ctx.createGain();
      flutterLfo.frequency.value = 2.1;
      flutterGain.gain.value = (p.modDepth || 0.28) * 0.0035;
      flutterLfo.connect(flutterGain);
      flutterGain.connect(delayL.delayTime);
      flutterGain.connect(delayR.delayTime);
      flutterLfo.start();

      var panL = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      var panR = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (panL.pan) {
        panL.pan.value = -(p.pingPong || 0.75) * 0.8;
        panR.pan.value = (p.pingPong || 0.75) * 0.8;
      }

      inputNode.connect(toneFilter);
      toneFilter.connect(delayL);
      delayL.connect(fbL);
      fbL.connect(delayR);
      delayR.connect(fbR);
      fbR.connect(toneFilter);

      delayL.connect(panL);
      delayR.connect(panR);
      panL.connect(wetGain);
      panR.connect(wetGain);

      dsp.delayL = delayL;
      dsp.delayR = delayR;
      dsp.fbL = fbL;
      dsp.fbR = fbR;
      dsp.toneFilter = toneFilter;
      dsp.flutterGain = flutterGain;
      dsp.panL = panL;
      dsp.panR = panR;
      dsp.cleanup = function () {
        try { flutterLfo.stop(); } catch (e) {}
      };

    } else if (node.type === 'filter-prism') {
      var filter = ctx.createBiquadFilter();
      filter.type = p.filterType || 'lowpass';
      filter.frequency.value = p.cutoff || 1400;
      filter.Q.value = p.resonance || 5.2;

      var lfo = ctx.createOscillator();
      var lfoGain = ctx.createGain();
      lfo.type = p.lfoWave || 'sine';
      lfo.frequency.value = p.lfoRate || 0.8;
      lfoGain.gain.value = p.lfoDepth || 1200;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      inputNode.connect(filter);
      filter.connect(wetGain);

      dsp.filter = filter;
      dsp.lfo = lfo;
      dsp.lfoGain = lfoGain;
      dsp.cleanup = function () {
        try { lfo.stop(); } catch (e) {}
      };

    } else if (node.type === 'distortion-thorn') {
      var shaper = ctx.createWaveShaper();
      shaper.curve = this._makeDistortionCurve(p.drive || 0.45, p.asymmetry || 0.35);
      shaper.oversample = '2x';

      var toneFilter = ctx.createBiquadFilter();
      toneFilter.type = 'lowpass';
      toneFilter.frequency.value = p.tone || 4200;
      toneFilter.Q.value = 1.4;

      inputNode.connect(shaper);
      shaper.connect(toneFilter);
      toneFilter.connect(wetGain);

      dsp.shaper = shaper;
      dsp.toneFilter = toneFilter;
    }

    return dsp;
  };

  AudioEngine.prototype._updatePluginDSP = function (node, key, value) {
    var dsp = node.audio;
    if (!dsp || !this.ctx) return;
    var now = this.ctx.currentTime;
    var p = node.params;

    var mix = node.bypassed ? 0 : (p.mix !== undefined ? p.mix : 0.5);
    dsp.dryGain.gain.setTargetAtTime(node.bypassed ? 1 : (1 - mix * 0.65), now, 0.02);
    dsp.wetGain.gain.setTargetAtTime(node.bypassed ? 0 : mix, now, 0.02);
    this._applyNodeOutputGain(node);

    if (node.type === 'lush-reverb') {
      if (key === 'preDelay' && dsp.preDelay) {
        dsp.preDelay.delayTime.setTargetAtTime(p.preDelay, now, 0.02);
      } else if (key === 'damping' && dsp.dampingFilter) {
        dsp.dampingFilter.frequency.setTargetAtTime(p.damping, now, 0.02);
      } else if ((key === 'decay' || key === 'shimmer') && dsp.convolver) {
        dsp.convolver.buffer = this._generateReverbImpulse(p.decay, p.shimmer);
      }
    } else if (node.type === 'echo-vine') {
      var spread = (p.pingPong || 0.75) * 0.045;
      if (dsp.delayL && dsp.delayR) {
        dsp.delayL.delayTime.setTargetAtTime(p.time, now, 0.03);
        dsp.delayR.delayTime.setTargetAtTime(Math.min(1.9, p.time + spread), now, 0.03);
      }
      if (dsp.fbL && dsp.fbR) {
        dsp.fbL.gain.setTargetAtTime(p.feedback, now, 0.02);
        dsp.fbR.gain.setTargetAtTime(p.feedback, now, 0.02);
      }
      if (dsp.toneFilter) {
        dsp.toneFilter.frequency.setTargetAtTime(p.tone, now, 0.02);
      }
      if (dsp.flutterGain) {
        dsp.flutterGain.gain.setTargetAtTime(p.modDepth * 0.0035, now, 0.02);
      }
      if (dsp.panL && dsp.panL.pan) {
        dsp.panL.pan.setTargetAtTime(-p.pingPong * 0.8, now, 0.02);
        dsp.panR.pan.setTargetAtTime(p.pingPong * 0.8, now, 0.02);
      }
    } else if (node.type === 'filter-prism') {
      if (dsp.filter) {
        if (key === 'filterType') dsp.filter.type = p.filterType;
        dsp.filter.frequency.setTargetAtTime(p.cutoff, now, 0.02);
        dsp.filter.Q.setTargetAtTime(p.resonance, now, 0.02);
      }
      if (dsp.lfo) {
        if (key === 'lfoWave') dsp.lfo.type = p.lfoWave;
        dsp.lfo.frequency.setTargetAtTime(p.lfoRate, now, 0.02);
      }
      if (dsp.lfoGain) {
        dsp.lfoGain.gain.setTargetAtTime(p.lfoDepth, now, 0.02);
      }
    } else if (node.type === 'distortion-thorn') {
      if ((key === 'drive' || key === 'asymmetry') && dsp.shaper) {
        dsp.shaper.curve = this._makeDistortionCurve(p.drive, p.asymmetry);
      }
      if (dsp.toneFilter) {
        dsp.toneFilter.frequency.setTargetAtTime(p.tone, now, 0.02);
      }
    }
  };

  // Generate stereo algorithmic impulse response with shimmer harmonics
  AudioEngine.prototype._generateReverbImpulse = function (decay, shimmer) {
    var ctx = this.ctx;
    var rate = ctx.sampleRate;
    var length = Math.max(Math.floor(rate * Math.min(10, Math.max(0.3, decay))), 1024);
    var impulse = ctx.createBuffer(2, length, rate);

    for (var ch = 0; ch < 2; ch++) {
      var data = impulse.getChannelData(ch);
      for (var i = 0; i < length; i++) {
        var t = i / length;
        var env = Math.pow(1 - t, 2.4);
        var white = (Math.random() * 2 - 1);
        // Add subtle high harmonic shimmer modulation
        var mod = shimmer > 0 ? Math.sin(i * 0.045 * (ch + 1)) * shimmer * 0.35 : 0;
        data[i] = (white + mod * white) * env * 0.65;
      }
    }
    return impulse;
  };

  // Generate asymmetric harmonic waveshaper transfer curve
  AudioEngine.prototype._makeDistortionCurve = function (drive, asymmetry) {
    var k = Math.max(1, drive * 130);
    var n = 8192;
    var curve = new Float32Array(n);
    var asym = (asymmetry || 0) * 0.35;
    for (var i = 0; i < n; i++) {
      var x = (i * 2) / n - 1;
      var shifted = x + asym * (x * x - 0.5);
      curve[i] = ((3 + k) * shifted * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(shifted));
    }
    return curve;
  };

  // =========================================================================
  // VIRTUAL INSTRUMENT SYNTHESIS VOICES
  // =========================================================================
  AudioEngine.prototype.triggerNote = function (nodeId, midiNote, duration, velocity) {
    this.resume();
    var node = this.nodes[nodeId];
    if (!node || node.category !== 'instrument' || node.muted || !node.audio) return;

    duration = duration || 0.35;
    velocity = velocity !== undefined ? velocity : 0.85;
    node.lastTriggeredTime = performance.now();

    if (this.onNoteTriggered) {
      this.onNoteTriggered(nodeId, midiNote, velocity);
    }

    if (node.type === 'sub-flora') {
      this._playSubFloraVoice(node, midiNote, duration, velocity);
    } else if (node.type === 'crystal-pad') {
      this._playCrystalPadVoice(node, midiNote, duration, velocity);
    } else if (node.type === 'granular-spore') {
      this._playGranularSporeVoice(node, midiNote, duration, velocity);
    } else if (node.type === 'perc-blooms') {
      this._playPercBloomVoice(node, midiNote, duration, velocity);
    }
  };

  // 1. SUB-FLORA BASS VOICE
  AudioEngine.prototype._playSubFloraVoice = function (node, midiNote, duration, velocity) {
    var ctx = this.ctx;
    var now = ctx.currentTime;
    var p = node.params;
    var freq = SG.midiToFreq(midiNote);

    var atk = Math.max(0.004, p.attack || 0.015);
    var dec = Math.max(0.03, p.decay || 0.45);
    var sus = Math.max(0.01, p.sustain !== undefined ? p.sustain : 0.4);
    var rel = Math.max(0.03, p.release || 0.35);
    var stopTime = now + atk + dec + duration + rel;

    // Dual detuned main oscillators + sub oscillator (-1 octave)
    var osc1 = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var subOsc = ctx.createOscillator();

    osc1.type = p.waveform || 'sawtooth';
    osc2.type = p.waveform || 'sawtooth';
    subOsc.type = 'sine';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq, now);
    osc1.detune.value = -(p.detune || 12);
    osc2.detune.value = (p.detune || 12);
    subOsc.frequency.setValueAtTime(freq * 0.5, now);

    var subGain = ctx.createGain();
    subGain.gain.value = p.subLevel !== undefined ? p.subLevel : 0.75;

    // Resonant Lowpass Filter with dedicated envelope
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    var baseCut = Math.max(30, p.cutoff || 420);
    var peakCut = Math.min(14000, baseCut + (p.envMod || 1800) * velocity);
    filter.Q.value = p.resonance || 5.5;

    filter.frequency.setValueAtTime(baseCut, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, peakCut), now + atk);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, baseCut + (peakCut - baseCut) * sus * 0.5), now + atk + dec);
    filter.frequency.exponentialRampToValueAtTime(Math.max(35, baseCut), stopTime);

    // Optional root saturation waveshaper
    var shaper = ctx.createWaveShaper();
    shaper.curve = this._makeDistortionCurve((p.drive || 0.35) * 0.5, 0.2);

    var vca = ctx.createGain();
    var peakGain = 0.36 * velocity;
    vca.gain.setValueAtTime(0.0001, now);
    vca.gain.linearRampToValueAtTime(peakGain, now + atk);
    vca.gain.exponentialRampToValueAtTime(Math.max(0.001, peakGain * sus), now + atk + dec);
    vca.gain.setValueAtTime(Math.max(0.001, peakGain * sus), now + atk + dec + duration * 0.5);
    vca.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc1.connect(filter);
    osc2.connect(filter);
    subOsc.connect(subGain);
    subGain.connect(filter);

    filter.connect(shaper);
    shaper.connect(vca);
    vca.connect(node.audio.inputNode);

    osc1.start(now);
    osc2.start(now);
    subOsc.start(now);

    osc1.stop(stopTime + 0.02);
    osc2.stop(stopTime + 0.02);
    subOsc.stop(stopTime + 0.02);
  };

  // 2. CRYSTAL PAD VOICE
  AudioEngine.prototype._playCrystalPadVoice = function (node, midiNote, duration, velocity) {
    var ctx = this.ctx;
    var now = ctx.currentTime;
    var p = node.params;
    var freq = SG.midiToFreq(midiNote);

    var atk = Math.max(0.015, p.attack || 0.65);
    var dec = Math.max(0.1, p.decay || 1.5);
    var sus = Math.max(0.05, p.sustain !== undefined ? p.sustain : 0.78);
    var rel = Math.max(0.1, p.release || 2.4);
    var holdEnd = now + atk + Math.max(duration, 0.4);
    var stopTime = holdEnd + rel;

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(p.cutoff || 2400, now);
    filter.Q.value = p.resonance || 2.2;

    // Breathing LFO on filter
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = p.lfoRate || 0.35;
    lfoGain.gain.value = p.lfoDepth || 750;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    lfo.stop(stopTime + 0.02);

    var vca = ctx.createGain();
    var peakGain = 0.22 * velocity;
    vca.gain.setValueAtTime(0.0001, now);
    vca.gain.linearRampToValueAtTime(peakGain, now + atk);
    vca.gain.linearRampToValueAtTime(peakGain * sus, holdEnd);
    vca.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    filter.connect(vca);
    vca.connect(node.audio.inputNode);

    // 3 detuned chorus oscillators + 1 shimmer octave/fifth crystal overtone
    var spread = p.spread || 18;
    var detunes = [-spread, 0, spread];
    detunes.forEach(function (dt) {
      var osc = ctx.createOscillator();
      osc.type = p.waveform || 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.value = dt;
      osc.connect(filter);
      osc.start(now);
      osc.stop(stopTime + 0.02);
    });

    if ((p.shimmer || 0.65) > 0.05) {
      var shimOsc = ctx.createOscillator();
      var shimGain = ctx.createGain();
      shimOsc.type = 'triangle';
      // Alternate octave (2x) and fifth+octave (3x) crystal overtones
      shimOsc.frequency.setValueAtTime(freq * 2, now);
      shimOsc.detune.value = spread * 0.5;
      shimGain.gain.value = (p.shimmer || 0.65) * 0.45;
      shimOsc.connect(shimGain);
      shimGain.connect(filter);
      shimOsc.start(now);
      shimOsc.stop(stopTime + 0.02);
    }
  };

  // 3. GRANULAR SPORE VOICE (Micro-Grain Cloud Generator)
  AudioEngine.prototype._playGranularSporeVoice = function (node, midiNote, duration, velocity) {
    var ctx = this.ctx;
    var now = ctx.currentTime;
    var p = node.params;
    var baseFreq = SG.midiToFreq(midiNote);

    var atk = Math.max(0.02, p.attack || 0.35);
    var rel = Math.max(0.1, p.release || 1.8);
    var cloudSpan = Math.max(0.35, atk + duration + rel * 0.75);
    var density = Math.min(45, Math.max(4, p.density || 22));
    var grainSize = Math.max(0.03, p.grainSize || 0.14);
    var totalGrains = Math.min(48, Math.max(5, Math.floor(cloudSpan * density * 0.65)));

    var cloudFilter = ctx.createBiquadFilter();
    cloudFilter.type = 'lowpass';
    cloudFilter.frequency.value = p.cutoff || 4200;
    cloudFilter.Q.value = p.resonance || 2.8;
    cloudFilter.connect(node.audio.inputNode);

    for (var i = 0; i < totalGrains; i++) {
      var progress = i / totalGrains;
      var grainOffset = progress * cloudSpan + (Math.random() * 0.03);
      var gStart = now + grainOffset;
      var gEnd = gStart + grainSize;

      // Macro cloud envelope
      var macroEnv = progress < 0.25
        ? (progress / 0.25)
        : Math.pow(1 - ((progress - 0.25) / 0.75), 1.5);

      var gOsc = ctx.createOscillator();
      var gGain = ctx.createGain();
      gOsc.type = p.grainWave || 'sine';

      // Determine grain pitch (base, +1 octave sparkle, or +fifth harmonic)
      var harmonicMult = 1;
      var roll = Math.random();
      if (roll < (p.octaveChance || 0.45) * 0.55) {
        harmonicMult = 2;
      } else if (roll < (p.octaveChance || 0.45) * 0.55 + (p.fifthChance || 0.3) * 0.45) {
        harmonicMult = 1.4983; // Perfect fifth
      }

      gOsc.frequency.setValueAtTime(baseFreq * harmonicMult, gStart);
      var scatterCents = (Math.random() * 2 - 1) * (p.scatter || 18);
      gOsc.detune.setValueAtTime(scatterCents, gStart);

      var peak = Math.max(0.002, 0.16 * velocity * macroEnv);
      gGain.gain.setValueAtTime(0.0001, gStart);
      gGain.gain.linearRampToValueAtTime(peak, gStart + grainSize * 0.45);
      gGain.gain.exponentialRampToValueAtTime(0.0001, gEnd);

      gOsc.connect(gGain);
      gGain.connect(cloudFilter);

      gOsc.start(gStart);
      gOsc.stop(gEnd + 0.01);
    }
  };

  // 4. PERCUSSION BLOOMS VOICE (Mycelial Kick, Seed-Pod Snare, Bamboo Marimba & Dewdrop Chimes)
  AudioEngine.prototype._playPercBloomVoice = function (node, midiNote, duration, velocity) {
    var ctx = this.ctx;
    var now = ctx.currentTime;
    var p = node.params;
    var freq = SG.midiToFreq(midiNote);
    var mode = p.mode || 'kit';
    var dec = Math.max(0.05, p.decay || 0.42);

    // In 'kit' mode, map scale degrees / pitch ranges to distinct botanical drum voices
    var kitPiece = mode;
    if (mode === 'kit') {
      var modNote = midiNote % 12;
      if (midiNote < 52 || modNote === 0) {
        kitPiece = 'kick';
      } else if (modNote === 2 || modNote === 4) {
        kitPiece = 'snare';
      } else if (modNote >= 9) {
        kitPiece = 'hat';
      } else {
        kitPiece = 'marimba';
      }
    }

    var bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.value = p.bodyTone || 2600;
    bodyFilter.Q.value = p.resonance || 4.2;
    bodyFilter.connect(node.audio.inputNode);

    if (kitPiece === 'kick' || kitPiece === 'taiko-pod') {
      // Deep Mycelial Sub Kick with pitch drop + wood click
      var kOsc = ctx.createOscillator();
      var kGain = ctx.createGain();
      var baseKickFreq = kitPiece === 'kick' ? 54 : Math.min(140, freq * 0.5);
      var dropMult = Math.pow(2, (p.pitchBend || 16) / 12);

      kOsc.type = 'sine';
      kOsc.frequency.setValueAtTime(baseKickFreq * dropMult, now);
      kOsc.frequency.exponentialRampToValueAtTime(baseKickFreq, now + 0.085);
      kOsc.frequency.exponentialRampToValueAtTime(Math.max(28, baseKickFreq * 0.75), now + dec);

      kGain.gain.setValueAtTime(0.65 * velocity, now);
      kGain.gain.exponentialRampToValueAtTime(0.0001, now + dec);

      kOsc.connect(kGain);
      kGain.connect(bodyFilter);
      kOsc.start(now);
      kOsc.stop(now + dec + 0.02);

    } else if (kitPiece === 'snare') {
      // Resonant woody body + crisp seed-pod noise burst
      var sOsc = ctx.createOscillator();
      var sGain = ctx.createGain();
      sOsc.type = 'triangle';
      sOsc.frequency.setValueAtTime(220, now);
      sOsc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      sGain.gain.setValueAtTime(0.35 * velocity, now);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      sOsc.connect(sGain);
      sGain.connect(bodyFilter);
      sOsc.start(now);
      sOsc.stop(now + 0.2);

      this._triggerNoiseSnap(ctx, bodyFilter, now, dec * 0.65, (p.snap || 0.55) * 0.45 * velocity, 1800);

    } else if (kitPiece === 'hat') {
      // Shimmering metallic dewdrop hi-hat
      this._triggerNoiseSnap(ctx, bodyFilter, now, Math.min(0.22, dec * 0.4), (p.snap || 0.55) * 0.35 * velocity, 6200);

    } else {
      // FM Botanical Marimba / Dewdrop Crystal Chime
      var carrier = ctx.createOscillator();
      var modOsc = ctx.createOscillator();
      var modGain = ctx.createGain();
      var vca = ctx.createGain();

      var ratio = p.fmRatio || (kitPiece === 'dewdrop' ? 3.5 : 2.4);
      var fmDepth = (p.fmIndex || 0.48) * freq * 3.2;

      carrier.type = 'sine';
      modOsc.type = 'sine';
      carrier.frequency.setValueAtTime(freq, now);
      modOsc.frequency.setValueAtTime(freq * ratio, now);

      modGain.gain.setValueAtTime(fmDepth, now);
      modGain.gain.exponentialRampToValueAtTime(0.1, now + dec * 0.5);

      vca.gain.setValueAtTime(0.001, now);
      vca.gain.linearRampToValueAtTime(0.38 * velocity, now + 0.006);
      vca.gain.exponentialRampToValueAtTime(0.0001, now + dec);

      modOsc.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(vca);
      vca.connect(bodyFilter);

      carrier.start(now);
      modOsc.start(now);
      carrier.stop(now + dec + 0.02);
      modOsc.stop(now + dec + 0.02);
    }
  };

  AudioEngine.prototype._triggerNoiseSnap = function (ctx, dest, now, dur, level, highpassFreq) {
    var len = Math.max(256, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;

    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpassFreq || 2000;

    var g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.001, level), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(hp);
    hp.connect(g);
    g.connect(dest);
    src.start(now);
  };

  // =========================================================================
  // REAL-TIME METERING & SPECTRUM UPDATES
  // =========================================================================
  AudioEngine.prototype.updateMeters = function () {
    if (!this.isInitialized || !this.masterAnalyser) return { masterLevel: 0, bassEnergy: 0, highEnergy: 0 };

    this.masterAnalyser.getByteFrequencyData(this.freqData);
    this.masterAnalyser.getByteTimeDomainData(this.timeData);

    var sum = 0;
    var bassSum = 0;
    var highSum = 0;
    var len = this.freqData.length;

    for (var i = 0; i < len; i++) {
      var v = this.freqData[i] / 255;
      sum += v;
      if (i < 12) bassSum += v;
      if (i > 40) highSum += v;
    }

    // Update individual node RMS levels for 3D bioluminescence & cable pulses
    var self = this;
    Object.keys(this.nodes).forEach(function (id) {
      var n = self.nodes[id];
      if (n && n.audio && n.audio.analyser) {
        n.audio.analyser.getByteTimeDomainData(self.tempMeterBuf);
        var sqSum = 0;
        for (var j = 0; j < self.tempMeterBuf.length; j++) {
          var norm = (self.tempMeterBuf[j] - 128) / 128;
          sqSum += norm * norm;
        }
        var rms = Math.sqrt(sqSum / self.tempMeterBuf.length);
        n.signalLevel = n.signalLevel * 0.72 + Math.min(1, rms * 3.2) * 0.28;
      }
    });

    return {
      masterLevel: sum / len,
      bassEnergy: bassSum / 12,
      highEnergy: highSum / Math.max(1, len - 40)
    };
  };

  // =========================================================================
  // LIVE STUDIO AUDIO RECORDING
  // =========================================================================
  AudioEngine.prototype.toggleRecording = function (onStopCallback) {
    this.resume();
    if (!this.recorderDest || typeof MediaRecorder === 'undefined') {
      alert('Audio recording is not supported in this browser context.');
      return false;
    }

    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      return false;
    }

    var self = this;
    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.recorderDest.stream);

    this.mediaRecorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        self.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = function () {
      var blob = new Blob(self.recordedChunks, { type: 'audio/webm' });
      var url = URL.createObjectURL(blob);
      if (onStopCallback) onStopCallback(url);
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    return true;
  };

  SG.AudioEngine = AudioEngine;
})(window.SoundGarden);
