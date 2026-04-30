import * as THREE from "three";

export function createGalaxyBackground(scene) {

    // ── Galaxy plane — GLSL shader ───────────────────────────────
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
            float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){v+=a*noise(p);p*=2.1;a*=0.5;} return v; }

            void main() {
                vec2 uv = vUv - 0.5;

                // Slow rotation
                float rot = uTime * 0.010;
                uv = vec2(cos(rot)*uv.x - sin(rot)*uv.y, sin(rot)*uv.x + cos(rot)*uv.y);

                // Elliptical — 3:1 ratio like reference
                vec2 uvE = vec2(uv.x, uv.y * 3.0);
                float rE  = length(uvE);   // elliptical radius
                float r   = length(uv);    // true radius

                float theta = atan(uv.y, uv.x);

                // ── Core ──────────────────────────────────────────
                float core      = exp(-rE*rE*32.0);
                float coreGlow  = exp(-rE*rE*6.5);
                float outerWarm = exp(-r*r*3.8);

                vec3 coreCol = mix(
                    vec3(1.00, 0.97, 0.88),   // white center
                    mix(vec3(0.90, 0.50, 0.18), vec3(0.50, 0.15, 0.06), smoothstep(0.1,0.35,rE)),
                    smoothstep(0.0, 0.22, rE)
                );

                // ── Arms: use fbm to make them soft and diffuse ───
                float tight = 3.8;
                float logR  = log(max(r, 0.002));

                // Arm density via fbm-warped angle
                vec2 warpUv = uv * 2.8 + vec2(uTime*0.002);
                float warp  = fbm(warpUv) * 0.35;
                float ang1  = mod(theta - tight*logR + warp + PI,      2.0*PI) - PI;
                float ang2  = mod(theta - tight*logR + warp + PI*2.0,  2.0*PI) - PI;
                float arm1  = exp(-ang1*ang1*7.0) * exp(-r*2.0);
                float arm2  = exp(-ang2*ang2*7.0) * exp(-r*2.0);

                // Soft nebula fill between arms
                float nebula = fbm(uv*3.5 + vec2(uTime*0.003, uTime*0.002)) * exp(-r*2.5) * 0.5;

                float arms = (arm1 + arm2) * 0.7 + nebula;

                // Arm color
                vec3 armBlue = mix(vec3(0.04,0.14,0.72), vec3(0.25,0.50,1.0), smoothstep(0.45,0.05,r));
                armBlue = mix(armBlue, vec3(0.75,0.65,0.50), coreGlow*0.8);

                // ── Dust lanes ────────────────────────────────────
                float dustA = theta - tight*logR;
                float dust  = (smoothstep(0.06,0.0,abs(sin(dustA+0.5))) + smoothstep(0.06,0.0,abs(sin(dustA+PI+0.8)))) * exp(-r*4.5) * 0.65;

                // ── Outer halo ────────────────────────────────────
                float halo = exp(-r*r*1.8) * 0.07;

                // ── Combine ───────────────────────────────────────
                vec3 col = vec3(0.0);
                col += coreCol * (core*3.2 + coreGlow*0.7 + outerWarm*0.12);
                col += armBlue * arms * 2.5;
                col -= vec3(0.028,0.018,0.010) * dust * 22.0;
                col += vec3(0.04,0.08,0.28) * halo;

                float alpha = clamp(core*3.0 + arms*2.2 + coreGlow*0.5 + halo, 0.0, 1.0);
                alpha *= smoothstep(0.50, 0.20, r);

                gl_FragColor = vec4(col, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });

    const galaxyPlane = new THREE.Mesh(new THREE.PlaneGeometry(74, 28), galaxyMat);
    galaxyPlane.position.set(1, 9, -38);
    galaxyPlane.rotation.x = 0.22;
    galaxyPlane.rotation.z = -0.06;
    scene.add(galaxyPlane);

    // ── Stars — dense field like reference ───────────────────────
    // 3000 total: 2700 small background + 300 bright with spikes
    const sTotal  = 3000;
    const sBright = 300;
    const sPos    = new Float32Array(sTotal * 3);
    const sCol    = new Float32Array(sTotal * 3);
    const sSize   = new Float32Array(sTotal);

    for (let i = 0; i < sTotal; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 34 + Math.random() * 26;
        sPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        sPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        sPos[i*3+2] = r * Math.cos(phi);

        const type = Math.random();
        if (type < 0.35) {
            // Blue-white (dominant in reference)
            sCol[i*3]=0.50+Math.random()*0.35; sCol[i*3+1]=0.75+Math.random()*0.20; sCol[i*3+2]=1.0;
        } else if (type < 0.45) {
            // Warm orange
            sCol[i*3]=1.0; sCol[i*3+1]=0.70+Math.random()*0.18; sCol[i*3+2]=0.30+Math.random()*0.28;
        } else {
            // White
            sCol[i*3]=0.88+Math.random()*0.12; sCol[i*3+1]=0.92+Math.random()*0.08; sCol[i*3+2]=1.0;
        }

        if (i < sBright) {
            sSize[i] = 2.5 + Math.random() * 3.5; // large bright stars
        } else {
            sSize[i] = 0.08 + Math.random() * 0.22; // tiny background stars
        }
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
                vec4 mv=modelViewMatrix*vec4(position,1.0);
                float tw=1.0+0.22*sin(uTime*2.5+position.x*11.3+position.z*8.3);
                gl_PointSize=size*tw*(280.0/-mv.z);
                gl_Position=projectionMatrix*mv;
            }
        `,
        fragmentShader: `
            varying vec3 vColor; varying float vSize;
            void main(){
                vec2 uv=gl_PointCoord-0.5;
                float d=length(uv);
                if(d>0.5) discard;
                float alpha=pow(1.0-smoothstep(0.0,0.5,d),1.2);
                if(vSize>2.0){
                    float h=exp(-abs(uv.x)*24.0)*exp(-abs(uv.y)*5.0);
                    float v=exp(-abs(uv.y)*24.0)*exp(-abs(uv.x)*5.0);
                    float d1=exp(-abs(uv.x+uv.y)*30.0)*0.35;
                    float d2=exp(-abs(uv.x-uv.y)*30.0)*0.35;
                    alpha=max(alpha,max(h,v)*0.9);
                    alpha=max(alpha,max(d1,d2));
                }
                gl_FragColor=vec4(vColor,alpha);
            }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    });

    const stars = new THREE.Points(sGeo, sMat);
    scene.add(stars);

    // ── Small companion galaxy ───────────────────────────────────
    const compMat = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
            varying vec2 vUv;
            void main(){
                vec2 uv=vUv-0.5; uv.y*=2.0;
                float r=length(uv);
                float core=exp(-r*r*55.0);
                float halo=exp(-r*r*11.0)*0.20;
                float alpha=(core+halo)*smoothstep(0.36,0.05,r)*0.88;
                vec3 col=mix(vec3(0.12,0.30,0.92),vec3(1.0,1.0,1.0),core*2.8);
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
            stars.rotation.y = T * 0.006;
        }
    };
}
