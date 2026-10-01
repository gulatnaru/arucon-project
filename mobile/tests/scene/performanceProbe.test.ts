import assert from 'node:assert/strict';
import test from 'node:test';
import { RingBuffer, RoomPerformanceProbe } from '../../src/scene/performanceProbe';

test('bounded ring buffer preserves the newest samples in chronological order', () => {
  const values = new RingBuffer<number>(3);
  values.push(1); values.push(2); values.push(3); values.push(4); values.push(5);
  assert.deepEqual(values.values(), [3, 4, 5]);
});

test('performance probe uses injected time and reports fixed premeasurement budgets as JSON', () => {
  let now = 1_000;
  const probe = new RoomPerformanceProbe('software_low_resolution', () => now, 10);
  probe.recordRaf(990);
  probe.recordSubmission(1_000);
  for (let index = 0; index < 5; index++) {
    const input = 1_000 + index * 50;
    now = input + 4;
    probe.recordInputHandled(input);
    probe.recordRaf(input + 16);
    probe.recordSubmission(input + 50);
  }
  probe.setSurfaceSize(195, 422);
  probe.recordRenderWorkload({ calls: 5, triangles: 1_200, points: 0, lines: 0 });
  now = 1_300;
  const summary = probe.snapshot();
  assert.equal(summary.inputHandlerDuration.p95Ms, 4);
  assert.deepEqual(summary.inputSamplesBySource, { touch: 5, accessibility: 0 });
  assert.equal(summary.inputToNextRafProxy.p95Ms, 16);
  assert.equal(summary.inputToNextRafProxy.status, 'pass');
  assert.equal(summary.inputToNextSubmissionProxy.p95Ms, 50);
  assert.equal(summary.inputToNextSubmissionProxy.status, 'pass');
  assert.equal(summary.jsRafInterval.p95Ms, 50);
  assert.equal(summary.jsRafInterval.status, 'fail', 'LIFE-00 30 Hz floor rejects historical 20 Hz samples');
  assert.equal(summary.continuousUiLockRafGapProxy.status, 'pass');
  assert.equal(summary.submittedFrames.aggregateRateHz, 20);
  assert.equal(summary.submittedFrames.status, 'fail');
  assert.deepEqual(summary.renderWorkload, {
    surfaceWidth: 195, surfaceHeight: 422, calls: 5, triangles: 1_200, points: 0, lines: 0,
  });
  assert.match(summary.proxyNotice, /proxies/);
  assert.deepEqual(JSON.parse(JSON.stringify(summary)).budgets, {
    inputFeedbackP95Ms: 100,
    jsRafIntervalP95Ms: 33.34,
    continuousUiLockMaxMs: 500,
    submittedFrameRateAimFps: 30,
  });
});

test('performance probe fails fixed budgets instead of relaxing them and resets lifecycle gaps', () => {
  let now = 0;
  const probe = new RoomPerformanceProbe('software_legacy_333', () => now, 10);
  probe.recordRaf(0);
  probe.recordSubmission(0);
  for (let index = 0; index < 5; index++) {
    const input = 1_000 + index * 600;
    now = input + 120;
    probe.recordInputHandled(input);
    probe.recordRaf(input + 501);
    probe.recordSubmission(input + 333);
  }
  probe.resetRafClock(); probe.recordRaf(5_000); probe.recordRaf(5_016);
  now = 5_016;
  const summary = probe.snapshot();
  assert.equal(summary.inputHandlerDuration.p95Ms, 120);
  assert.equal(summary.inputToNextRafProxy.status, 'fail');
  assert.equal(summary.inputToNextSubmissionProxy.status, 'fail');
  assert.equal(summary.jsRafInterval.status, 'fail');
  assert.equal(summary.continuousUiLockRafGapProxy.status, 'fail');
  assert.ok(summary.continuousUiLockRafGapProxy.over500MsCount >= 1);
  assert.equal(summary.submittedFrames.status, 'fail');
});

