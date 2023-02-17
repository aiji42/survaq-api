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

export type Schedule = {
  year: number;
  month: number;
  term: keyof typeof terms;
  termIndex: number;
  text: string;
  subText: string;
  texts: string[];
};

type Locale = "ja" | "en";

export const makeScheduleFromDeliverySchedule = (
  str: DeliverySchedule,
  locale: Locale
): Schedule => {
  const [year, month, term] = str.split("-") as [
    string,
    string,
    keyof typeof terms
  ];
  return schedule(year, month, term, locale);
};

const schedule = (
  year: string | number,
  month: string | number,
  term: keyof typeof terms,
  locale: Locale
): Schedule => {
  const texts = createScheduleTextArray(
    {
      year,
      month,
      term,
    },
    locale
  );
  const text = texts[0];
  if (!text) throw new Error();
  return {
    year: Number(year),
    month: Number(month),
    term,
    termIndex: terms[term],
    text,
    texts,
    subText: monthWithDateRange(Number(year), Number(month) - 1, term, locale),
  };
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
  size = 7
): string[] => {
  const begin = dayjs(
    `${year}-${month}-${term === "late" ? 28 : term === "middle" ? 18 : 8}`
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
  locale: "ja" | "en" = "ja"
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
  locale: "ja" | "en" = "ja"
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
  locale: Locale = "ja"
): Schedule => {
  let scheduleMadeByCustom: undefined | Schedule;
  if (customSchedule) {
    scheduleMadeByCustom = makeScheduleFromDeliverySchedule(
      customSchedule as DeliverySchedule,
      locale
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

  const scheduleMadeByCurrent = schedule(year, month, term, locale);

  if (!scheduleMadeByCustom) return scheduleMadeByCurrent;
  if (
    Number(
      `${scheduleMadeByCustom.year}${String(
        scheduleMadeByCustom.month
      ).padStart(2, "0")}${scheduleMadeByCustom.termIndex}`
    ) >
    Number(
      `${scheduleMadeByCurrent.year}${String(
        scheduleMadeByCurrent.month
      ).padStart(2, "0")}${scheduleMadeByCurrent.termIndex}`
    )
  )
    return scheduleMadeByCustom;

  return scheduleMadeByCurrent;
};
