import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${process.cwd()}/app/mobile-fixes.css`, "utf8");
const app = readFileSync(`${process.cwd()}/app/TitiaApp.tsx`, "utf8");

describe("mobile layout contracts", () => {
  it("keeps section headers on one fixed vertical rhythm", () => {
    expect(css).toContain(".section-main>.page-header{flex:0 0 58px;height:58px");
  });

  it("shows full ledger overview values without ellipsis", () => {
    expect(css).toContain(".ledger-overview b{font-size:11px!important");
    expect(css).toContain("text-overflow:clip");
  });

  it("uses a solid pie chart and moves the month row below the range tabs", () => {
    expect(css).toContain(".pie-chart{width:148px;height:148px");
    expect(css).not.toContain(".donut:before");
    expect(css).toContain(".analysis-range>div:nth-child(2){margin-top:10px");
  });

  it("keeps the data overview banner on the merged settings page", () => {
    expect(app).toContain('section!=="首页"&&<LedgerOverview');
    expect(app).toContain('section==="设置"||section==="导入导出"');
  });

  it("uses the clickable application settings entry instead of a duplicate settings title", () => {
    expect(app).toContain('<Header eyebrow="生活的小小秩序" title="我呀"/>');
    expect(app).toContain('<b>应用设置</b>');
  });

  it("resets nested scroll positions whenever a main or side page changes", () => {
    expect(app).toContain('const resetAfterNavigation=()=>requestAnimationFrame(()=>{if(import.meta.env.MODE!=="test")scrollAppToTop()})');
    expect(app).toContain("onChange(item);resetAfterNavigation()");
  });

  it("uses a compact side rail to give cards more horizontal room", () => {
    expect(css).toContain(".section-layout{grid-template-columns:56px minmax(0,1fr);gap:6px}");
    expect(css).toContain(".side-nav button{min-height:56px");
  });
});
