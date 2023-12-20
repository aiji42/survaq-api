import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");
dayjs.extend(isBetween);

const terms = {
  early: 0,
  middle: 1,
  late: 2,
} as const;

export type Schedule<T extends boolean> = {
  year: number;
  month: number;
  term: keyof typeof terms;
  termIndex: number;
  numeric: number;
  text: string;
  subText: string;
  texts: T extends true ? string[] : never;
};

export type Locale = "ja" | "en";

type ResultType<T, W extends boolean> = T extends string
  ? Schedule<W>
  : T extends null
    ? null
    : never;

export const makeScheduleFromDeliverySchedule = <T extends string | null>(
  str: T,
  locale: Locale,
  withTexts: boolean = true,
): ResultType<T, typeof withTexts> => {
  if (!str) return null as ResultType<T, typeof withTexts>;
  const [year, month, term] = str.split("-") as [
    string,
    string,
    keyof typeof terms,
  ];
  return schedule(year, month, term, locale, withTexts) as ResultType<
    T,
    typeof withTexts
  >;
};

const schedule = <W extends boolean>(
  year: string | number,
  month: string | number,
  term: keyof typeof terms,
  locale: Locale,
  withTexts: boolean = true,
): Schedule<W> => {
  const texts = createScheduleTextArray(
    {
      year,
      month,
      term,
    },
    locale,
  );
  const text = texts[0];
  if (!text) throw new Error();
  return {
    year: Number(year),
    month: Number(month),
    term,
    termIndex: terms[term],
    numeric: Number(`${year}${String(month).padStart(2, "0")}${terms[term]}`),
    text,
    ...(withTexts ? { texts } : undefined),
    subText: monthWithDateRange(Number(year), Number(month) - 1, term, locale),
  } as Schedule<W>;
};

const createScheduleTextArray = (
  {
    year,
    month,
    term = "late",
  }: {
    year: string | number;
    month: string | number;
    term?: keyof typeof terms;
  },
  locale: "ja" | "en" = "ja",
  size = 7,
): string[] => {
  const begin = dayjs(
    `${year}-${month}-${term === "late" ? 28 : term === "middle" ? 18 : 8}`,
  );
  return Array.from({ length: size }).map((_, index) => {
    const date = begin.add(-1 * index * 10, "days");
    return yearMonthTerm(date.year(), date.month(), date.date(), locale);
  });
};

const yearMonthTerm = (
  year: number,
  monthIndex: number,
  date: number,
  locale: "ja" | "en" = "ja",
) => {
  if (locale === "ja")
    return `${year}年${monthIndex + 1}月${
      date > 20 ? "下旬" : date > 10 ? "中旬" : "上旬"
    }`;

  return `${date > 20 ? "late" : date > 10 ? "mid" : "early"} ${
    months[monthIndex]
  }. ${year}`;
};

const monthWithDateRange = (
  year: number,
  monthIndex: number,
  term: keyof typeof terms,
  locale: "ja" | "en" = "ja",
) => {
  const month = monthIndex + 1;
  const daysInMonth = dayjs(new Date(year, monthIndex, 1)).daysInMonth();
  const [begin, end] = [
    term === "early" ? 1 : term === "middle" ? 11 : 21,
    term === "early" ? 10 : term === "middle" ? 20 : daysInMonth,
  ];
  if (locale === "ja") return `${month}/${begin}〜${month}/${end}`;

  return `${months[monthIndex]}. ${begin} - ${end}`;
};

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const makeSchedule = (
  customSchedule: string | null,
  locale: Locale = "ja",
  withTexts: boolean = true,
): Schedule<typeof withTexts> => {
  let scheduleMadeByCustom: undefined | Schedule<true>;
  if (customSchedule) {
    scheduleMadeByCustom = makeScheduleFromDeliverySchedule(
      customSchedule,
      locale,
      withTexts,
    );
  }
  const date = dayjs().tz();
  let year = date.year();
  const day = date.date();
  let month = date.month() + 1 + (28 <= day ? 1 : 0);
  if (month > 12) {
    month = 1;
    year = year + 1;
  }
  const term: keyof typeof terms =
    28 <= day || day <= 7 ? "early" : 8 <= day && day <= 17 ? "middle" : "late";

  const scheduleMadeByCurrent = schedule(year, month, term, locale, withTexts);

  if (!scheduleMadeByCustom) return scheduleMadeByCurrent;
  if (scheduleMadeByCustom.numeric > scheduleMadeByCurrent.numeric)
    return scheduleMadeByCustom;

  return scheduleMadeByCurrent;
};

// 引数が過去日で構成される場合、過去日が最遅として計算されてしまうので、それを防ぎたい場合にはmakeSchedule(null)で最短配送日をガードとして入れないといけないことに注意
export const latest = (schedules: Array<null | Schedule<boolean>>) => {
  return (
    schedules.sort((a, b) => {
      const l = a?.numeric ?? makeSchedule(null).numeric;
      const r = b?.numeric ?? makeSchedule(null).numeric;
      return l > r ? -1 : l < r ? 1 : 0;
    })[0] ?? null
  );
};

export const earliest = (schedules: Array<null | Schedule<boolean>>) => {
  return (
    schedules.sort((a, b) => {
      const l = a?.numeric ?? 1000000;
      const r = b?.numeric ?? 1000000;
      return l > r ? 1 : l < r ? -1 : 0;
    })[0] ?? null
  );
};
