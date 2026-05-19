import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function Bee({ path }) {
    const { scene, animations } = useGLTF(path);
    const mixerRef = useRef(null);
    const groupRef = useRef();
    const [modelScale, setModelScale] = useState(window.innerWidth < 768 ? 0.17 : 0.08);

    useEffect(() => {
        const handleResize = () => setModelScale(window.innerWidth < 768 ? 0.17 : 0.08);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Auto-center the model using bounding box
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        scene.position.sub(center); // center it

        if (animations && animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(scene);
            
            // Find the requested idle animation or fallback to the first one
            const idleClip = animations.find(clip => clip.name.toLowerCase().includes('idle')) || animations[0];

            // Remove root motion (up/down translation) from the animation clip
            const filteredTracks = idleClip.tracks.filter(
                (track) => !(track.name.includes('bee_ctrl') && track.name.includes('position'))
            );
            
            const newClip = new THREE.AnimationClip(idleClip.name, idleClip.duration, filteredTracks);
            const action = mixerRef.current.clipAction(newClip);
            action.setEffectiveTimeScale(1.0); // Set speed to x1.0
            action.play();
        }
        return () => {
            mixerRef.current?.stopAllAction();
            mixerRef.current = null;
        };
    }, [animations, scene]);

    useFrame((_, delta) => {
        mixerRef.current?.update(delta);
    });

    return (
        <group ref={groupRef} rotation={[-0.3, -1.2, 0]} position={[0, -0.5, 0]}>
            <primitive object={scene} scale={modelScale} />
        </group>
    );
}

export default function BeeModel({ style, className }) {
    return (
        <div className={className} style={style}>
            <Canvas
                camera={{ position: [0, 0.5, 4.5], fov: 40 }}
                style={{ width: '100%', height: '100%', background: 'transparent', touchAction: 'pan-y' }}
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={1.6} />
                <directionalLight position={[3, 5, 5]} intensity={1.8} castShadow />
                <pointLight position={[-2, 2, 2]} intensity={0.7} color="#FFD700" />
                <spotLight position={[0, 4, 3]} intensity={0.6} angle={0.5} color="#fff8e1" />

                <Suspense fallback={null}>
                    <Bee path="/models/animated_bee.glb?v=3" />
                    <ContactShadows
                        position={[0, -1.2, 0]}
                        opacity={0.18}
                        scale={4}
                        blur={2}
                        far={2}
                    />
                    <Environment preset="sunset" />
                </Suspense>

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 1.6}
                />
            </Canvas>
        </div>
    );
}

useGLTF.preload('/models/animated_bee.glb?v=3');
