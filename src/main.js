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

  // --- CHAPTER 1, 2, & 2.5: THE LUMINANCE BRIDGE TIMELINE ---
  const introTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#intro-wrap", start: "top top", end: "+=4500", pin: true, scrub: 0.1,
      onLeave: () => gsap.set("#mask-container", { autoAlpha: 0 }),
      onEnterBack: () => gsap.set("#mask-container", { autoAlpha: 1 })
    }
  });

  // 1. ZOOM & BRIGHTEN
  introTl
    .to("#mask-text-group", { scale: 400, transformOrigin: "50% 50%", duration: 1.5, ease: "power2.in" }, 0)
    .to("#black-wall", { opacity: 0, duration: 0.8 }, 0.4)
    .to(bgMaterial.uniforms.uBrightness, { value: 12.0, duration: 1 }, 0);

  // 2. WHITE VOID NARRATIVE
  introTl.to("#step-narrative h2, #step-narrative .divider", { opacity: 1, filter: "blur(0px)", duration: 1.2 }, 1.1);
  document.querySelectorAll("#step-narrative .p-stage").forEach((p, i) => {
    introTl.to(p, { autoAlpha: 1, duration: 1.2 }, `+=${i === 0 ? 0.2 : 0.5}`)
      .to(p.querySelector('p'), { filter: "blur(0px)", duration: 1.2 }, "-=1.2")
      .to(p, { autoAlpha: 0, y: -40, duration: 1.2 }, "+=1"); // Float Up & Out
  });

  // 3. THE BRIDGE: RAMP DOWN BRIGHTNESS
  introTl.to(bgMaterial.uniforms.uBrightness, { value: 0.0, duration: 1.5 }, ">-0.5");

  // 4. SHADOW BRIDGE NARRATIVE
  introTl.to("#step-shadow h2, #step-shadow .divider", { opacity: 1, filter: "blur(0px)", duration: 1.2 }, ">-0.5");
  document.querySelectorAll("#step-shadow .p-stage").forEach((p) => {
    introTl.fromTo(p, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2 }) // Float Up & In
      .to(p.querySelector('p'), { filter: "blur(0px)", duration: 1.2 }, "-=1.2")
      .to(p, { autoAlpha: 0, duration: 1.2 }, "+=1.5");
  });

  // --- CHAPTER 3: VIDEO (Fade Entrance) ---
  ScrollTrigger.create({
    trigger: "#step-video", start: "top top", end: "+=3000", pin: true, scrub: 1,
    onEnter: () => {
      // Fade in video container (already at x:0) and turn off shader
      gsap.fromTo(".video-container", { autoAlpha: 0, x: 0 }, { autoAlpha: 1, duration: 1.2 });
      gsap.to("#hero", { autoAlpha: 0 });
    },
    onLeaveBack: () => {
      gsap.to(".video-container", { autoAlpha: 0, duration: 0.8 });
      gsap.to("#hero", { autoAlpha: 1 });
    },
    onUpdate: (self) => { if (video.duration) video.currentTime = video.duration * self.progress; }
  });

  // --- CHAPTER 4: SPIDER FOREST ---
  const finalTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#step-final", start: "top top", end: "+=3500", pin: true, scrub: 1,
      onEnter: () => { gsap.set(".video-container", { autoAlpha: 0 }); gsap.to("#spider-bg", { autoAlpha: 1, duration: 1 }); },
      onLeaveBack: () => { gsap.set(".video-container", { autoAlpha: 1 }); gsap.to("#spider-bg", { autoAlpha: 0 }); }
    }
  });

  finalTl.to("#spider-img", { yPercent: 20, scale: 1.3, ease: "none", duration: 10 }, 0);
  document.querySelectorAll("#step-final .p-stage").forEach((p, i) => {
    const startTime = (10 / 2) * i;
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