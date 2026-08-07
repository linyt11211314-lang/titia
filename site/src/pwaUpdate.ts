type WorkerRegistration = { update: () => Promise<unknown> };
type WorkerContainer = {
  controller: unknown;
  register: (url: string, options: { scope: string; updateViaCache: "none" }) => Promise<WorkerRegistration>;
  addEventListener: (name: "controllerchange", listener: () => void) => void;
};

export async function keepPwaFresh(options: {
  serviceWorker: WorkerContainer;
  base: string;
  version?: string;
  reload: () => void;
  visibilityTarget?: {
    visibilityState: string;
    addEventListener: (name: "visibilitychange", listener: () => void) => void;
  };
}) {
  const { serviceWorker, base, reload, visibilityTarget, version } = options;
  const hadController = Boolean(serviceWorker.controller);
  let refreshing = false;

  serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    reload();
  });

  const registration = await serviceWorker.register(`${base}sw.js${version?`?v=${version}`:""}`, {
    scope: base,
    updateViaCache: "none",
  });
  await registration.update();
  visibilityTarget?.addEventListener("visibilitychange", () => {
    if (visibilityTarget.visibilityState === "visible") registration.update().catch(() => undefined);
  });
  return registration;
}
