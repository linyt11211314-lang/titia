import type { LedgerCategory } from "./store";

const taxonomy: Array<{ name: string; type: LedgerCategory["type"]; children: string[] }> = [
  { name: "收入", type: "income", children: ["基本工资", "提成", "亚马逊收入", "红包收入", "转账收入", "退款收入", "二手出售"] },
  { name: "餐饮", type: "expense", children: ["早餐", "午餐", "晚餐", "夜宵", "外卖", "咖啡", "奶茶", "饮料", "朋友聚餐", "家庭聚餐", "零食", "水果", "甜品"] },
  { name: "购物", type: "expense", children: ["清洁用品", "家居用品", "厨房用品", "收纳用品", "衣服", "鞋子", "包包", "配饰", "手机", "电脑", "配件", "耳机", "护肤", "彩妆", "香水", "美容工具", "礼物", "收藏", "二手商品"] },
  { name: "住房生活", type: "expense", children: ["房租", "宽带", "手机话费", "家具家电", "家电维修", "装修", "清洁服务"] },
  { name: "交通出行", type: "expense", children: ["打车", "公交", "地铁", "火车", "加油", "充电", "停车", "洗车", "保养", "维修"] },
  { name: "宠物", type: "expense", children: ["猫粮", "猫砂", "玩具", "猫窝", "零食", "工具", "宠物医疗", "洗澡", "美容", "修剪", "宠物寄养", "宠物保险"] },
  { name: "医疗健康", type: "expense", children: ["医疗健康"] },
  { name: "娱乐休闲", type: "expense", children: ["电影", "游戏", "会员", "音乐", "摄影", "书籍", "手办", "收藏", "聚会", "活动", "KTV"] },
  { name: "学习成长", type: "expense", children: ["课程", "书籍", "软件会员"] },
  { name: "人情关系", type: "expense", children: ["生日礼物", "节日礼物", "纪念日", "红包支出", "红包收入", "请客", "聚会"] },
  { name: "金融转账", type: "expense", children: ["银行转账", "账户充值", "信用卡还款", "平台手续费", "银行手续费"] },
  { name: "其他", type: "expense", children: ["临时支出", "未分类"] },
];

export const defaultLedgerCategories: LedgerCategory[] = taxonomy.flatMap((group, parentIndex) => {
  const parentId = `category-${parentIndex + 1}`;
  return [
    { id: parentId, name: group.name, type: group.type },
    ...group.children.map((name, childIndex) => ({ id: `${parentId}-${childIndex + 1}`, name, type: group.type, parentId })),
  ];
});

