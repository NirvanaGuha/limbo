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

  // SHADER FIX: Re-introduced uRadius and uOffsetY to snuff out the light
  bgMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBrightness: { value: 1.0 },
      uRadius: { value: 35.0 },
      uOffsetY: { value: 0.0 }
    },
    vertexShader: `varying vec2 vUv; varying vec3 vPosition; void main() { vUv = uv; vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; 
      varying vec3 vPosition; 
      uniform float uTime; 
      uniform float uBrightness; 
      uniform float uRadius;
      uniform float uOffsetY;
      void main() { 
        // Light moves dynamically, factoring in uOffsetY
        vec2 lp = vec2(sin(uTime*0.5)*40.0, cos(uTime*0.8)*20.0 + uOffsetY); 
        float d = distance(vPosition.xy, lp); 
        // Radius controlled dynamically
        float l = smoothstep(uRadius, 0.0, d); 
        float i = (l + 0.15 + vUv.y*0.1) * uBrightness; 
        float w = clamp(uBrightness-1.5, 0.0, 1.0); 
        gl_FragColor = vec4(mix(vec3(0.92, 0.95, 1.0)*i, vec3(1.0), w), 1.0); 
      }`
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(300, 300), bgMaterial));

  const video = document.getElementById('gameplay-video');

  // --- THE MASTER PIN TIMELINE ---
  const masterTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#master-pin",
      start: "top top",
      end: "+=4500",
      pin: true,
      scrub: 1
    }
  });

  // 1. THE ZOOM (0 to 1)
  masterTl.to("#mask-text-group", {
    scale: 150,
    svgOrigin: "80 45", // THE FIX: Forces absolute SVG centering, bypassing CSS bugs.
    ease: "power2.in",
    duration: 1
  }, 0)
    .to(bgMaterial.uniforms.uBrightness, { value: 12.0, duration: 1 }, 0)
    .to("#mask-container", { autoAlpha: 0, duration: 0.1 }, 1);

  // 2. THE WHITE VOID (0.8 to 2.8)
  masterTl.to("#white-narrative h2, #white-narrative .divider", { opacity: 1, filter: "blur(0px)", duration: 0.5 }, 0.8);

  const whiteParas = document.querySelectorAll("#white-narrative .p-stage");
  masterTl.to(whiteParas[0], { autoAlpha: 1, duration: 0.5 }, 1.2)
    .to(whiteParas[0].querySelector('p'), { filter: "blur(0px)", duration: 0.5 }, 1.2)
    .to(whiteParas[0], { autoAlpha: 0, duration: 0.5 }, 2.0)

    .to(whiteParas[1], { autoAlpha: 1, duration: 0.5 }, 2.0)
    .to(whiteParas[1].querySelector('p'), { filter: "blur(0px)", duration: 0.5 }, 2.0)
    .to(whiteParas[1], { autoAlpha: 0, duration: 0.5 }, 2.8);

  // 3. FADE TO SHADOW & KILL LIGHT (2.8 to 3.2)
  // THE FIX: Animate radius to 0 and shift it offscreen to instantly kill the "dancing"
  masterTl.to(bgMaterial.uniforms.uBrightness, { value: 0.0, duration: 0.4, ease: "power2.inOut" }, 2.8)
    .to(bgMaterial.uniforms.uOffsetY, { value: 100.0, duration: 0.4 }, 2.8) // Push light up
    .to(bgMaterial.uniforms.uRadius, { value: 0.0, duration: 0.4 }, 2.8)    // Shrink light to zero
    .to("#white-narrative", { autoAlpha: 0, duration: 0.1 }, 3.0)
    .to(renderer.domElement, { autoAlpha: 0, duration: 0.1 }, 3.2); // HARD KILL ThreeJS Canvas

  // 4. THE SHADOW NARRATIVE (3.2 to 4.5)
  masterTl.to("#shadow-narrative", { autoAlpha: 1, duration: 0.1 }, 3.2)
    .to("#shadow-narrative h2, #shadow-narrative .divider", { opacity: 1, filter: "blur(0px)", duration: 0.5 }, 3.2);

  const shadowParas = document.querySelectorAll("#shadow-narrative .p-stage");
  masterTl.fromTo(shadowParas[0], { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, 3.5)
    .to(shadowParas[0].querySelector('p'), { filter: "blur(0px)", duration: 0.5 }, 3.5)
    .to(shadowParas[0], { autoAlpha: 0, duration: 0.5 }, 4.2)
    .to("#shadow-narrative h2, #shadow-narrative .divider", { opacity: 0, duration: 0.5 }, 4.2);

  // --- SCENE 4: VIDEO ---
  ScrollTrigger.create({
    trigger: "#step-video", start: "top top", end: "+=2000", pin: true, scrub: 1,
    onEnter: () => gsap.to(".video-container", { autoAlpha: 1, duration: 0.5 }),
    onLeaveBack: () => gsap.to(".video-container", { autoAlpha: 0, duration: 0.5 }),
    onUpdate: (self) => { if (video.duration) video.currentTime = video.duration * self.progress; }
  });

  // --- SCENE 5: SPIDER ---
  const finalTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#step-final", start: "top top", end: "+=3000", pin: true, scrub: 1,
      onEnter: () => { gsap.set(".video-container", { autoAlpha: 0 }); gsap.to("#spider-bg", { opacity: 1, duration: 1 }); },
      onLeaveBack: () => { gsap.set(".video-container", { autoAlpha: 1 }); gsap.to("#spider-bg", { opacity: 0, duration: 0.5 }); }
    }
  });
  finalTl.to("#spider-img", { yPercent: 15, scale: 1.1, ease: "none", duration: 10 }, 0);
  document.querySelectorAll("#step-final .p-stage").forEach((p, i) => {
    finalTl.to(p, { autoAlpha: 1, duration: 2 }, (10 / 2) * i)
      .to(p.querySelector('p'), { filter: "blur(0px)", duration: 2 }, "-=2")
      .to(p, { autoAlpha: 0, duration: 2 }, "+=1");
  });

  function animate() {
    requestAnimationFrame(animate);
    bgMaterial.uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }
  animate();
}
init();