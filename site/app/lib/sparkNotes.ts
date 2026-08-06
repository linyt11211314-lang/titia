import type { Spark, SparkNote } from "./store";

export const sparkTags = ["全部", "备忘录", "电影", "音乐", "研究", "产品", "脑洞"] as const;
export function migrateLegacySparks(sparks: Spark[]): SparkNote[] {
  return sparks.map((spark) => ({ id: spark.id, title: spark.body.trim().split(/\n/)[0].slice(0, 24) || "未命名灵光", content: spark.body, tag: spark.tag || "备忘录", images: [], createdAt: spark.date, updatedAt: spark.date }));
}
export const filterSparkNotes = (notes: SparkNote[], tag: string) => tag === "全部" ? notes : notes.filter((note) => note.tag === tag);
