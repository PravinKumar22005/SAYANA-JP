import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth';
import OurApp from './pages/our';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Global Styles Component (from Morphing Background) ---
// Injects all the CSS from the original <style> tag into the document head
const GlobalStyles = () => {
    const css = `
        *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: "Inter", sans-serif;
            overflow: hidden;
            background: #040307;  
            background-image:
                radial-gradient(circle at 50% 35%, #1d1431 0%, transparent 65%),
                linear-gradient(180deg, #000000 0%, #070012 100%);
            color: #eee;
        }
        #container {
            position: fixed;
            inset: 0;
            z-index: 0; /* Background layer */
        }
        .vignette {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 9;
            background: radial-gradient(circle at center, rgba(0,0,0,0) 65%, rgba(0,0,0,.5) 100%);
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        /* --- NEW CSS FOR CARD STREAM --- */

        .card-stream-section {
            position: relative;
            width: 100%;
            height: 100vh; /* Give it a full viewport height to contain its elements */
            overflow: hidden;
            display: flex;
            flex-direction: column; /* Stack header and stream vertically */
            align-items: center;
            justify-content: center; /* Center the whole block vertically */
            padding: 2rem 0; /* Add some vertical padding */
        }

        /* REMOVED .controls, .control-btn, .control-btn:hover */

        /* REMOVED .speed-indicator */

        .card-stream-container {
            position: relative;
            width: 100vw;
            /* height: 100vh; */ /* <-- REMOVED this, it was pushing the layout */
            height: 400px; /* <-- ADDED fixed height for the stream area */
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: -2rem; /* <-- ADDED to pull stream closer to header */
        }

        .card-stream {
            position: absolute;
            width: 100vw;
            height: 180px;
            display: flex;
            align-items: center;
            overflow: visible;
        }

        .card-line {
            display: flex;
            align-items: center;
            gap: 60px;
            white-space: nowrap;
            cursor: grab;
            user-select: none;
            will-change: transform;
        }

        .card-line:active {
            cursor: grabbing;
        }

        .card-line.dragging {
            cursor: grabbing;
        }

        .card-line.css-animated {
            animation: scrollCards 40s linear infinite;
        }

        @keyframes scrollCards {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(100vw);
            }
        }

        .card-wrapper {
            position: relative;
            width: 400px;
            height: 250px;
            flex-shrink: 0;
        }

        .card {
            position: absolute;
            top: 0;
            left: 0;
            width: 400px;
            height: 250px;
            border-radius: 15px;
            overflow: hidden;
        }

        .card-normal {
            background: transparent;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 0;
            color: white;
            z-index: 2;
            position: relative;
            overflow: hidden;
        }

        .card-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 15px;
            transition: all 0.3s ease;
            filter: brightness(1.1) contrast(1.1);
            box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .card-image:hover {
            filter: brightness(1.2) contrast(1.2);
        }

        .card-ascii {
            background: transparent;
            z-index: 1;
            position: absolute;
            top: 0;
            left: 0;
            width: 400px;
            height: 250px;
            border-radius: 15px;
            overflow: hidden;
        }
        
        /* Removed .card-chip, .contactless, .card-number, .card-info, .card-logo as they weren't in the card-image HTML */

        .ascii-content {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            color: rgba(220, 210, 255, 0.6);
            font-family: "Courier New", monospace;
            font-size: 11px;
            line-height: 13px;
            overflow: hidden;
            white-space: pre;
            clip-path: inset(0 calc(100% - var(--clip-left, 0%)) 0 0);
            animation: glitch 0.1s infinite linear alternate-reverse;
            margin: 0;
            padding: 0;
            text-align: left;
            vertical-align: top;
            box-sizing: border-box;
            -webkit-mask-image: linear-gradient(
                to right,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 0.8) 30%,
                rgba(0, 0, 0, 0.6) 50%,
                rgba(0, 0, 0, 0.4) 80%,
                rgba(0, 0, 0, 0.2) 100%
            );
            mask-image: linear-gradient(
                to right,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 0.8) 30%,
                rgba(0, 0, 0, 0.6) 50%,
                rgba(0, 0, 0, 0.4) 80%,
                rgba(0, 0, 0, 0.2) 100%
            );
        }

        @keyframes glitch {
            0% {
                opacity: 1;
            }
            15% {
                opacity: 0.9;
            }
            16% {
                opacity: 1;
            }
            49% {
                opacity: 0.8;
            }
            50% {
                opacity: 1;
            }
            99% {
                opacity: 0.9;
            }
            100% {
                opacity: 1;
            }
        }

        .scanner {
            display: none; /* This was in the original CSS, kept it */
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 4px;
            height: 300px;
            border-radius: 30px;
            background: linear-gradient(
                to bottom,
                transparent,
                rgba(192, 132, 252, 0.8), /* Re-themed to purple */
                rgba(192, 132, 252, 1),   /* Re-themed to purple */
                rgba(192, 132, 252, 0.8), /* Re-themed to purple */
                transparent
            );
            box-shadow: 0 0 20px rgba(192, 132, 252, 0.8), 0 0 40px rgba(192, 132, 252, 0.4); /* Re-themed */
            animation: scanPulse 2s ease-in-out infinite alternate;
            z-index: 10;
        }

        @keyframes scanPulse {
            0% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scaleY(1);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) scaleY(1.1);
            }
        }
        
        .card-normal {
            clip-path: inset(0 0 0 var(--clip-right, 0%));
        }

        .card-ascii {
            clip-path: inset(0 calc(100% - var(--clip-left, 0%)) 0 0);
        }

        .scan-effect {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(192, 132, 252, 0.4), /* Re-themed to purple */
                transparent
            );
            animation: scanEffect 0.6s ease-out;
            pointer-events: none;
            z-index: 5;
        }

        @keyframes scanEffect {
            0% {
                transform: translateX(-100%);
                opacity: 0;
            }
            50% {
                opacity: 1;
            }
            100% {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        #particleCanvas {
            position: absolute;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            width: 100vw;
            height: 250px;
            z-index: 0;
            pointer-events: none;
        }

        #scannerCanvas {
            position: absolute;
            top: 50%;
            left: -3px; /* Original value */
            transform: translateY(-50%);
            width: 100vw;
            height: 300px;
            z-index: 15;
            pointer-events: none;
        }

        /* REMOVED .inspiration-credit styles */
        /* FAQ card styles: each question gets its own blurred/glass background */
        .faq-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
          backdrop-filter: blur(8px) saturate(120%);
          -webkit-backdrop-filter: blur(8px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 6px 24px rgba(2,6,23,0.6);
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 16px;
        }
        .faq-card .faq-question-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: transparent;
          border: none;
          padding: 0;
          color: inherit;
          cursor: pointer;
        }
        .faq-card h3 {
          font-size: 1.05rem;
          margin: 0;
          color: #fff;
        }
        .faq-card p {
          margin: 0;
          color: rgba(255,255,255,0.85);
        }
    `;
    return <style>{css}</style>;
};

