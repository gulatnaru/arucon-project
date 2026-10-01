import type { RoomRendererProfileId } from './rendererConfig';

// LIFE-00 §13 replaces the earlier 20 Hz engineering target with a 30 Hz floor.
// The legacy export name remains compatible with saved FUN tooling; old results do not pass this gate.
export const FUN01_PERFORMANCE_BUDGET = Object.freeze({
  inputFeedbackP95Ms: 100,
  jsRafIntervalP95Ms: 33.34,
  continuousUiLockMaxMs: 500,
  submittedFrameRateAimFps: 30,
});

export const FUN01_MIN_BUDGET_SAMPLES = 5;
export const FUN01_MEASUREMENT_WINDOW_MS = 10_000;
export const INPUT_MEASUREMENT_WINDOW_MS = 60_000;

export type PerformanceBudgetStatus = 'pass' | 'fail' | 'insufficient_data';
export type RoomInputSource = 'touch' | 'accessibility';

export type MetricSummary = {
  count: number;
  p50Ms: number | null;
  p95Ms: number | null;
  maxMs: number | null;
};

export type RoomPerformanceSummary = {
  schemaVersion: 2;
  capturedAtMs: number;
  profileId: RoomRendererProfileId;
  proxyNotice: string;
  phaseCost: Record<'morph' | 'draw' | 'queueDrain', MetricSummary>;
  budgetSource: 'LIFE-00-13';
  inputMeasurementWindowMs: number;
  frameMeasurementWindowMs: number;
  budgets: typeof FUN01_PERFORMANCE_BUDGET;
  inputSamplesBySource: Readonly<Record<RoomInputSource, number>>;
  inputHandlerDuration: MetricSummary;
  inputToNextRafProxy: MetricSummary & { status: PerformanceBudgetStatus; minimumSamples: number };
  inputToNextSubmissionProxy: MetricSummary & { status: PerformanceBudgetStatus; minimumSamples: number };
  jsRafInterval: MetricSummary & { status: PerformanceBudgetStatus; minimumSamples: number };
  continuousUiLockRafGapProxy: MetricSummary & {
    status: PerformanceBudgetStatus;
    minimumSamples: number;
    over500MsCount: number;
  };
  submittedFrames: {
    windowFrameCount: number;
    interval: MetricSummary;
    windowDurationMs: number | null;
    aggregateRateHz: number | null;
    minimumSamples: number;
    status: PerformanceBudgetStatus;
  };
  renderWorkload: {
    surfaceWidth: number | null;
    surfaceHeight: number | null;
    calls: number | null;
    triangles: number | null;
    points: number | null;
    lines: number | null;
  };
};

export type RoomPerformanceCapture = Readonly<{
  status: 'complete' | 'interrupted' | 'truncated';
  startedAtMs: number;
  finishedAtMs: number;
  requestedDurationMs: number;
  summary: RoomPerformanceSummary;
}>;

export class RingBuffer<T> {
  private readonly entries: T[] = [];
  private cursor = 0;
  private overwritten = 0;
  get droppedCount() { return this.overwritten; }

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('RingBuffer capacity must be a positive integer');
  }

  push(value: T) {
    if (this.entries.length < this.capacity) this.entries.push(value);
    else {
      this.overwritten++;
      this.entries[this.cursor] = value;
      this.cursor = (this.cursor + 1) % this.capacity;
    }
  }

  values(): readonly T[] {
    if (this.entries.length < this.capacity || this.cursor === 0) return [...this.entries];
    return [...this.entries.slice(this.cursor), ...this.entries.slice(0, this.cursor)];
  }

  clear() {
    this.entries.length = 0;
    this.cursor = 0;
    this.overwritten = 0;
  }
}

type TimedSample = Readonly<{ value: number; atMs: number }>;

function percentile(values: readonly number[], ratio: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? null;
}

function summarize(values: readonly number[]): MetricSummary {
  return {
    count: values.length,
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maxMs: values.length ? Math.max(...values) : null,
  };
}

function thresholdStatus(value: number | null, maximum: number, count: number): PerformanceBudgetStatus {
  if (value === null || count < FUN01_MIN_BUDGET_SAMPLES) return 'insufficient_data';
  return value <= maximum ? 'pass' : 'fail';
}

