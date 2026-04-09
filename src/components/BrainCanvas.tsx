'use client';

/**
 * BrainCanvas — Premium Three.js WebGL brain visualisation
 *
 * Renders a bioluminescent 3D brain inspired by high-end neural-network visuals.
 * Features:
 *   • Dark solid brain mesh with pronounced gyri / sulci displacement
 *   • Multi-layer glowing wireframe overlay (simulates bloom without post-processing)
 *   • Dense surface neural-pathway tubes with additive blending
 *   • Ambient particle field mixing surface and orbital particles
 *   • Concentric halo planes for fake volumetric bloom
 *   • Scroll-driven rotation + "activation" lighting surge
 *   • Rhythmic pulse animation (idle heartbeat glow)
 *   • Mouse-tracking subtle tilt
 *   • Desktop: brain offset right so text occupies the left half
 *   • Low-performance device fallback (reduced geometry, lower DPR)
 *   • Fully disposed on unmount to avoid memory leaks
 *   • Respects prefers-reduced-motion
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ─── Configuration ──────────────────────────────────────────────────── */

const BRAIN_RADIUS      = 1.3;
const PARTICLE_COUNT    = 900;
const NEURAL_PATH_COUNT   = 130;
// Viewport width above which the brain is offset right (aligns with text layout)
const DESKTOP_BREAKPOINT_WIDTH = 860;

// Electric blue / cyan bioluminescent palette
const COL_DEEP_BLUE    = 0x001133;
const COL_MID_BLUE     = 0x0044cc;
const COL_BRIGHT_BLUE  = 0x0066ff;
const COL_CYAN         = 0x00aaff;
const COL_BRIGHT_CYAN  = 0x55ccff;

/* ─── Helpers ────────────────────────────────────────────────────────── */

/**
 * Displace a normalised vertex to carve brain-like gyri / sulci.
 * Returns a signed scalar displacement applied along the surface normal.
 */
function brainDisplace(v: THREE.Vector3): number {
  const { x, y, z } = v.clone().normalize();

  // Major lobe shapes — low-frequency, high-amplitude waves
  let d = 0;
  d += Math.sin(x * 8.0 + y * 5.0) * 0.048;
  d += Math.cos(y * 7.0 + z * 6.0) * 0.040;
  d += Math.sin(z * 9.0 + x * 4.0) * 0.034;
  d += Math.cos(x * 6.0 + z * 7.0) * 0.028;
  d += Math.sin(y * 5.0 + z * 4.5) * 0.022;

  // Frontal / parietal lobe division
  d += Math.sin(z * 3.5) * 0.018;

  // Cerebellum — depression at rear-bottom
  const rearBottom = -z * 0.65 + -y * 0.55;
  if (rearBottom > 0.3) d -= rearBottom * 0.055;

  // Deep longitudinal fissure along the midline
  d -= Math.exp(-x * x * 60) * 0.045;

  // Fine sulci texture layers
  d += Math.sin(x * 20 + y * 16 + z * 11) * 0.015;
  d += Math.cos(x * 16 + y * 12 + z * 18) * 0.012;
  d += Math.sin(x * 24 + z * 13 + y *  8) * 0.008;
  d += Math.cos(y * 22 + z * 15 + x * 10) * 0.006;

  return d;
}

/**
 * Build a displaced icosahedron that approximates brain topology.
 * detail 6 → high-res solid mesh; detail 4 → edge wireframe base.
 */
function buildBrainGeometry(detail: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(BRAIN_RADIUS, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v   = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Oval vertical compression
    v.y *= 0.88;
    // Forebrain protrusion
    v.z += v.z > 0 ? 0.10 : -0.04;
    // Slight lateral compression
    v.x *= 0.95;

    const d = brainDisplace(v);
    v.addScaledVector(v.clone().normalize(), d);

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Generate a smooth Catmull-Rom spline biased towards the brain surface.
 * Surface-biased paths (r ≈ 0.75–1.0) create the realistic vein/neuron look.
 */
function randomNeuralPath(rng: () => number): THREE.Vector3[] {
  const count  = 4 + Math.floor(rng() * 6);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const theta = rng() * Math.PI * 2;
    const phi   = Math.acos(2 * rng() - 1);
    const r     = BRAIN_RADIUS * (0.72 + rng() * 0.26); // biased to surface

    points.push(new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta) * 0.95,
      r * Math.sin(phi) * Math.sin(theta) * 0.88,
      r * Math.cos(phi),
    ));
  }

  return points;
}

/** Seeded pseudo-RNG — deterministic layout across renders */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ─── Component ──────────────────────────────────────────────────────── */

interface Props {
  className?: string;
}

