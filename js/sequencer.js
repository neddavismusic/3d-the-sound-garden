/**
 * THE SOUND GARDEN — 16-Step Polyphonic Sequencer & Generative Bloom Engine
 * Drives rhythmic and ambient patterns across all 3D Sonic Flora instruments,
 * quantized to customizable botanical musical scales.
 */

window.SoundGarden = window.SoundGarden || {};

(function (SG) {
  'use strict';

  function Sequencer(audioEngine) {
    this.audio = audioEngine;
    this.isPlaying = false;
    this.bpm = 96;
    this.currentStep = 0;
    this.scaleKey = 'bioluminescent';
    this.rootNote = 0; // 0 = C, 2 = D, etc.
    this.generativeBloom = true;
    this.swing = 0.08;

    this.timerId = null;
    this.onStepChanged = null; // function(stepIndex)
  }

  Sequencer.prototype.start = function () {
    if (this.isPlaying) return;
    this.audio.resume();
    this.isPlaying = true;
    this.currentStep = 0;
    this._scheduleNextStep();
  };

  Sequencer.prototype.stop = function () {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.onStepChanged) {
      this.onStepChanged(-1);
    }
  };

  Sequencer.prototype.toggle = function () {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  };

  Sequencer.prototype.setBpm = function (bpm) {
    this.bpm = Math.max(40, Math.min(200, Number(bpm) || 96));
  };

  Sequencer.prototype.degreeToMidi = function (degree, octave) {
    var scaleObj = SG.SCALES[this.scaleKey] || SG.SCALES.bioluminescent;
    var intervals = scaleObj.intervals;
    var len = intervals.length;
    var normDeg = ((degree % len) + len) % len;
    var octShift = Math.floor(degree / len);
    var midi = (octave + 1 + octShift) * 12 + this.rootNote + intervals[normDeg];
    return Math.max(24, Math.min(96, midi));
  };

  Sequencer.prototype._scheduleNextStep = function () {
    if (!this.isPlaying) return;

    var self = this;
    var step = this.currentStep;

    this._triggerStep(step);
    if (this.onStepChanged) {
      this.onStepChanged(step);
    }

    // Calculate 16th-note interval in ms with subtle swing on odd steps
    var baseStepMs = (60 / this.bpm / 4) * 1000;
    var swingOffset = (step % 2 === 1) ? baseStepMs * this.swing : -baseStepMs * this.swing * 0.5;
    var delayMs = Math.max(40, baseStepMs + swingOffset);

    this.currentStep = (this.currentStep + 1) % 16;
    this.timerId = setTimeout(function () {
      self._scheduleNextStep();
    }, delayMs);
  };

  Sequencer.prototype._triggerStep = function (stepIndex) {
    var self = this;
    var stepDurSec = (60 / this.bpm / 4) * 0.92;

    Object.keys(this.audio.nodes).forEach(function (id) {
      var node = self.audio.nodes[id];
      if (!node || node.category !== 'instrument' || node.muted) return;

      var stepData = node.pattern && node.pattern[stepIndex];
      if (stepData && stepData.active) {
        var prob = stepData.prob !== undefined ? stepData.prob : 1.0;
        if (Math.random() <= prob) {
          var deg = stepData.degree || 0;
          var oct = stepData.octave !== undefined ? stepData.octave : 3;

          // In Generative Bloom mode, occasionally add harmonic variations
          if (self.generativeBloom && Math.random() < 0.22) {
            deg = (deg + (Math.random() < 0.5 ? 2 : 4)) % 7;
          }

          var midi = self.degreeToMidi(deg, oct);
          var vel = 0.72 + Math.random() * 0.22;
          var dur = node.type === 'crystal-pad' ? stepDurSec * 2.8 : stepDurSec * 1.15;
          self.audio.triggerNote(node.id, midi, dur, vel);
        }
      } else if (self.generativeBloom && Math.random() < 0.085) {
        // Autonomous generative spore bloom on empty steps
        var defOct = (SG.INSTRUMENT_TYPES[node.type] && SG.INSTRUMENT_TYPES[node.type].defaultOctave) || 4;
        var randDeg = Math.floor(Math.random() * 7);
        var genMidi = self.degreeToMidi(randDeg, defOct);
        self.audio.triggerNote(node.id, genMidi, stepDurSec * 1.6, 0.55);
      }
    });
  };

  // Helper: Randomize an instrument's 16-step pattern musically
  Sequencer.prototype.randomizeNodePattern = function (nodeId, density) {
    var node = this.audio.nodes[nodeId];
    if (!node || node.category !== 'instrument') return;
    density = density !== undefined ? density : 0.45;
    var catalog = SG.INSTRUMENT_TYPES[node.type];
    var baseOct = catalog ? catalog.defaultOctave : 3;

    for (var i = 0; i < 16; i++) {
      var active = (i === 0) ? true : (Math.random() < density);
      var deg = Math.floor(Math.random() * 7);
      var oct = baseOct + (Math.random() < 0.25 ? 1 : 0);
      node.pattern[i] = {
        active: active,
        degree: deg,
        octave: oct,
        prob: 0.75 + Math.random() * 0.25
      };
    }
  };

  Sequencer.prototype.clearNodePattern = function (nodeId) {
    var node = this.audio.nodes[nodeId];
    if (!node || node.category !== 'instrument') return;
    var catalog = SG.INSTRUMENT_TYPES[node.type];
    var baseOct = catalog ? catalog.defaultOctave : 3;
    for (var i = 0; i < 16; i++) {
      node.pattern[i] = {
        active: false,
        degree: 0,
        octave: baseOct,
        prob: 1.0
      };
    }
  };

  SG.Sequencer = Sequencer;
})(window.SoundGarden);
