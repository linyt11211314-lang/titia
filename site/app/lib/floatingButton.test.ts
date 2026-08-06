import { describe, expect, it } from "vitest";
import { clampFloatingPosition, snapFloatingPosition } from "./floatingButton";

const viewport = { width: 390, height: 844, buttonSize: 58, sideInset: 8, topInset: 55, bottomInset: 126 };

describe("floating Spark button geometry", () => {
  it("keeps the button out of the status and bottom-navigation safe areas", () => {
    expect(clampFloatingPosition({ x: -20, y: 0 }, viewport)).toEqual({ x: 8, y: 55 });
    expect(clampFloatingPosition({ x: 500, y: 900 }, viewport)).toEqual({ x: 324, y: 660 });
  });

  it("snaps to the nearest horizontal edge after release", () => {
    expect(snapFloatingPosition({ x: 80, y: 300 }, viewport)).toEqual({ x: 8, y: 300 });
    expect(snapFloatingPosition({ x: 250, y: 300 }, viewport)).toEqual({ x: 324, y: 300 });
  });
});