// --- Morphing Background Component ---
const MorphingBackground = () => {
    const containerRef = useRef(null);
    const animationFrameId = useRef(null);
    
    // THIS WAS MISSING
    const threeState = useRef({
        scene: null,
        camera: null,
        renderer: null,
        composer: null,
        controls: null,
        particles: null,
        sparkles: null,
        stars: null,
        clock: new THREE.Clock(),
        currentPattern: 0,
        isTrans: false,
        prog: 0,
        lastMorphTime: 0,
    });
    
    // ... (rest of MorphingBackground component is unchanged) ...
    // ... [Immersive content redacted for brevity.] ...

    useEffect(() => {
        // --- Constants ---
        const PARTICLE_COUNT = 15000;
        const SPARK_COUNT = 2000;
        const STAR_COUNT = 7000;
        const morphSpeed = .03;
        const morphInterval = 5; // Morph every 5 seconds

        // --- Helper Functions ---
        const normalise = (points, size) => {
            if (points.length === 0) return [];
            const box = new THREE.Box3().setFromPoints(points);
            const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray()) || 1;
            const centre = box.getCenter(new THREE.Vector3());
            return points.map(p => p.clone().sub(centre).multiplyScalar(size / maxDim));
        };

        const torusKnot = (n) => {
            const geometry = new THREE.TorusKnotGeometry(10, 3, 200, 16, 2, 3);
            const points = [];
            const positionAttribute = geometry.attributes.position;
            for (let i = 0; i < positionAttribute.count; i++) {
                points.push(new THREE.Vector3().fromBufferAttribute(positionAttribute, i));
            }
            const result = [];
            for (let i = 0; i < n; i++) {
                result.push(points[i % points.length].clone());
            }
            return normalise(result, 50);
        };

        const halvorsen = (n) => {
            const pts = [];
            let x = 0.1, y = 0, z = 0;
            const a = 1.89;
            const dt = 0.005;
            for (let i = 0; i < n * 25; i++) {
                const dx = -a * x - 4 * y - 4 * z - y * y;
                const dy = -a * y - 4 * z - 4 * x - z * z;
                const dz = -a * z - 4 * x - 4 * y - x * x;
                x += dx * dt;
                y += dy * dt;
                z += dz * dt;
                if (i > 200 && i % 25 === 0) {
                    pts.push(new THREE.Vector3(x, y, z));
                }
                if (pts.length >= n) break;
            }
            while(pts.length < n) pts.push(pts[Math.floor(Math.random()*pts.length)].clone());
            return normalise(pts, 60);
        };

        const dualHelix = (n) => {
            const pts = [];
            const turns = 5;
            const radius = 15;
            const height = 40;
            for (let i = 0; i < n; i++) {
                const isSecondHelix = i % 2 === 0;
                const angle = (i / n) * Math.PI * 2 * turns;
                const y = (i / n) * height - height / 2;
                const r = radius + (isSecondHelix ? 5 : -5);
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                pts.push(new THREE.Vector3(x, y, z));
            }
            return normalise(pts, 60);
        };

        const deJong = (n) => {
            const pts = [];
            let x = 0.1, y = 0.1;
            const a = 1.4, b = -2.3, c = 2.4, d = -2.1;
            for (let i = 0; i < n; i++) {
                const xn = Math.sin(a * y) - Math.cos(b * x);
                const yn = Math.sin(c * x) - Math.cos(d * y);
                x = xn;
                y = yn;
                const z = Math.sin(x * y * 0.5);
                pts.push(new THREE.Vector3(x, y, z));
            }
            return normalise(pts, 55);
        };

        const PATTERNS = [torusKnot, halvorsen, dualHelix, deJong];

        const createStars = () => {
            const geo=new THREE.BufferGeometry();const pos=new Float32Array(STAR_COUNT*3);const col=new Float32Array(STAR_COUNT*3);const size=new Float32Array(STAR_COUNT);const rnd=new Float32Array(STAR_COUNT);const R=900;for(let i=0;i<STAR_COUNT;i++){const i3=i*3,θ=Math.random()*2*Math.PI,φ=Math.acos(2*Math.random()-1),r=R*Math.cbrt(Math.random());pos[i3]=r*Math.sin(φ)*Math.cos(θ);pos[i3+1]=r*Math.sin(φ)*Math.sin(θ);pos[i3+2]=r*Math.cos(φ);const c=new THREE.Color().setHSL(Math.random()*.6,.3+.3*Math.random(),.55+.35*Math.random());col[i3]=c.r;col[i3+1]=c.g;col[i3+2]=c.b;size[i]=.25+Math.pow(Math.random(),4)*2.1;rnd[i]=Math.random()*Math.PI*2}geo.setAttribute("position",new THREE.BufferAttribute(pos,3));geo.setAttribute("color",new THREE.BufferAttribute(col,3));geo.setAttribute("size",new THREE.BufferAttribute(size,1));geo.setAttribute("random",new THREE.BufferAttribute(rnd,1));const mat=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`attribute float size;attribute float random;
            varying vec3 vColor;varying float vRnd;
            void main(){vColor=color;vRnd=random;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*(250./-mv.z);gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform float time;varying vec3 vColor;varying float vRnd;
            void main(){vec2 uv=gl_PointCoord-.5;float d=length(uv);float a=1.-smoothstep(.4,.5,d);a*=.7+.3*sin(time*(.6+vRnd*.3)+vRnd*5.);if(a<.02)discard;gl_FragColor=vec4(vColor,a);}`,transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending});return new THREE.Points(geo,mat)
        };

        const makeParticles = (count, palette) => {
            const geo=new THREE.BufferGeometry();
            const pos=new Float32Array(count*3);
            const col=new Float32Array(count*3);
            const size=new Float32Array(count);
            const rnd=new Float32Array(count*3);
            for(let i=0;i<count;i++){
                const i3=i*3,base=palette[Math.random()*palette.length|0],hsl={h:0,s:0,l:0};
                base.getHSL(hsl);
                hsl.h+=(Math.random()-.5)*.05;
                hsl.s=Math.min(1,Math.max(.7,hsl.s+(Math.random()-.5)*.3));
                hsl.l=Math.min(.9,Math.max(.5,hsl.l+(Math.random()-.5)*.4));
                const c=new THREE.Color().setHSL(hsl.h,hsl.s,hsl.l);
                col[i3]=c.r;col[i3+1]=c.g;col[i3+2]=c.b;
                size[i]=.7+Math.random()*1.1;
                rnd[i3]=Math.random()*10;
                rnd[i3+1]=Math.random()*Math.PI*2;
                rnd[i3+2]=.5+.5*Math.random();
            }
            geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
            geo.setAttribute("color",new THREE.BufferAttribute(col,3));
            geo.setAttribute("size",new THREE.BufferAttribute(size,1));
            geo.setAttribute("random",new THREE.BufferAttribute(rnd,3));
            
            const mat=new THREE.ShaderMaterial({
                uniforms:{time:{value:0},hueSpeed:{value:0.12}},
                vertexShader:`uniform float time;attribute float size;attribute vec3 random;
            varying vec3 vCol;varying float vR;
            void main(){
                vCol=color;vR=random.z;
                vec3 p=position;
                float t=time*.25*random.z;
                float ax=t+random.y, ay=t*.75+random.x;
                float amp=(.6+sin(random.x+t*.6)*.3)*random.z;
                p.x+=sin(ax+p.y*.06+random.x*.1)*amp;
                p.y+=cos(ay+p.z*.06+random.y*.1)*amp;
                p.z+=sin(ax*.85+p.x*.06+random.z*.1)*amp;
                vec4 mv=modelViewMatrix*vec4(p,1.);
                float pulse=.9+.1*sin(time*1.15+random.y);
                gl_PointSize=size*pulse*(350./-mv.z);
                gl_Position=projectionMatrix*mv;
            }`,
                fragmentShader:`
            uniform float time;
            uniform float hueSpeed;
            varying vec3 vCol;
            varying float vR;
            
            vec3 hueShift(vec3 c, float h) {
                const vec3 k = vec3(0.57735);
                float cosA = cos(h);
                float sinA = sin(h);
                return c * cosA + cross(k, c) * sinA + k * dot(k, c) * (1.0 - cosA);
            }
            
            void main() {
                vec2 uv = gl_PointCoord - 0.5;
                float d = length(uv);
                
                float core = smoothstep(0.05, 0.0, d);
                float angle = atan(uv.y, uv.x);
                float flare = pow(max(0.0, sin(angle * 6.0 + time * 2.0 * vR)), 4.0);
                flare *= smoothstep(0.5, 0.0, d);
                float glow = smoothstep(0.4, 0.1, d);
                
                float alpha = core * 1.0 + flare * 0.5 + glow * 0.2;
                
                vec3 color = hueShift(vCol, time * hueSpeed);
                vec3 finalColor = mix(color, vec3(1.0, 0.95, 0.9), core);
                finalColor = mix(finalColor, color, flare * 0.5 + glow * 0.5);
            
                if (alpha < 0.01) discard;
                
                gl_FragColor = vec4(finalColor, alpha);
            }`,
                transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending
            });
            return new THREE.Points(geo,mat);
        };

        const createSparkles = (count) => {
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const size = new Float32Array(count);
            const rnd = new Float32Array(count * 3);
        
            for (let i = 0; i < count; i++) {
                size[i] = 0.5 + Math.random() * 0.8;
                rnd[i*3] = Math.random() * 10;
                rnd[i*3+1] = Math.random() * Math.PI * 2;
                rnd[i*3+2] = 0.5 + 0.5 * Math.random();
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
            geo.setAttribute('random', new THREE.BufferAttribute(rnd, 3));
        
            const mat = new THREE.ShaderMaterial({
                uniforms: { time: { value: 0 } },
                vertexShader: `
                    uniform float time;
                    attribute float size;
                    attribute vec3 random;
                    void main() {
                        vec3 p = position;
                        float t = time * 0.25 * random.z;
                        float ax = t + random.y, ay = t * 0.75 + random.x;
                        float amp = (0.6 + sin(random.x + t * 0.6) * 0.3) * random.z;
                        p.x += sin(ax + p.y * 0.06 + random.x * 0.1) * amp;
                        p.y += cos(ay + p.z * 0.06 + random.y * 0.1) * amp;
                        p.z += sin(ax * 0.85 + p.x * 0.06 + random.z * 0.1) * amp;
                        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }`,
                fragmentShader: `
                    uniform float time;
                    void main() {
                        float d = length(gl_PointCoord - vec2(0.5));
                        float alpha = 1.0 - smoothstep(0.4, 0.5, d);
                        if (alpha < 0.01) discard;
                        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
                    }`,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
        
            return new THREE.Points(geo, mat);
        };

        const applyPattern = (i) => {
            const { particles, sparkles } = threeState.current;
            const pts = PATTERNS[i](PARTICLE_COUNT);
            const particleArr = particles.geometry.attributes.position.array;
            const sparkleArr = sparkles.geometry.attributes.position.array;
            for(let j=0; j<PARTICLE_COUNT; j++){
                const idx = j*3;
                const p = pts[j] || new THREE.Vector3();  
                particleArr[idx] = p.x;
                particleArr[idx+1] = p.y;
                particleArr[idx+2] = p.z;
                if (j < SPARK_COUNT) {  
                    sparkleArr[idx] = p.x;
                    sparkleArr[idx+1] = p.y;
                    sparkleArr[idx+2] = p.z;
                }
            }
            particles.geometry.attributes.position.needsUpdate=true;
            sparkles.geometry.attributes.position.needsUpdate=true;
        };

        const beginMorph = () => {
            const { particles } = threeState.current;
            threeState.current.isTrans = true;
            threeState.current.prog = 0;
            const next = (threeState.current.currentPattern + 1) % PATTERNS.length;
            const fromPts = particles.geometry.attributes.position.array.slice();
            const toPts = PATTERNS[next](PARTICLE_COUNT);
            
            const to = new Float32Array(PARTICLE_COUNT*3);
            if(toPts.length > 0){
                for(let j=0; j<PARTICLE_COUNT; j++){
                    const idx=j*3, p=toPts[j];
                    to[idx]=p.x; to[idx+1]=p.y; to[idx+2]=p.z;
                }
                particles.userData={from: fromPts, to, next};
                threeState.current.sparkles.userData={from: fromPts, to, next}; 
            }
        };

        const handleResize = () => {
            const { camera, renderer, composer } = threeState.current;
            if (camera && renderer && composer) {
                camera.aspect = innerWidth / innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(innerWidth, innerHeight);
                composer.setSize(innerWidth, innerHeight);
            }
        };

        const animate = () => {
            animationFrameId.current = requestAnimationFrame(animate);
            
            const state = threeState.current;
            const dt = state.clock.getDelta(), t = state.clock.getElapsedTime();
        
            state.controls.update();
        
            // Update shader times
            state.particles.material.uniforms.time.value = t;
            state.sparkles.material.uniforms.time.value = t;
            state.stars.material.uniforms.time.value = t;
        
            if (state.isTrans) {
                state.prog += morphSpeed;
                const eased = state.prog >= 1 ? 1 : 1 - Math.pow(1 - state.prog, 3);
                const { from, to } = state.particles.userData;
                if (to) {
                    const particleArr = state.particles.geometry.attributes.position.array;
                    const sparkleArr = state.sparkles.geometry.attributes.position.array;
                    for (let i = 0; i < particleArr.length; i++) {
                        const val = from[i] + (to[i] - from[i]) * eased;
                        particleArr[i] = val;
                        if (i < sparkleArr.length) {
                            sparkleArr[i] = val;
                        }
                    }
                    state.particles.geometry.attributes.position.needsUpdate = true;
                    state.sparkles.geometry.attributes.position.needsUpdate = true;
                }
                if (state.prog >= 1) {
                    state.currentPattern = state.particles.userData.next;
                    state.isTrans = false;
                    state.lastMorphTime = t; // Reset timer
                }
            } else if (t - state.lastMorphTime > morphInterval) {
                // If not transitioning and time is up, start a new morph
                beginMorph();
            }
        
            state.composer.render(dt);
        };

        // --- Init Function ---
        const init = () => {
            const state = threeState.current;
            const container = containerRef.current;

            state.scene = new THREE.Scene();
            state.scene.fog = new THREE.FogExp2(0x050203, .012);
        
            state.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 2500);
            state.camera.position.set(0, 0, 80);
        
            state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            state.renderer.setPixelRatio(devicePixelRatio);
            state.renderer.setSize(innerWidth, innerHeight);
            container.appendChild(state.renderer.domElement);
        
            state.controls = new OrbitControls(state.camera, state.renderer.domElement);
            state.controls.enableDamping = true;
            state.controls.dampingFactor = 0.05;
            state.controls.screenSpacePanning = false;
            state.controls.minDistance = 20;
            state.controls.maxDistance = 200;
            state.controls.target.set(0, 0, 0);
            state.controls.autoRotate = true;
            state.controls.autoRotateSpeed = 0.5;
        
            state.stars = createStars();
            state.scene.add(state.stars);
        
            const palette = [0xff3c78, 0xff8c00, 0xfff200, 0x00cfff, 0xb400ff, 0xffffff, 0xff4040].map(c => new THREE.Color(c));
            state.particles = makeParticles(PARTICLE_COUNT, palette);
            state.sparkles = createSparkles(SPARK_COUNT);
            state.scene.add(state.particles);
            state.scene.add(state.sparkles);
        
            state.composer = new EffectComposer(state.renderer);
            state.composer.addPass(new RenderPass(state.scene, state.camera));
            state.composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .45, .5, .85));
            const after = new AfterimagePass();
            after.uniforms.damp.value = .92;
            state.composer.addPass(after);
            state.composer.addPass(new OutputPass());
        
            applyPattern(state.currentPattern);
        
            window.addEventListener("resize", handleResize);
        };
        
        // --- Run ---
        init();
        animate();

        // --- Cleanup Function ---
        return () => {
            cancelAnimationFrame(animationFrameId.current);
            window.removeEventListener("resize", handleResize);
            
            const state = threeState.current;
            if (containerRef.current && state.renderer) {
                containerRef.current.removeChild(state.renderer.domElement);
            }
            
            // Dispose of Three.js objects
            if (state.scene) {
                state.scene.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(m => m.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                });
            }
            if (state.renderer) state.renderer.dispose();
            if (state.composer) {
                state.composer.passes.forEach(pass => {
                    if (pass.dispose) pass.dispose();
                });
            }
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
        <React.Fragment>
            <div id="container" ref={containerRef} />
            <div className="vignette" />
        </React.Fragment>
    );
};


