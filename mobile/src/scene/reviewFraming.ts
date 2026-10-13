import { OrthographicCamera } from 'three';
export type ReviewFraming = 'original' | 'close' | 'face_floor';
/** Review options only. The face/floor candidate retains the whole horizontal play span. */
export function configureReviewCamera(camera: OrthographicCamera, width: number, height: number, mode: ReviewFraming) {
  const halfHeight = mode === 'close' ? 6.3 : 6.8;
  const halfWidth = halfHeight * width / height;
  Object.assign(camera, { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight });
  camera.position.set(0, mode === 'face_floor' ? 7.3 : 9.2, 13.5);
  camera.lookAt(0, mode === 'face_floor' ? .15 : 0, mode === 'face_floor' ? 1.25 : 1.4);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}
