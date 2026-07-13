const REJECTION_MARKERS = [
  'user rejected',
  'user denied',
  'rejected the request',
  'request rejected',
  'transaction rejected',
  'denied transaction signature',
  'userrejectedrequesterror',
  'action_rejected',
  'code 4001',
] as const;

function errorText(value: unknown, depth = 0): string {
  if (depth > 3 || value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value instanceof Error) return `${value.name} ${value.message} ${errorText(value.cause, depth + 1)}`;
  if (typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  return ['name', 'message', 'shortMessage', 'details', 'code', 'cause']
    .map((key) => errorText(record[key], depth + 1))
    .join(' ');
}

export function transactionErrorMessage(error: unknown): string {
  const normalized = errorText(error).toLowerCase();
  const wasRejected = REJECTION_MARKERS.some((marker) => normalized.includes(marker));
  return wasRejected ? 'Transaction cancelled.' : 'Transaction failed.';
}
