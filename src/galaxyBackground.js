import * as THREE from "three";

export function createGalaxyBackground(scene) {

    // ── Galaxy plane — full GLSL shader ─────────────────────────
    const galaxyMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            #define PI 3.14159265

            float hash(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+19.19); return fract(p.x*p.y); }
            float noise(vec2 p){
                vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
                return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
            }
            float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.5;} return v; }

            void main() {
                // Map UV to centered coords, apply elliptical shape like reference
                vec2 uv = vUv - 0.5;

                // Slow rotation
                float rot = uTime * 0.012;
                uv = vec2(cos(rot)*uv.x - sin(rot)*uv.y, sin(rot)*uv.x + cos(rot)*uv.y);

                // Flatten to ellipse — reference has ~3:1 width:height ratio
                vec2 uvEllipse = vec2(uv.x, uv.y * 3.2);
                float r = length(uvEllipse);         // elliptical radius
                float rRaw = length(uv);             // true radius for cutoff

                float theta = atan(uv.y, uv.x);

                // ── CORE: soft oval, warm white center → orange-red mid ──
                float core     = exp(-r*r*38.0);                    // tight bright center
                float coreWide = exp(-r*r*7.0);                     // orange glow zone
                float coreFar  = exp(-rRaw*rRaw*4.5);               // faint outer warmth

                vec3 coreWhite  = vec3(1.00, 0.97, 0.88);
                vec3 coreOrange = vec3(0.88, 0.45, 0.15);
                vec3 coreRed    = vec3(0.55, 0.20, 0.08);

                vec3 coreCol = coreWhite;
                coreCol = mix(coreCol, coreOrange, smoothstep(0.0, 0.18, r));
                coreCol = mix(coreCol, coreRed,    smoothstep(0.12, 0.32, r));

                // ── SPIRAL ARMS: 4 arms, blue, wide ──────────────────
                // Arms use true UV not elliptical for natural spiral shape
                float tight = 4.2;
                float arm1 = exp(-pow(mod(theta - tight*log(max(length(uv),0.001)) + PI,       2.0*PI)-PI, 2.0)*10.0) * exp(-rRaw*2.2);
                float arm2 = exp(-pow(mod(theta - tight*log(max(length(uv),0.001)) + PI + PI,  2.0*PI)-PI, 2.0)*10.0) * exp(-rRaw*2.2);
                float arm3 = exp(-pow(mod(theta - tight*log(max(length(uv),0.001)) + PI*0.5,   2.0*PI)-PI, 2.0)*10.0) * exp(-rRaw*2.8) * 0.5;
                float arm4 = exp(-pow(mod(theta - tight*log(max(length(uv),0.001)) + PI*1.5,   2.0*PI)-PI, 2.0)*10.0) * exp(-rRaw*2.8) * 0.5;
                float arms = arm1 + arm2 + arm3 + arm4;

                // Turbulence — gives arms fluffy irregular edges
                vec2 noiseUv = uv * 4.0 + vec2(uTime*0.003, uTime*0.002);
                float turb = fbm(noiseUv);
                arms *= 0.5 + turb * 0.9;

                // Arm color: deep blue outer → blue-white mid → warm near core
                vec3 armBlue  = vec3(0.05, 0.18, 0.75);
                vec3 armMid   = vec3(0.30, 0.55, 1.00);
                vec3 armWarm  = vec3(0.80, 0.72, 0.55);
                vec3 armCol   = mix(armBlue, armMid, smoothstep(0.4, 0.1, rRaw));
                armCol        = mix(armCol,  armWarm, coreWide * 0.7);

                // ── DUST LANES: dark bands between spiral arms ────────
                float dustA = theta - tight * log(max(length(uv), 0.001));
                float dust1 = smoothstep(0.07, 0.0, abs(sin(dustA + 0.5))) * exp(-rRaw * 4.0);
                float dust2 = smoothstep(0.07, 0.0, abs(sin(dustA + PI + 0.7))) * exp(-rRaw * 4.0);
                float dust  = (dust1 + dust2) * 0.7;

                // ── OUTER HALO ────────────────────────────────────────
                float halo    = exp(-rRaw*rRaw*2.2) * 0.08;
                vec3  haloCol = vec3(0.05, 0.09, 0.30);

                // ── COMBINE ───────────────────────────────────────────
                vec3 col = vec3(0.0);
                col += coreCol * (core * 3.5 + coreWide * 0.8 + coreFar * 0.15);
                col += armCol  * arms * 2.2;
                col -= vec3(0.03, 0.02, 0.01) * dust * 25.0;  // darken dust lanes
                col += haloCol * halo;

                // Alpha: fade at ellipse edge, hard cutoff beyond
                float edgeFade = smoothstep(0.50, 0.22, rRaw);
                float alpha = clamp(core*3.0 + arms*2.0 + coreWide*0.6 + halo, 0.0, 1.0) * edgeFade;

                gl_FragColor = vec4(col, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });

    // Galaxy plane: wide, flat, tilted — far back
    const galaxyPlane = new THREE.Mesh(new THREE.PlaneGeometry(72, 28), galaxyMat);
    galaxyPlane.position.set(1, 9, -38);
    galaxyPlane.rotation.x = 0.22;   // tilt to match reference perspective
    galaxyPlane.rotation.z = -0.08;  // slight roll
    scene.add(galaxyPlane);

    // ── Foreground stars ─────────────────────────────────────────
    // 2000 background + 70 bright with spike glow — scattered like reference
    const sCount  = 2000;
    const sBright = 70;
    const sPos    = new Float32Array(sCount * 3);
    const sCol    = new Float32Array(sCount * 3);
    const sSize   = new Float32Array(sCount);

    for (let i = 0; i < sCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 36 + Math.random() * 24;
        sPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        sPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        sPos[i*3+2] = r * Math.cos(phi);

        const type = Math.random();
        if (type < 0.30) {
            // Blue-white stars (dominant in reference)
            sCol[i*3]=0.55+Math.random()*0.3; sCol[i*3+1]=0.78+Math.random()*0.18; sCol[i*3+2]=1.0;
        } else if (type < 0.40) {
            // Warm orange stars
            sCol[i*3]=1.0; sCol[i*3+1]=0.72+Math.random()*0.15; sCol[i*3+2]=0.35+Math.random()*0.25;
        } else {
            // Pure white
            sCol[i*3]=0.90+Math.random()*0.10; sCol[i*3+1]=0.93+Math.random()*0.07; sCol[i*3+2]=1.0;
        }
        sSize[i] = i < sBright ? 2.2 + Math.random() * 3.0 : 0.10 + Math.random() * 0.28;
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("color",    new THREE.BufferAttribute(sCol, 3));
    sGeo.setAttribute("size",     new THREE.BufferAttribute(sSize, 1));

    const sMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float size; attribute vec3 color;
            varying vec3 vColor; varying float vSize;
            uniform float uTime;
            void main() {
                vColor=color; vSize=size;
                vec4 mvPos=modelViewMatrix*vec4(position,1.0);
                float tw=1.0+0.20*sin(uTime*2.5+position.x*13.1+position.z*8.3);
                gl_PointSize=size*tw*(270.0/-mvPos.z);
                gl_Position=projectionMatrix*mvPos;
            }
        `,
        fragmentShader: `
            varying vec3 vColor; varying float vSize;
            void main(){
                vec2 uv=gl_PointCoord-0.5;
                float d=length(uv);
                if(d>0.5) discard;
                float alpha=pow(1.0-smoothstep(0.0,0.5,d),1.2);
                // 4-point cross spike for bright stars
                if(vSize>1.8){
                    float hSpike=exp(-abs(uv.x)*22.0)*exp(-abs(uv.y)*5.0);
                    float vSpike=exp(-abs(uv.y)*22.0)*exp(-abs(uv.x)*5.0);
                    float dSpike=exp(-abs(uv.x+uv.y)*28.0)*exp(-abs(uv.x-uv.y)*8.0)*0.4;
                    alpha=max(alpha, max(hSpike,vSpike)*0.85);
                    alpha=max(alpha, dSpike);
                }
                gl_FragColor=vec4(vColor,alpha);
            }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    });

    const stars = new THREE.Points(sGeo, sMat);
    scene.add(stars);

    // ── Sparse arm particles — 500, placed on spiral curves ──────
    const pCount = 500;
    const pPos   = new Float32Array(pCount * 3);
    const pCol   = new Float32Array(pCount * 3);
    const pSize  = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
        const arm    = Math.floor(Math.random() * 2);
        const t      = 0.08 + Math.random() * 0.88;
        const angle  = t * Math.PI * 4.2 + arm * Math.PI;
        const radius = t * 26.0;
        const sx     = (Math.random()-0.5) * 4.0 * (0.4 + t*0.6);
        const sy     = (Math.random()-0.5) * 0.8 * (1.0-t*0.6);

        // Match galaxy plane position
        pPos[i*3]   =  Math.cos(angle)*radius + sx;
        pPos[i*3+1] =  sy + 9.0;
        pPos[i*3+2] = (Math.sin(angle)*radius*0.38 + sx*0.38) - 38.0;

        const norm = Math.min(radius/26.0, 1.0);
        if (norm < 0.15) {
            pCol[i*3]=1.0; pCol[i*3+1]=0.95; pCol[i*3+2]=0.82;
            pSize[i]=0.9+Math.random()*1.1;
        } else if (norm < 0.5) {
            pCol[i*3]=0.5+Math.random()*0.3; pCol[i*3+1]=0.7+Math.random()*0.2; pCol[i*3+2]=1.0;
            pSize[i]=0.4+Math.random()*0.55;
        } else {
            pCol[i*3]=0.1+Math.random()*0.2; pCol[i*3+1]=0.25+Math.random()*0.2; pCol[i*3+2]=0.75+Math.random()*0.25;
            pSize[i]=0.18+Math.random()*0.3;
        }
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color",    new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute("size",     new THREE.BufferAttribute(pSize, 1));

    const pMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float size; attribute vec3 color;
            varying vec3 vColor; uniform float uTime;
            void main(){
                vColor=color;
                vec4 mvPos=modelViewMatrix*vec4(position,1.0);
                float sh=1.0+0.1*sin(uTime*1.6+position.x*0.4+position.z*0.6);
                gl_PointSize=size*sh*(200.0/-mvPos.z);
                gl_Position=projectionMatrix*mvPos;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main(){
                vec2 uv=gl_PointCoord-0.5; float d=length(uv);
                if(d>0.5) discard;
                float a=pow(1.0-smoothstep(0.0,0.5,d),1.6)*0.8;
                gl_FragColor=vec4(vColor,a);
            }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    });

    const armParticles = new THREE.Points(pGeo, pMat);
    scene.add(armParticles);

    // ── Small companion galaxy (bottom-center in reference) ───────
    const compMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
            varying vec2 vUv;
            void main(){
                vec2 uv=vUv-0.5; uv.y*=2.0;
                float r=length(uv);
                float core=exp(-r*r*50.0);
                float halo=exp(-r*r*10.0)*0.22;
                float alpha=(core+halo)*smoothstep(0.36,0.06,r)*0.9;
                vec3 col=mix(vec3(0.15,0.35,0.95),vec3(1.0,1.0,1.0),core*2.5);
                gl_FragColor=vec4(col,alpha);
            }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const comp = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), compMat);
    comp.position.set(0, 2, -26);
    comp.rotation.x = 0.15;
    scene.add(comp);

    return {
        tick(t) {
            const T = t * 0.001;
            galaxyMat.uniforms.uTime.value = T;
            sMat.uniforms.uTime.value      = T;
            pMat.uniforms.uTime.value      = T;
            stars.rotation.y        = T * 0.006;
            armParticles.rotation.y = T * 0.006;
        }
    };
}
