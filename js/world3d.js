/**
 * THE SOUND GARDEN — 3D Bioluminescent Botanical Studio Environment (Three.js)
 * Renders the nocturnal glass conservatory, the central Heart Tree (Master Core),
 * procedural 3D Sonic Flora (Instruments), 3D Environmental Modifiers (FX Plugins),
 * interactive 3D Mycelial Patch Cables with traveling audio pulses, and spatial dragging.
 */

window.SoundGarden = window.SoundGarden || {};

(function (SG) {
  'use strict';

  function World3D(containerEl, labelsContainerEl, audioEngine) {
    this.container = containerEl;
    this.labelsContainer = labelsContainerEl;
    this.audio = audioEngine;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Camera spherical orbit state
    this.camTarget = new THREE.Vector3(0, 1.8, 0);
    this.camDesiredTarget = new THREE.Vector3(0, 1.8, 0);
    this.spherical = {
      radius: 26,
      desiredRadius: 26,
      theta: 0.35,
      desiredTheta: 0.35,
      phi: 1.05,
      desiredPhi: 1.05
    };

    // 3D Scene registries
    this.nodeMeshes = {};    // nodeId -> { group, hitMesh, animateFn, pulseScale, labelEl, ... }
    this.cableMeshes = [];   // Array of { from, to, tubeMesh, pulses: [], curve, color }
    this.heartTree = null;   // Master nexus at (0,0,0)
    this.sporeParticles = null;
    this.floorRings = [];

    // Interaction state
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.intersectPoint = new THREE.Vector3();

    this.selectedNodeId = null;
    this.hoveredNodeId = null;
    this.draggingNodeId = null;
    this.isOrbiting = false;
    this.isPanning = false;
    this.pointerDownPos = { x: 0, y: 0 };
    this.lastPointerPos = { x: 0, y: 0 };

    // Interactive 3D Patching mode
    this.patchMode = false;
    this.patchSourceId = null;
    this.previewCableMesh = null;

    // Callbacks
    this.onNodeSelected = null;      // function(nodeId)
    this.onNodeMoved = null;         // function(nodeId, pos)
    this.onConnectionCreated = null; // function(fromId, toId)
    this.onStatusMessage = null;     // function(msg)

    this._initScene();
    this._buildConservatory();
    this._buildHeartTree();
    this._buildSporeField();
    this._bindEvents();
  }

  World3D.prototype._initScene = function () {
    var w = this.container.clientWidth || window.innerWidth;
    var h = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030711);
    this.scene.fog = new THREE.FogExp2(0x040916, 0.015);

    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 200);
    this._updateCameraPosition(true);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    var ambient = new THREE.AmbientLight(0x162447, 1.3);
    this.scene.add(ambient);

    var hemi = new THREE.HemisphereLight(0x38bdf8, 0x09111e, 0.9);
    hemi.position.set(0, 30, 0);
    this.scene.add(hemi);

    var centerLight = new THREE.PointLight(0x00f5d4, 2.2, 38, 1.5);
    centerLight.position.set(0, 6, 0);
    this.scene.add(centerLight);
    this.centerLight = centerLight;

    var rimLight1 = new THREE.PointLight(0xd946ef, 1.4, 45);
    rimLight1.position.set(-18, 12, -14);
    this.scene.add(rimLight1);

    var rimLight2 = new THREE.PointLight(0x38bdf8, 1.4, 45);
    rimLight2.position.set(18, 12, 14);
    this.scene.add(rimLight2);
  };

  // =========================================================================
  // CONSERVATORY DOME & HARMONIC FLOOR
  // =========================================================================
  World3D.prototype._buildConservatory = function () {
    var conservatoryGroup = new THREE.Group();

    // Obsidian-Moss Floor Disc
    var floorGeo = new THREE.CylinderGeometry(28, 28, 0.4, 64);
    var floorMat = new THREE.MeshStandardMaterial({
      color: 0x050d1a,
      roughness: 0.35,
      metalness: 0.45
    });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    conservatoryGroup.add(floor);

    // Concentric Harmonic Rings on Floor
    var radii = [4.5, 9, 13.5, 18, 22.5, 27];
    var self = this;
    radii.forEach(function (r, idx) {
      var ringGeo = new THREE.RingGeometry(r - 0.04, r + 0.04, 96);
      var ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x00f5d4 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18 - idx * 0.02
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      conservatoryGroup.add(ring);
      self.floorRings.push(ring);
    });

    // Radial stereo field lines (12 ribs)
    var lineMat = new THREE.LineBasicMaterial({
      color: 0x1e3a5f,
      transparent: true,
      opacity: 0.35
    });
    for (var i = 0; i < 12; i++) {
      var angle = (i / 12) * Math.PI * 2;
      var pts = [
        new THREE.Vector3(Math.cos(angle) * 3.5, 0.02, Math.sin(angle) * 3.5),
        new THREE.Vector3(Math.cos(angle) * 27, 0.02, Math.sin(angle) * 27)
      ];
      var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      conservatoryGroup.add(new THREE.Line(lineGeo, lineMat));
    }

    // Glass Conservatory Geodesic Dome Wireframe + Ribs
    var domeGeo = new THREE.SphereGeometry(28, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
    var domeWireMat = new THREE.MeshBasicMaterial({
      color: 0x1e40af,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    var domeMesh = new THREE.Mesh(domeGeo, domeWireMat);
    conservatoryGroup.add(domeMesh);

    // Glowing Architectural Arch Ribs (8 arches meeting at the zenith oculus)
    var archMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.22
    });
    for (var a = 0; a < 8; a++) {
      var archGeo = new THREE.TorusGeometry(27.8, 0.06, 8, 64, Math.PI);
      var arch = new THREE.Mesh(archGeo, archMat);
      arch.rotation.y = (a / 8) * Math.PI;
      conservatoryGroup.add(arch);
    }

    // Zenith Oculus Ring at top of Conservatory
    var oculusGeo = new THREE.TorusGeometry(3.8, 0.08, 12, 64);
    var oculusMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.45
    });
    var oculus = new THREE.Mesh(oculusGeo, oculusMat);
    oculus.rotation.x = Math.PI / 2;
    oculus.position.y = 27.5;
    conservatoryGroup.add(oculus);

    this.scene.add(conservatoryGroup);
  };

  // =========================================================================
  // CENTRAL HEART TREE (MASTER SONIC NEXUS AT 0,0,0)
  // =========================================================================
  World3D.prototype._buildHeartTree = function () {
    var group = new THREE.Group();
    group.position.set(0, 0, 0);

    // Base sanctuary pedestal ring
    var baseGeo = new THREE.CylinderGeometry(2.2, 2.7, 0.35, 32);
    var baseMat = new THREE.MeshStandardMaterial({
      color: 0x09192f,
      emissive: 0x052e2b,
      roughness: 0.3,
      metalness: 0.7
    });
    var baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.175;
    group.add(baseMesh);

    // Intertwined Bioluminescent Trunk Tendrils
    var trunkGroup = new THREE.Group();
    for (var t = 0; t < 5; t++) {
      var angleOffset = (t / 5) * Math.PI * 2;
      var curvePts = [];
      for (var s = 0; s <= 12; s++) {
        var frac = s / 12;
        var y = 0.3 + frac * 4.2;
        var radius = (1 - frac * 0.65) * 0.9 + 0.18;
        var twist = angleOffset + frac * Math.PI * 1.4;
        curvePts.push(new THREE.Vector3(Math.cos(twist) * radius, y, Math.sin(twist) * radius));
      }
      var curve = new THREE.CatmullRomCurve3(curvePts);
      var tubeGeo = new THREE.TubeGeometry(curve, 32, 0.11, 8, false);
      var tubeMat = new THREE.MeshStandardMaterial({
        color: 0x00f5d4,
        emissive: 0x00a896,
        emissiveIntensity: 0.7,
        roughness: 0.25,
        metalness: 0.3
      });
      trunkGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
    }
    group.add(trunkGroup);

    // Levitating Heart Crystal Core
    var coreGeo = new THREE.OctahedronGeometry(0.95, 1);
    var coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.2,
      wireframe: false,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.2
    });
    var coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 4.8;
    group.add(coreMesh);

    // Outer Wireframe Halo around Core
    var haloGeo = new THREE.IcosahedronGeometry(1.45, 1);
    var haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });
    var haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.y = 4.8;
    group.add(haloMesh);

    // 32 Radial FFT Spectrum Crystal Petals around the base
    var spectrumBars = [];
    var numBars = 32;
    for (var i = 0; i < numBars; i++) {
      var a = (i / numBars) * Math.PI * 2;
      var barGeo = new THREE.BoxGeometry(0.14, 1, 0.14);
      var hue = 0.48 + (i / numBars) * 0.35;
      var col = new THREE.Color().setHSL(hue % 1, 0.9, 0.6);
      var barMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.85
      });
      var bar = new THREE.Mesh(barGeo, barMat);
      var r = 2.55;
      bar.position.set(Math.cos(a) * r, 0.35, Math.sin(a) * r);
      group.add(bar);
      spectrumBars.push(bar);
    }

    // Invisible Hit Cylinder so user can click 'master' when patching cables
    var hitGeo = new THREE.CylinderGeometry(2.4, 2.4, 6.2, 16);
    var hitMat = new THREE.MeshBasicMaterial({ visible: false });
    var hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.y = 3.1;
    hitMesh.userData = { nodeId: 'master' };
    group.add(hitMesh);

    this.scene.add(group);

    // Create floating DOM label for Master Heart Tree
    var labelEl = document.createElement('div');
    labelEl.className = 'node-3d-label master-label';
    labelEl.innerHTML = '<span class="label-icon">🌳</span> <span class="label-text">HEART TREE (MASTER)</span>';
    var self = this;
    labelEl.addEventListener('click', function (e) {
      e.stopPropagation();
      self._handleNodeClick('master');
    });
    this.labelsContainer.appendChild(labelEl);

    this.heartTree = {
      group: group,
      coreMesh: coreMesh,
      haloMesh: haloMesh,
      trunkGroup: trunkGroup,
      spectrumBars: spectrumBars,
      hitMesh: hitMesh,
      labelEl: labelEl
    };
  };

  // =========================================================================
  // FLOATING BIOLUMINESCENT SPORE PARTICLE FIELD
  // =========================================================================
  World3D.prototype._buildSporeField = function () {
    var count = 550;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var phases = new Float32Array(count);

    var palette = [
      new THREE.Color(0x00f5d4),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xd946ef),
      new THREE.Color(0x4ade80),
      new THREE.Color(0xfbbf24)
    ];

    for (var i = 0; i < count; i++) {
      var r = 2 + Math.random() * 24;
      var theta = Math.random() * Math.PI * 2;
      var y = 0.4 + Math.random() * 19;

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      var c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      phases[i] = Math.random() * Math.PI * 2;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    var points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.sporeParticles = {
      points: points,
      positions: positions,
      phases: phases,
      count: count,
      material: mat
    };
  };

  // =========================================================================
  // PROCEDURAL 3D BOTANICAL INSTRUMENT & FX PLUGIN SCULPTURES
  // =========================================================================
  World3D.prototype.syncNodesAndCables = function () {
    var self = this;

    // 1. Remove deleted nodes
    Object.keys(this.nodeMeshes).forEach(function (id) {
      if (!self.audio.nodes[id]) {
        self._removeNodeMesh(id);
      }
    });

    // 2. Create or update current nodes
    Object.keys(this.audio.nodes).forEach(function (id) {
      var node = self.audio.nodes[id];
      if (!self.nodeMeshes[id]) {
        self._createNodeMesh(node);
      } else {
        var nm = self.nodeMeshes[id];
        nm.group.position.set(node.position.x, node.position.y, node.position.z);
      }
    });

    // 3. Rebuild 3D Mycelial Patch Cables
    this.rebuildCables();
  };

  World3D.prototype._createNodeMesh = function (node) {
    var group = new THREE.Group();
    group.position.set(node.position.x, node.position.y, node.position.z);

    var primaryCol = new THREE.Color(node.color || '#00f5d4');
    var secondaryCol = new THREE.Color(node.secondaryColor || '#38bdf8');

    // Selection / Aura Ring on the ground
    var auraGeo = new THREE.RingGeometry(1.45, 1.65, 48);
    var auraMat = new THREE.MeshBasicMaterial({
      color: primaryCol,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    var auraRing = new THREE.Mesh(auraGeo, auraMat);
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.04;
    group.add(auraRing);

    // Base Botanical Pod Pedestal
    var podGeo = new THREE.CylinderGeometry(1.1, 1.35, 0.24, 24);
    var podMat = new THREE.MeshStandardMaterial({
      color: 0x0b172a,
      emissive: primaryCol,
      emissiveIntensity: 0.18,
      roughness: 0.35,
      metalness: 0.6
    });
    var podMesh = new THREE.Mesh(podGeo, podMat);
    podMesh.position.y = 0.12;
    group.add(podMesh);

    // Build specific 3D botanical sculpture based on node.type
    var sculptureData = this._buildSculptureByType(node.type, primaryCol, secondaryCol);
    group.add(sculptureData.mesh);

    // Invisible Hit Mesh for easy 3D raycasting & dragging
    var hitGeo = new THREE.CylinderGeometry(1.55, 1.55, 3.8, 16);
    var hitMat = new THREE.MeshBasicMaterial({ visible: false });
    var hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.y = 1.9;
    hitMesh.userData = { nodeId: node.id };
    group.add(hitMesh);

    this.scene.add(group);

    // Create floating HTML badge label
    var catalog = SG.INSTRUMENT_TYPES[node.type] || SG.PLUGIN_TYPES[node.type];
    var labelEl = document.createElement('div');
    labelEl.className = 'node-3d-label ' + node.category + '-label';
    labelEl.style.setProperty('--node-color', node.color);
    labelEl.innerHTML =
      '<span class="label-icon">' + (catalog ? catalog.icon : '🌱') + '</span>' +
      '<span class="label-text">' + node.name + '</span>' +
      '<span class="label-meter"><span class="label-meter-fill"></span></span>';

    var self = this;
    labelEl.addEventListener('click', function (e) {
      e.stopPropagation();
      self._handleNodeClick(node.id);
    });
    this.labelsContainer.appendChild(labelEl);

    this.nodeMeshes[node.id] = {
      nodeId: node.id,
      group: group,
      auraRing: auraRing,
      podMesh: podMesh,
      sculpture: sculptureData,
      hitMesh: hitMesh,
      labelEl: labelEl,
      meterFillEl: labelEl.querySelector('.label-meter-fill'),
      pulseEnergy: 0
    };
  };

  World3D.prototype._buildSculptureByType = function (type, col1, col2) {
    var root = new THREE.Group();
    var parts = {};

    if (type === 'sub-flora') {
      // Bioluminescent Lotus Bulb + Coiled Root Tendrils + Sub Shockwave Ring
      var bulbGeo = new THREE.SphereGeometry(0.95, 24, 20);
      bulbGeo.scale(1, 1.35, 1);
      var bulbMat = new THREE.MeshStandardMaterial({
        color: col1,
        emissive: col2,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9
      });
      var bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.y = 1.45;
      root.add(bulb);
      parts.core = bulb;

      // Glowing petals / root tendrils around the bulb
      var petals = new THREE.Group();
      for (var i = 0; i < 6; i++) {
        var ang = (i / 6) * Math.PI * 2;
        var pGeo = new THREE.ConeGeometry(0.32, 1.6, 8);
        var pMat = new THREE.MeshStandardMaterial({
          color: col2,
          emissive: col1,
          emissiveIntensity: 0.45,
          roughness: 0.3
        });
        var petal = new THREE.Mesh(pGeo, pMat);
        petal.position.set(Math.cos(ang) * 0.75, 1.1, Math.sin(ang) * 0.75);
        petal.rotation.z = -Math.cos(ang) * 0.38;
        petal.rotation.x = Math.sin(ang) * 0.38;
        petals.add(petal);
      }
      root.add(petals);
      parts.orbit = petals;

    } else if (type === 'crystal-pad') {
      // Cluster of 7 Translucent Amethyst Quartz Crystals + Floating Harmonic Ring
      var cluster = new THREE.Group();
      for (var c = 0; c < 7; c++) {
        var h = c === 0 ? 2.4 : (1.2 + (c % 3) * 0.4);
        var rad = c === 0 ? 0.42 : 0.25;
        var cGeo = new THREE.CylinderGeometry(0.04, rad, h, 6);
        var cMat = new THREE.MeshStandardMaterial({
          color: c % 2 === 0 ? col1 : col2,
          emissive: col1,
          emissiveIntensity: 0.6,
          roughness: 0.1,
          metalness: 0.5,
          transparent: true,
          opacity: 0.88
        });
        var shard = new THREE.Mesh(cGeo, cMat);
        if (c > 0) {
          var a = ((c - 1) / 6) * Math.PI * 2;
          shard.position.set(Math.cos(a) * 0.62, h * 0.5 + 0.2, Math.sin(a) * 0.62);
          shard.rotation.z = -Math.cos(a) * 0.32;
          shard.rotation.x = Math.sin(a) * 0.32;
        } else {
          shard.position.y = h * 0.5 + 0.2;
        }
        cluster.add(shard);
      }
      root.add(cluster);
      parts.core = cluster;

      var haloGeo = new THREE.TorusGeometry(1.15, 0.04, 12, 48);
      var haloMat = new THREE.MeshBasicMaterial({ color: col1, transparent: true, opacity: 0.75 });
      var halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 2.0;
      root.add(halo);
      parts.orbit = halo;

    } else if (type === 'granular-spore') {
      // Dandelion Nebula Core + 24 Orbiting Spore Orbs
      var stemGeo = new THREE.CylinderGeometry(0.08, 0.14, 1.8, 12);
      var stemMat = new THREE.MeshStandardMaterial({ color: col2, emissive: col2, emissiveIntensity: 0.4 });
      var stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 1.0;
      root.add(stem);

      var centerGeo = new THREE.IcosahedronGeometry(0.58, 2);
      var centerMat = new THREE.MeshStandardMaterial({
        color: col1,
        emissive: col1,
        emissiveIntensity: 0.9,
        wireframe: true
      });
      var center = new THREE.Mesh(centerGeo, centerMat);
      center.position.y = 2.1;
      root.add(center);
      parts.core = center;

      var swarm = new THREE.Group();
      swarm.position.y = 2.1;
      for (var s = 0; s < 24; s++) {
        var sGeo = new THREE.SphereGeometry(0.09, 8, 8);
        var sMat = new THREE.MeshBasicMaterial({
          color: s % 2 === 0 ? col1 : col2
        });
        var sp = new THREE.Mesh(sGeo, sMat);
        var phi = Math.acos(1 - 2 * (s + 0.5) / 24);
        var theta = Math.PI * (1 + Math.sqrt(5)) * s;
        var r = 0.95;
        sp.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );
        sp.userData = { basePos: sp.position.clone() };
        swarm.add(sp);
      }
      root.add(swarm);
      parts.orbit = swarm;

    } else if (type === 'perc-blooms') {
      // Cluster of 3 Bioluminescent Mushroom Caps & Dewdrop Chimes
      var capsGroup = new THREE.Group();
      var configs = [
        { x: 0, z: 0, h: 1.9, r: 0.85 },
        { x: -0.65, z: 0.45, h: 1.25, r: 0.55 },
        { x: 0.65, z: -0.35, h: 1.45, r: 0.62 }
      ];
      configs.forEach(function (cfg, idx) {
        var stGeo = new THREE.CylinderGeometry(0.12, 0.18, cfg.h, 12);
        var stMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: col2, emissiveIntensity: 0.25 });
        var st = new THREE.Mesh(stGeo, stMat);
        st.position.set(cfg.x, cfg.h * 0.5 + 0.1, cfg.z);
        capsGroup.add(st);

        var capGeo = new THREE.SphereGeometry(cfg.r, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58);
        var capMat = new THREE.MeshStandardMaterial({
          color: idx % 2 === 0 ? col1 : col2,
          emissive: col1,
          emissiveIntensity: 0.65,
          roughness: 0.25,
          side: THREE.DoubleSide
        });
        var cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(cfg.x, cfg.h + 0.1, cfg.z);
        capsGroup.add(cap);
      });
      root.add(capsGroup);
      parts.core = capsGroup;

    } else if (type === 'lush-reverb') {
      // Iridescent Mist Fountain + Rising Vapor Rings
      var basinGeo = new THREE.CylinderGeometry(0.95, 0.65, 0.9, 24);
      var basinMat = new THREE.MeshStandardMaterial({
        color: col1,
        emissive: col2,
        emissiveIntensity: 0.6,
        roughness: 0.15,
        metalness: 0.5,
        transparent: true,
        opacity: 0.85
      });
      var basin = new THREE.Mesh(basinGeo, basinMat);
      basin.position.y = 0.65;
      root.add(basin);
      parts.core = basin;

      var rings = new THREE.Group();
      for (var rIdx = 0; rIdx < 3; rIdx++) {
        var rGeo = new THREE.TorusGeometry(0.65 + rIdx * 0.22, 0.045, 12, 36);
        var rMat = new THREE.MeshBasicMaterial({
          color: col1,
          transparent: true,
          opacity: 0.7 - rIdx * 0.18
        });
        var ringMesh = new THREE.Mesh(rGeo, rMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 1.2 + rIdx * 0.55;
        rings.add(ringMesh);
      }
      root.add(rings);
      parts.orbit = rings;

    } else if (type === 'echo-vine') {
      // Double-Helix Spiraling Bioluminescent Vines
      var vineGroup = new THREE.Group();
      for (var hIdx = 0; hIdx < 2; hIdx++) {
        var pts = [];
        for (var k = 0; k <= 20; k++) {
          var f = k / 20;
          var ang2 = f * Math.PI * 3 + hIdx * Math.PI;
          pts.push(new THREE.Vector3(Math.cos(ang2) * 0.68, 0.25 + f * 2.4, Math.sin(ang2) * 0.68));
        }
        var cCurve = new THREE.CatmullRomCurve3(pts);
        var tGeo = new THREE.TubeGeometry(cCurve, 36, 0.09, 8, false);
        var tMat = new THREE.MeshStandardMaterial({
          color: hIdx === 0 ? col1 : col2,
          emissive: hIdx === 0 ? col1 : col2,
          emissiveIntensity: 0.65
        });
        vineGroup.add(new THREE.Mesh(tGeo, tMat));
      }
      root.add(vineGroup);
      parts.core = vineGroup;
      parts.orbit = vineGroup;

    } else if (type === 'filter-prism') {
      // Levitating Refractive Octahedron + Dual Gyroscopic Rings
      var octGeo = new THREE.OctahedronGeometry(0.85, 0);
      var octMat = new THREE.MeshStandardMaterial({
        color: col1,
        emissive: col2,
        emissiveIntensity: 0.75,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity: 0.88
      });
      var oct = new THREE.Mesh(octGeo, octMat);
      oct.position.y = 1.65;
      root.add(oct);
      parts.core = oct;

      var gyro = new THREE.Group();
      gyro.position.y = 1.65;
      var g1 = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.035, 10, 48),
        new THREE.MeshBasicMaterial({ color: col1 })
      );
      var g2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.32, 0.035, 10, 48),
        new THREE.MeshBasicMaterial({ color: col2 })
      );
      g2.rotation.x = Math.PI / 2;
      gyro.add(g1);
      gyro.add(g2);
      root.add(gyro);
      parts.orbit = gyro;

    } else if (type === 'distortion-thorn') {
      // Spiked Briar Torus Knot
      var knotGeo = new THREE.TorusKnotGeometry(0.65, 0.18, 64, 12, 2, 3);
      var knotMat = new THREE.MeshStandardMaterial({
        color: col1,
        emissive: col2,
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.6
      });
      var knot = new THREE.Mesh(knotGeo, knotMat);
      knot.position.y = 1.6;
      root.add(knot);
      parts.core = knot;
      parts.orbit = knot;
    }

    return { mesh: root, parts: parts };
  };

  World3D.prototype._removeNodeMesh = function (nodeId) {
    var nm = this.nodeMeshes[nodeId];
    if (!nm) return;
    this.scene.remove(nm.group);
    if (nm.labelEl && nm.labelEl.parentNode) {
      nm.labelEl.parentNode.removeChild(nm.labelEl);
    }
    delete this.nodeMeshes[nodeId];
  };

  // =========================================================================
  // 3D MYCELIAL PATCH CABLES & TRAVELING SIGNAL PULSES
  // =========================================================================
  World3D.prototype.rebuildCables = function () {
    var self = this;

    // Remove existing cable meshes
    this.cableMeshes.forEach(function (cm) {
      self.scene.remove(cm.group);
    });
    this.cableMeshes = [];

    this.audio.connections.forEach(function (conn) {
      var fromNode = self.audio.nodes[conn.from];
      if (!fromNode) return;

      var startPos = new THREE.Vector3(fromNode.position.x, 0.6, fromNode.position.z);
      var endPos;
      if (conn.to === 'master') {
        endPos = new THREE.Vector3(0, 1.6, 0);
      } else {
        var toNode = self.audio.nodes[conn.to];
        if (!toNode) return;
        endPos = new THREE.Vector3(toNode.position.x, 0.8, toNode.position.z);
      }

      var dist = startPos.distanceTo(endPos);
      var mid1 = startPos.clone().lerp(endPos, 0.33);
      var mid2 = startPos.clone().lerp(endPos, 0.66);
      var archHeight = Math.min(3.5, Math.max(1.1, dist * 0.16));
      mid1.y += archHeight;
      mid2.y += archHeight * 0.85;

      var curve = new THREE.CatmullRomCurve3([startPos, mid1, mid2, endPos]);
      var tubeGeo = new THREE.TubeGeometry(curve, 36, 0.055, 8, false);
      var col = new THREE.Color(fromNode.color || '#00f5d4');

      var tubeMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.55
      });
      var tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);

      var cableGroup = new THREE.Group();
      cableGroup.add(tubeMesh);

      // 3 Traveling Signal Pulse Orbs along each Mycelial Cable
      var pulses = [];
      for (var p = 0; p < 3; p++) {
        var pGeo = new THREE.SphereGeometry(0.13, 10, 10);
        var pMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9
        });
        var pMesh = new THREE.Mesh(pGeo, pMat);
        cableGroup.add(pMesh);
        pulses.push({
          mesh: pMesh,
          offset: p / 3
        });
      }

      self.scene.add(cableGroup);
      self.cableMeshes.push({
        from: conn.from,
        to: conn.to,
        group: cableGroup,
        tubeMesh: tubeMesh,
        tubeMat: tubeMat,
        curve: curve,
        pulses: pulses,
        color: col
      });
    });
  };

  World3D.prototype.triggerVisualPulse = function (nodeId) {
    var nm = this.nodeMeshes[nodeId];
    if (nm) {
      nm.pulseEnergy = 1.0;
    }
  };

  // =========================================================================
  // INTERACTIVE CAMERA, RAYCASTING, DRAGGING & 3D CABLE PATCHING
  // =========================================================================
  World3D.prototype._bindEvents = function () {
    var self = this;
    var dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', function (e) { self._onPointerDown(e); });
    window.addEventListener('pointermove', function (e) { self._onPointerMove(e); });
    window.addEventListener('pointerup', function (e) { self._onPointerUp(e); });
    dom.addEventListener('wheel', function (e) { self._onWheel(e); }, { passive: false });
    dom.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('resize', function () { self.onResize(); });
  };

  World3D.prototype.onResize = function () {
    if (!this.container || !this.renderer || !this.camera) return;
    var w = this.container.clientWidth || window.innerWidth;
    var h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  World3D.prototype._updateMouseNDC = function (e) {
    var rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  World3D.prototype._raycastNodes = function () {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    var hitTargets = [];
    var self = this;
    Object.keys(this.nodeMeshes).forEach(function (id) {
      hitTargets.push(self.nodeMeshes[id].hitMesh);
    });
    if (this.heartTree && this.heartTree.hitMesh) {
      hitTargets.push(this.heartTree.hitMesh);
    }
    var hits = this.raycaster.intersectObjects(hitTargets, false);
    if (hits.length > 0 && hits[0].object && hits[0].object.userData) {
      return hits[0].object.userData.nodeId;
    }
    return null;
  };

  World3D.prototype._onPointerDown = function (e) {
    this._updateMouseNDC(e);
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.lastPointerPos = { x: e.clientX, y: e.clientY };

    var hitNodeId = this._raycastNodes();

    // Right-click or Shift+drag pans the camera
    if (e.button === 2 || (e.button === 0 && e.shiftKey && !hitNodeId)) {
      this.isPanning = true;
      return;
    }

    if (e.button === 0) {
      if (this.patchMode && hitNodeId) {
        this._handleNodeClick(hitNodeId);
        return;
      }

      if (hitNodeId && hitNodeId !== 'master') {
        this.draggingNodeId = hitNodeId;
        this.selectNode(hitNodeId, false);
        this.renderer.domElement.style.cursor = 'grabbing';
      } else {
        this.isOrbiting = true;
      }
    }
  };

  World3D.prototype._onPointerMove = function (e) {
    this._updateMouseNDC(e);
    var dx = e.clientX - this.lastPointerPos.x;
    var dy = e.clientY - this.lastPointerPos.y;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };

    // 1. Dragging a 3D Node across the Conservatory Floor
    if (this.draggingNodeId) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.raycaster.ray.intersectPlane(this.floorPlane, this.intersectPoint)) {
        // Clamp within conservatory radius (3.6 to 24.5 from center so it doesn't collide with Heart Tree)
        var x = this.intersectPoint.x;
        var z = this.intersectPoint.z;
        var dist = Math.sqrt(x * x + z * z);
        if (dist < 3.6) {
          var ang = Math.atan2(z, x);
          x = Math.cos(ang) * 3.6;
          z = Math.sin(ang) * 3.6;
        } else if (dist > 24.5) {
          var ang2 = Math.atan2(z, x);
          x = Math.cos(ang2) * 24.5;
          z = Math.sin(ang2) * 24.5;
        }

        var nm = this.nodeMeshes[this.draggingNodeId];
        if (nm) {
          nm.group.position.set(x, 0, z);
        }
        this.audio.updateNodePosition(this.draggingNodeId, x, 0, z);
        this.rebuildCables();
        if (this.onNodeMoved) {
          this.onNodeMoved(this.draggingNodeId, { x: x, y: 0, z: z });
        }
      }
      return;
    }

    // 2. Orbiting Camera
    if (this.isOrbiting) {
      this.spherical.desiredTheta -= dx * 0.0065;
      this.spherical.desiredPhi = Math.max(0.22, Math.min(Math.PI * 0.46, this.spherical.desiredPhi - dy * 0.0055));
      return;
    }

    // 3. Panning Camera
    if (this.isPanning) {
      var panSpeed = 0.035;
      var forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      var right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      this.camDesiredTarget.addScaledVector(right, -dx * panSpeed);
      this.camDesiredTarget.addScaledVector(forward, dy * panSpeed);
      return;
    }

    // 4. Update 3D Preview Cable when in Patch Mode
    if (this.patchMode && this.patchSourceId) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.raycaster.ray.intersectPlane(this.floorPlane, this.intersectPoint)) {
        this._updatePreviewCable(this.intersectPoint);
      }
    }

    // 5. Hover highlight check
    var hoverId = this._raycastNodes();
    if (hoverId !== this.hoveredNodeId) {
      this.hoveredNodeId = hoverId;
      this.renderer.domElement.style.cursor = hoverId ? (this.patchMode ? 'crosshair' : 'grab') : (this.patchMode ? 'crosshair' : 'default');
    }
  };

  World3D.prototype._onPointerUp = function (e) {
    var movedDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);

    if (this.draggingNodeId) {
      var clickedId = this.draggingNodeId;
      this.draggingNodeId = null;
      this.renderer.domElement.style.cursor = 'grab';
      // If it was a quick click without dragging, trigger preview sound!
      if (movedDist < 5) {
        this._handleNodeClick(clickedId);
      }
    } else if (this.isOrbiting && movedDist < 5) {
      var hitId = this._raycastNodes();
      if (hitId) {
        this._handleNodeClick(hitId);
      }
    }

    this.isOrbiting = false;
    this.isPanning = false;
  };

  World3D.prototype._onWheel = function (e) {
    e.preventDefault();
    this.spherical.desiredRadius = Math.max(8, Math.min(54, this.spherical.desiredRadius + e.deltaY * 0.018));
  };

  World3D.prototype._handleNodeClick = function (nodeId) {
    // Handle 3D Patch Cable Wiring Mode
    if (this.patchMode) {
      if (!this.patchSourceId) {
        if (nodeId === 'master') {
          if (this.onStatusMessage) this.onStatusMessage('Heart Tree is the Master output. Click an Instrument or FX Plugin first as the cable source.');
          return;
        }
        this.patchSourceId = nodeId;
        var srcNode = this.audio.nodes[nodeId];
        if (this.onStatusMessage) {
          this.onStatusMessage('Patching from [' + (srcNode ? srcNode.name : nodeId) + '] -> Click any FX Plugin or the Central Heart Tree to connect!');
        }
      } else {
        var fromId = this.patchSourceId;
        this.patchSourceId = null;
        this._clearPreviewCable();

        if (fromId === nodeId) {
          if (this.onStatusMessage) this.onStatusMessage('Cancelled cable connection.');
          return;
        }

        // Toggle connection: if already connected, disconnect; otherwise connect
        var existing = this.audio.connections.some(function (c) {
          return c.from === fromId && c.to === nodeId;
        });

        if (existing) {
          this.audio.disconnectNodes(fromId, nodeId);
          this.rebuildCables();
          if (this.onConnectionCreated) this.onConnectionCreated(fromId, nodeId);
          if (this.onStatusMessage) this.onStatusMessage('Disconnected Mycelial Patch Cable.');
        } else {
          var ok = this.audio.connectNodes(fromId, nodeId);
          if (ok) {
            this.rebuildCables();
            if (this.onConnectionCreated) this.onConnectionCreated(fromId, nodeId);
            if (this.onStatusMessage) this.onStatusMessage('Connected glowing Mycelial Patch Cable!');
          } else {
            if (this.onStatusMessage) this.onStatusMessage('Cannot route signal into an Instrument or create a feedback loop.');
          }
        }
      }
      return;
    }

    if (nodeId === 'master') {
      this.setCameraPreset('overview');
      return;
    }

    this.selectNode(nodeId, true);
  };

  World3D.prototype.selectNode = function (nodeId, triggerPreview) {
    this.selectedNodeId = nodeId;

    var self = this;
    Object.keys(this.nodeMeshes).forEach(function (id) {
      var nm = self.nodeMeshes[id];
      var isSel = (id === nodeId);
      nm.labelEl.classList.toggle('selected', isSel);
      nm.auraRing.material.opacity = isSel ? 0.9 : 0.35;
      nm.auraRing.scale.setScalar(isSel ? 1.18 : 1.0);
    });

    var node = this.audio.nodes[nodeId];
    if (node && triggerPreview && node.category === 'instrument') {
      var oct = (SG.INSTRUMENT_TYPES[node.type] && SG.INSTRUMENT_TYPES[node.type].defaultOctave) || 4;
      this.audio.triggerNote(nodeId, (oct + 1) * 12, 0.45, 0.85);
    }

    if (this.onNodeSelected) {
      this.onNodeSelected(nodeId);
    }
  };

  World3D.prototype.setPatchMode = function (enabled) {
    this.patchMode = enabled;
    this.patchSourceId = null;
    this._clearPreviewCable();
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : 'default';
  };

  World3D.prototype._updatePreviewCable = function (targetVec3) {
    this._clearPreviewCable();
    var srcNode = this.audio.nodes[this.patchSourceId];
    if (!srcNode) return;

    var start = new THREE.Vector3(srcNode.position.x, 0.8, srcNode.position.z);
    var end = new THREE.Vector3(targetVec3.x, 0.8, targetVec3.z);
    var mid = start.clone().lerp(end, 0.5);
    mid.y += 2.2;

    var curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    var geo = new THREE.TubeGeometry(curve, 24, 0.06, 8, false);
    var mat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.85
    });
    this.previewCableMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.previewCableMesh);
  };

  World3D.prototype._clearPreviewCable = function () {
    if (this.previewCableMesh) {
      this.scene.remove(this.previewCableMesh);
      this.previewCableMesh = null;
    }
  };

  // =========================================================================
  // CAMERA PRESETS & FOCUS
  // =========================================================================
  World3D.prototype.setCameraPreset = function (preset) {
    if (preset === 'overview') {
      this.camDesiredTarget.set(0, 1.8, 0);
      this.spherical.desiredRadius = 26;
      this.spherical.desiredPhi = 1.05;
      this.spherical.desiredTheta = 0.35;
    } else if (preset === 'canopy') {
      this.camDesiredTarget.set(0, 0, 0);
      this.spherical.desiredRadius = 32;
      this.spherical.desiredPhi = 0.32;
      this.spherical.desiredTheta = 0.0;
    } else if (preset === 'ground') {
      this.camDesiredTarget.set(0, 2.2, 0);
      this.spherical.desiredRadius = 19;
      this.spherical.desiredPhi = 1.38;
      this.spherical.desiredTheta = -0.5;
    } else if (preset === 'focus' && this.selectedNodeId && this.audio.nodes[this.selectedNodeId]) {
      var p = this.audio.nodes[this.selectedNodeId].position;
      this.camDesiredTarget.set(p.x, 1.5, p.z);
      this.spherical.desiredRadius = 11;
      this.spherical.desiredPhi = 1.15;
    }
  };

  World3D.prototype._updateCameraPosition = function (immediate) {
    var lerpFactor = immediate ? 1.0 : 0.08;
    this.spherical.radius += (this.spherical.desiredRadius - this.spherical.radius) * lerpFactor;
    this.spherical.theta += (this.spherical.desiredTheta - this.spherical.theta) * lerpFactor;
    this.spherical.phi += (this.spherical.desiredPhi - this.spherical.phi) * lerpFactor;
    this.camTarget.lerp(this.camDesiredTarget, lerpFactor);

    var r = this.spherical.radius;
    var phi = this.spherical.phi;
    var theta = this.spherical.theta;

    this.camera.position.x = this.camTarget.x + r * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = this.camTarget.y + r * Math.cos(phi);
    this.camera.position.z = this.camTarget.z + r * Math.sin(phi) * Math.cos(theta);
    this.camera.lookAt(this.camTarget);
  };

  // =========================================================================
  // MAIN 60FPS RENDER & AUDIO-REACTIVE ANIMATION LOOP
  // =========================================================================
  World3D.prototype.renderFrame = function (meters) {
    var elapsed = this.clock.getElapsedTime();
    var masterLevel = meters ? meters.masterLevel : 0;
    var bassEnergy = meters ? meters.bassEnergy : 0;

    this._updateCameraPosition(false);

    // 1. Animate Central Heart Tree & 32-Bar Radial FFT Spectrum
    if (this.heartTree) {
      var ht = this.heartTree;
      ht.coreMesh.rotation.y = elapsed * 0.6;
      ht.coreMesh.rotation.z = Math.sin(elapsed * 0.8) * 0.25;
      var coreScale = 1 + masterLevel * 0.85 + bassEnergy * 0.45;
      ht.coreMesh.scale.setScalar(coreScale);

      ht.haloMesh.rotation.y = -elapsed * 0.35;
      ht.haloMesh.rotation.x = elapsed * 0.22;
      ht.haloMesh.scale.setScalar(1 + bassEnergy * 0.55);

      if (this.centerLight) {
        this.centerLight.intensity = 1.8 + masterLevel * 3.5;
      }

      // Update 32 radial FFT spectrum bars around the Heart Tree
      var freqData = this.audio.freqData;
      for (var i = 0; i < ht.spectrumBars.length; i++) {
        var bar = ht.spectrumBars[i];
        var val = freqData ? (freqData[i * 2] / 255) : 0;
        var h = Math.max(0.18, val * 4.2);
        bar.scale.y = h;
        bar.position.y = h * 0.5 + 0.1;
      }

      this._projectLabel(new THREE.Vector3(0, 6.6, 0), ht.labelEl);
    }

    // 2. Animate Floating Bioluminescent Spores
    if (this.sporeParticles) {
      var sp = this.sporeParticles;
      var posArr = sp.positions;
      for (var s = 0; s < sp.count; s++) {
        posArr[s * 3 + 1] += 0.008 + masterLevel * 0.035;
        posArr[s * 3] += Math.sin(elapsed * 0.5 + sp.phases[s]) * 0.006;
        if (posArr[s * 3 + 1] > 21) {
          posArr[s * 3 + 1] = 0.3;
        }
      }
      sp.points.geometry.attributes.position.needsUpdate = true;
      sp.material.size = 0.2 + bassEnergy * 0.22;
    }

    // 3. Animate Individual 3D Instruments & FX Plugins
    var self = this;
    Object.keys(this.nodeMeshes).forEach(function (id) {
      var nm = self.nodeMeshes[id];
      var node = self.audio.nodes[id];
      if (!node) return;

      nm.pulseEnergy *= 0.91;
      var energy = Math.max(node.signalLevel || 0, nm.pulseEnergy);

      var parts = nm.sculpture.parts;
      if (parts.core) {
        parts.core.rotation.y = elapsed * 0.45;
        var s = 1 + energy * 0.42;
        parts.core.scale.set(s, 1 + energy * 0.55, s);
      }
      if (parts.orbit && parts.orbit !== parts.core) {
        parts.orbit.rotation.y = -elapsed * 0.75;
      }

      // Special spore cloud scatter animation for Granular Spore
      if (node.type === 'granular-spore' && parts.orbit) {
        parts.orbit.children.forEach(function (orb, idx) {
          var b = orb.userData.basePos;
          if (b) {
            var expand = 1 + energy * 0.85 + Math.sin(elapsed * 2.5 + idx) * 0.12;
            orb.position.set(b.x * expand, b.y * expand, b.z * expand);
          }
        });
      }

      // Update live meter bar on 3D floating label
      if (nm.meterFillEl) {
        nm.meterFillEl.style.width = Math.min(100, Math.round(energy * 100)) + '%';
      }

      // Project 3D label to 2D screen coordinates
      var worldPos = nm.group.position.clone();
      worldPos.y += 3.35;
      self._projectLabel(worldPos, nm.labelEl);
    });

    // 4. Animate Traveling Signal Pulses along 3D Mycelial Patch Cables
    this.cableMeshes.forEach(function (cm) {
      var srcNode = self.audio.nodes[cm.from];
      var sig = srcNode ? Math.max(0.08, srcNode.signalLevel || 0) : 0.1;
      cm.tubeMat.opacity = 0.35 + Math.min(0.6, sig * 0.9);

      var speed = 0.35 + sig * 1.4;
      cm.pulses.forEach(function (pObj) {
        pObj.offset = (pObj.offset + 0.008 * speed) % 1;
        var pt = cm.curve.getPointAt(pObj.offset);
        pObj.mesh.position.copy(pt);
        var pScale = 0.65 + sig * 1.35;
        pObj.mesh.scale.setScalar(pScale);
      });
    });

    this.renderer.render(this.scene, this.camera);
  };

  World3D.prototype._projectLabel = function (worldVec, domEl) {
    if (!domEl) return;
    var v = worldVec.clone();
    v.project(this.camera);

    // Hide if behind camera
    if (v.z > 1) {
      domEl.style.display = 'none';
      return;
    }

    var w = this.container.clientWidth || window.innerWidth;
    var h = this.container.clientHeight || window.innerHeight;
    var x = (v.x * 0.5 + 0.5) * w;
    var y = (-(v.y * 0.5) + 0.5) * h;

    domEl.style.display = 'flex';
    domEl.style.transform = 'translate(-50%, -50%) translate(' + Math.round(x) + 'px, ' + Math.round(y) + 'px)';
  };

  SG.World3D = World3D;
})(window.SoundGarden);
