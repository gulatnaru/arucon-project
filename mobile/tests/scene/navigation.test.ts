import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { clearLine, isFree, localDockOffset, nearestFree, route, TOILET_SPOT, WALK } from '../../src/scene/navigation';

const start = { x: 0, z: 1.8 };

test('facility docking lands on the same world location while the actor turns', () => {
  const position = { x: -.95, z: -1.6 };
  for (const target of [TOILET_SPOT, { x: -2.05, z: .2 }]) {
    for (const facing of [-Math.PI, -1.4, 0, .8, Math.PI]) {
      for (const progress of [0, .25, .7, 1]) {
        const offset = localDockOffset(position, target, facing, progress);
        const parent = new THREE.Object3D();
        parent.position.set(position.x, 0, position.z); parent.rotation.y = facing;
        const world = parent.localToWorld(new THREE.Vector3(offset.x, 0, offset.z));
        assert.ok(Math.abs(world.x - THREE.MathUtils.lerp(position.x, target.x, progress)) < 1e-10);
        assert.ok(Math.abs(world.z - THREE.MathUtils.lerp(position.z, target.z, progress)) < 1e-10);
      }
    }
  }
});

test('visible floor in front, back, left and right can be a destination beyond the rug', () => {
  for (const requested of [
    { x: 0, z: 6.4 },
    { x: 0, z: -2.8 },
    { x: -2.1, z: 3.5 },
    { x: 2.1, z: 3.5 },
  ]) {
    const path = route(start, requested);
    assert.ok(path.length > 0, JSON.stringify(requested));
    const end = path.at(-1)!;
    assert.ok(Math.hypot(end.x - requested.x, end.z - requested.z) < 0.16);
    let last = start;
    for (const point of path) { assert.ok(clearLine(last, point)); last = point; }
  }
});

test('edge and furniture taps settle on a walkable nearby point', () => {
  for (const requested of [{ x: 12, z: 11 }, { x: 2.1, z: 0.1 }, { x: -2.05, z: 0.2 }]) {
    const end = nearestFree(requested);
    assert.ok(end);
    assert.ok(isFree(end));
    assert.ok(end.x >= WALK.x[0] && end.x <= WALK.x[1]);
    assert.ok(end.z >= WALK.z[0] && end.z <= WALK.z[1]);
  }
});

test('uninstalled table does not remain an invisible obstacle', () => {
  const table = { x: 2.1, z: 0.1 };
  assert.equal(isFree(table, { tableInstalled: true }), false);
  assert.equal(isFree(table, { tableInstalled: false }), true);
  assert.deepEqual(nearestFree(table, { tableInstalled: false }), table);
});

test('installed toilet creates a collision boundary', () => {
  const toilet = { x: -2.1, z: -1.62 };
  assert.equal(isFree(toilet, { toiletInstalled: false }), true);
  assert.equal(isFree(toilet, { toiletInstalled: true }), false);
});

test('path replacement and invalid values cannot produce unsafe segments', () => {
  const first = route(start, { x: -2.1, z: 5.7 });
  const newGoal = route(first[0], { x: 2.1, z: -2.7 });
  assert.ok(first.length > 0 && newGoal.length > 0);
  let last = first[0];
  for (const point of newGoal) { assert.ok(clearLine(last, point)); last = point; }
  assert.deepEqual(route(start, { x: Number.NaN, z: 0 }), []);
});
