import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${process.cwd()}/app/mobile-fixes.css`, "utf8");
const app = readFileSync(`${process.cwd()}/app/TitiaApp.tsx`, "utf8");
const manifest = readFileSync(`${process.cwd()}/public/manifest.webmanifest`, "utf8");
const indexHtml = readFileSync(`${process.cwd()}/index.html`, "utf8");

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
    expect(app).toContain('section!=="首页"&&section!=="AI识别"&&<LedgerOverview');
    expect(app).toContain('section==="设置"||section==="导入导出"');
  });

  it("uses the clickable application settings entry instead of a duplicate settings title", () => {
    expect(app).toContain('className="card me-banner"');
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

  it("keeps controls outside iPhone system bars and floats the rounded bottom navigation", () => {
    expect(css).toContain(".dynamic-island-scroll{position:fixed;z-index:90;top:env(safe-area-inset-top)");
    expect(css).toContain(".bottom-nav{bottom:max(10px,env(safe-area-inset-bottom));height:70px;width:calc(100% - 20px);border-radius:27px");
    expect(css).toContain("padding-bottom:calc(92px + env(safe-area-inset-bottom))");
  });

  it("restores the Me banner without changing other page data", () => {
    expect(app).toContain('className="card me-banner"');
    expect(app).toContain("Titia 时序");
    expect(app).toContain('<time dateTime="2026-08-06">2026年8月6日</time>');
  });

  it("pins daily expense summaries and centers the analysis pie", () => {
    expect(css).toContain(".transaction-day-summary{display:grid;grid-template-columns:minmax(0,1fr) 108px");
    expect(css).toContain(".analysis>.pie-chart{display:block;width:148px;height:148px;margin:14px auto 18px");
  });

  it("keeps the bottom navigation fixed as a non-moving floating capsule", () => {
    expect(css).toContain(".bottom-nav{position:fixed!important;left:50%;transform:translateX(-50%);bottom:max(10px,env(safe-area-inset-bottom))");
  });

  it("uses the supplied desktop icon and a distinct AI scan icon", () => {
    expect(manifest).toContain("./titia-icon.jpg");
    expect(indexHtml).toContain("titia-icon.jpg");
    expect(app).toContain('<ScanLine size={19}/>');
  });

  it("routes clipboard and OCR text through the enabled DeepSeek pipeline", () => {
    expect(app).toContain("const analyzeText=async(text:string");
    expect(app).toContain("await recognizeBillsWithApi(data.userPreferences.billApi,text)");
    expect(app).toContain("void analyzeText(initialText)");
    expect(app).toContain("await analyzeText(text,nextAttachmentId)");
    expect(app).toContain("await analyzeText(text)");
    expect(app).toContain("ai-center-simple");
  });

  it("shows smart review in a modal card", () => {
    expect(app).toContain('className="ai-review-backdrop"');
    expect(app).toContain('className="ai-review-card" role="dialog" aria-modal="true"');
    expect(css).toContain(".ai-review-backdrop{position:fixed;inset:0;z-index:70");
    expect(css).toContain("overflow-x:hidden;overflow-y:auto");
    expect(app).toContain("navigator.clipboard.readText().then");
  });

  it("tries bill-only clipboard recognition when the app starts", () => {
    expect(app).toContain("const looksLikeBillClipboard=");
    expect(app).toContain('setLedgerSection("AI识别")');
    expect(app).toContain('initialText={startupBillText}');
  });

  it("places Spark tags in one horizontal row above note cards", () => {
    const spark = readFileSync(`${process.cwd()}/app/components/SparkFullscreen.tsx`, "utf8");
    expect(spark).toContain('className="spark-tags spark-tags-inline"');
    expect(spark).not.toContain('label="标签筛选"');
    expect(css).toContain(".spark-tags-inline{display:flex;flex-wrap:nowrap");
  });
});
