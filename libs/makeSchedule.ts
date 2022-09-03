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

export const makeSchedule = ({ customSchedules }: Rule): Schedule => {
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
      string
    ];
    return {
      year: Number(year),
      month: Number(month),
      term: term as Schedule["term"],
      text: `${year}年${Number(month)}月${
        term === "early" ? "上旬" : term === "middle" ? "中旬" : "下旬"
      }`,
      texts: createScheduleTextArray({
        year,
        month,
        term: term as Schedule["term"],
      }),
      subText: `${Number(month)}/${
        term === "early" ? "1" : term === "middle" ? "11" : "21"
      }〜${Number(month)}/${
        term === "early"
          ? "10"
          : term === "middle"
          ? "20"
          : dayjs(new Date(Number(year), Number(month) - 1, 1)).daysInMonth()
      }`,
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
  const dayOfMonth = dayjs(new Date(year, month - 1, day)).daysInMonth();

  const [term, termText, beginDate, endDate]: [
    Schedule["term"],
    string,
    number,
    number
  ] =
    28 <= day || day <= 7
      ? ["early", "上旬", 1, 10]
      : 8 <= day && day <= 17
      ? ["middle", "中旬", 11, 20]
      : ["late", "下旬", 21, dayOfMonth];
  return {
    year,
    month,
    term,
    text: `${year}年${month}月${termText}`,
    texts: createScheduleTextArray({ year, month, term }),
    subText: `${month}/${beginDate}〜${month}/${endDate}`,
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
  size = 7
): string[] => {
  const begin = dayjs(
    `${year}-${month}-${term === "late" ? 28 : term === "middle" ? 18 : 8}`
  );
  return Array.from({ length: size }).map((_, index) => {
    const date = begin.add(-1 * index * 10, "days");
    return `${date.year()}年${date.month() + 1}月${
      date.date() > 20 ? "下旬" : date.date() > 10 ? "中旬" : "上旬"
    }`;
  });
};
