if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const workerUrl = new URL("sw.js", document.baseURI);
    navigator.serviceWorker.register(workerUrl, { scope: new URL("./", document.baseURI).pathname }).catch(() => undefined);
  });
}

