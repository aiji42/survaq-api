import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");
dayjs.extend(isBetween);

export type Schedule = {
  year: number;
  month: number;
  term: "early" | "middle" | "late";
  text: string;
  subText: string;
  texts: string[];
};

export const makeSchedule = (
  { customSchedules }: Pick<Rule, "customSchedules">,
  locale: "ja" | "en" = "ja"
): Schedule => {
  const customSchedule = customSchedules.find(({ beginOn, endOn }) =>
    dayjs().isBetween(
      dayjs(beginOn).startOf("date"),
      dayjs(endOn).endOf("date")
    )
  );

  if (customSchedule) {
    const [year, month, term] = customSchedule.deliverySchedule.split("-") as [
      string,
      string,
      Schedule["term"]
    ];
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
      text,
      texts,
      subText: monthWithDateRange(
        Number(year),
        Number(month) - 1,
        term,
        locale
      ),
    };
  }
  const date = dayjs().tz();
  let year = date.year();
  const day = date.date();
  let month = date.month() + 1 + (28 <= day ? 1 : 0);
  if (month > 12) {
    month = 1;
    year = year + 1;
  }
  const term: Schedule["term"] =
    28 <= day || day <= 7 ? "early" : 8 <= day && day <= 17 ? "middle" : "late";

  const texts = createScheduleTextArray({ year, month, term }, locale);
  const text = texts[0];
  if (!text) throw new Error();

  return {
    year,
    month,
    term,
    text,
    texts,
    subText: monthWithDateRange(year, month - 1, term, locale),
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
    term?: Schedule["term"];
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
  term: Schedule["term"],
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
