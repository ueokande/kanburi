import { expect, it } from "vitest";
import { flushPersistence, trackPersistence } from "./persistence";

it("waits for outstanding file and settings writes before closing", async () => {
  let finish: (() => void) | undefined;
  const write = trackPersistence(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  let flushed = false;
  const closing = flushPersistence().then(() => {
    flushed = true;
  });
  await Promise.resolve();
  expect(flushed).toBe(false);
  finish?.();
  await write;
  await closing;
  expect(flushed).toBe(true);
});

it("reports a pending failed write so the window stays open", async () => {
  let fail: ((error: Error) => void) | undefined;
  const write = trackPersistence(
    new Promise<void>((_, reject) => {
      fail = reject;
    }),
  );
  const closing = flushPersistence();
  fail?.(new Error("Disk full"));
  await expect(write).rejects.toThrow("Disk full");
  await expect(closing).rejects.toThrow("Disk full");
  await flushPersistence();
});