export class RoomPerformanceProbe {
  private readonly phaseCost: Record<'morph' | 'draw' | 'queueDrain', RingBuffer<TimedSample>>;
  private capture?: { probe: RoomPerformanceProbe; start: number; end: number };
  private readonly inputHandlerDurationMs: RingBuffer<TimedSample>;
  private readonly inputSources: RingBuffer<Readonly<{ source: RoomInputSource; atMs: number }>>;
  private readonly inputToNextRafMs: RingBuffer<TimedSample>;
  private readonly inputToNextSubmissionMs: RingBuffer<TimedSample>;
  private readonly rafIntervalsMs: RingBuffer<TimedSample>;
  private readonly submissionIntervalsMs: RingBuffer<TimedSample>;
  private readonly submissionTimestampsMs: RingBuffer<number>;
  private pendingRafInputsMs: number[] = [];
  private pendingSubmissionInputsMs: number[] = [];
  private previousRafMs: number | null = null;
  private previousSubmissionMs: number | null = null;
  private surfaceWidth: number | null = null;
  private surfaceHeight: number | null = null;
  private renderWorkload: Omit<RoomPerformanceSummary['renderWorkload'], 'surfaceWidth' | 'surfaceHeight'> = {
    calls: null, triangles: null, points: null, lines: null,
  };

  constructor(
    readonly profileId: RoomRendererProfileId,
    private readonly now: () => number = () => performance.now(),
    capacity = 240,
    private readonly measurementWindowMs = FUN01_MEASUREMENT_WINDOW_MS,
  ) {
    this.phaseCost = { morph: new RingBuffer(capacity), draw: new RingBuffer(capacity), queueDrain: new RingBuffer(capacity) };
    this.inputHandlerDurationMs = new RingBuffer(capacity);
    this.inputSources = new RingBuffer(capacity);
    this.inputToNextRafMs = new RingBuffer(capacity);
    this.inputToNextSubmissionMs = new RingBuffer(capacity);
    this.rafIntervalsMs = new RingBuffer(capacity);
    this.submissionIntervalsMs = new RingBuffer(capacity);
    this.submissionTimestampsMs = new RingBuffer(capacity + 1);
  }

  startInput(): number { return this.now(); }

  recordPhase(phase: keyof RoomPerformanceSummary['phaseCost'], durationMs: number) {
    this.captureProbeAt(this.now())?.recordPhase(phase, durationMs);
    if (Number.isFinite(durationMs) && durationMs >= 0) this.phaseCost[phase].push({ value: durationMs, atMs: this.now() });
  }

  recordInputHandled(startedAtMs: number, source: RoomInputSource = 'touch') {
    const handledAtMs = this.now();
    this.captureProbeAt(handledAtMs)?.recordInputHandled(startedAtMs, source);
    this.inputHandlerDurationMs.push({ value: Math.max(0, handledAtMs - startedAtMs), atMs: handledAtMs });
    this.inputSources.push({ source, atMs: handledAtMs });
    this.pendingRafInputsMs = [...this.pendingRafInputsMs.slice(-15), startedAtMs];
    this.pendingSubmissionInputsMs = [...this.pendingSubmissionInputsMs.slice(-15), startedAtMs];
  }

  recordRaf(timestampMs: number) {
    this.captureProbeAt(timestampMs)?.recordRaf(timestampMs);
    for (const startedAtMs of this.pendingRafInputsMs) {
      this.inputToNextRafMs.push({ value: Math.max(0, timestampMs - startedAtMs), atMs: timestampMs });
    }
    this.pendingRafInputsMs = [];
    if (this.previousRafMs !== null) {
      const interval = Math.max(0, timestampMs - this.previousRafMs);
      this.rafIntervalsMs.push({ value: interval, atMs: timestampMs });
    }
    this.previousRafMs = timestampMs;
  }

  resetRafClock() {
    this.previousRafMs = null;
    this.previousSubmissionMs = null;
    this.pendingRafInputsMs = [];
    this.pendingSubmissionInputsMs = [];
  }

