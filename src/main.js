import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let scene, camera, renderer, bgMaterial, clock = new THREE.Clock();
const lenis = new Lenis({ lerp: 0.08 });
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

async function init() {
  // --- THREE.JS SETUP ---
  scene = new THREE.Scene();
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(-30 * aspect, 30 * aspect, 30, -30, 0.1, 1000);
  camera.position.z = 100;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('hero').appendChild(renderer.domElement);

  bgMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBrightness: { value: 1.0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vPosition; void main() { vUv = uv; vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vPosition; uniform float uTime; uniform float uBrightness; void main() { vec2 lp = vec2(sin(uTime*0.5)*40.0, cos(uTime*0.8)*20.0); float d = distance(vPosition.xy, lp); float l = smoothstep(35.0, 0.0, d); float i = (l + 0.15 + vUv.y*0.1) * uBrightness; float w = clamp(uBrightness-1.5, 0.0, 1.0); gl_FragColor = vec4(mix(vec3(0.92, 0.95, 1.0)*i, vec3(1.0), w), 1.0); }`
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(300, 300), bgMaterial));

  const video = document.getElementById('gameplay-video');

  // CHAPTER 1: THE ZOOM
  gsap.timeline({
    scrollTrigger: {
      trigger: "#step-zoom", start: "top top", end: "+=1500", pin: true, scrub: 1,
      onLeave: () => gsap.set("#mask-container", { autoAlpha: 0 }),
      onEnterBack: () => gsap.set("#mask-container", { autoAlpha: 1 })
    }
  }).to("#mask-text-group", { scale: 300, transformOrigin: "50% 50%", duration: 1, ease: "power3.in" }, 0)
    .to("#black-wall", { opacity: 0, duration: 0.5 }, 0.5)
    .to(bgMaterial.uniforms.uBrightness, { value: 10.0, duration: 1 }, 0);

  // CHAPTER 2: NARRATIVE
  const narrTl = gsap.timeline({
    scrollTrigger: { trigger: "#step-narrative", start: "top top", end: "+=2500", pin: true, scrub: 1, snap: [0, 0.3, 0.6, 1] }
  });
  narrTl.to("#main-title h2, #main-title .divider", { opacity: 1, filter: "blur(0px)", y: 0, duration: 1 });
  document.querySelectorAll("#step-narrative .p-stage").forEach((p) => {
    narrTl.to(p, { autoAlpha: 1, duration: 1 }, "+=0.2").to(p.querySelector('p'), { filter: "blur(0px)", duration: 1 }, "-=1").to(p, { autoAlpha: 0, duration: 1 }, "+=1");
  });

  // CHAPTER 3: VIDEO (The "Exit Strategy" Fix)
  ScrollTrigger.create({
    trigger: "#step-video", start: "top top", end: "+=3000", pin: true, scrub: 1,
    onEnter: () => {
      gsap.to(".video-container", { x: 0, autoAlpha: 1, duration: 0.8 });
      gsap.to("#hero", { autoAlpha: 0 });
    },
    onLeaveBack: () => {
      // The crucial fix: Move video out and show hero again
      gsap.to(".video-container", { x: "100%", autoAlpha: 0, duration: 0.8 });
      gsap.to("#hero", { autoAlpha: 1 });
    },
    onUpdate: (self) => { if (video.duration) video.currentTime = video.duration * self.progress; }
  });

  // CHAPTER 4: THE SPIDER FOREST
  const finalTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#step-final",
      start: "top top",
      end: "+=4000", // Longer distance = slower, heavier scroll
      pin: true,
      scrub: 1,
      snap: [0.1, 0.5, 0.9], // Snaps to Paragraph 1, Paragraph 2, or Exit
      onEnter: () => {
        gsap.set(".video-container", { autoAlpha: 0 });
        gsap.to("#spider-bg", { autoAlpha: 1, duration: 1 });
      },
      onLeaveBack: () => {
        gsap.set(".video-container", { autoAlpha: 1 });
        gsap.to("#spider-bg", { autoAlpha: 0, duration: 0.5 });
      }
    }
  });

  // THE PARALLAX FIX: 
  // We use the total duration of the timeline to ensure the move spans the whole scroll.
  const totalSteps = 10; // We define a length for the background move

  finalTl.to("#spider-img", {
    yPercent: 20,      // Move the image down
    scale: 1.25,      // Loom closer
    ease: "none",
    duration: totalSteps // Stretch this move across the entire sequence
  }, 0);

  // Overlay the text fades on top of the moving background
  const finalParas = document.querySelectorAll("#step-final .p-stage");
  finalParas.forEach((p, i) => {
    // We calculate the start time based on the "totalSteps" duration
    const startTime = (totalSteps / finalParas.length) * i;

    finalTl.to(p, { autoAlpha: 1, duration: 2 }, startTime)
      .to(p.querySelector('p'), { filter: "blur(0px)", duration: 2 }, "-=2")
      .to(p, { autoAlpha: 0, duration: 2 }, "+=1.5");
  });

  function animate() {
    requestAnimationFrame(animate);
    bgMaterial.uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }
  animate();
}
init();