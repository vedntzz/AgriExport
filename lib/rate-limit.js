const submissionsByIp = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 5;

export function isRateLimited(ip, now = Date.now()) {
  const recent = (submissionsByIp.get(ip) || []).filter((time) => time > now - WINDOW_MS);
  if (recent.length >= MAX_SUBMISSIONS) return true;
  submissionsByIp.set(ip, [...recent, now]);
  return false;
}
