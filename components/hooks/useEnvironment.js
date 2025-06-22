import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const hdrPath = '/textures/royal_esplanade_1k.hdr';

export function useEnvironment() {
  const { scene } = useThree();

  useEffect(() => {
    const loader = new RGBELoader();
    loader.load(hdrPath, (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdrTexture;
      scene.background = hdrTexture;
      console.log('HDR Environment loaded and set.');
    }, undefined, (error) => {
      console.error('An error occurred loading the HDR environment:', error);
    });

    // Cleanup function (optional, as environment is usually set once)
    return () => {
      // scene.environment = null;
      // scene.background = null;
    };
  }, [scene]);
}
