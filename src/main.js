import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

gsap.registerPlugin(ScrollTrigger);

// 1. GLOBAL VARIABLES
let scene, camera, renderer, material, bgMaterial, mesh, clock;
clock = new THREE.Clock();

// 2. SHADERS (Positioning and Lighting logic)
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uBrightness;

  void main() {
    // Spotlight position drifting in the void
    vec2 lightPos = vec2(sin(uTime * 0.5) * 40.0, cos(uTime * 0.8) * 20.0);
    float dist = distance(vPosition.xy, lightPos);
    float light = smoothstep(35.0, 0.0, dist);
    
    // Base visuals (Ambient + Vertical Sheen)
    float intensity = (light + 0.15 + vUv.y * 0.1) * uBrightness;
    
    // Blinding white-out logic (Mixes spotlight into pure white)
    float wash = clamp(uBrightness - 1.5, 0.0, 1.0);
    vec3 baseColor = vec3(0.92, 0.95, 1.0); 
    vec3 finalColor = mix(baseColor * intensity, vec3(1.0), wash);
    
    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
  }
`;

// 3. LENIS SETUP (Aggressive Scroll)
const lenis = new Lenis({
  lerp: 0.1,
  wheelMultiplier: 1.2, // Increases scroll speed per flick
  normalizeWheel: true,
  smoothWheel: true,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // 4. ORTHOGRAPHIC CAMERA (The "Flat" Lens)
  const aspect = window.innerWidth / window.innerHeight;
  const d = 30; // Viewport size
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
  camera.position.set(0, 0, 100);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('hero').appendChild(renderer.domElement);

  // 5. BACKGROUND PLANE (The world on the other side)
  bgMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBrightness: { value: 0.0 } },
    vertexShader,
    fragmentShader,
  });
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), bgMaterial);
  bgMesh.position.z = -50; 
  scene.add(bgMesh);

  const fontLoader = new FontLoader();
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
    
    // Create Flat 2D Shape Text
    const shapes = font.generateShapes('LIMBO', 15);
    const geometry = new THREE.ShapeGeometry(shapes);
    geometry.center(); 

    material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uBrightness: { value: 1.0 } },
      vertexShader,
      fragmentShader
    });

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 6. THE AGGRESSIVE TIMELINE (The 2-Scroll Journey)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5, // Tight response to the wheel
      }
    });

    // BEAT 1: The Exponential Zoom
    tl.to(mesh.scale, { 
      x: 600, 
      y: 600, 
      ease: "power4.in", // Fast explosion through the screen
      duration: 2 
    }, 0)

    // BEAT 2: The White-Out Flash
    .to(bgMaterial.uniforms.uBrightness, { 
      value: 15.0, 
      ease: "power2.out",
      duration: 1.5
    }, 0.5) // Overlaps with the zoom

    // BEAT 3: The Cinematic Reveal
    // 1. First, make the container visible
    tl.to(".content-wrapper", {
      autoAlpha: 1,
      duration: 2,
    }, "-=0.2")

    // 2. The Fog Lift (Staggered)
    // We target the children directly to clear the blur and the Y-position
    .to(".content-wrapper h2, .divider, .content-wrapper p", {
      filter: "blur(0px)",
      y: 0,
      opacity: 1,
      stagger: 0.4,      // Each element clears its fog 0.2s after the last
      duration: 2,
      ease: "sine.inOut"
    }, "+=0.5"); // Starts slightly before the container is fully opaque
  });

  window.addEventListener('resize', onWindowResize);
  animate();
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const d = 30;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.top = d;
  camera.bottom = -d;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  if (material) material.uniforms.uTime.value = time;
  if (bgMaterial) bgMaterial.uniforms.uTime.value = time;
  renderer.render(scene, camera);
}

init();