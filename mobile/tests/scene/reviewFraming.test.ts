import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3, Vector2, Raycaster, Plane } from 'three';
import { configureReviewCamera } from '../../src/scene/reviewFraming';

test('face/floor framing retains width, restores original and preserves floor projection/raycast', () => {
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 100), original = new OrthographicCamera(-1, 1, 1, -1, .1, 100);
  configureReviewCamera(original, 390, 844, 'original'); configureReviewCamera(camera, 390, 844, 'face_floor');
  assert.equal(camera.right, original.right); assert.equal(camera.top, original.top); assert.ok(camera.position.y < original.position.y);
  const floor = new Plane(new Vector3(0, 1, 0), 0), ray = new Raycaster();
  for (const x of [-2, 0, 2]) for (const z of [-2, .2, 3.5]) {
    const point = new Vector3(x, 0, z), screen = point.clone().project(camera);
    assert.ok(Math.abs(screen.x) < 1 && Math.abs(screen.y) < .8);
    ray.setFromCamera(new Vector2(screen.x, screen.y), camera);
    assert.ok(ray.ray.intersectPlane(floor, new Vector3())!.distanceTo(point) < 1e-5);
  }
  configureReviewCamera(camera, 390, 844, 'original');
  assert.deepEqual(camera.projectionMatrix.elements, original.projectionMatrix.elements);
  assert.deepEqual(camera.matrixWorld.elements, original.matrixWorld.elements);
});
