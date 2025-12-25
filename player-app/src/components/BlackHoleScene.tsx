"use client";

/**
 * Black Hole Scene - Scene content only (no Canvas wrapper) for unified canvas
 * Features: Event horizon, accretion disk, gravitational lensing effect, star field
 */

import { useRef, useMemo, useEffect, forwardRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import {
  BufferGeometry,
  BufferAttribute,
  Points,
  ShaderMaterial,
  Mesh,
  Color,
  Vector3,
  DoubleSide,
  AdditiveBlending,
  SphereGeometry,
  RingGeometry,
  MeshBasicMaterial,
  BackSide,
  Uniform,
} from "three";

interface BlackHoleSceneProps {
  micData?: {
    energy?: number;
    bass?: number;
    mid?: number;
    treble?: number;
    volume?: number;
  };
  blackHoleControls?: {
    intensity?: number;        // Bloom intensity (0-3)
    psychedelia?: number;      // How much bass affects bloom radius (0-2)
    lensingStrength?: number;  // Gravitational lensing (0-10 UI, 0-0.2 actual)
    diskSize?: number;         // Accretion disk outer radius (4-12)
  };
}

// Constants
const BLACK_HOLE_RADIUS = 1.3;
const DISK_INNER_RADIUS = BLACK_HOLE_RADIUS + 0.2;
const DISK_OUTER_RADIUS = 8.0;
const DISK_TILT_ANGLE = Math.PI / 3.0;

// Gravitational Lensing shader
const lensingFragmentShader = `
uniform vec2 blackHoleScreenPos;
uniform float lensingStrength;
uniform float lensingRadius;
uniform float aspectRatio;
uniform float chromaticAberration;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 screenPos = uv;
  vec2 toCenter = screenPos - blackHoleScreenPos;
  toCenter.x *= aspectRatio;
  float dist = length(toCenter);
  
  float distortionAmount = lensingStrength / (dist * dist + 0.003);
  distortionAmount = clamp(distortionAmount, 0.0, 0.7);
  float falloff = smoothstep(lensingRadius, lensingRadius * 0.3, dist);
  distortionAmount *= falloff;
  
  vec2 offset = normalize(toCenter + vec2(0.0001)) * distortionAmount;
  offset.x /= aspectRatio;
  
  vec2 distortedUvR = screenPos - offset * (1.0 + chromaticAberration);
  vec2 distortedUvG = screenPos - offset;
  vec2 distortedUvB = screenPos - offset * (1.0 - chromaticAberration);
  
  float r = texture2D(inputBuffer, distortedUvR).r;
  float g = texture2D(inputBuffer, distortedUvG).g;
  float b = texture2D(inputBuffer, distortedUvB).b;
  
  outputColor = vec4(r, g, b, 1.0);
}
`;

// Custom gravitational lensing effect class
class GravitationalLensingEffect extends Effect {
  constructor({ 
    blackHoleScreenPos = new Vector3(0.5, 0.5, 0),
    lensingStrength = 0.12,
    lensingRadius = 0.3,
    aspectRatio = 1,
    chromaticAberration = 0.008
  } = {}) {
    super("GravitationalLensingEffect", lensingFragmentShader, {
      uniforms: new Map<string, Uniform<any>>([
        ["blackHoleScreenPos", new Uniform(blackHoleScreenPos)],
        ["lensingStrength", new Uniform(lensingStrength)],
        ["lensingRadius", new Uniform(lensingRadius)],
        ["aspectRatio", new Uniform(aspectRatio)],
        ["chromaticAberration", new Uniform(chromaticAberration)],
      ]),
    });
  }

  get blackHoleScreenPos() {
    return this.uniforms.get("blackHoleScreenPos")!.value;
  }

  set blackHoleScreenPos(value: Vector3) {
    this.uniforms.get("blackHoleScreenPos")!.value = value;
  }

  set aspectRatio(value: number) {
    this.uniforms.get("aspectRatio")!.value = value;
  }

  set lensingStrength(value: number) {
    this.uniforms.get("lensingStrength")!.value = value;
  }
}

// React component wrapper for the lensing effect
const GravitationalLensing = forwardRef<GravitationalLensingEffect | null, { 
  blackHoleScreenPos?: Vector3;
  lensingStrength?: number;
  lensingRadius?: number;
  chromaticAberration?: number;
}>(function GravitationalLensing(props, ref) {
  const { size } = useThree();
  const effect = useMemo(() => {
    return new GravitationalLensingEffect({
      ...props,
      aspectRatio: size.width / size.height,
    });
  }, []);

  useEffect(() => {
    effect.aspectRatio = size.width / size.height;
  }, [size, effect]);

  useEffect(() => {
    if (props.blackHoleScreenPos) {
      effect.blackHoleScreenPos = props.blackHoleScreenPos;
    }
  }, [props.blackHoleScreenPos, effect]);

  useEffect(() => {
    if (props.lensingStrength !== undefined) {
      effect.lensingStrength = props.lensingStrength / 500;
    }
  }, [props.lensingStrength, effect]);

  return <primitive ref={ref} object={effect} dispose={null} />;
});

// Star field component
function StarField({ starCount = 50000, bass = 0 }: { starCount?: number; bass?: number }) {
  const pointsRef = useRef<Points>(null);
  const timeRef = useRef(0);

  const { geometry, material } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const twinkle = new Float32Array(starCount);

    const starFieldRadius = 500;
    const starPalette = [
      new Color(0x88aaff), new Color(0xffaaff), new Color(0xaaffff),
      new Color(0xffddaa), new Color(0xffeecc), new Color(0xffffff),
      new Color(0xff8888), new Color(0x88ff88), new Color(0xffff88),
      new Color(0x88ffff)
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const phi = Math.acos(-1 + (2 * i) / starCount);
      const theta = Math.sqrt(starCount * Math.PI) * phi;
      const radius = Math.cbrt(Math.random()) * starFieldRadius + 50;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const starColor = starPalette[Math.floor(Math.random() * starPalette.length)].clone();
      starColor.multiplyScalar(Math.random() * 0.7 + 0.3);
      colors[i3] = starColor.r;
      colors[i3 + 1] = starColor.g;
      colors[i3 + 2] = starColor.b;
      sizes[i] = Math.random() * 2.0 + 0.5;
      twinkle[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    geo.setAttribute('size', new BufferAttribute(sizes, 1));
    geo.setAttribute('twinkle', new BufferAttribute(twinkle, 1));

    const mat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1.5 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float size;
        attribute float twinkle;
        varying vec3 vColor;
        varying float vTwinkle;
        
        void main() {
          vColor = color;
          vTwinkle = sin(uTime * 2.5 + twinkle) * 0.5 + 0.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= (0.2 + vTwinkle * 0.8);
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: AdditiveBlending,
      depthWrite: false
    });

    return { geometry: geo, material: mat };
  }, [starCount]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    timeRef.current += delta;
    
    material.uniforms.uTime.value = timeRef.current;
    
    // Slow rotation
    pointsRef.current.rotation.y += delta * 0.003;
    pointsRef.current.rotation.x += delta * 0.001;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// Event horizon glow
function EventHorizon({ bass = 0 }: { bass?: number }) {
  const meshRef = useRef<Mesh>(null);
  const { camera } = useThree();
  const timeRef = useRef(0);

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCameraPosition: { value: new Vector3() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uCameraPosition;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec3 viewDirection = normalize(uCameraPosition - vPosition);
          float fresnel = 1.0 - abs(dot(vNormal, viewDirection));
          fresnel = pow(fresnel, 2.5);
          
          vec3 glowColor = vec3(1.0, 0.4, 0.1);
          float pulse = sin(uTime * 2.5) * 0.15 + 0.85;
          
          gl_FragColor = vec4(glowColor * fresnel * pulse, fresnel * 0.4);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      side: BackSide
    });
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    
    material.uniforms.uTime.value = timeRef.current;
    material.uniforms.uCameraPosition.value.copy(camera.position);
    
    // Pulse with bass
    const scale = 1 + bass * 1.2;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[BLACK_HOLE_RADIUS * 1.05, 64, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// The black hole sphere itself
function BlackHoleSphere() {
  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[BLACK_HOLE_RADIUS, 64, 32]} />
      <meshBasicMaterial color={0x000000} />
    </mesh>
  );
}

// Accretion disk
function AccretionDisk({ bass = 0, energy = 0, diskSpeed = 1, diskSize = 8 }: { bass?: number; energy?: number; diskSpeed?: number; diskSize?: number }) {
  const meshRef = useRef<Mesh>(null);
  const timeRef = useRef(0);

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColorHot: { value: new Color(0xffffff) },
        uColorMid1: { value: new Color(0xff7733) },
        uColorMid2: { value: new Color(0xff4477) },
        uColorMid3: { value: new Color(0x7744ff) },
        uColorOuter: { value: new Color(0x4477ff) },
        uNoiseScale: { value: 2.5 },
        uFlowSpeed: { value: 0.22 },
        uDensity: { value: 1.3 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vRadius;
        varying float vAngle;
        void main() {
          vUv = uv;
          vRadius = length(position.xy);
          vAngle = atan(position.y, position.x);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorHot;
        uniform vec3 uColorMid1;
        uniform vec3 uColorMid2;
        uniform vec3 uColorMid3;
        uniform vec3 uColorOuter;
        uniform float uNoiseScale;
        uniform float uFlowSpeed;
        uniform float uDensity;

        varying vec2 vUv;
        varying float vRadius;
        varying float vAngle;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 = v - i + dot(i, C.xxx) ;
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute( permute( permute( 
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
          float normalizedRadius = smoothstep(${DISK_INNER_RADIUS.toFixed(2)}, ${DISK_OUTER_RADIUS.toFixed(2)}, vRadius);
          
          float spiral = vAngle * 3.0 - (1.0 / (normalizedRadius + 0.1)) * 2.0;
          vec2 noiseUv = vec2(vUv.x + uTime * uFlowSpeed * (2.0 / (vRadius * 0.3 + 1.0)) + sin(spiral) * 0.1, vUv.y * 0.8 + cos(spiral) * 0.1);
          float noiseVal1 = snoise(vec3(noiseUv * uNoiseScale, uTime * 0.15));
          float noiseVal2 = snoise(vec3(noiseUv * uNoiseScale * 3.0 + 0.8, uTime * 0.22));
          float noiseVal3 = snoise(vec3(noiseUv * uNoiseScale * 6.0 + 1.5, uTime * 0.3));
          
          float noiseVal = (noiseVal1 * 0.45 + noiseVal2 * 0.35 + noiseVal3 * 0.2);
          noiseVal = (noiseVal + 1.0) * 0.5;
          
          vec3 color = uColorOuter;
          color = mix(color, uColorMid3, smoothstep(0.0, 0.25, normalizedRadius));
          color = mix(color, uColorMid2, smoothstep(0.2, 0.55, normalizedRadius));
          color = mix(color, uColorMid1, smoothstep(0.5, 0.75, normalizedRadius));
          color = mix(color, uColorHot, smoothstep(0.7, 0.95, normalizedRadius));
          
          color *= (0.5 + noiseVal * 1.0);
          float brightness = pow(1.0 - normalizedRadius, 1.0) * 3.5 + 0.5;
          brightness *= (0.3 + noiseVal * 2.2);
          
          float pulse = sin(uTime * 1.8 + normalizedRadius * 12.0 + vAngle * 2.0) * 0.15 + 0.85;
          brightness *= pulse;
          
          float alpha = uDensity * (0.2 + noiseVal * 0.9);
          alpha *= smoothstep(0.0, 0.15, normalizedRadius);
          alpha *= (1.0 - smoothstep(0.85, 1.0, normalizedRadius));
          alpha = clamp(alpha, 0.0, 1.0);

          gl_FragColor = vec4(color * brightness, alpha);
        }
      `,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
      blending: AdditiveBlending
    });
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta * diskSpeed;
    
    material.uniforms.uTime.value = timeRef.current;
    material.uniforms.uFlowSpeed.value = 0.22 //+ bass * 0.01;
    
    // Rotate disk
    meshRef.current.rotation.z += delta * 0.005 * diskSpeed * (1 + energy * 0.5);
  });

  return (
    <mesh ref={meshRef} rotation={[DISK_TILT_ANGLE, 0, 0]} renderOrder={1}>
      <ringGeometry args={[DISK_INNER_RADIUS, diskSize, 128, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// Component to track black hole position and update lensing
function LensingController({ 
  lensingRef 
}: { 
  lensingRef: React.RefObject<GravitationalLensingEffect | null> 
}) {
  const { camera } = useThree();
  const blackHolePos = useMemo(() => new Vector3(0, 0, -80), []); // Match the black hole group position
  const screenPos = useMemo(() => new Vector3(), []);

  useFrame(() => {
    if (!lensingRef.current) return;
    
    // Project black hole world position to screen space
    screenPos.copy(blackHolePos).project(camera);
    
    // Convert from NDC (-1 to 1) to UV (0 to 1)
    lensingRef.current.blackHoleScreenPos.set(
      (screenPos.x + 1) / 2,
      (screenPos.y + 1) / 2,
      0
    );
  });

  return null;
}

// Rotating group for the black hole scene
function RotatingBlackHole({ 
  bass, 
  energy, 
  diskSpeed, 
  starCount,
  diskSize
}: { 
  bass: number; 
  energy: number; 
  diskSpeed: number; 
  starCount: number;
  diskSize: number;
}) {
  const groupRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Slow rotation around Y axis
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -80]} scale={14}>
      {/* Event horizon glow */}
      <EventHorizon bass={bass} />

      {/* Black hole sphere */}
      <BlackHoleSphere />

      {/* Accretion disk */}
      <AccretionDisk bass={bass} energy={energy} diskSpeed={diskSpeed} diskSize={diskSize} />
    </group>
  );
}

export default function BlackHoleScene({ micData, blackHoleControls }: BlackHoleSceneProps) {
  const bass = micData?.bass || 0;
  const energy = micData?.energy || 0;
  
  // Controls with defaults
  const intensity = blackHoleControls?.intensity ?? 0.6;
  const psychedelia = blackHoleControls?.psychedelia ?? 0.5;
  const lensingStrengthUI = blackHoleControls?.lensingStrength ?? 5; // 0-10 UI value, divided by 10 in effect
  const diskSize = blackHoleControls?.diskSize ?? 8;
  
  // Bloom intensity with psychedelia affecting how much bass influences it
  const bloomIntensity = intensity + bass * psychedelia;
  
  const lensingRef = useRef<GravitationalLensingEffect>(null);

  return (
    <>
      <color attach="background" args={["#000002"]} />
      <fog attach="fog" args={["#020104", 80, 400]} />

      {/* Star field background - doesn't rotate with black hole */}
      <StarField starCount={50000} bass={bass} />

      {/* Rotating black hole group */}
      <RotatingBlackHole 
        bass={bass} 
        energy={energy} 
        diskSpeed={1} 
        starCount={50000}
        diskSize={diskSize}
      />

      {/* Orbit controls for interactive viewing */}
      <OrbitControls
        enableDamping
        dampingFactor={0.035}
        rotateSpeed={0.4}
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={10}
        maxDistance={150}
        enablePan={false}
      />
      
      {/* Controller to update lensing position */}
      <LensingController lensingRef={lensingRef} />
      

      {/* Post-processing */}
      <EffectComposer multisampling={0}>
        <GravitationalLensing 
          ref={lensingRef}
          lensingStrength={lensingStrengthUI}
          lensingRadius={0.3}
          chromaticAberration={0.003}
        />
       
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          radius={0.1 + bass * psychedelia}
          levels={6}
          mipmapBlur={true}
        />
      </EffectComposer>
    </>
  );
}

