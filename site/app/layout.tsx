import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Titia 时序", template: "%s · Titia 时序" },
  description: "记录生活、管理时间、沉淀关系、保存成长轨迹。所有数据只保存在你的设备。",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Titia 时序", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.png", apple: "/icon.png" },
  openGraph: { title: "Titia 时序", description: "让时间留下痕迹", images: [{ url: "/og.png", width: 1536, height: 1024 }] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#edf8fc" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}<script src="/register-sw.js" defer /></body></html>;
}
