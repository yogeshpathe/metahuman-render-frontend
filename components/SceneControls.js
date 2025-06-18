import React, { useRef, useEffect } from 'react';
import { OrbitControls, useGLTF, Environment, useProgress, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';

function SceneControls() {
  const { camera, gl } = useThree();
  const controls = useRef();

  useEffect(() => {
    if (controls.current) {
      controls.current.target.set(0, 0.2, 0); // <-- Set focus around face height
      controls.current.update();
    }
  }, []);

  return <OrbitControls ref={controls} args={[camera, gl.domElement]} enableZoom={false} />;
}

export default SceneControls;