test('budget status stays insufficient until the bounded window has enough samples', () => {
  let now = 0;
  const probe = new RoomPerformanceProbe('automatic', () => now, 10);
  for (let index = 0; index < 2; index++) {
    const input = index * 20;
    now = input + 1;
    probe.recordInputHandled(input);
    probe.recordRaf(input + 16);
    probe.recordSubmission(input + 16);
  }
  now = 41;
  probe.recordInputHandled(40, 'accessibility');
  probe.recordRaf(56);
  probe.recordSubmission(56);
  now = 100;
  const summary = probe.snapshot();
  assert.deepEqual(summary.inputSamplesBySource, { touch: 2, accessibility: 1 });
  assert.equal(summary.inputToNextRafProxy.status, 'insufficient_data');
  assert.equal(summary.inputToNextSubmissionProxy.status, 'insufficient_data');
  assert.equal(summary.jsRafInterval.status, 'insufficient_data');
  assert.equal(summary.continuousUiLockRafGapProxy.status, 'insufficient_data');
  assert.equal(summary.submittedFrames.status, 'insufficient_data');
  now = 10_101;
  assert.equal(probe.snapshot().submittedFrames.windowFrameCount, 0);
  assert.equal(probe.snapshot().inputToNextSubmissionProxy.count, 3, 'input window is explicitly sixty seconds for normal menu export');
  now = 60_101;
  assert.equal(probe.snapshot().inputToNextSubmissionProxy.count, 0);
  probe.resetWindow();
  assert.equal(probe.snapshot().jsRafInterval.count, 0);
});

test('sixty-second capture retains early slow frames and seals before late export work', () => {
  let now = 0;
  const probe = new RoomPerformanceProbe('software_balanced', () => now);
  probe.setSurfaceSize(585, 1266);
  assert.equal(probe.beginCapture(), true);
  assert.equal(probe.beginCapture(), false, 'repeated start cannot reset an active interval');
  probe.recordRaf(now); probe.recordSubmission(now);
  for (let i = 0; i < 5; i++) { now += 50; probe.recordInputHandled(now - 2); probe.recordRaf(now); probe.recordSubmission(now + 4); }
  while (now < 60_000) {
    now += now < 10_000 ? 50 : 16;
    probe.recordRaf(now); probe.recordPhase('morph', 3); probe.recordSubmission(now);
  }
  now = 65_000; // Later UI/file export must not shift the fixed capture interval.
  const capture = probe.finishCaptureIfDue()!;
  assert.equal(capture.status, 'complete');
  assert.equal(capture.startedAtMs, 0); assert.equal(capture.finishedAtMs, 60_000);
  assert.equal(capture.summary.frameMeasurementWindowMs, 60_000);
  assert.ok(capture.summary.jsRafInterval.count > 3_000);
  assert.equal(capture.summary.jsRafInterval.p95Ms, 50, 'first ten slow seconds cannot disappear into a four-second ring');
  assert.equal(capture.summary.jsRafInterval.status, 'fail');
  assert.equal(capture.summary.inputToNextSubmissionProxy.count, 5);
  assert.equal(capture.summary.phaseCost.morph.p95Ms, 3);
  assert.ok(capture.summary.submittedFrames.windowDurationMs! > 59_900);
  assert.equal(probe.finishCaptureIfDue(), null);
});

test('background interruption and sample overflow are explicit incomplete captures', () => {
  let now = 0;
  const probe = new RoomPerformanceProbe('software_balanced', () => now);
  probe.beginCapture();
  now = 20_000; probe.recordRaf(now); probe.recordSubmission(now);
  assert.equal(probe.finishCaptureIfDue(true)?.status, 'interrupted');
  probe.beginCapture(1_000);
  for (let i = 0; i < 1_000; i++) { now++; probe.recordRaf(now); probe.recordSubmission(now); }
  assert.equal(probe.finishCaptureIfDue()?.status, 'truncated', 'overflow cannot be reported as a full-interval capture');
});
