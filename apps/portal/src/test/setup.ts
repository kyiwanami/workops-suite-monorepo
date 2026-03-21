import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// React テストごとに DOM を破棄して、状態の持ち越しを防ぐ。
afterEach(() => {
  if (typeof document !== "undefined") {
    cleanup();
  }
});
