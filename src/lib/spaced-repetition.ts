const SR_INTERVALS_DAYS = [1, 3, 7, 14, 30, 90];

export function getNextDueDate(stage: number): Date {
  const days = SR_INTERVALS_DAYS[Math.min(stage, SR_INTERVALS_DAYS.length - 1)];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}

export function getMaxStage(): number {
  return SR_INTERVALS_DAYS.length - 1;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
