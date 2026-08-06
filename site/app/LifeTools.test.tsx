import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TitiaApp } from "./TitiaApp";
import { createVault, emptyData, encryptText, store } from "./lib/store";

afterEach(cleanup);
beforeEach(async () => { await store.save(emptyData()); });

async function openHomeSection(name: string) {
  const user = userEvent.setup();
  render(<TitiaApp />);
  await user.click(await screen.findByRole("button", { name: "小窝" }));
  await user.click(screen.getByRole("button", { name: new RegExp(`${name}$`) }));
  return user;
}

describe("home life tools", () => {
  it("edits and deletes an existing countdown", async () => {
    const data = emptyData();
    data.countdowns = [{ id: "c1", title: "生日", date: "2026-12-01", category: "生日", repeat: true, calendar: "solar", createdAt: "2026-08-06" }];
    await store.save(data);
    const user = await openHomeSection("倒数日");
    await user.click(screen.getByRole("button", { name: "编辑生日" }));
    expect(screen.getByRole("heading", { name: "编辑倒数日" })).toBeInTheDocument();
    expect(screen.getByLabelText("事件名称")).toHaveValue("生日");
    expect(screen.getByRole("button", { name: "删除生日" })).toBeInTheDocument();
  });

  it("collects period history inside one collapsed card", async () => {
    const data = emptyData();
    data.periods = [{ id: "p1", start: "2026-08-01", end: "2026-08-05", note: "正常" }];
    await store.save(data);
    await openHomeSection("周期");
    const history = screen.getByText("历史记录 · 1 条").closest("details");
    expect(history).toBeInTheDocument();
    expect(history).not.toHaveAttribute("open");
  });

  it("offers a local image upload for pet growth moments", async () => {
    const data = emptyData();
    data.pets = [{ id: "pet1", name: "憨憨", breed: "狸花", birthday: "2019-11-08", sex: "男孩" }];
    await store.save(data);
    const user = await openHomeSection("憨憨");
    await user.click(screen.getByRole("button", { name: /成长时光/ }));
    expect(screen.getByLabelText("成长图片（可选）")).toHaveAttribute("accept", "image/*");
  });

  it("can hide a password after revealing it", async () => {
    const data = emptyData();
    const { meta, key } = await createVault("password123");
    const encrypted = await encryptText(JSON.stringify({ username: "me", password: "secret" }), key);
    data.vaultMeta = meta;
    data.vault = [{ id: "v1", title: "示例", ...encrypted, createdAt: "2026-08-06" }];
    await store.save(data);
    const user = await openHomeSection("密码箱");
    await user.click(screen.getByRole("button", { name: "输入主密码解锁" }));
    await user.type(screen.getByLabelText("请输入密码"), "password123");
    await user.click(screen.getByRole("button", { name: "解锁" }));
    await user.click(await screen.findByRole("button", { name: "查看账号和密码" }));
    expect(await screen.findByRole("button", { name: "隐藏账号和密码" })).toBeInTheDocument();
  });
});
