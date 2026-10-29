/**
 * THE SOUND GARDEN — Main Application Bootstrapper
 * Initializes the Audio Engine, 3D Bioluminescent Conservatory, Sequencer, and Studio UI.
 */

window.SoundGarden = window.SoundGarden || {};

(function (SG) {
  'use strict';

  function initApp() {
    var viewportEl = document.getElementById('viewport-3d');
    var labelsEl = document.getElementById('labels-3d');

    var audio = new SG.AudioEngine();
    var world = new SG.World3D(viewportEl, labelsEl, audio);
    var sequencer = new SG.Sequencer(audio);
    var ui = new SG.StudioUI(audio, world, sequencer);

    // Load default Preset Garden ("Midnight Bioluminescence")
    ui.loadPresetGarden('midnightBioluminescence');

    // Main 60fps Render & Audio Metering Loop
    function animate() {
      requestAnimationFrame(animate);
      var meters = audio.updateMeters();
      world.renderFrame(meters);
      ui.drawMasterScope();
    }

    animate();

    // Expose on window for debugging / live scripting
    SG.app = {
      audio: audio,
      world: world,
      sequencer: sequencer,
      ui: ui
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})(window.SoundGarden);
