export type FloatingPosition = { x: number; y: number };
export type FloatingViewport = { width: number; height: number; buttonSize: number; sideInset: number; topInset: number; bottomInset: number };

export function clampFloatingPosition(position: FloatingPosition, viewport: FloatingViewport): FloatingPosition {
  return {
    x: Math.max(viewport.sideInset, Math.min(viewport.width - viewport.buttonSize - viewport.sideInset, position.x)),
    y: Math.max(viewport.topInset, Math.min(viewport.height - viewport.buttonSize - viewport.bottomInset, position.y)),
  };
}

export function snapFloatingPosition(position: FloatingPosition, viewport: FloatingViewport): FloatingPosition {
  const safe = clampFloatingPosition(position, viewport);
  const midpoint = (viewport.width - viewport.buttonSize) / 2;
  return { x: safe.x <= midpoint ? viewport.sideInset : viewport.width - viewport.buttonSize - viewport.sideInset, y: safe.y };
}
