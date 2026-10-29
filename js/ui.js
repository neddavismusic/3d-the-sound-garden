/**
 * THE SOUND GARDEN — Studio UI, Custom SVG Rotary Knobs, Plugin Rack Inspector,
 * 16-Step Sequencer Grid, Playable Keyboard (Mouse/QWERTY/MIDI), and Master Visualizer.
 */

window.SoundGarden = window.SoundGarden || {};

(function (SG) {
  'use strict';

  function StudioUI(audio, world, sequencer) {
    this.audio = audio;
    this.world = world;
    this.sequencer = sequencer;

    this.selectedNodeId = null;
    this.activeSequencerInstId = null;
    this.keyboardBaseOctave = 3;
    this.hudCollapsed = false;

    // DOM Elements cache
    this.els = {};
    this._cacheElements();
    this._initTopBar();
    this._initSpawnerCatalog();
    this._initKeyboard();
    this._initMIDI();
    this._bindWorldAndAudioCallbacks();
  }

  StudioUI.prototype._cacheElements = function () {
    var ids = [
      'btn-play', 'btn-generative', 'btn-patch-mode', 'btn-record',
      'bpm-slider', 'bpm-value', 'scale-select', 'root-select',
      'preset-garden-select', 'master-vol-slider',
      'spawner-instruments', 'spawner-plugins', 'active-nodes-list',
      'rack-panel', 'rack-header-title', 'rack-header-subtitle', 'rack-badge',
      'rack-preset-select', 'rack-knobs-grid', 'rack-patch-list',
      'rack-pos-readout', 'btn-rack-trigger', 'btn-rack-mute', 'btn-rack-focus', 'btn-rack-delete',
      'seq-inst-select', 'seq-steps-grid', 'btn-seq-random', 'btn-seq-clear',
      'piano-keys', 'kb-octave-label', 'btn-oct-down', 'btn-oct-up',
      'master-scope-canvas', 'status-banner', 'btn-toggle-hud',
      'welcome-overlay', 'btn-enter-garden'
    ];
    var self = this;
    ids.forEach(function (id) {
      self.els[id] = document.getElementById(id);
    });
  };

  // =========================================================================
  // TOP STUDIO BAR & PRESET GARDENS
  // =========================================================================
  StudioUI.prototype._initTopBar = function () {
    var self = this;

    // Populate Scales
    Object.keys(SG.SCALES).forEach(function (key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = SG.SCALES[key].name;
      self.els['scale-select'].appendChild(opt);
    });

    // Populate Root Notes
    SG.ROOT_NOTES.forEach(function (noteName, idx) {
      var opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = 'Key: ' + noteName;
      self.els['root-select'].appendChild(opt);
    });

    // Populate Curated Preset Gardens
    Object.keys(SG.PRESET_GARDENS).forEach(function (key) {
      var g = SG.PRESET_GARDENS[key];
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = '🌿 ' + g.name;
      self.els['preset-garden-select'].appendChild(opt);
    });

    // Welcome Overlay Start Button
    if (this.els['btn-enter-garden']) {
      this.els['btn-enter-garden'].addEventListener('click', function () {
        self.audio.init();
        self.els['welcome-overlay'].classList.add('hidden');
        if (!self.sequencer.isPlaying) {
          self.sequencer.start();
          self._updateTransportUI();
        }
        self.showStatus('Welcome to The Sound Garden! Drag 3D plants to pan spatially, tweak knobs on the right, or wire 3D Mycelial Patch Cables.');
      });
    }

    // Play / Stop Button
    this.els['btn-play'].addEventListener('click', function () {
      self.audio.init();
      self.sequencer.toggle();
      self._updateTransportUI();
    });

    // Generative Bloom Toggle
    this.els['btn-generative'].addEventListener('click', function () {
      self.sequencer.generativeBloom = !self.sequencer.generativeBloom;
      self._updateTransportUI();
      self.showStatus(self.sequencer.generativeBloom
        ? '✨ Generative Bloom ENABLED — The garden will organically evolve harmonies and spore blooms.'
        : 'Generative Bloom paused — Playing strict 16-step sequencer patterns.');
    });

    // 3D Cable Patching Mode Toggle
    this.els['btn-patch-mode'].addEventListener('click', function () {
      var next = !self.world.patchMode;
      self.world.setPatchMode(next);
      self.els['btn-patch-mode'].classList.toggle('active', next);
      if (next) {
        self.showStatus('🔌 3D PATCH CABLE MODE: Click a source Instrument/Plugin in 3D, then click a target FX Plugin or the Heart Tree!');
      } else {
        self.showStatus('Exited 3D Patch Cable Mode. Drag nodes in 3D to adjust spatial stereo position.');
      }
    });

    // Live Audio Recording Button
    this.els['btn-record'].addEventListener('click', function () {
      var rec = self.audio.toggleRecording(function (downloadUrl) {
        var a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'the-sound-garden-session-' + Date.now() + '.webm';
        a.click();
        self.showStatus('🎙️ Studio recording saved and downloaded!');
      });
      self.els['btn-record'].classList.toggle('recording', rec);
      self.els['btn-record'].innerHTML = rec ? '⏹ STOP REC' : '● REC AUDIO';
      if (rec) {
        self.showStatus('🔴 Recording live studio output... Click STOP REC when finished to download audio.');
      }
    });

    // BPM Slider
    this.els['bpm-slider'].addEventListener('input', function (e) {
      var v = Number(e.target.value);
      self.sequencer.setBpm(v);
      self.els['bpm-value'].textContent = v + ' BPM';
    });

    // Scale & Root Selectors
    this.els['scale-select'].addEventListener('change', function (e) {
      self.sequencer.scaleKey = e.target.value;
      self.showStatus('Musical Scale set to ' + SG.SCALES[e.target.value].name);
    });

    this.els['root-select'].addEventListener('change', function (e) {
      self.sequencer.rootNote = Number(e.target.value);
      self.showStatus('Root Key set to ' + SG.ROOT_NOTES[self.sequencer.rootNote]);
    });

    // Preset Garden Switcher
    this.els['preset-garden-select'].addEventListener('change', function (e) {
      self.loadPresetGarden(e.target.value);
    });

    // Master Volume
    this.els['master-vol-slider'].addEventListener('input', function (e) {
      self.audio.setMasterVolume(Number(e.target.value));
    });

    // Camera Preset Buttons
    document.querySelectorAll('[data-cam-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = btn.getAttribute('data-cam-preset');
        self.world.setCameraPreset(preset);
      });
    });

    // Toggle HUD (Zen 3D Mode)
    this.els['btn-toggle-hud'].addEventListener('click', function () {
      self.hudCollapsed = !self.hudCollapsed;
      document.body.classList.toggle('hud-collapsed', self.hudCollapsed);
      self.els['btn-toggle-hud'].textContent = self.hudCollapsed ? '🎛️ Show Studio HUD' : '👁️ Zen 3D View';
    });
  };

  StudioUI.prototype._updateTransportUI = function () {
    var playing = this.sequencer.isPlaying;
    this.els['btn-play'].classList.toggle('playing', playing);
    this.els['btn-play'].innerHTML = playing ? '⏸ PAUSE GARDEN' : '▶ BLOOM PLAY';
    this.els['btn-generative'].classList.toggle('active', this.sequencer.generativeBloom);
  };

  // =========================================================================
  // LOAD CURATED 3D PRESET GARDEN
  // =========================================================================
  StudioUI.prototype.loadPresetGarden = function (gardenKey) {
    var garden = SG.PRESET_GARDENS[gardenKey];
    if (!garden) return;

    this.audio.clearGraph();
    this.sequencer.setBpm(garden.bpm || 96);
    this.sequencer.scaleKey = garden.scale || 'bioluminescent';
    this.sequencer.rootNote = garden.rootNote || 0;
    this.sequencer.generativeBloom = garden.generativeBloom !== undefined ? garden.generativeBloom : true;

    this.els['bpm-slider'].value = this.sequencer.bpm;
    this.els['bpm-value'].textContent = this.sequencer.bpm + ' BPM';
    this.els['scale-select'].value = this.sequencer.scaleKey;
    this.els['root-select'].value = this.sequencer.rootNote;
    this._updateTransportUI();

    var self = this;
    garden.nodes.forEach(function (nCfg) {
      self.audio.createNode(JSON.parse(JSON.stringify(nCfg)));
    });

    garden.connections.forEach(function (c) {
      self.audio.connectNodes(c.from, c.to);
    });

    this.world.syncNodesAndCables();
    this.refreshActiveNodesList();

    // Select first instrument
    var firstId = garden.nodes[0] ? garden.nodes[0].id : null;
    if (firstId) {
      this.world.selectNode(firstId, false);
    }

    this.showStatus('🌿 Loaded Preset Garden: "' + garden.name + '" — ' + garden.description);
  };

  // =========================================================================
  // LEFT DOCK: SPAWNER CATALOG & ACTIVE NODES LIST
  // =========================================================================
  StudioUI.prototype._initSpawnerCatalog = function () {
    var self = this;

    // 1. Virtual Instruments Spawner Cards
    Object.keys(SG.INSTRUMENT_TYPES).forEach(function (typeKey) {
      var item = SG.INSTRUMENT_TYPES[typeKey];
      var card = document.createElement('button');
      card.className = 'spawner-card instrument-card';
      card.style.setProperty('--card-color', item.color);
      card.innerHTML =
        '<span class="spawner-icon">' + item.icon + '</span>' +
        '<div class="spawner-info">' +
          '<span class="spawner-name">' + item.name + '</span>' +
          '<span class="spawner-sub">' + item.badge + '</span>' +
        '</div>' +
        '<span class="spawner-plus">+ PLANT</span>';

      card.addEventListener('click', function () {
        self.spawnNewNode(typeKey);
      });
      self.els['spawner-instruments'].appendChild(card);
    });

    // 2. Virtual FX Plugins Spawner Cards
    Object.keys(SG.PLUGIN_TYPES).forEach(function (typeKey) {
      var item = SG.PLUGIN_TYPES[typeKey];
      var card = document.createElement('button');
      card.className = 'spawner-card plugin-card';
      card.style.setProperty('--card-color', item.color);
      card.innerHTML =
        '<span class="spawner-icon">' + item.icon + '</span>' +
        '<div class="spawner-info">' +
          '<span class="spawner-name">' + item.name + '</span>' +
          '<span class="spawner-sub">' + item.badge + '</span>' +
        '</div>' +
        '<span class="spawner-plus">+ ADD FX</span>';

      card.addEventListener('click', function () {
        self.spawnNewNode(typeKey);
      });
      self.els['spawner-plugins'].appendChild(card);
    });
  };

  StudioUI.prototype.spawnNewNode = function (typeKey) {
    this.audio.init();
    var catalog = SG.INSTRUMENT_TYPES[typeKey] || SG.PLUGIN_TYPES[typeKey];
    if (!catalog) return;

    // Count existing of this type to number it nicely
    var count = 1;
    var self = this;
    Object.keys(this.audio.nodes).forEach(function (id) {
      if (self.audio.nodes[id].type === typeKey) count++;
    });

    // Pick a free orbital position in the conservatory
    var radius = catalog.category === 'instrument' ? (10 + Math.random() * 6) : (4.8 + Math.random() * 3.5);
    var angle = Math.random() * Math.PI * 2;
    var pos = {
      x: Math.round(Math.cos(angle) * radius * 10) / 10,
      y: 0,
      z: Math.round(Math.sin(angle) * radius * 10) / 10
    };

    var newNode = this.audio.createNode({
      type: typeKey,
      name: count > 1 ? (catalog.name + ' #' + count) : catalog.name,
      position: pos
    });

    // Auto-connect to master (or insert into selected instrument's chain if spawning an FX plugin)
    if (newNode.category === 'instrument') {
      this.audio.connectNodes(newNode.id, 'master');
    } else if (newNode.category === 'plugin') {
      this.audio.connectNodes(newNode.id, 'master');
      if (this.selectedNodeId && this.audio.nodes[this.selectedNodeId] && this.audio.nodes[this.selectedNodeId].category === 'instrument') {
        this.audio.connectNodes(this.selectedNodeId, newNode.id);
      }
    }

    this.world.syncNodesAndCables();
    this.refreshActiveNodesList();
    this.world.selectNode(newNode.id, true);
    this.showStatus('🌱 Planted "' + newNode.name + '" in the 3D Conservatory at (' + pos.x + ', ' + pos.z + ')!');
  };

  StudioUI.prototype.refreshActiveNodesList = function () {
    var self = this;
    var container = this.els['active-nodes-list'];
    container.innerHTML = '';

    var instSelect = this.els['seq-inst-select'];
    var prevSeqId = instSelect.value;
    instSelect.innerHTML = '';

    Object.keys(this.audio.nodes).forEach(function (id) {
      var node = self.audio.nodes[id];
      var catalog = SG.INSTRUMENT_TYPES[node.type] || SG.PLUGIN_TYPES[node.type];

      var row = document.createElement('div');
      row.className = 'active-node-row' + (id === self.selectedNodeId ? ' selected' : '');
      row.style.setProperty('--node-color', node.color);

      var stateBtnLabel = node.category === 'instrument'
        ? (node.muted ? 'MUTE' : 'ON')
        : (node.bypassed ? 'BYP' : 'ON');
      var isOff = node.muted || node.bypassed;

      row.innerHTML =
        '<span class="node-row-icon">' + (catalog ? catalog.icon : '🌱') + '</span>' +
        '<span class="node-row-name">' + node.name + '</span>' +
        '<button class="node-row-toggle ' + (isOff ? 'off' : 'on') + '" title="Toggle Mute/Bypass">' + stateBtnLabel + '</button>';

      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('node-row-toggle')) {
          e.stopPropagation();
          if (node.category === 'instrument') {
            self.audio.setNodeMute(node.id, !node.muted);
          } else {
            self.audio.setNodeBypass(node.id, !node.bypassed);
          }
          self.refreshActiveNodesList();
          if (self.selectedNodeId === node.id) self.renderRackInspector(node.id);
          return;
        }
        self.world.selectNode(node.id, true);
      });

      container.appendChild(row);

      // Populate Sequencer Instrument Dropdown
      if (node.category === 'instrument') {
        var opt = document.createElement('option');
        opt.value = node.id;
        opt.textContent = (catalog ? catalog.icon + ' ' : '') + node.name;
        instSelect.appendChild(opt);
      }
    });

    if (prevSeqId && this.audio.nodes[prevSeqId]) {
      instSelect.value = prevSeqId;
      this.activeSequencerInstId = prevSeqId;
    } else if (instSelect.options.length > 0) {
      this.activeSequencerInstId = instSelect.options[0].value;
      instSelect.value = this.activeSequencerInstId;
    }

    this.renderSequencerGrid();
  };

  // =========================================================================
  // RIGHT PANEL: BESPOKE PLUGIN / INSTRUMENT RACK INSPECTOR & ROTARY KNOBS
  // =========================================================================
  StudioUI.prototype.renderRackInspector = function (nodeId) {
    this.selectedNodeId = nodeId;
    var node = this.audio.nodes[nodeId];
    if (!node) return;

    var catalog = SG.INSTRUMENT_TYPES[node.type] || SG.PLUGIN_TYPES[node.type];
    if (!catalog) return;

    var self = this;
    this.els['rack-panel'].style.setProperty('--rack-accent', node.color);
    this.els['rack-header-title'].textContent = catalog.icon + ' ' + node.name;
    this.els['rack-header-subtitle'].textContent = catalog.subtitle;
    this.els['rack-badge'].textContent = catalog.badge;

    this._updateSpatialReadout(node);

    // Update Mute / Bypass Button
    if (node.category === 'instrument') {
      this.els['btn-rack-trigger'].style.display = 'inline-flex';
      this.els['btn-rack-mute'].textContent = node.muted ? '🔇 Unmute Flora' : '🔊 Active';
      this.els['btn-rack-mute'].classList.toggle('muted', node.muted);
      // Sync sequencer lane to this instrument
      this.activeSequencerInstId = node.id;
      this.els['seq-inst-select'].value = node.id;
      this.renderSequencerGrid();
    } else {
      this.els['btn-rack-trigger'].style.display = 'none';
      this.els['btn-rack-mute'].textContent = node.bypassed ? '⏸ Bypassed' : '⚡ FX Active';
      this.els['btn-rack-mute'].classList.toggle('muted', node.bypassed);
    }

    // Populate Built-in Node Presets
    var presetSel = this.els['rack-preset-select'];
    presetSel.innerHTML = '<option value="">— Select Module Preset —</option>';
    if (catalog.presets) {
      Object.keys(catalog.presets).forEach(function (pName) {
        var opt = document.createElement('option');
        opt.value = pName;
        opt.textContent = '✨ ' + pName;
        presetSel.appendChild(opt);
      });
    }
    presetSel.onchange = function () {
      var pName = presetSel.value;
      if (pName && catalog.presets && catalog.presets[pName]) {
        var presetVals = catalog.presets[pName];
        Object.keys(presetVals).forEach(function (k) {
          self.audio.updateNodeParam(node.id, k, presetVals[k]);
        });
        self.renderRackInspector(node.id);
        if (node.category === 'instrument') {
          self.audio.triggerNote(node.id, 60, 0.5, 0.85);
        }
        self.showStatus('Loaded "' + pName + '" preset on ' + node.name);
      }
    };

    // Build Custom Rotary Knobs & Waveform Selectors
    var knobsGrid = this.els['rack-knobs-grid'];
    knobsGrid.innerHTML = '';

    catalog.params.forEach(function (paramDef) {
      var currentVal = node.params[paramDef.key];

      if (paramDef.type === 'select') {
        var selWrap = document.createElement('div');
        selWrap.className = 'rack-param-select-card';
        var lbl = document.createElement('label');
        lbl.textContent = paramDef.label;
        var sel = document.createElement('select');
        paramDef.options.forEach(function (optVal) {
          var o = document.createElement('option');
          o.value = optVal;
          o.textContent = optVal.toUpperCase();
          if (optVal === currentVal) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function () {
          self.audio.updateNodeParam(node.id, paramDef.key, sel.value);
        });
        selWrap.appendChild(lbl);
        selWrap.appendChild(sel);
        knobsGrid.appendChild(selWrap);
      } else {
        var knobEl = self._createRotaryKnob(node, paramDef, currentVal);
        knobsGrid.appendChild(knobEl);
      }
    });

    // Build Interactive Mycelial Patch Cable Routing Pills
    this._renderPatchMatrix(node);
  };

  StudioUI.prototype._updateSpatialReadout = function (node) {
    if (!node || !this.els['rack-pos-readout']) return;
    var panVal = Math.max(-0.88, Math.min(0.88, node.position.x / 16));
    var panLabel = Math.abs(panVal) < 0.08
      ? 'CENTER'
      : (panVal < 0 ? ('L ' + Math.round(Math.abs(panVal) * 100) + '%') : ('R ' + Math.round(panVal * 100) + '%'));
    this.els['rack-pos-readout'].textContent =
      '3D Pos: (' + node.position.x.toFixed(1) + ', ' + node.position.z.toFixed(1) + ')  |  Stereo Pan: ' + panLabel;
  };

  StudioUI.prototype._createRotaryKnob = function (node, paramDef, initialValue) {
    var self = this;
    var card = document.createElement('div');
    card.className = 'knob-card';

    var min = paramDef.min;
    var max = paramDef.max;
    var val = initialValue !== undefined ? initialValue : paramDef.default;

    var formatVal = function (v) {
      if (paramDef.unit === '%') return Math.round(v * 100) + '%';
      if (paramDef.unit === 'Hz') return v >= 1000 ? (v / 1000).toFixed(2) + 'kHz' : Math.round(v) + 'Hz';
      if (paramDef.step >= 1) return Math.round(v) + (paramDef.unit ? ' ' + paramDef.unit : '');
      return Number(v).toFixed(2) + (paramDef.unit ? ' ' + paramDef.unit : '');
    };

    var valToNorm = function (v) {
      if (paramDef.log && min > 0) {
        return Math.log(v / min) / Math.log(max / min);
      }
      return (v - min) / (max - min);
    };

    var normToVal = function (norm) {
      norm = Math.max(0, Math.min(1, norm));
      var raw;
      if (paramDef.log && min > 0) {
        raw = min * Math.pow(max / min, norm);
      } else {
        raw = min + norm * (max - min);
      }
      var step = paramDef.step || 0.01;
      return Math.max(min, Math.min(max, Math.round(raw / step) * step));
    };

    // SVG Rotary Knob with glowing indicator arc
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('class', 'knob-svg');

    var trackCircle = document.createElementNS(svgNS, 'circle');
    trackCircle.setAttribute('cx', '32');
    trackCircle.setAttribute('cy', '32');
    trackCircle.setAttribute('r', '23');
    trackCircle.setAttribute('class', 'knob-track');

    var valueCircle = document.createElementNS(svgNS, 'circle');
    valueCircle.setAttribute('cx', '32');
    valueCircle.setAttribute('cy', '32');
    valueCircle.setAttribute('r', '23');
    valueCircle.setAttribute('class', 'knob-Arc');

    var pointerLine = document.createElementNS(svgNS, 'line');
    pointerLine.setAttribute('x1', '32');
    pointerLine.setAttribute('y1', '32');
    pointerLine.setAttribute('x2', '32');
    pointerLine.setAttribute('y2', '12');
    pointerLine.setAttribute('class', 'knob-pointer');

    svg.appendChild(trackCircle);
    svg.appendChild(valueCircle);
    svg.appendChild(pointerLine);

    var labelEl = document.createElement('div');
    labelEl.className = 'knob-label';
    labelEl.textContent = paramDef.label;

    var readoutEl = document.createElement('div');
    readoutEl.className = 'knob-readout';

    var updateKnobVisual = function (v) {
      var norm = Math.max(0, Math.min(1, valToNorm(v)));
      var deg = -135 + norm * 270;
      pointerLine.setAttribute('transform', 'rotate(' + deg + ' 32 32)');
      // Circumference of r=23 is ~144.5; 270deg arc is ~108.4
      var arcLen = norm * 108.4;
      valueCircle.setAttribute('stroke-dasharray', arcLen + ' 200');
      readoutEl.textContent = formatVal(v);
    };

    updateKnobVisual(val);

    // Drag interaction
    var startY = 0;
    var startNorm = 0;

    svg.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      startY = e.clientY;
      startNorm = valToNorm(val);
      svg.setPointerCapture(e.pointerId);

      var onMove = function (me) {
        var deltaNorm = (startY - me.clientY) / 130;
        val = normToVal(startNorm + deltaNorm);
        updateKnobVisual(val);
        self.audio.updateNodeParam(node.id, paramDef.key, val);
      };

      var onUp = function (ue) {
        svg.releasePointerCapture(ue.pointerId);
        svg.removeEventListener('pointermove', onMove);
        svg.removeEventListener('pointerup', onUp);
      };

      svg.addEventListener('pointermove', onMove);
      svg.addEventListener('pointerup', onUp);
    });

    // Double-click resets to default
    svg.addEventListener('dblclick', function () {
      val = paramDef.default;
      updateKnobVisual(val);
      self.audio.updateNodeParam(node.id, paramDef.key, val);
    });

    card.appendChild(svg);
    card.appendChild(readoutEl);
    card.appendChild(labelEl);
    return card;
  };

  StudioUI.prototype._renderPatchMatrix = function (node) {
    var self = this;
    var container = this.els['rack-patch-list'];
    container.innerHTML = '';

    // List all possible targets (all FX plugins + Master Heart Tree)
    var targets = [];
    Object.keys(this.audio.nodes).forEach(function (id) {
      var targetNode = self.audio.nodes[id];
      if (targetNode.category === 'plugin' && targetNode.id !== node.id) {
        targets.push({ id: targetNode.id, name: targetNode.name, color: targetNode.color });
      }
    });
    targets.push({ id: 'master', name: '🌳 Heart Tree (Master)', color: '#00f5d4' });

    targets.forEach(function (t) {
      var isConnected = self.audio.connections.some(function (c) {
        return c.from === node.id && c.to === t.id;
      });

      var pill = document.createElement('button');
      pill.className = 'patch-pill' + (isConnected ? ' connected' : '');
      pill.style.setProperty('--pill-color', t.color);
      pill.innerHTML =
        '<span class="patch-dot"></span>' +
        '<span>' + (isConnected ? 'Wired → ' : 'Route → ') + t.name + '</span>';

      pill.addEventListener('click', function () {
        if (isConnected) {
          self.audio.disconnectNodes(node.id, t.id);
        } else {
          var ok = self.audio.connectNodes(node.id, t.id);
          if (!ok) {
            self.showStatus('Cannot create a feedback loop between FX plugins.');
            return;
          }
        }
        self.world.rebuildCables();
        self._renderPatchMatrix(node);
      });

      container.appendChild(pill);
    });
  };

  // =========================================================================
  // BOTTOM DOCK: 16-STEP BOTANICAL SEQUENCER GRID
  // =========================================================================
  StudioUI.prototype.renderSequencerGrid = function () {
    var self = this;
    var grid = this.els['seq-steps-grid'];
    grid.innerHTML = '';

    var instId = this.activeSequencerInstId;
    var node = this.audio.nodes[instId];
    if (!node || !node.pattern) return;

    this.els['seq-inst-select'].onchange = function () {
      self.activeSequencerInstId = self.els['seq-inst-select'].value;
      self.renderSequencerGrid();
    };

    node.pattern.forEach(function (stepObj, idx) {
      var cell = document.createElement('div');
      cell.className = 'seq-step-cell' + (stepObj.active ? ' active' : '') + (idx === self.sequencer.currentStep && self.sequencer.isPlaying ? ' playing' : '');
      cell.style.setProperty('--step-color', node.color);
      cell.setAttribute('data-step-index', idx);

      // Top toggle pad
      var pad = document.createElement('button');
      pad.className = 'seq-step-pad';
      pad.innerHTML = '<span class="step-num">' + (idx + 1) + '</span>';
      pad.addEventListener('click', function () {
        stepObj.active = !stepObj.active;
        cell.classList.toggle('active', stepObj.active);
        if (stepObj.active) {
          var midi = self.sequencer.degreeToMidi(stepObj.degree || 0, stepObj.octave || 3);
          self.audio.triggerNote(node.id, midi, 0.25, 0.8);
        }
      });

      // Pitch degree cycler button (Deg I..VII)
      var degBtn = document.createElement('button');
      degBtn.className = 'seq-step-degree';
      var degLabels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
      degBtn.textContent = degLabels[(stepObj.degree || 0) % 7];
      degBtn.title = 'Click to cycle scale degree (I - VII)';
      degBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        stepObj.degree = ((stepObj.degree || 0) + 1) % 7;
        stepObj.active = true;
        cell.classList.add('active');
        degBtn.textContent = degLabels[stepObj.degree];
        var midi = self.sequencer.degreeToMidi(stepObj.degree, stepObj.octave || 3);
        self.audio.triggerNote(node.id, midi, 0.25, 0.8);
      });

      cell.appendChild(pad);
      cell.appendChild(degBtn);
      grid.appendChild(cell);
    });
  };

  StudioUI.prototype.highlightSequencerStep = function (stepIndex) {
    var cells = this.els['seq-steps-grid'].querySelectorAll('.seq-step-cell');
    cells.forEach(function (c, idx) {
      c.classList.toggle('playing', idx === stepIndex);
    });
  };

  // =========================================================================
  // PLAYABLE 2-OCTAVE BOTANICAL KEYBOARD + QWERTY + WEB MIDI
  // =========================================================================
  StudioUI.prototype._initKeyboard = function () {
    var self = this;
    this._renderPianoKeys();

    this.els['btn-oct-down'].addEventListener('click', function () {
      self.keyboardBaseOctave = Math.max(1, self.keyboardBaseOctave - 1);
      self.els['kb-octave-label'].textContent = 'C' + self.keyboardBaseOctave;
      self._renderPianoKeys();
    });

    this.els['btn-oct-up'].addEventListener('click', function () {
      self.keyboardBaseOctave = Math.min(6, self.keyboardBaseOctave + 1);
      self.els['kb-octave-label'].textContent = 'C' + self.keyboardBaseOctave;
      self._renderPianoKeys();
    });

    // Sequencer Pattern Quick Actions
    this.els['btn-seq-random'].addEventListener('click', function () {
      if (self.activeSequencerInstId) {
        self.sequencer.randomizeNodePattern(self.activeSequencerInstId, 0.5);
        self.renderSequencerGrid();
        self.showStatus('🎲 Generated new botanical rhythm pattern!');
      }
    });

    this.els['btn-seq-clear'].addEventListener('click', function () {
      if (self.activeSequencerInstId) {
        self.sequencer.clearNodePattern(self.activeSequencerInstId);
        self.renderSequencerGrid();
      }
    });

    // Rack Inspector Action Buttons
    this.els['btn-rack-trigger'].addEventListener('click', function () {
      if (self.selectedNodeId) {
        var midi = (self.keyboardBaseOctave + 1) * 12 + self.sequencer.rootNote;
        self.audio.triggerNote(self.selectedNodeId, midi, 0.6, 0.9);
      }
    });

    this.els['btn-rack-mute'].addEventListener('click', function () {
      var node = self.audio.nodes[self.selectedNodeId];
      if (!node) return;
      if (node.category === 'instrument') {
        self.audio.setNodeMute(node.id, !node.muted);
      } else {
        self.audio.setNodeBypass(node.id, !node.bypassed);
      }
      self.renderRackInspector(node.id);
      self.refreshActiveNodesList();
    });

    this.els['btn-rack-focus'].addEventListener('click', function () {
      self.world.setCameraPreset('focus');
    });

    this.els['btn-rack-delete'].addEventListener('click', function () {
      if (!self.selectedNodeId) return;
      var instCount = Object.keys(self.audio.nodes).filter(function (k) {
        return self.audio.nodes[k].category === 'instrument';
      }).length;
      var delNode = self.audio.nodes[self.selectedNodeId];
      if (delNode && delNode.category === 'instrument' && instCount <= 1) {
        self.showStatus('Keep at least one Sonic Flora instrument in the garden!');
        return;
      }
      var delName = delNode ? delNode.name : '';
      self.audio.removeNode(self.selectedNodeId);
      self.world.syncNodesAndCables();
      self.refreshActiveNodesList();
      var remainingIds = Object.keys(self.audio.nodes);
      if (remainingIds.length > 0) {
        self.world.selectNode(remainingIds[0], false);
      }
      self.showStatus('Uprooted "' + delName + '" from the garden.');
    });

    // QWERTY Keyboard Mapping (2 rows: A W S E D F T G Y H U J K O L P)
    var keyMap = {
      'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6,
      'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12, 'o': 13, 'l': 14, 'p': 15
    };
    var heldKeys = {};

    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        self.audio.init();
        self.sequencer.toggle();
        self._updateTransportUI();
        return;
      }
      var k = e.key.toLowerCase();
      if (keyMap[k] !== undefined && !heldKeys[k]) {
        heldKeys[k] = true;
        var midi = (self.keyboardBaseOctave + 1) * 12 + keyMap[k];
        self.playLiveNote(midi);
      }
    });

    window.addEventListener('keyup', function (e) {
      var k = e.key.toLowerCase();
      delete heldKeys[k];
    });
  };

  StudioUI.prototype._renderPianoKeys = function () {
    var self = this;
    var container = this.els['piano-keys'];
    container.innerHTML = '';

    var startMidi = (this.keyboardBaseOctave + 1) * 12;
    var totalSemitones = 18; // 1.5 octaves compact ribbon
    var blackIndices = { 1: true, 3: true, 6: true, 8: true, 10: true };
    var qwertyHints = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K', 'O', 'L', 'P', ';', '\''];

    for (var i = 0; i < totalSemitones; i++) {
      var midi = startMidi + i;
      var isBlack = !!blackIndices[i % 12];
      var keyBtn = document.createElement('button');
      keyBtn.className = 'piano-key ' + (isBlack ? 'black-key' : 'white-key');
      keyBtn.setAttribute('data-midi', midi);
      keyBtn.innerHTML =
        '<span class="key-note">' + (i % 12 === 0 ? SG.midiToName(midi) : '') + '</span>' +
        '<span class="key-hint">' + (qwertyHints[i] || '') + '</span>';

      (function (m, btn) {
        btn.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          self.playLiveNote(m);
        });
      })(midi, keyBtn);

      container.appendChild(keyBtn);
    }
  };

  StudioUI.prototype.playLiveNote = function (midiNote) {
    this.audio.init();
    var targetInstId = (this.selectedNodeId && this.audio.nodes[this.selectedNodeId] && this.audio.nodes[this.selectedNodeId].category === 'instrument')
      ? this.selectedNodeId
      : this.activeSequencerInstId;

    if (!targetInstId) return;
    this.audio.triggerNote(targetInstId, midiNote, 0.45, 0.9);

    // Visual key flash
    var keyBtn = this.els['piano-keys'].querySelector('[data-midi="' + midiNote + '"]');
    if (keyBtn) {
      keyBtn.classList.add('active');
      setTimeout(function () { keyBtn.classList.remove('active'); }, 220);
    }
  };

  StudioUI.prototype._initMIDI = function () {
    var self = this;
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess().then(function (midiAccess) {
      midiAccess.inputs.forEach(function (input) {
        input.onmidimessage = function (msg) {
          var cmd = msg.data[0] & 0xf0;
          var note = msg.data[1];
          var vel = msg.data[2] / 127;
          if (cmd === 0x90 && vel > 0) {
            self.playLiveNote(note);
          }
        };
      });
    }).catch(function () {});
  };

  // =========================================================================
  // CALLBACKS & REAL-TIME MASTER SPECTRUM / OSCILLOSCOPE CANVAS
  // =========================================================================
  StudioUI.prototype._bindWorldAndAudioCallbacks = function () {
    var self = this;

    this.world.onNodeSelected = function (nodeId) {
      self.selectedNodeId = nodeId;
      self.refreshActiveNodesList();
      self.renderRackInspector(nodeId);
    };

    this.world.onNodeMoved = function (nodeId) {
      if (self.selectedNodeId === nodeId && self.audio.nodes[nodeId]) {
        self._updateSpatialReadout(self.audio.nodes[nodeId]);
      }
    };

    this.world.onConnectionCreated = function () {
      if (self.selectedNodeId && self.audio.nodes[self.selectedNodeId]) {
        self._renderPatchMatrix(self.audio.nodes[self.selectedNodeId]);
      }
    };

    this.world.onStatusMessage = function (msg) {
      self.showStatus(msg);
    };

    this.audio.onNoteTriggered = function (nodeId) {
      self.world.triggerVisualPulse(nodeId);
    };

    this.sequencer.onStepChanged = function (stepIdx) {
      self.highlightSequencerStep(stepIdx);
    };
  };

  StudioUI.prototype.drawMasterScope = function () {
    var canvas = this.els['master-scope-canvas'];
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;

    ctx.fillStyle = 'rgba(4, 10, 22, 0.45)';
    ctx.fillRect(0, 0, w, h);

    if (!this.audio.isInitialized) return;

    // 1. Draw FFT Spectrum Bars
    var freq = this.audio.freqData;
    var barCount = 48;
    var barWidth = w / barCount;
    for (var i = 0; i < barCount; i++) {
      var v = (freq[i] || 0) / 255;
      var bh = v * (h - 6);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 245, 212, 0.42)' : 'rgba(217, 70, 239, 0.38)';
      ctx.fillRect(i * barWidth, h - bh, barWidth - 1, bh);
    }

    // 2. Draw Time-Domain Waveform Line
    var time = this.audio.timeData;
    ctx.beginPath();
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 1.8;
    var slice = w / time.length;
    var x = 0;
    for (var j = 0; j < time.length; j++) {
      var tv = time[j] / 128.0;
      var y = (tv * h) / 2;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += slice;
    }
    ctx.stroke();
  };

  StudioUI.prototype.showStatus = function (msg) {
    if (this.els['status-banner']) {
      this.els['status-banner'].textContent = msg;
    }
  };

  SG.StudioUI = StudioUI;
})(window.SoundGarden);
