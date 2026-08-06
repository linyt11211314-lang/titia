import type { Metadata } from "next";
import { TitiaApp } from "./TitiaApp";

export const metadata: Metadata = {
  title: { absolute: "Titia 时序" },
  description: "温柔、私密、离线优先的个人生活操作系统",
};

export default function Home() { return <TitiaApp />; }
