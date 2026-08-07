import { describe, expect, it, vi } from "vitest";
import { keepPwaFresh } from "./pwaUpdate";

describe("keepPwaFresh", () => {
  it("checks for a fresh worker on launch and reloads once when it takes control", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn().mockResolvedValue({ update });
    let controllerChange: (() => void) | undefined;
    const serviceWorker = {
      controller: {},
      register,
      addEventListener: vi.fn((name: string, listener: () => void) => {
        if (name === "controllerchange") controllerChange = listener;
      }),
    };
    const reload = vi.fn();
    let visibilityChange: (() => void) | undefined;
    const visibilityTarget = {
      visibilityState: "visible",
      addEventListener: vi.fn((name: string, listener: () => void) => {
        if (name === "visibilitychange") visibilityChange = listener;
      }),
    };

    await keepPwaFresh({ serviceWorker, base: "/titia/", version: "24", reload, visibilityTarget });
    expect(register).toHaveBeenCalledWith("/titia/sw.js?v=24", { scope: "/titia/", updateViaCache: "none" });
    expect(update).toHaveBeenCalledOnce();
    visibilityChange?.();
    expect(update).toHaveBeenCalledTimes(2);

    controllerChange?.();
    controllerChange?.();
    expect(reload).toHaveBeenCalledOnce();
  });
});