export default function BrainCanvas({ className = '' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    /* ── Accessibility / performance guards ───────────────────────── */
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Low-performance mode: undefined/low core count → reduce geometry and DPR
    // Treat undefined concurrency as low-perf to be safe on unknown devices
    const isLowPerf = (navigator.hardwareConcurrency ?? 2) <= 4;

    /* ── Renderer ─────────────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: !isLowPerf,
      alpha:     true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPerf ? 1.5 : 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.7;
    el.appendChild(renderer.domElement);

    /* ── Scene ────────────────────────────────────────────────────── */
    const scene = new THREE.Scene();

    /* ── Camera ───────────────────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(
      38,
      el.clientWidth / el.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.1, 4.6);

    /* ── Lighting ─────────────────────────────────────────────────── */

    // Dark ambient keeps contrast high — contrast is key to the glow look
    const ambient = new THREE.AmbientLight(0x000c1e, 2.0);
    scene.add(ambient);

    // Key — strong blue from upper-front
    const keyLight = new THREE.PointLight(COL_BRIGHT_BLUE, 220, 28);
    keyLight.position.set(2, 3.5, 5);
    scene.add(keyLight);

    // Fill — cooler blue from the left
    const fillLight = new THREE.PointLight(COL_MID_BLUE, 90, 22);
    fillLight.position.set(-4, 1, 2);
    scene.add(fillLight);

    // Rim / back — creates the strong halo seen in the reference image
    const rimLight = new THREE.PointLight(COL_CYAN, 180, 22);
    rimLight.position.set(0, 2, -4.5);
    scene.add(rimLight);

    // Top accent — pure cyan
    const topLight = new THREE.PointLight(COL_BRIGHT_CYAN, 100, 20);
    topLight.position.set(0, 5.5, 0);
    scene.add(topLight);

    // Neural core glow — activated by scroll
    const coreLight = new THREE.PointLight(COL_BRIGHT_BLUE, 0, 9);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    /* ── Root group — scroll / mouse rotation applied here ────────── */
    const root = new THREE.Group();
    scene.add(root);

    /* ─────────────────────────────────────────────────────────────── *
     *  BRAIN CORE MESH                                                 *
     *  Dark, almost-black base — its depth/shading reveals the sulci   *
     * ─────────────────────────────────────────────────────────────── */
    const brainGeoHD = buildBrainGeometry(6); // high-detail solid
    const brainMat   = new THREE.MeshPhysicalMaterial({
      color:               0x000d22,
      roughness:           0.5,
      metalness:           0.08,
      emissive:            new THREE.Color(0x001555),
      emissiveIntensity:   1.0,
      clearcoat:           0.9,
      clearcoatRoughness:  0.18,
    });
    const brainMesh = new THREE.Mesh(brainGeoHD, brainMat);
    root.add(brainMesh);

    /* ─────────────────────────────────────────────────────────────── *
     *  WIREFRAME GLOW LAYERS — three concentric edge sets              *
     *  Together they simulate the bloom/glow of the reference image    *
     * ─────────────────────────────────────────────────────────────── */

    // Shared medium-detail geometry for edge extraction (cheaper than HD)
    const brainGeoMD = buildBrainGeometry(isLowPerf ? 2 : 4);
    // EdgesGeometry at 20° threshold: keeps only topology-defining edges
    const edgesBase  = new THREE.EdgesGeometry(brainGeoMD, 20);

    // Layer 1 — bright inner lines (scale 1.0, highest opacity)
    const wireMat1 = new THREE.LineBasicMaterial({
      color:       COL_BRIGHT_BLUE,
      transparent: true,
      opacity:     0.70,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    const wire1 = new THREE.LineSegments(edgesBase, wireMat1);
    root.add(wire1);

    // Layer 2 — mid glow ring (scale 1.012, cyan tint)
    const edgesGeo2 = edgesBase.clone();
    const wireMat2  = new THREE.LineBasicMaterial({
      color:       COL_CYAN,
      transparent: true,
      opacity:     0.28,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    const wire2 = new THREE.LineSegments(edgesGeo2, wireMat2);
    wire2.scale.setScalar(1.012);
    root.add(wire2);

    // Layer 3 — outermost soft haze (scale 1.028, deep blue)
    const edgesGeo3 = edgesBase.clone();
    const wireMat3  = new THREE.LineBasicMaterial({
      color:       COL_MID_BLUE,
      transparent: true,
      opacity:     0.13,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    const wire3 = new THREE.LineSegments(edgesGeo3, wireMat3);
    wire3.scale.setScalar(1.028);
    root.add(wire3);

    /* ─────────────────────────────────────────────────────────────── *
     *  NEURAL SURFACE PATHWAYS                                         *
     *  Glowing tubes biased near the brain surface (gyri trace)        *
     * ─────────────────────────────────────────────────────────────── */
    const rng       = seededRng(42);
    const pathCount = isLowPerf ? 65 : NEURAL_PATH_COUNT;

    interface NeuralPath {
      mesh:        THREE.Mesh;
      mat:         THREE.MeshBasicMaterial;
      phase:       number;
      speed:       number;
      baseOpacity: number; // pre-computed so RNG stays stable per-frame
    }

    const neuralPaths: NeuralPath[] = [];

    for (let i = 0; i < pathCount; i++) {
      const points = randomNeuralPath(rng);
      const curve  = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
      const radius = 0.006 + rng() * 0.009;
      const segs   = isLowPerf ? 8 : 12;

      const tubeGeo = new THREE.TubeGeometry(curve, segs, radius, 3, false);

      // Vary colour slightly between bright blue and bright cyan
      const col = new THREE.Color(COL_BRIGHT_BLUE).lerp(
        new THREE.Color(COL_BRIGHT_CYAN), rng(),
      );
      const baseOpacity = 0.14 + rng() * 0.22;

      const tubeMat = new THREE.MeshBasicMaterial({
        color:       col,
        transparent: true,
        opacity:     baseOpacity,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
      });

      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      root.add(tube);

      neuralPaths.push({
        mesh: tube,
        mat:  tubeMat,
        phase:       rng() * Math.PI * 2,
        speed:       0.5 + rng() * 1.3,
        baseOpacity,
      });
    }

    /* ─────────────────────────────────────────────────────────────── *
     *  AMBIENT PARTICLE FIELD                                          *
     *  Mix of surface-near and orbital particles                       *
     * ─────────────────────────────────────────────────────────────── */
    const pCount = isLowPerf ? 450 : PARTICLE_COUNT;
    const pRng   = seededRng(99);
    const pPos   = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const theta     = pRng() * Math.PI * 2;
      const phi       = Math.acos(2 * pRng() - 1);
      const onSurface = pRng() > 0.45;
      // 55% close to surface, 45% in wider orbit
      const r = onSurface
        ? BRAIN_RADIUS * (0.96 + pRng() * 0.22)
        : BRAIN_RADIUS * (1.35 + pRng() * 0.75);

      pPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta) * 0.95;
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.88;
      pPos[i * 3 + 2] = r * Math.cos(phi);
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const particleMat = new THREE.PointsMaterial({
      color:           COL_BRIGHT_CYAN,
      size:            0.016,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.55,
      blending:        THREE.AdditiveBlending,
      depthWrite:      false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    /* ─────────────────────────────────────────────────────────────── *
     *  VOLUMETRIC BLOOM PLANES — fake bloom without post-processing    *
     *  Concentric screen-aligned planes with additive blending create  *
     *  the soft radial glow seen around the brain in the reference.    *
     * ─────────────────────────────────────────────────────────────── */
    interface BloomItem {
      mesh: THREE.Mesh;
      mat:  THREE.MeshBasicMaterial;
      base: number;
    }
    const bloomItems: BloomItem[] = [];

    ([
      { size: 3.2, base: 0.07,  color: COL_BRIGHT_BLUE },
      { size: 4.8, base: 0.045, color: COL_MID_BLUE    },
      { size: 6.8, base: 0.025, color: COL_DEEP_BLUE   },
    ] as const).forEach(({ size, base, color }) => {
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
        color:       new THREE.Color(color),
        transparent: true,
        opacity:     base,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
        side:        THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = -1.4;
      scene.add(mesh);
      bloomItems.push({ mesh, mat, base });
    });

    /* ── Environment map ──────────────────────────────────────────── */
    const pmremGen   = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGen.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    /* ── Resize handler ───────────────────────────────────────────── */
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    /* ── Scroll-driven state (0 = top, 1 = hero fully scrolled) ──── */
    let scrollProgress = 0;
    const onScroll = () => {
      const heroH = el.getBoundingClientRect().height || window.innerHeight;
      scrollProgress = Math.min(window.scrollY / heroH, 1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ── Mouse-tracking tilt ──────────────────────────────────────── */
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      mouseY = ((e.clientY - rect.top ) / rect.height - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    /* ── Animation loop ───────────────────────────────────────────── */
    let frameId: number;
    let elapsed  = 0;
    let lastTime = 0;

    // Smoothed animation state
    let smoothRotX = 0;
    let smoothRotY = 0;
    let smoothAct  = 0;  // neural activation (0–1)
    let smoothPosX = 0;  // lateral offset for right-side positioning

    const animate = (now: number) => {
      frameId  = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      if (prefersReduced) {
        renderer.render(scene, camera);
        return;
      }

      /* ── Lateral offset — brain sits right of centre on desktop ── */
      const targetPosX = el.clientWidth > DESKTOP_BREAKPOINT_WIDTH ? 0.72 : 0.0;
      smoothPosX += (targetPosX - smoothPosX) * (1 - Math.exp(-dt * 3));
      root.position.x = smoothPosX;

      /* ── Rotation ─────────────────────────────────────────────── */
      const targetRotY = scrollProgress * Math.PI * 1.15 + mouseX * 0.20;
      const targetRotX = -scrollProgress * 0.26           + mouseY * -0.12;
      const swayY      = Math.sin(elapsed * 0.26) * 0.055;
      const swayX      = Math.cos(elapsed * 0.18) * 0.022;

      const k = 1 - Math.exp(-dt * 4);
      smoothRotY += (targetRotY + swayY - smoothRotY) * k;
      smoothRotX += (targetRotX + swayX - smoothRotX) * k;

      root.rotation.y = smoothRotY;
      root.rotation.x = smoothRotX;

      /* ── Neural activation driven by scroll ───────────────────── */
      const actTarget = Math.pow(scrollProgress, 0.5);
      smoothAct += (actTarget - smoothAct) * (1 - Math.exp(-dt * 3));

      // Rhythmic heartbeat-like pulse (always running)
      const pulse     = (Math.sin(elapsed * 1.9) * 0.5 + 0.5);
      const slowPulse = (Math.sin(elapsed * 0.65) * 0.5 + 0.5);

      /* ── Brain core emissive glow ─────────────────────────────── */
      brainMat.emissiveIntensity = 1.0 + smoothAct * 2.8 + pulse * 0.35;
      brainMat.emissive.setRGB(
        0.00 + smoothAct * 0.07,
        0.05 + smoothAct * 0.22 + pulse * 0.04,
        0.33 + smoothAct * 0.60 + pulse * 0.12,
      );

      /* ── Wireframe glow layers ────────────────────────────────── */
      wireMat1.opacity = 0.70 + smoothAct * 0.28 + pulse     * 0.14;
      wireMat2.opacity = 0.28 + smoothAct * 0.28 + slowPulse * 0.10;
      wireMat3.opacity = 0.13 + smoothAct * 0.18;

      /* ── Lighting surge on activation ────────────────────────── */
      keyLight.intensity  = 220 + smoothAct * 280 + pulse * 90;
      rimLight.intensity  = 180 + smoothAct * 200;
      topLight.intensity  = 100 + smoothAct * 120;
      coreLight.intensity = smoothAct * 70 + pulse * 25;

      /* ── Neural pathway pulses ────────────────────────────────── */
      neuralPaths.forEach((np, i) => {
        const threshold = i / neuralPaths.length;
        // Activation front sweeps through paths as scroll increases
        const pathAct = Math.max(0, (smoothAct + 0.35 - threshold * 0.55) * 2.2);
        const p       = (Math.sin(elapsed * np.speed + np.phase) + 1) * 0.5;
        np.mat.opacity = Math.min(
          np.baseOpacity + pathAct * (0.55 + p * 0.40),
          0.94,
        );
      });

      /* ── Particles ────────────────────────────────────────────── */
      particles.rotation.y = elapsed * 0.055;
      particles.rotation.x = elapsed * 0.020;
      particleMat.opacity  = 0.45 + smoothAct * 0.40 + slowPulse * 0.08;

      /* ── Bloom planes ─────────────────────────────────────────── */
      bloomItems.forEach((b) => {
        b.mat.opacity = b.base + smoothAct * 0.055 + slowPulse * 0.018;
      });

      /* ── Render ───────────────────────────────────────────────── */
      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    /* ── Cleanup ──────────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize',    onResize);
      window.removeEventListener('scroll',    onScroll);
      window.removeEventListener('mousemove', onMouseMove);

      // Dispose all Three.js GPU resources
      brainGeoHD.dispose();
      brainGeoMD.dispose();
      brainMat.dispose();
      edgesBase.dispose();
      edgesGeo2.dispose();
      edgesGeo3.dispose();
      wireMat1.dispose();
      wireMat2.dispose();
      wireMat3.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      neuralPaths.forEach((np) => {
        np.mesh.geometry.dispose();
        np.mat.dispose();
      });
      bloomItems.forEach((b) => {
        b.mesh.geometry.dispose();
        b.mat.dispose();
      });
      envTexture.dispose();
      pmremGen.dispose();
      renderer.dispose();

      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      aria-hidden="true"
    />
  );
}
