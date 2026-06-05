export function withFrozenTime<T>(date: Date, fn: () => Promise<T> | T): Promise<T> {
  const realDateNow = Date.now.bind(Date);
  const now = date.getTime();
  const dateConstructor = Date as typeof Date & { now: () => number };
  const frozenNow = (): number => now;

  dateConstructor.now = frozenNow;

  try {
    const result = fn();
    return Promise.resolve(result).finally(() => {
      dateConstructor.now = realDateNow;
    });
  } catch (err) {
    dateConstructor.now = realDateNow;
    throw err;
  }
}
