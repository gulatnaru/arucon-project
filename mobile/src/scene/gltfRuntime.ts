import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

function withGltfLoaderUserAgent<T>(operation: () => T): T {
  if (typeof navigator === 'undefined' || typeof navigator.userAgent === 'string') return operation();

  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'ReactNative' });
  try {
    return operation();
  } finally {
    if (descriptor) Object.defineProperty(navigator, 'userAgent', descriptor);
    else Reflect.deleteProperty(navigator, 'userAgent');
  }
}

/** Three r166 assumes a present navigator also has a string userAgent. React Native does not. */
export function parseGlb(data: ArrayBuffer): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    withGltfLoaderUserAgent(() => loader.parse(data, '', resolve, reject));
  });
}