  recordSubmission(timestampMs: number) {
    this.captureProbeAt(timestampMs)?.recordSubmission(timestampMs);
    for (const startedAtMs of this.pendingSubmissionInputsMs) {
      this.inputToNextSubmissionMs.push({ value: Math.max(0, timestampMs - startedAtMs), atMs: timestampMs });
    }
    this.pendingSubmissionInputsMs = [];
    if (this.previousSubmissionMs !== null) {
      this.submissionIntervalsMs.push({ value: Math.max(0, timestampMs - this.previousSubmissionMs), atMs: timestampMs });
    }
    this.previousSubmissionMs = timestampMs;
    this.submissionTimestampsMs.push(timestampMs);
  }

  setSurfaceSize(width: number, height: number) {
    this.capture?.probe.setSurfaceSize(width, height);
    this.surfaceWidth = width;
    this.surfaceHeight = height;
  }

  recordRenderWorkload(workload: { calls: number; triangles: number; points: number; lines: number }) {
    this.capture?.probe.recordRenderWorkload(workload);
    this.renderWorkload = { ...workload };
  }

  resetWindow() {
    this.capture = undefined;
    for (const buffer of Object.values(this.phaseCost)) buffer.clear();
    this.inputHandlerDurationMs.clear();
    this.inputSources.clear();
    this.inputToNextRafMs.clear();
    this.inputToNextSubmissionMs.clear();
    this.rafIntervalsMs.clear();
    this.submissionIntervalsMs.clear();
    this.submissionTimestampsMs.clear();
    this.resetRafClock();
  }

  private captureProbeAt(atMs: number) {
    return this.capture && atMs >= this.capture.start && atMs <= this.capture.end ? this.capture.probe : undefined;
  }

