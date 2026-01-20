export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    backoffMs = 300
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      await new Promise(r => setTimeout(r, backoffMs * attempt));
    }
  }
}
