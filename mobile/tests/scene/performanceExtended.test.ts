import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomPerformanceProbe } from '../../src/scene/performanceProbe';
test('explicit extended QA retains the entire180s frame/input window and preserves the sixty-second API limit',()=>{
 let now=0;const probe=new RoomPerformanceProbe('software_balanced',()=>now);
 assert.throws(()=>probe.beginCapture(60_001));assert.throws(()=>probe.beginExtendedCapture(180_001));assert.throws(()=>probe.beginExtendedCapture(59_999));
 assert.equal(probe.beginExtendedCapture(),true);
 for(let i=0;i<=18_000;i++){now=i*10;if(i===2)probe.recordInputHandled(now-1);probe.recordRaf(now);probe.recordPhase('draw',.5);probe.recordSubmission(now+1);}
 const r=probe.finishCaptureIfDue()!;assert.equal(r.status,'complete');assert.equal(r.requestedDurationMs,180_000);
 assert.equal(r.summary.frameMeasurementWindowMs,180_000);assert.equal(r.summary.inputMeasurementWindowMs,180_000);assert.equal(r.summary.inputToNextSubmissionProxy.count,1);assert.ok(r.summary.submittedFrames.windowFrameCount>17_000);
});