  /** Explicit local QA run; normal rolling probes retain their existing cost/capacity. */
  beginCapture(durationMs = 60_000) {
    if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 60_000) throw new Error('Capture duration must be within sixty seconds');
    if (this.capture) return false;
    const start = this.now();
    const probe = new RoomPerformanceProbe(this.profileId, this.now, Math.ceil(durationMs / 1_000 * 120) + 1, durationMs);
    probe.setSurfaceSize(this.surfaceWidth ?? 0, this.surfaceHeight ?? 0);
    probe.renderWorkload = { ...this.renderWorkload };
    this.capture = { probe, start, end: start + durationMs };
    return true;
  }

  finishCaptureIfDue(interrupted = false): RoomPerformanceCapture | null {
    const capture = this.capture;
    if (!capture || (!interrupted && this.now() < capture.end)) return null;
    this.capture = undefined;
    const finishedAtMs = interrupted ? Math.min(this.now(), capture.end) : capture.end;
    const truncated = [capture.probe.rafIntervalsMs, capture.probe.submissionTimestampsMs, ...Object.values(capture.probe.phaseCost)].some(buffer => buffer.droppedCount > 0);
    return { status: interrupted ? 'interrupted' : truncated ? 'truncated' : 'complete',
      startedAtMs: capture.start, finishedAtMs, requestedDurationMs: capture.end - capture.start,
      summary: capture.probe.snapshot(finishedAtMs) };
  }

  private windowValues(buffer: RingBuffer<TimedSample>, capturedAtMs: number, windowMs = this.measurementWindowMs): readonly number[] {
    const earliest = capturedAtMs - windowMs;
    return buffer.values().filter(sample => sample.atMs >= earliest && sample.atMs <= capturedAtMs).map(sample => sample.value);
  }

  snapshot(capturedAtMs = this.now()): RoomPerformanceSummary {
    const handler = summarize(this.windowValues(this.inputHandlerDurationMs, capturedAtMs, INPUT_MEASUREMENT_WINDOW_MS));
    const inputRaf = summarize(this.windowValues(this.inputToNextRafMs, capturedAtMs, INPUT_MEASUREMENT_WINDOW_MS));
    const inputSubmission = summarize(this.windowValues(this.inputToNextSubmissionMs, capturedAtMs, INPUT_MEASUREMENT_WINDOW_MS));
    const rafValues = this.windowValues(this.rafIntervalsMs, capturedAtMs);
    const raf = summarize(rafValues);
    const submissionValues = this.windowValues(this.submissionIntervalsMs, capturedAtMs);
    const submissions = summarize(submissionValues);
    const earliest = capturedAtMs - this.measurementWindowMs;
    const windowSubmissionTimestamps = this.submissionTimestampsMs.values()
      .filter(timestamp => timestamp >= earliest && timestamp <= capturedAtMs);
    const inputSamplesBySource = this.inputSources.values()
      .filter(sample => sample.atMs >= capturedAtMs - INPUT_MEASUREMENT_WINDOW_MS && sample.atMs <= capturedAtMs)
      .reduce<Record<RoomInputSource, number>>((counts, sample) => {
        counts[sample.source]++;
        return counts;
      }, { touch: 0, accessibility: 0 });
    const submissionWindowDurationMs = windowSubmissionTimestamps.length >= 2
      ? windowSubmissionTimestamps[windowSubmissionTimestamps.length - 1] - windowSubmissionTimestamps[0]
      : 0;
    const aggregateRateHz = windowSubmissionTimestamps.length >= 2 && submissionWindowDurationMs > 0
      ? (windowSubmissionTimestamps.length - 1) * 1_000 / submissionWindowDurationMs
      : null;
    return {
      schemaVersion: 2,
      capturedAtMs,
      profileId: this.profileId,
      budgetSource: 'LIFE-00-13',
      inputMeasurementWindowMs: INPUT_MEASUREMENT_WINDOW_MS,
      frameMeasurementWindowMs: this.measurementWindowMs,
      phaseCost: { morph: summarize(this.windowValues(this.phaseCost.morph, capturedAtMs)),
        draw: summarize(this.windowValues(this.phaseCost.draw, capturedAtMs)), queueDrain: summarize(this.windowValues(this.phaseCost.queueDrain, capturedAtMs)) },
      proxyNotice: 'input-to-RAF, input-to-endFrameEXP and RAF-gap values are timing proxies; they do not measure touch-to-photon latency, native-thread lock or visible FPS',
      budgets: FUN01_PERFORMANCE_BUDGET,
      inputSamplesBySource,
      inputHandlerDuration: handler,
      inputToNextRafProxy: {
        ...inputRaf,
        status: thresholdStatus(inputRaf.p95Ms, FUN01_PERFORMANCE_BUDGET.inputFeedbackP95Ms, inputRaf.count),
        minimumSamples: FUN01_MIN_BUDGET_SAMPLES,
      },
      inputToNextSubmissionProxy: {
        ...inputSubmission,
        status: thresholdStatus(inputSubmission.p95Ms, FUN01_PERFORMANCE_BUDGET.inputFeedbackP95Ms, inputSubmission.count),
        minimumSamples: FUN01_MIN_BUDGET_SAMPLES,
      },
      jsRafInterval: {
        ...raf,
        status: thresholdStatus(raf.p95Ms, FUN01_PERFORMANCE_BUDGET.jsRafIntervalP95Ms, raf.count),
        minimumSamples: FUN01_MIN_BUDGET_SAMPLES,
      },
      continuousUiLockRafGapProxy: {
        ...raf,
        status: thresholdStatus(raf.maxMs, FUN01_PERFORMANCE_BUDGET.continuousUiLockMaxMs, raf.count),
        minimumSamples: FUN01_MIN_BUDGET_SAMPLES,
        over500MsCount: rafValues.filter(value => value > FUN01_PERFORMANCE_BUDGET.continuousUiLockMaxMs).length,
      },
      submittedFrames: {
        windowFrameCount: windowSubmissionTimestamps.length,
        interval: submissions,
        windowDurationMs: submissionWindowDurationMs || null,
        aggregateRateHz,
        minimumSamples: FUN01_MIN_BUDGET_SAMPLES,
        status: aggregateRateHz === null || windowSubmissionTimestamps.length - 1 < FUN01_MIN_BUDGET_SAMPLES ? 'insufficient_data'
          : aggregateRateHz >= FUN01_PERFORMANCE_BUDGET.submittedFrameRateAimFps ? 'pass' : 'fail',
      },
      renderWorkload: {
        surfaceWidth: this.surfaceWidth,
        surfaceHeight: this.surfaceHeight,
        ...this.renderWorkload,
      },
    };
  }
}
