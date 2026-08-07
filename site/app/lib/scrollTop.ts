export function scrollAppToTop(root: Pick<Document, "querySelectorAll"> = document, view: Pick<Window, "scrollTo"> = window) {
  view.scrollTo({ top: 0, behavior: "smooth" });
  root.querySelectorAll<HTMLElement>(".content-scroll,.ledger-scroll,.spark-fullscreen-body").forEach((element) => element.scrollTo({ top: 0, behavior: "smooth" }));
}
