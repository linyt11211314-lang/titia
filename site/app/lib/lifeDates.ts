import type { PeriodRecord } from "./store";

const dayMs = 86_400_000;
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : null;

export function countdownStatus(value: string, now = new Date()) {
  const target = localDate(value);
  if (!target || Number.isNaN(target.getTime())) return { valid: false as const, label: "待设置日期", days: null, direction: "pending" as const };
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const difference = Math.round((target.getTime() - current.getTime()) / dayMs);
  return { valid: true as const, label: difference < 0 ? "已经过" : difference === 0 ? "就是今天" : "还有", days: Math.abs(difference), direction: difference < 0 ? "elapsed" as const : "remaining" as const };
}

export function countdownDetails(item: { date: string; repeat: boolean }, now = new Date()) {
  const target=localDate(item.date);const current=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  if(!target)return{mode:item.repeat?"expectation" as const:"footprint" as const,totalDays:0,years:0,days:0,nextDate:""};
  if(!item.repeat){const totalDays=Math.max(0,Math.floor((current.getTime()-target.getTime())/dayMs));let years=current.getFullYear()-target.getFullYear();if(new Date(current.getFullYear(),target.getMonth(),target.getDate(),12)>current)years--;return{mode:"footprint" as const,totalDays,years:Math.max(0,years),days:Math.max(0,totalDays-Math.max(0,years)*365),nextDate:""};}
  const month=target.getMonth(),day=target.getDate();let year=current.getFullYear(),next=new Date(year,month,day,12);
  if(month===1&&day===29){while(!(year%4===0&&(year%100!==0||year%400===0))||next<current){year++;next=new Date(year,month,day,12);}}else if(next<current)next=new Date(year+1,month,day,12);
  return{mode:"expectation" as const,totalDays:Math.ceil((next.getTime()-current.getTime())/dayMs),years:0,days:0,nextDate:iso(next)};
}
export const countdownMonths=(items:{date:string}[])=>[...new Set(items.map(item=>Number(item.date.slice(5,7))).filter(value=>value>=1&&value<=12))].sort((a,b)=>a-b);

export type PeriodCalendarDay = { date: string; day: number; period: boolean; predicted: boolean; today: boolean };
export function buildPeriodCalendar(year: number, month: number, periods: PeriodRecord[], now = new Date()): PeriodCalendarDay[] {
  const recorded = new Set<string>();
  for (const period of periods) {
    const start = localDate(period.start); if (!start) continue;
    const end = localDate(period.end ?? "") ?? new Date(start.getTime() + 4 * dayMs);
    for (let date = new Date(start); date <= end; date = new Date(date.getTime() + dayMs)) recorded.add(iso(date));
  }
  const starts = periods.map((item) => localDate(item.start)).filter(Boolean) as Date[];
  const intervals = starts.slice(0, -1).map((item, index) => Math.abs(Math.round((item.getTime() - starts[index + 1].getTime()) / dayMs))).filter((value) => value >= 15 && value <= 60);
  const cycle = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 28;
  const predicted = new Set<string>();
  if (starts[0]) for (let offset = -3; offset <= 3; offset++) { const base = new Date(starts[0].getTime() + cycle * offset * dayMs); for (let d = 0; d < 5; d++) predicted.add(iso(new Date(base.getTime() + d * dayMs))); }
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, index) => { const date = iso(new Date(year, month, index + 1, 12)); return { date, day: index + 1, period: recorded.has(date), predicted: !recorded.has(date) && predicted.has(date), today: date === iso(now) }; });
}
