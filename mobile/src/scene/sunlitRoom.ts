import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { readAssetBytes } from './assetBytes';
import { parseGlb } from './gltfRuntime';
import { batchStaticRoom } from './staticRoomBatch';
import { disposeSceneObject } from './lifecycle';
// An additive game asset authored in Blender, not a screenshot backdrop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SUNLIT_ROOM = require('../../assets/reboot-05/sunlit-room.glb') as number;
export type SunlitRoom = Record<'RoomStatic' | 'Cushion' | 'Toilet' | 'Table', THREE.Group>;
function contactShadow(rx: number, rz: number) {
  const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 p; void main(){p=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 p; void main(){float a=pow(max(0.0,1.0-dot(p,p)),2.0)*0.16;gl_FragColor=vec4(0.24,0.18,0.14,a);}' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), material); mesh.rotation.x = -Math.PI / 2; mesh.position.y = .1;
  mesh.name = 'ProceduralContactShadow'; return mesh;
}
/** CPU setup once, outside render/SQL. Dynamic facility pivots/ownership stay in the controller. */
export async function loadSunlitRoom(mode: 'basic' | 'lambert' | 'standard' | 'vertex_lit'): Promise<SunlitRoom> {
  const asset = Asset.fromModule(SUNLIT_ROOM); await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const bytes = await readAssetBytes({ platform: Platform.OS, bundleUri: Platform.OS === 'ios' ? Paths.bundle.uri : '', source: new File(uri), hash: asset.hash,
    type: asset.type, createCacheFile: name => new File(Paths.cache, name), uniqueSuffix: () => `room-${Date.now()}` });
  const gltf = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const result = {} as SunlitRoom;
  try {
    for (const role of ['RoomStatic', 'Cushion', 'Toilet', 'Table'] as const) {
      const source = gltf.scene.getObjectByName(role); if (!source) throw Error(`Room candidate missing ${role}`);
      source.updateWorldMatrix(true, true);
      const group = new THREE.Group(); group.name = `Sunlit_${role}`; group.add(batchStaticRoom([source], mode)); result[role] = group;
    }
    result.Cushion.add(contactShadow(.86, .62)); result.Toilet.add(contactShadow(.58, .5)); result.Table.add(contactShadow(.70, .51));
    return result;
  } catch (error) { Object.values(result).forEach(disposeSceneObject); throw error; }
  finally { disposeSceneObject(gltf.scene); }
}
