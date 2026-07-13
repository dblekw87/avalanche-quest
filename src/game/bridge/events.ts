export type StageTelemetryEvent = {
  type: 'run-started' | 'checkpoint' | 'run-completed';
  elapsedMs: number;
  checkpoint?: string;
};

export type StageResult = {
  attemptId: string;
  stageId: string;
  durationMs: number;
  events: readonly StageTelemetryEvent[];
};

export type StageFailure = {
  attemptId: string;
  stageId: string;
  durationMs: number;
  reason: 'player-defeated';
  events: readonly StageTelemetryEvent[];
};

export type GameToAppEvent =
  | { type: 'stage-ready' }
  | { type: 'stage-failed'; failure: StageFailure }
  | { type: 'stage-completed'; result: StageResult };
