import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let scene, camera, renderer, bgMaterial, clock = new THREE.Clock();
const lenis = new Lenis({ lerp: 0.08 });

// 1. Tell Lenis to trigger GSAP's scroll math every time it moves
lenis.on('scroll', ScrollTrigger.update);

// 2. Add Lenis's requestAnimationFrame to GSAP's internal ticker
gsap.ticker.add((time) => {
  lenis.raf(time * 1000); // GSAP runs in seconds, Lenis needs milliseconds
});

// 3. Prevent GSAP from trying to "catch up" on missed frames, which causes lag
gsap.ticker.lagSmoothing(0);

async function init() {
  scene = new THREE.Scene();
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(-30 * aspect, 30 * aspect, 30, -30, 0.1, 1000);
  camera.position.z = 100;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('hero').appendChild(renderer.domElement);

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
        vec2 lp = vec2(sin(uTime*0.5)*40.0, cos(uTime*0.8)*20.0 + uOffsetY); 
        float d = distance(vPosition.xy, lp); 
        float l = smoothstep(uRadius, 0.0, d); 
        float i = (l + 0.15 + vUv.y*0.1) * uBrightness; 
        float w = clamp(uBrightness-1.5, 0.0, 1.0); 
        gl_FragColor = vec4(mix(vec3(0.92, 0.95, 1.0)*i, vec3(1.0), w), 1.0); 
      }`
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(300, 300), bgMaterial));

  // --- PRELOADER LOGIC ---
  const preloader = document.getElementById('preloader');
  const progressLine = document.querySelector('.preloader-progress');

  // 1. Lock the scroll wheel immediately
  lenis.stop();

  // 2. Simulate progress while the network works in the background
  let loadAmount = 0;
  const loadInterval = setInterval(() => {
    loadAmount += Math.random() * 15;
    if (loadAmount > 90) loadAmount = 90; // Hold at 90% until truly fully loaded
    progressLine.style.width = `${loadAmount}%`;
  }, 100);

  // 3. Listen for the browser's absolute confirmation that all assets are ready
  window.addEventListener('load', () => {
    clearInterval(loadInterval);
    progressLine.style.width = '100%'; // Snap to 100%

    // Wait a tiny fraction of a second so the user registers the 100%, then fade out
    setTimeout(() => {
      preloader.classList.add('hidden');
      lenis.start(); // Unlock the scroll wheel
      ScrollTrigger.refresh(); // Tell GSAP to recalculate everything now that images are loaded
    }, 600);
  });

  // --- CUSTOM CURSOR LOGIC ---
  const cursor = document.getElementById('custom-cursor');

  // Use GSAP's optimized quickTo for buttery smooth 60fps tracking
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.1, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.1, ease: "power3" });

  // Track mouse movement
  window.addEventListener("mousemove", (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });

  // Find all clickable elements (buttons and links)
  const interactables = document.querySelectorAll('button, a, .nav-link');

  // Add the expanding ring effect when hovering over them
  interactables.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover-active'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover-active'));
  });

  // --- AUDIO LOGIC ---
  const audioBtn = document.getElementById('audio-btn');
  const ambientAudio = document.getElementById('ambient-audio');
  const iconMuted = document.getElementById('audio-icon-muted');
  const iconPlaying = document.getElementById('audio-icon-playing');
  let isPlaying = false;

  audioBtn.addEventListener('click', () => {
    if (isPlaying) {
      ambientAudio.pause();
      iconPlaying.style.display = 'none';
      iconMuted.style.display = 'block';
    } else {
      ambientAudio.play();
      iconMuted.style.display = 'none';
      iconPlaying.style.display = 'block';
    }
    isPlaying = !isPlaying;
  });

  // --- MODAL SUB-MENU LOGIC ---
  const modals = {
    portals: document.getElementById('modal-portals'),
    soundscape: document.getElementById('modal-soundscape')
  };

  const openModal = (id) => {
    if (modals[id]) {
      modals[id].classList.add('active');
      lenis.stop(); // Pause smooth scrolling while modal is open
    }
  };

  const closeModal = () => {
    Object.values(modals).forEach(m => m && m.classList.remove('active'));
    lenis.start(); // Resume smooth scrolling
  };

  // Outro Buttons
  const btnPortals = document.getElementById('btn-portals');
  const btnSoundscape = document.getElementById('btn-soundscape');
  if (btnPortals) btnPortals.addEventListener('click', () => openModal('portals'));
  if (btnSoundscape) btnSoundscape.addEventListener('click', () => openModal('soundscape'));

  // Global Action Buttons
  const globalPortals = document.getElementById('global-portals');
  const globalSoundscape = document.getElementById('global-soundscape');
  if (globalPortals) globalPortals.addEventListener('click', () => openModal('portals'));
  if (globalSoundscape) globalSoundscape.addEventListener('click', () => openModal('soundscape'));

  // Close Modals (clicking close button or background)
  document.querySelectorAll('.link-modal, .modal-close').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('link-modal') || e.target.classList.contains('modal-close')) {
        closeModal();
      }
    });
  });

  const video = document.getElementById('gameplay-video');

  // --- SCENE 1, 2, 3: MASTER PIN ---
  const masterTl = gsap.timeline({
    scrollTrigger: { trigger: "#master-pin", start: "top top", end: "+=4500", pin: true, scrub: 1 }
  });

  masterTl.to("#mask-text-group", { scale: 150, svgOrigin: "80 45", ease: "power2.in", duration: 1 }, 0)
    .to(bgMaterial.uniforms.uBrightness, { value: 12.0, duration: 1 }, 0)
    .to("#mask-container", { autoAlpha: 0, duration: 0.1 }, 1);

  masterTl.to("#white-narrative h2, #white-narrative .divider", { opacity: 1, filter: "blur(0px)", duration: 0.5 }, 0.8);

  const whiteParas = document.querySelectorAll("#white-narrative .p-stage");
  masterTl.to(whiteParas[0], { autoAlpha: 1, duration: 0.5 }, 1.2)
    .to(whiteParas[0].querySelector('p'), { filter: "blur(0px)", duration: 0.5 }, 1.2)
    .to(whiteParas[0], { autoAlpha: 0, duration: 0.5 }, 2.0)
    .to(whiteParas[1], { autoAlpha: 1, duration: 0.5 }, 2.0)
    .to(whiteParas[1].querySelector('p'), { filter: "blur(0px)", duration: 0.5 }, 2.0)
    .to(whiteParas[1], { autoAlpha: 0, duration: 0.5 }, 2.8);

  masterTl.to(bgMaterial.uniforms.uBrightness, { value: 0.0, duration: 0.4, ease: "power2.inOut" }, 2.8)
    .to(bgMaterial.uniforms.uOffsetY, { value: 100.0, duration: 0.4 }, 2.8)
    .to(bgMaterial.uniforms.uRadius, { value: 0.0, duration: 0.4 }, 2.8)
    .to("#white-narrative", { autoAlpha: 0, duration: 0.1 }, 3.0)
    .to(renderer.domElement, { autoAlpha: 0, duration: 0.1 }, 3.2);

  masterTl.to("#shadow-narrative", { autoAlpha: 1, duration: 0.1 }, 3.2)
    .to("#shadow-narrative h2, #shadow-narrative .divider", { opacity: 1, filter: "blur(0px)", duration: 0.5 }, 3.2);

  const shadowParas = document.querySelectorAll("#shadow-narrative .p-stage");
  masterTl.fromTo(shadowParas[0], { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, 3.5)
    .to(shadowParas[0].querySelector('p'), { filter: "blur(0px)", duration: 0.5 }, 3.5)
    .to(shadowParas[0], { autoAlpha: 0, duration: 0.5 }, 4.2)
    .to("#shadow-narrative h2, #shadow-narrative .divider", { opacity: 0, duration: 0.5 }, 4.2);

  // --- SCENE 4: VIDEO ---
  const videoTrigger = ScrollTrigger.create({
    trigger: "#step-video", start: "top top", end: "+=2000", pin: true, scrub: 1,
    onEnter: () => gsap.to(".video-container", { autoAlpha: 1, duration: 0.5 }),
    onLeave: () => gsap.to(".video-container", { autoAlpha: 0, duration: 0.5 }),
    onEnterBack: () => gsap.to(".video-container", { autoAlpha: 1, duration: 0.5 }),
    onLeaveBack: () => gsap.to(".video-container", { autoAlpha: 0, duration: 0.5 }),
    onUpdate: (self) => { if (video.duration) video.currentTime = video.duration * self.progress; }
  });

  // --- SCENE 4.5: POST-VIDEO ---
  const postVideoTl = gsap.timeline({
    scrollTrigger: { trigger: "#step-post-video", start: "top top", end: "+=1500", pin: true, scrub: true }
  });
  postVideoTl.to("#step-post-video h2, #step-post-video .divider", { opacity: 1, filter: "blur(0px)", duration: 0.5 }, 0.2);
  const postParas = document.querySelectorAll("#step-post-video .p-stage");
  if (postParas.length > 0) {
    postVideoTl.fromTo(postParas[0], { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, 0.5)
      .to(postParas[0].querySelector('p'), { filter: "blur(0px)", duration: 0.5 }, 0.5)
      .to(postParas[0], { autoAlpha: 0, duration: 0.5 }, 1.2);
    if (postParas.length > 1) {
      postVideoTl.fromTo(postParas[1], { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, 1.2)
        .to(postParas[1].querySelector('p'), { filter: "blur(0px)", duration: 0.5 }, 1.2)
        .to(postParas[1], { autoAlpha: 0, duration: 0.5 }, 1.9);
    }
    postVideoTl.to("#step-post-video h2, #step-post-video .divider", { opacity: 0, duration: 0.5 }, 2.0);
  }

  // --- SCENE 5: SPIDER ---
  const finalTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#step-final", start: "top top", end: "+=3000", pin: true, scrub: 1,
      onEnter: () => { gsap.set(".video-container", { autoAlpha: 0 }); gsap.to("#spider-bg", { opacity: 1, duration: 0.1 }); },
      onLeaveBack: () => { gsap.set(".video-container", { autoAlpha: 1 }); gsap.to("#spider-bg", { opacity: 0, duration: 0.5 }); }
    }
  });
  finalTl.to("#spider-img", { filter: "blur(0px) brightness(0.5) grayscale(100%)", duration: 3 }, 0);
  finalTl.to("#spider-img", { yPercent: 15, scale: 1.1, ease: "none", duration: 10 }, 0);
  document.querySelectorAll("#step-final .p-stage").forEach((p, i) => {
    finalTl.to(p, { autoAlpha: 1, duration: 2 }, (10 / 2) * i)
      .to(p.querySelector('p'), { filter: "blur(0px)", duration: 2 }, "-=2")
      .to(p, { autoAlpha: 0, duration: 2 }, "+=1");
  });

  // --- SCENE 6: OUTRO & CUE HIDING ---
  const outroTrigger = ScrollTrigger.create({
    trigger: "#step-outro", start: "top 60%",
    onEnter: () => {
      gsap.fromTo(".outro-content", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power2.out" });
      gsap.to("#scroll-cue", { autoAlpha: 0, duration: 0.5 });
    },
    onLeaveBack: () => {
      gsap.to(".outro-content", { autoAlpha: 0, y: 40, duration: 0.5 });
      gsap.to("#scroll-cue", { autoAlpha: 1, duration: 0.5 });
    }
  });

  // --- MENU NAVIGATION LOGIC (SAFELY AT THE BOTTOM) ---
  const menuBtn = document.getElementById('menu-btn');
  const fullMenu = document.getElementById('full-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  menuBtn.addEventListener('click', () => {
    menuBtn.classList.toggle('open');
    fullMenu.classList.toggle('active');
  });

  const triggerMap = {
    '#master-pin': masterTl.scrollTrigger,
    '#step-video': videoTrigger,
    '#step-post-video': postVideoTl.scrollTrigger,
    '#step-final': finalTl.scrollTrigger,
    '#step-outro': outroTrigger
  };

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = e.target.getAttribute('data-target');

      menuBtn.classList.remove('open');
      fullMenu.classList.remove('active');

      ScrollTrigger.refresh();
      const trigger = triggerMap[targetId];
      const scrollTarget = trigger ? trigger.start : targetId;

      lenis.scrollTo(scrollTarget, { duration: 2, ease: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    });
  });

  function animate() {
    requestAnimationFrame(animate);
    bgMaterial.uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }
  animate();
}
init();