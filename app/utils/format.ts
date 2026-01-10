const MINUTE_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

export function formatTimestamp(timestamp: number, includeTime = false): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < MINUTE_MS) {
    return 'Just now';
  }
  if (diff < HOUR_MS) {
    const mins = Math.floor(diff / MINUTE_MS);
    return `${mins}m ago`;
  }
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `${hours}h ago`;
  }
  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
}

export function truncateName(name: string, maxLength = 30): string {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.substring(0, maxLength)}...`;
}
