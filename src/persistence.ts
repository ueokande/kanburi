// The close handler waits for outstanding writes rather than dropping IPC on exit.
const pending = new Set<Promise<unknown>>();

export function trackPersistence<T>(operation: Promise<T>): Promise<T> {
  pending.add(operation);
  void operation.then(
    () => pending.delete(operation),
    () => pending.delete(operation),
  );
  return operation;
}

export async function flushPersistence() {
  while (pending.size) {
    const results = await Promise.allSettled([...pending]);
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
  }
}