// --- SAYANA Content Component ---

// --- SVG Icon Components (Re-themed) ---
const FeatureIcon = ({ type, className }) => {
  const iconClass = className || "w-12 h-12 text-white mb-6"; // Changed to white
  
  switch (type) {
    case 'emotion':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'translate':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V10a2 2 0 012-2h8z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 15v-3a1 1 0 00-1-1H3m0 0l2-2m-2 2l2 2m1-5V4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1z"></path>
        </svg>
      );
    case 'secure':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case 'multilingual':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2H10a2 2 0 002-2v-1a2 2 0 012-2h1.945M12 8c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 8 12 8z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM12 12a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      );
    case 'step1':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM12 8v4m0 0l-2-2m2 2l2-2"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        </svg>
      );
    case 'step2':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
      );
    case 'step3':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z"></path></svg>
      );
    case 'tech-emotion':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="2 2" d="M8 14.01c.148-.59.83-1.01 1.558-1.01h4.884c.728 0 1.41.42 1.558 1.01"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="1 1" d="M3.5 9.5v.01M3.5 14.5v.01M20.5 9.5v.01M20.5 14.5v.01M12 3.5v.01M12 20.5v.01"></path>
        </svg>
      );
    case 'tech-sign':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 17.9291C8 17.9291 5.5 19.9291 3.5 16.9291C1.5 13.9291 3.5 10.9291 5.5 8.9291C7.5 6.9291 10.5 4.9291 12.5 6.9291C14.5 8.9291 16.5 11.9291 18.5 10.9291C20.5 9.9291 22 7.9291 22 7.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M11 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
};

const HandSignIcon = ({ type, className }) => {
  const iconClass = className || "w-full h-full";
  if (type === 'love') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.5 17C10.119 17 9 15.881 9 14.5V9C9 7.619 10.119 6.5 11.5 6.5C12.881 6.5 14 7.619 14 9V14.5C14 15.881 12.881 17 11.5 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 14.5V9C6 7.619 7.119 6.5 8.5 6.5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 8.5H14.5C15.881 8.5 17 9.619 17 11V14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 14.5C6 15.881 4.881 17 3.5 17C2.119 17 1 15.881 1 14.5C1 13.119 2.119 12 3.5 12C4.881 12 6 13.119 6 14.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 14.5C17 15.881 18.119 17 19.5 17C20.881 17 22 15.881 22 14.5C22 13.119 20.881 12 19.5 12C18.119 12 17 13.119 17 14.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type === 'ok') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 14.5V9C9 7.619 10.119 6.5 11.5 6.5C12.881 6.5 14 7.619 14 9V14.5C14 15.881 12.881 17 11.5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 14.5V9C6 7.619 7.119 6.5 8.5 6.5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 11.5C14 9.567 15.567 8 17.5 8C19.433 8 21 9.567 21 11.5C21 13.433 19.433 15 17.5 15C15.567 15 14 13.433 14 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11.5 17C10.119 17 9 15.881 9 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type === 'wave') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 17.9291C8 17.9291 5.5 19.9291 3.5 16.9291C1.5 13.9291 3.5 10.9291 5.5 8.9291C7.5 6.9291 10.5 4.9291 12.5 6.9291C14.5 8.9291 16.5 11.9291 18.5 10.9291C20.5 9.9291 22 7.9291 22 7.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 17.9291V10.9291" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return null;
};

const SpeechToSignIcon = ({ className }) => (
  <svg className={className || "w-full h-full"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 12V11C7 9.11438 7 8.17157 7.58579 7.58579C8.17157 7 9.11438 7 11 7H13C14.8856 7 15.8284 7 16.4142 7.58579C17 8.17157 17 9.11438 17 11V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9L12 7L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 14V15C3 16.8856 3 17.8284 3.58579 18.4142C4.17157 19 5.11438 19 7 19H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 14V15C21 16.8856 21 17.8284 20.4142 18.4142C19.8284 19 18.8856 19 17 19H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// --- Chatbot Icons (Re-themed) ---
const ChatIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
);

const CloseIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path></svg>
);

const SendIcon = ({ className }) => (
  // right-facing paper plane / send icon (points to the right)
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M2 21l20-9L2 3v7l13 2-13 2v7z" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg>
);

const StarIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
);

// --- API Helper ---
const fetchWithBackoff = async (url, options, retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      if (response.status >= 400 && response.status < 500) {
          console.error("Client error:", response.status, await response.text());
          throw new Error(`Client error: ${response.status}`);
      }
    } catch (error) {
      if (i === retries - 1) {
        console.error("Final attempt failed:", error);
        throw error;
      }
    }
    const jitter = Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i) + jitter));
  }
};

const resolveApiBase = (candidate) => {
  const fallback = typeof window !== 'undefined' && window.location
    ? window.location.origin
    : 'http://localhost:5000';
  const trimmed = (candidate || '').trim();
  if (!trimmed) return fallback;
  if (!/^https?:\/\//i.test(trimmed)) return fallback;
  const normalized = trimmed.replace(/[/\\]+$/g, '').trim();
  return normalized || fallback;
};

const API_BASE = resolveApiBase(import.meta.env.VITE_API_BASE || '');


// --- Data for Features and Animations ---
const features = [
  {
    title: "AI Emotion Detection",
    description: "Our advanced AI reads facial expressions to understand the emotion behind the words.",
    icon: "emotion",
  },
  {
    title: "Real-Time Sign Translation",
    description: "Instantly translate spoken language to sign language and back, all on your device.",
    icon: "translate",
  },
  {
    title: "Private & Secure Conversations",
    description: "End-to-end encryption ensures your personal conversations remain private.",
    icon: "secure",
  },
  {
    title: "Multilingual Support",
    description: "Communicate in multiple sign and spoken languages, breaking down all barriers.",
    icon: "multilingual",
  },
];

const floatingIcons = [
  { id: 1, icon: <HandSignIcon type="love" />, top: '15%', left: '10%', size: '40px', duration: 8 },
  { id: 2, icon: <SpeechToSignIcon />, top: '25%', left: '80%', size: '30px', duration: 6 },
  { id: 3, icon: <HandSignIcon type="ok" />, top: '60%', left: '90%', size: '50px', duration: 10 },
  { id: 4, icon: <HandSignIcon type="wave" />, top: '70%', left: '10%', size: '35px', duration: 7 },
  { id: 5, icon: <SpeechToSignIcon />, top: '85%', left: '50%', size: '25px', duration: 5 },
  { id: 6, icon: <HandSignIcon type="love" />, top: '40%', left: '60%', size: '45px', duration: 9 },
];

const howItWorksSteps = [
  {
    icon: "step1",
    title: "Point Your Camera",
    description: "Simply open the app and point your camera at a person or group."
  },
  {
    icon: "step2",
    title: "AI Scans & Understands",
    description: "Our AI instantly analyzes facial expressions for emotion and hand gestures for sign language."
  },
  {
    icon: "step3",
    title: "Get Instant Translation",
    description: "Receive real-time translations as text or synthesized speech, complete with emotional context."
  }
];

const testimonials = [
  {
    name: "Aisha K.",
    role: "ISL Educator",
    quote: "SAYANA is a revolutionary tool for bridging the gap. The emotion detection adds a layer of understanding I've never seen in any other app.",
    stars: 5
  },
  {
    name: "Michael T.",
    role: "Family Member",
    quote: "I can finally have nuanced conversations with my deaf son. Understanding his emotions, not just his words, has changed everything for us.",
    stars: 5
  },
  {
    name: "Chen W.",
    role: "App User",
    quote: "As someone who is mute, this app has given me my voice. The real-time translation is fast and accurate. It is my daily companion.",
    stars: 5
  },
  {
    name: "Dr. Elena Rodriguez",
    role: "Accessibility Researcher",
    quote: "The team at SAYANA has prioritized security and privacy alongside innovation. It's a model for accessible technology.",
    stars: 5
  }
];

const faqData = [
  {
    question: "How does the AI Emotion Detection work?",
    answer: "Our AI model has been trained on a diverse dataset of facial expressions to recognize subtle nuances that convey emotion. It analyzes key facial landmarks in real-time to provide context to the communication, understanding if the user is happy, sad, surprised, etc."
  },
  {
    question: "Is my data and my conversations private?",
    answer: "Absolutely. Privacy is at the core of SAYANA. All conversations are end-to-end encrypted. We do not store your personal conversation data, and all AI processing for translation and emotion detection happens securely."
  },
  {
    question: "What sign languages and spoken languages are supported?",
    answer: "We are constantly expanding our language library. Currently, we lead with support for ISL (Indian Sign Language), with translation to and from English, Spanish, Mandarin, and Hindi. More languages are in development!"
  },
  {
    question: "Is SAYANA an app I need to download?",
    answer: "SAYANA is a powerful web application, which means you do not need to download anything! You can access it from any modern browser on your computer, tablet, or phone, ensuring you always have the latest version."
  },
  {
    question: "How can I get involved or support SAYANA's mission?",
    answer: "We are so glad you asked! You can support us by sharing the app with your community, providing feedback for improvements, or following and sharing our mission on social media. We also partner with organizations for accessibility. Please visit our 'Contact' page for more information."
  }
];

// --- Animation Variants ---
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: "easeOut"
    }
  }
};

const buttonSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 20
};

// --- Sub-Components (Re-themed) ---
const SectionHeader = ({ title, subtitle }) => (
  <motion.div
    className="mb-16 text-center"
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.3 }}
    variants={fadeIn}
  >
    <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
      {title}
    </h2>
    <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto">
      {subtitle}
    </p>
  </motion.div>
);

const HowItWorksSection = () => (
  <section id="how-it-works" className="w-full max-w-7xl mx-auto px-6 pt-24 sm:px-10 scroll-mt-20">
    <SectionHeader
      title="How It Works"
      subtitle="A simple, seamless experience. See how SAYANA turns silence into expression in three easy steps."
    />
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-8"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {howItWorksSteps.map((step, index) => (
        <motion.div
          key={index}
          className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/5 backdrop-blur-md shadow-lg shadow-black/20 border border-white/10"
          variants={cardVariants}
        >
          <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-white/10 mb-6">
            <FeatureIcon type={step.icon} className="w-12 h-12 text-white z-10" />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-white">
            {step.title}
          </h3>
          <p className="text-white/80">
            {step.description}
          </p>
        </motion.div>
      ))}
    </motion.div>
  </section>
);

const TechnologySection = ({ onGetStartedClick }) => {
  const [activeTab, setActiveTab] = useState('emotion');

  return (
    <section className="w-full bg-transparent mt-24 py-24">
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10">
        <SectionHeader
          title="Our Technology"
          subtitle="Powered by cutting-edge AI, SAYANA is built on empathy and precision. Explore the models that make communication possible."
        />
        <div className="flex justify-center mb-12">
          <div className="flex p-1 rounded-full bg-white/10">
            <button
              onClick={() => setActiveTab('emotion')}
              className={`px-6 sm:px-10 py-3 text-sm sm:text-base font-semibold rounded-full transition-colors ${activeTab === 'emotion' ? 'bg-white text-purple-600 shadow-md' : 'text-white/70 hover:text-white'}`}
            >
              AI Emotion Detection
            </button>
            <button
              onClick={() => setActiveTab('translation')}
              className={`px-6 sm:px-10 py-3 text-sm sm:text-base font-semibold rounded-full transition-colors ${activeTab === 'translation' ? 'bg-white text-purple-600 shadow-md' : 'text-white/70 hover:text-white'}`}
            >
              Sign Language Translation
            </button>
          </div>
        </div>

        <div className="relative w-full min-h-[450px]">
          <AnimatePresence mode="wait">
            {activeTab === 'emotion' && (
              <motion.div
                key="emotion-content"
                className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-8 sm:p-12 rounded-3xl bg-white/5 backdrop-blur-md shadow-lg shadow-black/20 border border-white/10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">Understanding the Unspoken</h3>
                  <p className="text-lg text-white/80 mb-6">
                    Communication is more than just words. Our neural network analyzes facial landmarks to interpret the emotional context.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center text-white"><span className="w-5 h-5 mr-3 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">✔</span>Live analysis via secure API keys</li>
                    <li className="flex items-center text-white"><span className="w-5 h-5 mr-3 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">✔</span>Trained on diverse, global datasets</li>
                    <li className="flex items-center text-white"><span className="w-5 h-5 mr-3 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">✔</span>Subtle expression recognition</li>
                  </ul>
                  <motion.button
                    onClick={onGetStartedClick}
                    className="mt-8 rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-purple-600/30 transition-all"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={buttonSpring}
                  >
                    Get Started
                  </motion.button>
                </div>
                <motion.div
                  className="flex items-center justify-center min-h-[250px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <FeatureIcon type="tech-emotion" className="w-48 h-48 text-white/60" />
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'translation' && (
              <motion.div
                key="translation-content"
                className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-8 sm:p-12 rounded-3xl bg-white/5 backdrop-blur-md shadow-lg shadow-black/20 border border-white/10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="flex items-center justify-center min-h-[250px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <FeatureIcon type="tech-sign" className="w-48 h-48 text-white/60" />
                </motion.div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">Bridging Worlds with ISL</h3>
                  <p className="text-lg text-white/80 mb-6">
                    Our translation engine is built with a deep understanding of ISL (Indian Sign Language).
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center text-white"><span className="w-5 h-5 mr-3 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">✔</span>Supports ISL</li>
                    <li className="flex items-center text-white"><span className="w-5 h-5 mr-3 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">✔</span>Context-aware translation engine</li>
                    <li className="flex items-center text-white"><span className="w-5 h-5 mr-3 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">✔</span>Speech-to-sign generation</li>
                  </ul>
                  <motion.button
                    onClick={onGetStartedClick}
                    className="mt-8 rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-purple-600/30 transition-all"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={buttonSpring}
                  >
                    Get Started
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

// --- NEW CARD STREAM SECTION ---

const CardStreamSection = () => {
    // Refs for DOM elements
    const cardStreamContainerRef = useRef(null);
    const cardStreamRef = useRef(null);
    const cardLineRef = useRef(null);
    // REMOVED speedValueRef
    const particleCanvasRef = useRef(null);
    const scannerCanvasRef = useRef(null);
    // REMOVED inspirationCreditRef

    // Ref to hold class instances
    const cardStreamInstanceRef = useRef(null);
    const particleSystemInstanceRef = useRef(null);
    const particleScannerInstanceRef = useRef(null);

    // REMOVED Event handlers: toggleAnimation, resetPosition, changeDirection

    useEffect(() => {
        // --- All the JS code from script.js goes in here ---
        
        const codeChars =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(){}[]<>;:,._-+=!@#$%^&*|\\/\"'`~?";

        class CardStreamController {
            constructor(container, cardLine, speedIndicator) {
                this.container = container;
                this.cardLine = cardLine;
                this.speedIndicator = speedIndicator;

                this.position = 0;
                this.velocity = 120;
                this.direction = -1;
                this.isAnimating = true;
                this.isDragging = false;

                this.lastTime = 0;
                this.lastMouseX = 0;
                this.mouseVelocity = 0;
                this.friction = 0.95;
                this.minVelocity = 30;

                this.containerWidth = 0;
                this.cardLineWidth = 0;

                this.init();
            }

            init() {
                this.populateCardLine();
                this.calculateDimensions();
                this.setupEventListeners();
                this.updateCardPosition();
                this.animate();
                this.startPeriodicUpdates();
            }

            calculateDimensions() {
                this.containerWidth = this.container.offsetWidth;
                const cardWidth = 400;
                const cardGap = 60;
                const cardCount = this.cardLine.children.length;
                this.cardLineWidth = (cardWidth + cardGap) * cardCount;
            }

            setupEventListeners() {
                this.cardLine.addEventListener("mousedown", (e) => this.startDrag(e));
                document.addEventListener("mousemove", (e) => this.onDrag(e));
                document.addEventListener("mouseup", () => this.endDrag());

                this.cardLine.addEventListener(
                    "touchstart",
                    (e) => this.startDrag(e.touches[0]),
                    { passive: false }
                );
                document.addEventListener("touchmove", (e) => this.onDrag(e.touches[0]), {
                    passive: false,
                });
                document.addEventListener("touchend", () => this.endDrag());

                this.cardLine.addEventListener("wheel", (e) => this.onWheel(e));
                this.cardLine.addEventListener("selectstart", (e) => e.preventDefault());
                this.cardLine.addEventListener("dragstart", (e) => e.preventDefault());

                window.addEventListener("resize", () => this.calculateDimensions());
            }

            startDrag(e) {
                if (e.preventDefault) e.preventDefault();

                this.isDragging = true;
                this.isAnimating = false;
                this.lastMouseX = e.clientX;
                this.mouseVelocity = 0;

                const transform = window.getComputedStyle(this.cardLine).transform;
                if (transform !== "none") {
                    const matrix = new DOMMatrix(transform);
                    this.position = matrix.m41;
                }

                this.cardLine.style.animation = "none";
                this.cardLine.classList.add("dragging");

                document.body.style.userSelect = "none";
                document.body.style.cursor = "grabbing";
            }

            onDrag(e) {
                if (!this.isDragging) return;
                if (e.preventDefault) e.preventDefault();

                const deltaX = e.clientX - this.lastMouseX;
                this.position += deltaX;
                this.mouseVelocity = deltaX * 60;
                this.lastMouseX = e.clientX;

                this.cardLine.style.transform = `translateX(${this.position}px)`;
                this.updateCardClipping();
            }

            endDrag() {
                               if (!this.isDragging) return;

                this.isDragging = false;
                this.cardLine.classList.remove("dragging");

                if (Math.abs(this.mouseVelocity) > this.minVelocity) {
                    this.velocity = Math.abs(this.mouseVelocity);
                    this.direction = this.mouseVelocity > 0 ? 1 : -1;
                } else {
                    this.velocity = 120;
                }

                this.isAnimating = true;
                this.updateSpeedIndicator();

                document.body.style.userSelect = "";
                document.body.style.cursor = "";
            }

            animate() {
                const currentTime = performance.now();
                const deltaTime = (currentTime - this.lastTime) / 1000;
                this.lastTime = currentTime;

                if (this.isAnimating && !this.isDragging) {
                    if (this.velocity > this.minVelocity) {
                        this.velocity *= this.friction;
                    } else {
                        this.velocity = Math.max(this.minVelocity, this.velocity);
                    }

                    this.position += this.velocity * this.direction * deltaTime;
                    this.updateCardPosition();
                    this.updateSpeedIndicator();
                }

                this.animationFrame = requestAnimationFrame(() => this.animate());
            }

            updateCardPosition() {
                const containerWidth = this.containerWidth;
                const cardLineWidth = this.cardLineWidth;

                if (this.position < -cardLineWidth) {
                    this.position = containerWidth;
                } else if (this.position > containerWidth) {
                    this.position = -cardLineWidth;
                }

                this.cardLine.style.transform = `translateX(${this.position}px)`;
                this.updateCardClipping();
            }

            updateSpeedIndicator() {
                if(this.speedIndicator) {
                    this.speedIndicator.textContent = Math.round(this.velocity);
                }
            }

            toggleAnimation() {
                this.isAnimating = !this.isAnimating;
                const btn = document.querySelector(".control-btn"); // Simple query for this one-off
                if (btn) {
                    btn.textContent = this.isAnimating ? "⏸️ Pause" : "▶️ Play";
                }

                if (this.isAnimating) {
                    this.cardLine.style.animation = "none";
                }
            }

            resetPosition() {
                this.position = this.containerWidth;
                this.velocity = 120;
                this.direction = -1;
                this.isAnimating = true;
                this.isDragging = false;

                this.cardLine.style.animation = "none";
                this.cardLine.style.transform = `translateX(${this.position}px)`;
                this.cardLine.classList.remove("dragging");

                this.updateSpeedIndicator();

                const btn = document.querySelector(".control-btn"); // Simple query
                if(btn) {
                    btn.textContent = "⏸️ Pause";
                }
            }

            changeDirection() {
                this.direction *= -1;
                this.updateSpeedIndicator();
            }

            onWheel(e) {
                e.preventDefault();

                const scrollSpeed = 20;
                const delta = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;

                this.position += delta;
                this.updateCardPosition();
                this.updateCardClipping();
            }

            generateCode(width, height) {
                // ... (generateCode function from JS) ...
                const randInt = (min, max) =>
                    Math.floor(Math.random() * (max - min + 1)) + min;
                const pick = (arr) => arr[randInt(0, arr.length - 1)];

                const header = [
                    "// compiled preview • scanner demo",
                    "/* generated for visual effect – not executed */",
                    "const SCAN_WIDTH = 8;",
                    "const FADE_ZONE = 35;",
                    "const MAX_PARTICLES = 2500;",
                    "const TRANSITION = 0.05;",
                ];

                const helpers = [
                    "function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }",
                    "function lerp(a, b, t) { return a + (b - a) * t; }",
                    "const now = () => performance.now();",
                    "function rng(min, max) { return Math.random() * (max - min) + min; }",
                ];

                const particleBlock = (idx) => [
                    `class Particle${idx} {`,
                    "  constructor(x, y, vx, vy, r, a) {",
                    "    this.x = x; this.y = y;",
                    "    this.vx = vx; this.vy = vy;",
                    "    this.r = r; this.a = a;",
                    "  }",
                    "  step(dt) { this.x += this.vx * dt; this.y += this.vy * dt; }",
                    "}",
                ];

                const scannerBlock = [
                    "const scanner = {",
                    "  x: Math.floor(window.innerWidth / 2),",
                    "  width: SCAN_WIDTH,",
                    "  glow: 3.5,",
                    "};",
                    "",
                    "function drawParticle(ctx, p) {",
                    "  ctx.globalAlpha = clamp(p.a, 0, 1);",
                    "  ctx.drawImage(gradient, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);",
                    "}",
                ];

                const loopBlock = [
                    "function tick(t) {",
                    "  // requestAnimationFrame(tick);",
                    "  const dt = 0.016;",
                    "  // update & render",
                    "}",
                ];

                const misc = [
                    "const state = { intensity: 1.2, particles: MAX_PARTICLES };",
                    "const bounds = { w: window.innerWidth, h: 300 };",
                    "const gradient = document.createElement('canvas');",
                    "const ctx = gradient.getContext('2d');",
                    "ctx.globalCompositeOperation = 'lighter';",
                    "// ascii overlay is masked with a 3-phase gradient",
                ];

                const library = [];
                header.forEach((l) => library.push(l));
                helpers.forEach((l) => library.push(l));
                for (let b = 0; b < 3; b++)
                    particleBlock(b).forEach((l) => library.push(l));
                scannerBlock.forEach((l) => library.push(l));
                loopBlock.forEach((l) => library.push(l));
                misc.forEach((l) => library.push(l));

                for (let i = 0; i < 40; i++) {
                    const n1 = randInt(1, 9);
                    const n2 = randInt(10, 99);
                    library.push(`const v${i} = (${n1} + ${n2}) * 0.${randInt(1, 9)};`);
                }
                for (let i = 0; i < 20; i++) {
                    library.push(
                        `if (state.intensity > ${1 + (i % 3)}) { scanner.glow += 0.01; }`
                    );
                }

                let flow = library.join(" ");
                flow = flow.replace(/\s+/g, " ").trim();
                const totalChars = width * height;
                while (flow.length < totalChars + width) {
                    const extra = pick(library).replace(/\s+/g, " ").trim();
                    flow += " " + extra;
                }

                let out = "";
                let offset = 0;
                for (let row = 0; row < height; row++) {
                    let line = flow.slice(offset, offset + width);
                    if (line.length < width) line = line + " ".repeat(width - line.length);
                    out += line + (row < height - 1 ? "\n" : "");
                    offset += width;
                }
                return out;
            }

            calculateCodeDimensions(cardWidth, cardHeight) {
                const fontSize = 11;
                const lineHeight = 13;
                const charWidth = 6;
                const width = Math.floor(cardWidth / charWidth);
                const height = Math.floor(cardHeight / lineHeight);
                return { width, height, fontSize, lineHeight };
            }

            createCardWrapper(index) {
                const wrapper = document.createElement("div");
                wrapper.className = "card-wrapper";

                const normalCard = document.createElement("div");
                normalCard.className = "card card-normal";

                const cardImages = [
                    "https://agno.blob.core.windows.net/dream-images/Sachin.png",
                    "https://agno.blob.core.windows.net/dream-images/Pravin.png",
                    "https://agno.blob.core.windows.net/dream-images/sri.png",
                    "https://agno.blob.core.windows.net/dream-images/vijay.png",
                ];

                const cardImage = document.createElement("img");
                cardImage.className = "card-image";
                cardImage.src = cardImages[index % cardImages.length];
                cardImage.alt = "Credit Card";

                cardImage.onerror = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 400;
                    canvas.height = 250;
                    const ctx = canvas.getContext("2d");

                    const gradient = ctx.createLinearGradient(0, 0, 400, 250);
                    gradient.addColorStop(0, "#667eea");
                    gradient.addColorStop(1, "#764ba2");

                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, 400, 250);

                    cardImage.src = canvas.toDataURL();
                };

                normalCard.appendChild(cardImage);

                const asciiCard = document.createElement("div");
                asciiCard.className = "card card-ascii";

                const asciiContent = document.createElement("div");
                asciiContent.className = "ascii-content";

                const { width, height, fontSize, lineHeight } =
                    this.calculateCodeDimensions(400, 250);
                asciiContent.style.fontSize = fontSize + "px";
                asciiContent.style.lineHeight = lineHeight + "px";
                asciiContent.textContent = this.generateCode(width, height);

                asciiCard.appendChild(asciiContent);
                wrapper.appendChild(normalCard);
                wrapper.appendChild(asciiCard);

                return wrapper;
            }

            updateCardClipping() {
                const scannerX = window.innerWidth / 2;
                const scannerWidth = 8;
                const scannerLeft = scannerX - scannerWidth / 2;
                const scannerRight = scannerX + scannerWidth / 2;
                let anyScanningActive = false;

                document.querySelectorAll(".card-wrapper").forEach((wrapper) => {
                    const rect = wrapper.getBoundingClientRect();
                    const cardLeft = rect.left;
                    const cardRight = rect.right;
                    const cardWidth = rect.width;

                    const normalCard = wrapper.querySelector(".card-normal");
                    const asciiCard = wrapper.querySelector(".card-ascii");

                    if (cardLeft < scannerRight && cardRight > scannerLeft) {
                        anyScanningActive = true;
                        const scannerIntersectLeft = Math.max(scannerLeft - cardLeft, 0);
                        const scannerIntersectRight = Math.min(
                            scannerRight - cardLeft,
                            cardWidth
                        );

                        const normalCardWidth = parseFloat(getComputedStyle(normalCard).width);
                        const asciiCardWidth = parseFloat(getComputedStyle(asciiCard).width);

                        const normalClipRight = (scannerIntersectLeft / normalCardWidth) * 100;
                        const asciiClipLeft = (scannerIntersectRight / asciiCardWidth) * 100;

                        normalCard.style.setProperty("--clip-right", `${normalClipRight}%`);
                        asciiCard.style.setProperty("--clip-left", `${asciiClipLeft}%`);

                        if (!wrapper.hasAttribute("data-scanned") && scannerIntersectLeft > 0) {
                            wrapper.setAttribute("data-scanned", "true");
                            const scanEffect = document.createElement("div");
                            scanEffect.className = "scan-effect";
                            wrapper.appendChild(scanEffect);
                            setTimeout(() => {
                                if (scanEffect.parentNode) {
                                    scanEffect.parentNode.removeChild(scanEffect);
                                }
                            }, 600);
                        }
                    } else {
                        if (cardRight < scannerLeft) {
                            normalCard.style.setProperty("--clip-right", "100%");
                            asciiCard.style.setProperty("--clip-left", "100%");
                        } else if (cardLeft > scannerRight) {
                            normalCard.style.setProperty("--clip-right", "0%");
                            asciiCard.style.setProperty("--clip-left", "0%");
                        }
                        wrapper.removeAttribute("data-scanned");
                    }
                });

                if (window.setScannerScanning) {
                    window.setScannerScanning(anyScanningActive);
                }
            }

            updateAsciiContent() {
                document.querySelectorAll(".ascii-content").forEach((content) => {
                    if (Math.random() < 0.15) {
                        const { width, height } = this.calculateCodeDimensions(400, 250);
                        content.textContent = this.generateCode(width, height);
                    }
                });
            }

            populateCardLine() {
                this.cardLine.innerHTML = "";
                const cardsCount = 30;
                for (let i = 0; i < cardsCount; i++) {
                    const cardWrapper = this.createCardWrapper(i);
                    this.cardLine.appendChild(cardWrapper);
                }
            }

            startPeriodicUpdates() {
                this.asciiInterval = setInterval(() => {
                    this.updateAsciiContent();
                }, 200);

                const updateClipping = () => {
                    this.updateCardClipping();
                    this.clippingFrame = requestAnimationFrame(updateClipping);
                };
                updateClipping();
            }

            destroy() {
                if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
                if (this.clippingFrame) cancelAnimationFrame(this.clippingFrame);
                if (this.asciiInterval) clearInterval(this.asciiInterval);
                // TODO: Remove event listeners
            }
        }
        
        class ParticleSystem {
            constructor(canvas) {
                this.scene = null;
                this.camera = null;
                this.renderer = null;
                this.particles = null;
                this.particleCount = 400;
                this.canvas = canvas;

                this.init();
            }

            init() {
                this.scene = new THREE.Scene();

                this.camera = new THREE.OrthographicCamera(
                    -window.innerWidth / 2,
                    window.innerWidth / 2,
                    125,
                    -125,
                    1,
                    1000
                );
                this.camera.position.z = 100;

                this.renderer = new THREE.WebGLRenderer({
                    canvas: this.canvas,
                    alpha: true,
                    antialias: true,
                });
                this.renderer.setSize(window.innerWidth, 250);
                this.renderer.setClearColor(0x000000, 0);

                this.createParticles();

                this.animate();

                window.addEventListener("resize", () => this.onWindowResize());
            }

            createParticles() {
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(this.particleCount * 3);
                const colors = new Float32Array(this.particleCount * 3);
                const sizes = new Float32Array(this.particleCount);
                const velocities = new Float32Array(this.particleCount);

                const canvas = document.createElement("canvas");
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext("2d");

                const half = canvas.width / 2;
                const hue = 270; // Re-themed to purple

                const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
                gradient.addColorStop(0.025, "#fff");
                gradient.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
                gradient.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`);
                gradient.addColorStop(1, "transparent");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(half, half, half, 0, Math.PI * 2);
                ctx.fill();

                const texture = new THREE.CanvasTexture(canvas);

                for (let i = 0; i < this.particleCount; i++) {
                    positions[i * 3] = (Math.random() - 0.5) * window.innerWidth * 2;
                    positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
                    positions[i * 3 + 2] = 0;

                    colors[i * 3] = 1;
                    colors[i * 3 + 1] = 1;
                    colors[i * 3 + 2] = 1;

                    const orbitRadius = Math.random() * 200 + 100;
                    sizes[i] = (Math.random() * (orbitRadius - 60) + 60) / 8;

                    velocities[i] = Math.random() * 60 + 30;
                }

                geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
                geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

                this.velocities = velocities;

                const alphas = new Float32Array(this.particleCount);
                for (let i = 0; i < this.particleCount; i++) {
                    alphas[i] = (Math.random() * 8 + 2) / 10;
                }
                geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
                this.alphas = alphas;

                const material = new THREE.ShaderMaterial({
                    uniforms: {
                        pointTexture: { value: texture },
                        size: { value: 15.0 },
                    },
                    vertexShader: `
                        attribute float alpha;
                        varying float vAlpha;
                        varying vec3 vColor;
                        uniform float size;
                        
                        void main() {
                            vAlpha = alpha;
                            vColor = color;
                            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                            gl_PointSize = size;
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D pointTexture;
                        varying float vAlpha;
                        varying vec3 vColor;
                        
                        void main() {
                            gl_FragColor = vec4(vColor, vAlpha) * texture2D(pointTexture, gl_PointCoord);
                        }
                    `,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    vertexColors: true,
                });

                this.particles = new THREE.Points(geometry, material);
                this.scene.add(this.particles);
            }

            animate() {
                this.animationId = requestAnimationFrame(() => this.animate());

                if (this.particles) {
                    const positions = this.particles.geometry.attributes.position.array;
                    const alphas = this.particles.geometry.attributes.alpha.array;
                    const time = Date.now() * 0.001;

                    for (let i = 0; i < this.particleCount; i++) {
                        positions[i * 3] += this.velocities[i] * 0.016;

                        if (positions[i * 3] > window.innerWidth / 2 + 100) {
                            positions[i * 3] = -window.innerWidth / 2 - 100;
                            positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
                        }

                        positions[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.5;

                        const twinkle = Math.floor(Math.random() * 10);
                        if (twinkle === 1 && alphas[i] > 0) {
                            alphas[i] -= 0.05;
                        } else if (twinkle === 2 && alphas[i] < 1) {
                            alphas[i] += 0.05;
                        }

                        alphas[i] = Math.max(0, Math.min(1, alphas[i]));
                    }

                    this.particles.geometry.attributes.position.needsUpdate = true;
                    this.particles.geometry.attributes.alpha.needsUpdate = true;
                }

                this.renderer.render(this.scene, this.camera);
            }

            onWindowResize() {
                this.camera.left = -window.innerWidth / 2;
                this.camera.right = window.innerWidth / 2;
                this.camera.updateProjectionMatrix();

                this.renderer.setSize(window.innerWidth, 250);
            }

            destroy() {
                if(this.animationId) cancelAnimationFrame(this.animationId);
                if (this.renderer) {
                    this.renderer.dispose();
                }
                if (this.particles) {
                    this.scene.remove(this.particles);
                    this.particles.geometry.dispose();
                    this.particles.material.dispose();
                }
            }
        }

        class ParticleScanner {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = this.canvas.getContext("2d");
                this.animationId = null;

                this.w = window.innerWidth;
                this.h = 300;
                this.particles = [];
                this.count = 0;
                this.maxParticles = 800;
                this.intensity = 0.8;
                this.lightBarX = this.w / 2;
                this.lightBarWidth = 3;
                this.fadeZone = 60;

                this.scanTargetIntensity = 1.8;
                this.scanTargetParticles = 2500;
                this.scanTargetFadeZone = 35;

                this.scanningActive = false;

                this.baseIntensity = this.intensity;
                this.baseMaxParticles = this.maxParticles;
                this.baseFadeZone = this.fadeZone;

                this.currentIntensity = this.intensity;
                this.currentMaxParticles = this.maxParticles;
                this.currentFadeZone = this.fadeZone;
                this.transitionSpeed = 0.05;

                this.setupCanvas();
                this.createGradientCache();
                this.initParticles();
                this.animate();

                window.addEventListener("resize", () => this.onResize());
            }

            setupCanvas() {
                this.canvas.width = this.w;
                this.canvas.height = this.h;
                this.canvas.style.width = this.w + "px";
                this.canvas.style.height = this.h + "px";
                this.ctx.clearRect(0, 0, this.w, this.h);
            }

            onResize() {
                this.w = window.innerWidth;
                this.lightBarX = this.w / 2;
                this.setupCanvas();
            }

            createGradientCache() {
                this.gradientCanvas = document.createElement("canvas");
                this.gradientCtx = this.gradientCanvas.getContext("2d");
                this.gradientCanvas.width = 16;
                this.gradientCanvas.height = 16;

                const half = this.gradientCanvas.width / 2;
                const gradient = this.gradientCtx.createRadialGradient(
                    half,
                    half,
                    0,
                    half,
                    half,
                    half
                );
                gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
                gradient.addColorStop(0.3, "rgba(196, 181, 253, 0.8)"); // light purple
                gradient.addColorStop(0.7, "rgba(139, 92, 246, 0.4)"); // purple
                gradient.addColorStop(1, "transparent");

                this.gradientCtx.fillStyle = gradient;
                this.gradientCtx.beginPath();
                this.gradientCtx.arc(half, half, half, 0, Math.PI * 2);
                this.gradientCtx.fill();
            }

            random(min, max) {
                if (arguments.length < 2) {
                    max = min;
                    min = 0;
                }
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }

            randomFloat(min, max) {
                return Math.random() * (max - min) + min;
            }

            createParticle() {
                const intensityRatio = this.intensity / this.baseIntensity;
                const speedMultiplier = 1 + (intensityRatio - 1) * 1.2;
                const sizeMultiplier = 1 + (intensityRatio - 1) * 0.7;

                return {
                    x:
                        this.lightBarX +
                        this.randomFloat(-this.lightBarWidth / 2, this.lightBarWidth / 2),
                    y: this.randomFloat(0, this.h),

                    vx: this.randomFloat(0.2, 1.0) * speedMultiplier,
                    vy: this.randomFloat(-0.15, 0.15) * speedMultiplier,

                    radius: this.randomFloat(0.4, 1) * sizeMultiplier,
                    alpha: this.randomFloat(0.6, 1),
                    decay: this.randomFloat(0.005, 0.025) * (2 - intensityRatio * 0.5),
                    originalAlpha: 0,
                    life: 1.0,
                    time: 0,
                    startX: 0,

                    twinkleSpeed: this.randomFloat(0.02, 0.08) * speedMultiplier,
                    twinkleAmount: this.randomFloat(0.1, 0.25),
                };
            }

            initParticles() {
                for (let i = 0; i < this.maxParticles; i++) {
                    const particle = this.createParticle();
                    particle.originalAlpha = particle.alpha;
                    particle.startX = particle.x;
                    this.count++;
                    this.particles[this.count] = particle;
                }
            }

            updateParticle(particle) {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.time++;

                particle.alpha =
                    particle.originalAlpha * particle.life +
                    Math.sin(particle.time * particle.twinkleSpeed) * particle.twinkleAmount;

                particle.life -= particle.decay;

                if (particle.x > this.w + 10 || particle.life <= 0) {
                    this.resetParticle(particle);
                }
            }

            resetParticle(particle) {
                particle.x =
                    this.lightBarX +
                    this.randomFloat(-this.lightBarWidth / 2, this.lightBarWidth / 2);
                particle.y = this.randomFloat(0, this.h);
                particle.vx = this.randomFloat(0.2, 1.0);
                particle.vy = this.randomFloat(-0.15, 0.15);
                particle.alpha = this.randomFloat(0.6, 1);
                particle.originalAlpha = particle.alpha;
                particle.life = 1.0;
                particle.time = 0;
                particle.startX = particle.x;
            }

            drawParticle(particle) {
                if (particle.life <= 0) return;

                let fadeAlpha = 1;

                if (particle.y < this.fadeZone) {
                    fadeAlpha = particle.y / this.fadeZone;
                } else if (particle.y > this.h - this.fadeZone) {
                    fadeAlpha = (this.h - particle.y) / this.fadeZone;
                }

                fadeAlpha = Math.max(0, Math.min(1, fadeAlpha));

                this.ctx.globalAlpha = particle.alpha * fadeAlpha;
                this.ctx.drawImage(
                    this.gradientCanvas,
                    particle.x - particle.radius,
                    particle.y - particle.radius,
                    particle.radius * 2,
                    particle.radius * 2
                );
            }

            drawLightBar() {
                const verticalGradient = this.ctx.createLinearGradient(0, 0, 0, this.h);
                verticalGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
                verticalGradient.addColorStop(
                    this.fadeZone / this.h,
                    "rgba(255, 255, 255, 1)"
                );
                verticalGradient.addColorStop(
                    1 - this.fadeZone / this.h,
                    "rgba(255, 255, 255, 1)"
                );
                verticalGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

                this.ctx.globalCompositeOperation = "lighter";

                const targetGlowIntensity = this.scanningActive ? 3.5 : 1;

                if (!this.currentGlowIntensity) this.currentGlowIntensity = 1;

                this.currentGlowIntensity +=
                    (targetGlowIntensity - this.currentGlowIntensity) * this.transitionSpeed;

                const glowIntensity = this.currentGlowIntensity;
                const lineWidth = this.lightBarWidth;
                const glow1Alpha = this.scanningActive ? 1.0 : 0.8;
                const glow2Alpha = this.scanningActive ? 0.8 : 0.6;
                const glow3Alpha = this.scanningActive ? 0.6 : 0.4;

                const coreGradient = this.ctx.createLinearGradient(
                    this.lightBarX - lineWidth / 2,
                    0,
                    this.lightBarX + lineWidth / 2,
                    0
                );
                coreGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
                coreGradient.addColorStop(
                    0.3,
                    `rgba(255, 255, 255, ${0.9 * glowIntensity})`
                );
                coreGradient.addColorStop(0.5, `rgba(255, 255, 255, ${1 * glowIntensity})`);
                coreGradient.addColorStop(
                    0.7,
                    `rgba(255, 255, 255, ${0.9 * glowIntensity})`
                );
                coreGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

                this.ctx.globalAlpha = 1;
                this.ctx.fillStyle = coreGradient;

                const radius = 15;
                this.ctx.beginPath();
                this.ctx.roundRect(
                    this.lightBarX - lineWidth / 2,
                    0,
                    lineWidth,
                    this.h,
                    radius
                );
                this.ctx.fill();

                const glow1Gradient = this.ctx.createLinearGradient(
                    this.lightBarX - lineWidth * 2,
                    0,
                    this.lightBarX + lineWidth * 2,
                    0
                );
                glow1Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
                glow1Gradient.addColorStop(
                    0.5,
                    `rgba(196, 181, 253, ${0.8 * glowIntensity})`
                );
                glow1Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

                this.ctx.globalAlpha = glow1Alpha;
                this.ctx.fillStyle = glow1Gradient;

                const glow1Radius = 25;
                this.ctx.beginPath();
                this.ctx.roundRect(
                    this.lightBarX - lineWidth * 2,
                    0,
                    lineWidth * 4,
                    this.h,
                    glow1Radius
                );
                this.ctx.fill();

                const glow2Gradient = this.ctx.createLinearGradient(
                    this.lightBarX - lineWidth * 4,
                    0,
                    this.lightBarX + lineWidth * 4,
                    0
                );
                glow2Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
                glow2Gradient.addColorStop(
                    0.5,
                    `rgba(139, 92, 246, ${0.4 * glowIntensity})`
                );
                glow2Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

                this.ctx.globalAlpha = glow2Alpha;
                this.ctx.fillStyle = glow2Gradient;

                const glow2Radius = 35;
                this.ctx.beginPath();
                this.ctx.roundRect(
                    this.lightBarX - lineWidth * 4,
                    0,
                    lineWidth * 8,
                    this.h,
                    glow2Radius
                );
                this.ctx.fill();

                if (this.scanningActive) {
                    const glow3Gradient = this.ctx.createLinearGradient(
                        this.lightBarX - lineWidth * 8,
                        0,
                        this.lightBarX + lineWidth * 8,
                        0
                    );
                    glow3Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
                    glow3Gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.2)");
                    glow3Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

                    this.ctx.globalAlpha = glow3Alpha;
                    this.ctx.fillStyle = glow3Gradient;

                    const glow3Radius = 45;
                    this.ctx.beginPath();
                    this.ctx.roundRect(
                        this.lightBarX - lineWidth * 8,
                        0,
                        lineWidth * 16,
                        this.h,
                        glow3Radius
                    );
                    this.ctx.fill();
                }

                this.ctx.globalCompositeOperation = "destination-in";
                this.ctx.globalAlpha = 1;
                this.ctx.fillStyle = verticalGradient;
                this.ctx.fillRect(0, 0, this.w, this.h);
            }

            render() {
                const targetIntensity = this.scanningActive
                    ? this.scanTargetIntensity
                    : this.baseIntensity;
                const targetMaxParticles = this.scanningActive
                    ? this.scanTargetParticles
                    : this.baseMaxParticles;
                const targetFadeZone = this.scanningActive
                    ? this.scanTargetFadeZone
                    : this.baseFadeZone;

                this.currentIntensity +=
                    (targetIntensity - this.currentIntensity) * this.transitionSpeed;
                this.currentMaxParticles +=
                    (targetMaxParticles - this.currentMaxParticles) * this.transitionSpeed;
                this.currentFadeZone +=
                    (targetFadeZone - this.currentFadeZone) * this.transitionSpeed;

                this.intensity = this.currentIntensity;
                this.maxParticles = Math.floor(this.currentMaxParticles);
                this.fadeZone = this.currentFadeZone;

                this.ctx.globalCompositeOperation = "source-over";
                this.ctx.clearRect(0, 0, this.w, this.h);

                this.drawLightBar();

                this.ctx.globalCompositeOperation = "lighter";
                for (let i = 1; i <= this.count; i++) {
                    if (this.particles[i]) {
                        this.updateParticle(this.particles[i]);
                        this.drawParticle(this.particles[i]);
                    }
                }

                const currentIntensity = this.intensity;
                const currentMaxParticles = this.maxParticles;
                
                // <<< FIX 1: Defined intensityRatio here
                const intensityRatio = this.intensity / this.baseIntensity;

                if (Math.random() < currentIntensity && this.count < currentMaxParticles) {
                    const particle = this.createParticle();
                    particle.originalAlpha = particle.alpha;
                    particle.startX = particle.x;
                    this.count++;
                    this.particles[this.count] = particle;
                }

                // ... (rest of particle generation logic) ...
                if (intensityRatio > 1.1 && Math.random() < (intensityRatio - 1.0) * 1.2) {
                    const particle = this.createParticle();
                    particle.originalAlpha = particle.alpha;
                    particle.startX = particle.x;
                    this.count++;
                    this.particles[this.count] = particle;
                }

                if (intensityRatio > 1.3 && Math.random() < (intensityRatio - 1.3) * 1.4) {
                    const particle = this.createParticle();
                    particle.originalAlpha = particle.alpha;
                    particle.startX = particle.x;
                    this.count++;
                    this.particles[this.count] = particle;
                }

                if (intensityRatio > 1.5 && Math.random() < (intensityRatio - 1.5) * 1.8) {
                    const particle = this.createParticle();
                    particle.originalAlpha = particle.alpha;
                    particle.startX = particle.x;
                    this.count++;
                    this.particles[this.count] = particle;
                }

                if (intensityRatio > 2.0 && Math.random() < (intensityRatio - 2.0) * 2.0) {
                    const particle = this.createParticle();
                    particle.originalAlpha = particle.alpha;
                    particle.startX = particle.x;
                    this.count++;
                    this.particles[this.count] = particle;
                }


                if (this.count > currentMaxParticles + 200) {
                    const excessCount = Math.min(15, this.count - currentMaxParticles);
                    for (let i = 0; i < excessCount; i++) {
                        delete this.particles[this.count - i];
                    }
                    this.count -= excessCount;
                }
            }

            animate() {
                this.render();
                this.animationId = requestAnimationFrame(() => this.animate());
            }

            startScanning() {
                this.scanningActive = true;
            }

            stopScanning() {
                this.scanningActive = false;
            }

            setScanningActive(active) {
                this.scanningActive = active;
            }

            getStats() {
                return {
                    intensity: this.intensity,
                    maxParticles: this.maxParticles,
                    currentParticles: this.count,
                    lightBarWidth: this.lightBarWidth,
                    fadeZone: this.fadeZone,
                    scanningActive: this.scanningActive,
                    canvasWidth: this.w,
                    canvasHeight: this.h,
                };
            }

            destroy() {
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                }
                this.particles = [];
                this.count = 0;
            }
        }
        
        // --- Initialization ---
        
        // Ensure all refs are current before initializing
        if (
            cardStreamRef.current &&
            cardLineRef.current &&
            // REMOVED speedValueRef.current check
            particleCanvasRef.current &&
            scannerCanvasRef.current
        ) {
            const cardStream = new CardStreamController(
                cardStreamRef.current,
                cardLineRef.current,
                null // PASSED null for speedIndicator
            );
            cardStreamInstanceRef.current = cardStream;

            const particleSystem = new ParticleSystem(particleCanvasRef.current);
            particleSystemInstanceRef.current = particleSystem;

            const particleScanner = new ParticleScanner(scannerCanvasRef.current);
            particleScannerInstanceRef.current = particleScanner;

            window.setScannerScanning = (active) => {
                if (particleScanner) {
                    particleScanner.setScanningActive(active);
                }
            };

            window.getScannerStats = () => {
                if (particleScanner) {
                    return particleScanner.getStats();
                }
                return null;
            };
            
            // Cleanup function
            return () => {
                cardStream.destroy();
                particleSystem.destroy();
                particleScanner.destroy();
                delete window.setScannerScanning;
                delete window.getScannerStats;
            };
        }

    }, []); // Empty dependency array to run only once on mount

    return (
        <section className="card-stream-section">
            <SectionHeader
                title="Meet our team"
                subtitle="Don’t just use SAYANA — meet the people who make it possible. The passionate team driving intelligence, creativity, and innovation forward."
            />

            {/* REMOVED controls and speed-indicator divs */}

            <div className="card-stream-container" ref={cardStreamContainerRef}>
                <canvas id="particleCanvas" ref={particleCanvasRef}></canvas>
                <canvas id="scannerCanvas" ref={scannerCanvasRef}></canvas>

                <div className="scanner"></div>

                <div className="card-stream" id="cardStream" ref={cardStreamRef}>
                    <div className="card-line" id="cardLine" ref={cardLineRef}></div>
                </div>
            </div>

            {/* REMOVED Inspiration Credit div */}
        </section>
    );
};


// --- OLD TESTIMONIALS SECTION (REPLACED) ---
/*
const TestimonialCard = ({ name, role, quote, stars }) => (
  <motion.div
    className="flex-shrink-0 w-[300px] sm:w-[350px] p-8 rounded-3xl bg-white/5 backdrop-blur-md shadow-lg shadow-black/20 border border-white/10"
  >
    <div className="flex mb-4">
      {[...Array(stars)].map((_, i) => (
        <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
      ))}
    </div>
    <p className="text-lg text-white mb-6 italic">"{quote}"</p>
    <div>
      <h4 className="text-lg font-bold text-white">{name}</h4>
      <p className="text-sm text-white/70">{role}</p>
    </div>
  </motion.div>
);

const TestimonialsSection = () => {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 pt-24 sm:px-10 overflow-hidden">
      <SectionHeader
        title="Loved by Our Community"
        subtitle="Don't just take our word for it. Hear from the families, educators, and users who are part of the SAYANA story."
      />
      <motion.div className="w-full">
        <motion.div
          className="flex gap-8 pb-8"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 40,
            ease: "linear",
            repeat: Infinity,
            repeatType: "mirror"
          }}
        >
          {[...testimonials, ...testimonials].map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};
*/

const MissionSection = () => (
  <section className="w-full bg-transparent mt-24 py-24">
    <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 grid md:grid-cols-2 gap-12 items-center">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeIn}
      >
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">Our Mission</h2>
        <p className="text-lg text-white/80 mb-4">
          At SAYANA, our mission is to build a world where every voice, whether spoken, signed, or expressed, is heard and understood. We believe in the power of technology to break down barriers.
        </p>
        <p className="text-lg text-white/80">
          We are committed to creating empathetic, accessible, and secure tools that empower the deaf and mute communities. Silence speaks, and we're here to translate.
        </p>
      </motion.div>
      <motion.div
        className="flex items-center justify-center p-8"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <HandSignIcon type="love" className="w-48 h-48 sm:w-64 sm:h-64 text-white/60" />
      </motion.div>
    </div>
  </section>
);

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      className="faq-card"
      variants={fadeIn}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="faq-question-btn"
      >
        <h3 className="text-lg font-semibold">{question}</h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDownIcon className="w-6 h-6 text-white/70" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-4"
          >
            <p className="text-white/80">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FAQSection = () => (
  <section className="w-full max-w-4xl mx-auto px-6 pt-24 sm:px-10">
    <SectionHeader
      title="Frequently Asked Questions"
      subtitle="Have questions? We have answers. Find out more about the most common inquiries about SAYANA."
    />
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {faqData.map((faq, index) => (
        <FAQItem key={index} question={faq.question} answer={faq.answer} />
      ))}
    </motion.div>
  </section>
);

// CTASection removed per request (Ready to Start section not needed)

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I\'m Sayan, the SAYANA assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { from: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

      const systemPrompt = "You are 'Sayan,' the friendly and helpful chatbot for SAYANA. SAYANA is an application that empowers deaf and mute users through AI-powered emotion detection, real-time sign language translation, secure conversations, and multilingual support. Your *only* job is to answer questions about SAYANA's features, accessibility, technology, and mission. Be empathetic, clear, and concise. **Strictly refuse to answer any questions or engage in any conversation that is not about SAYANA.** If asked about anything else, politely redirect the user back to SAYANA's features. For example: 'I'm here to help with any questions you have about SAYANA. How can I tell you more about our AI translation features?'";

      const userQuery = input;
      const token = localStorage.getItem('token');
      const endpoint = token ? `${API_BASE}/api/agent/query` : `${API_BASE}/api/agent/query/public`;

      const payload = {
        prompt: userQuery,
        history: messages.slice(-8),
        systemPrompt,
      };

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const result = await fetchWithBackoff(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        // Accept several possible response shapes from the backend proxy
        const botText = result?.text || result?.reply || result?.message || result?.output || result?.outputText || (result?.candidates?.[0]?.content?.parts?.[0]?.text) || null;
        if (botText) {
          setMessages(prev => [...prev, { from: 'bot', text: botText }]);
        } else {
          console.error('Unexpected agent response:', result);
          setMessages(prev => [...prev, { from: 'bot', text: "Sorry, I'm having a little trouble. Could you try asking that again?" }]);
        }
      } catch (error) {
        console.error('Error calling agent proxy:', error);
        setMessages(prev => [...prev, { from: 'bot', text: "I seem to be having connection issues. Please try again in a moment." }]);
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <>
      {/* Chat Bubble */}
      <motion.button
        className="fixed z-50 bottom-8 right-8 w-16 h-16 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
      >
        <ChatIcon className="w-8 h-8" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed z-50 bottom-28 right-8 w-full max-w-md h-[70vh] max-h-[600px] bg-gray-900 rounded-3xl shadow-xl flex flex-col overflow-hidden border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="text-xl font-bold text-white">Chat with Sayana AI</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl ${
                      msg.from === 'user'
                        ? 'bg-purple-600 text-white rounded-br-lg'
                        : 'bg-gray-700 text-gray-200 rounded-bl-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-xs px-4 py-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                  placeholder="Ask about SAYANA..."
                  className="flex-1 px-4 py-3 rounded-full border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 bg-gray-800 text-white"
                  disabled={isLoading}
                />
                <motion.button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center disabled:opacity-50"
                  whileHover={{ scale: isLoading ? 1 : 1.1 }}
                  whileTap={{ scale: isLoading ? 1 : 0.9 }}
                >
                  <SendIcon className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- Sayana Content Component ---
const SayanaContent = () => {
  const navigate = useNavigate();

  const handleScrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div
      className="absolute top-0 left-0 z-10 w-full h-full overflow-y-auto font-sans text-white"
    >
      {/* Background Floating Icons */}
      <div className="absolute inset-0 z-0">
        {floatingIcons.map((item) => (
          <motion.div
            key={item.id}
            className="absolute text-purple-400 opacity-60" // Re-themed
            style={{
              top: item.top,
              left: item.left,
              width: item.size,
              height: item.size,
            }}
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="w-full px-6 sm:px-10 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center text-3xl font-bold text-white">
              <img src="https://agno.blob.core.windows.net/dream-images/Image%20of.png" alt="SAYANA logo" className="w-10 h-10 mr-3 rounded-md object-contain" />
              <span>SAYANA</span>
            </div>
            <motion.button
              onClick={() => navigate('/auth')}
              className="hidden sm:block rounded-full bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-all"
              whileHover={{ scale: 1.05, shadow: "0px 5px 20px rgba(0, 0, 0, 0.2)", backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.95 }}
              transition={buttonSpring}
            >
              Get Started
            </motion.button>
          </motion.div>
        </header>

        {/* Hero Section */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 text-center min-h-[calc(100vh-100px)] pt-20 pb-32">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-8xl"
          >
            Where Silence Speaks
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-4 max-w-xl text-lg text-white/80 sm:text-2xl"
          >
            Empowering expression beyond sound and words
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <motion.button
              onClick={() => navigate('/auth')}
              className="rounded-full bg-purple-600 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-purple-600/30 transition-all"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={buttonSpring}
            >
              Get Started
            </motion.button>
            <motion.button
              onClick={() => handleScrollTo('how-it-works')}
              className="rounded-full bg-white/5 backdrop-blur-md border border-white/10 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-black/20 transition-all"
              whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.95 }}
              transition={buttonSpring}
            >
              How It Works
            </motion.button>
          </motion.div>
        </main>

        {/* Features Section */}
        <section className="w-full max-w-7xl mx-auto px-6 pt-16 pb-24 sm:px-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
            className="mx-auto mb-16 max-w-3xl text-center text-xl text-white/90"
          >
            SAYANA bridges emotion and understanding through AI-powered sign and facial translation — making silence heard worldwide.
          </motion.p>
          
          <motion.div
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                className="flex flex-col items-center rounded-3xl bg-white/5 backdrop-blur-md shadow-lg shadow-black/20 border border-white/10 p-8 text-center sm:items-start sm:text-left"
                variants={cardVariants}
              >
                <FeatureIcon type={feature.icon} />
                <h3 className="mb-3 text-2xl font-bold text-white">
                  {feature.title}
                </h3>
                <p className="text-white/80">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* --- NEW SECTIONS ADDED --- */}
        <HowItWorksSection />
  <TechnologySection onGetStartedClick={() => navigate('/auth')} />
        
        {/* <TestimonialsSection />  -- This is now replaced */}
        <CardStreamSection />

    <MissionSection />
    <FAQSection />
        {/* --- END OF NEW SECTIONS --- */}


        {/* Footer */}
        <footer className="py-10 text-center text-white/60">
          © {new Date().getFullYear()} SAYANA. All rights reserved.
        </footer>
      </div>

      {/* Chatbot Component */}
      <Chatbot />
    </div>
  );
}


// --- Main App Component ---
export default function App() {
  return (
    <React.Fragment>
      <GlobalStyles />
      <MorphingBackground />
      <ToastContainer position="bottom-right" theme="dark" newestOnTop closeOnClick pauseOnFocusLoss={false} />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/our" element={<OurApp />} />
        <Route path="/" element={<SayanaContent />} />
      </Routes>
    </React.Fragment>
  );
}