import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { makeSchedule } from "./makeSchedule";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("no custom schedules", () => {
  test("early(28-7)", () => {
    vi.setSystemTime(new Date(2022, 10, 28));
    expect(makeSchedule({ customSchedules: [] })).toEqual({
      year: 2022,
      month: 12,
      subText: "12/1〜12/10",
      term: "early",
      termIndex: 0,
      text: "2022年12月上旬",
      texts: [
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
        "2022年10月下旬",
        "2022年10月中旬",
        "2022年10月上旬",
      ],
    });

    vi.setSystemTime(new Date(2022, 11, 7));
    expect(makeSchedule({ customSchedules: [] })).toEqual({
      year: 2022,
      month: 12,
      subText: "12/1〜12/10",
      term: "early",
      termIndex: 0,
      text: "2022年12月上旬",
      texts: [
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
        "2022年10月下旬",
        "2022年10月中旬",
        "2022年10月上旬",
      ],
    });
  });

  test("middle(8-17)", () => {
    vi.setSystemTime(new Date(2022, 11, 8));
    expect(makeSchedule({ customSchedules: [] })).toEqual({
      year: 2022,
      month: 12,
      subText: "12/11〜12/20",
      term: "middle",
      termIndex: 1,
      text: "2022年12月中旬",
      texts: [
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
        "2022年10月下旬",
        "2022年10月中旬",
      ],
    });

    vi.setSystemTime(new Date(2022, 11, 17));
    expect(makeSchedule({ customSchedules: [] })).toEqual({
      year: 2022,
      month: 12,
      subText: "12/11〜12/20",
      term: "middle",
      termIndex: 1,
      text: "2022年12月中旬",
      texts: [
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
        "2022年10月下旬",
        "2022年10月中旬",
      ],
    });
  });

  test("late(18-27)", () => {
    vi.setSystemTime(new Date(2022, 11, 18));
    expect(makeSchedule({ customSchedules: [] })).toEqual({
      year: 2022,
      month: 12,
      subText: "12/21〜12/31",
      term: "late",
      termIndex: 2,
      text: "2022年12月下旬",
      texts: [
        "2022年12月下旬",
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
        "2022年10月下旬",
      ],
    });

    vi.setSystemTime(new Date(2022, 11, 27));
    expect(makeSchedule({ customSchedules: [] })).toEqual({
      year: 2022,
      month: 12,
      subText: "12/21〜12/31",
      term: "late",
      termIndex: 2,
      text: "2022年12月下旬",
      texts: [
        "2022年12月下旬",
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
        "2022年10月下旬",
      ],
    });
  });

  test("Straddling the year and the month", () => {
    vi.setSystemTime(new Date(2022, 11, 28));
    expect(makeSchedule({ customSchedules: [] })).toEqual({
      year: 2023,
      month: 1,
      subText: "1/1〜1/10",
      term: "early",
      termIndex: 0,
      text: "2023年1月上旬",
      texts: [
        "2023年1月上旬",
        "2022年12月下旬",
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
      ],
    });
  });
});

describe("custom schedule", () => {
  test("in the range", () => {
    vi.setSystemTime(new Date(2022, 10, 28));
    expect(
      makeSchedule({
        customSchedules: [
          {
            beginOn: "2022-11-20",
            endOn: "2022-11-30",
            deliverySchedule: "2023-01-early",
          },
        ],
      })
    ).toEqual({
      year: 2023,
      month: 1,
      subText: "1/1〜1/10",
      term: "early",
      termIndex: 0,
      text: "2023年1月上旬",
      texts: [
        "2023年1月上旬",
        "2022年12月下旬",
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
      ],
    });

    expect(
      makeSchedule({
        customSchedules: [
          {
            beginOn: "2022-11-20",
            endOn: "2022-11-30",
            deliverySchedule: "2023-01-middle",
          },
        ],
      })
    ).toEqual({
      year: 2023,
      month: 1,
      subText: "1/11〜1/20",
      term: "middle",
      termIndex: 1,
      text: "2023年1月中旬",
      texts: [
        "2023年1月中旬",
        "2023年1月上旬",
        "2022年12月下旬",
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
      ],
    });

    expect(
      makeSchedule({
        customSchedules: [
          {
            beginOn: "2022-11-20",
            endOn: "2022-11-30",
            deliverySchedule: "2023-01-late",
          },
        ],
      })
    ).toEqual({
      year: 2023,
      month: 1,
      subText: "1/21〜1/31",
      term: "late",
      termIndex: 2,
      text: "2023年1月下旬",
      texts: [
        "2023年1月下旬",
        "2023年1月中旬",
        "2023年1月上旬",
        "2022年12月下旬",
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
      ],
    });
  });

  test("out of the range", () => {
    vi.setSystemTime(new Date(2022, 11, 1));
    expect(
      makeSchedule({
        customSchedules: [
          {
            beginOn: "2022-11-20",
            endOn: "2022-11-30",
            deliverySchedule: "2023-01-early",
          },
        ],
      })
    ).toEqual({
      year: 2022,
      month: 12,
      subText: "12/1〜12/10",
      term: "early",
      termIndex: 0,
      text: "2022年12月上旬",
      texts: [
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
        "2022年10月下旬",
        "2022年10月中旬",
        "2022年10月上旬",
      ],
    });
  });

  test("two overlapping ranges", () => {
    vi.setSystemTime(new Date(2022, 10, 28));
    expect(
      makeSchedule({
        customSchedules: [
          {
            beginOn: "2022-11-20",
            endOn: "2022-11-30",
            deliverySchedule: "2023-01-early",
          },
          {
            beginOn: "2022-11-25",
            endOn: "2022-12-01",
            deliverySchedule: "2023-02-late",
          },
        ],
      })
    ).toEqual({
      year: 2023,
      month: 1,
      subText: "1/1〜1/10",
      term: "early",
      termIndex: 0,
      text: "2023年1月上旬",
      texts: [
        "2023年1月上旬",
        "2022年12月下旬",
        "2022年12月中旬",
        "2022年12月上旬",
        "2022年11月下旬",
        "2022年11月中旬",
        "2022年11月上旬",
      ],
    });
  });
});

describe("locale en", () => {
  test("early(28-7)", () => {
    vi.setSystemTime(new Date(2022, 10, 28));
    expect(makeSchedule({ customSchedules: [] }, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 1 - 10",
      term: "early",
      termIndex: 0,
      text: "early Dec. 2022",
      texts: [
        "early Dec. 2022",
        "late Nov. 2022",
        "mid Nov. 2022",
        "early Nov. 2022",
        "late Oct. 2022",
        "mid Oct. 2022",
        "early Oct. 2022",
      ],
    });

    vi.setSystemTime(new Date(2022, 11, 7));
    expect(makeSchedule({ customSchedules: [] }, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 1 - 10",
      term: "early",
      termIndex: 0,
      text: "early Dec. 2022",
      texts: [
        "early Dec. 2022",
        "late Nov. 2022",
        "mid Nov. 2022",
        "early Nov. 2022",
        "late Oct. 2022",
        "mid Oct. 2022",
        "early Oct. 2022",
      ],
    });
  });

  test("middle(8-17)", () => {
    vi.setSystemTime(new Date(2022, 11, 8));
    expect(makeSchedule({ customSchedules: [] }, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 11 - 20",
      term: "middle",
      termIndex: 1,
      text: "mid Dec. 2022",
      texts: [
        "mid Dec. 2022",
        "early Dec. 2022",
        "late Nov. 2022",
        "mid Nov. 2022",
        "early Nov. 2022",
        "late Oct. 2022",
        "mid Oct. 2022",
      ],
    });

    vi.setSystemTime(new Date(2022, 11, 17));
    expect(makeSchedule({ customSchedules: [] }, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 11 - 20",
      term: "middle",
      termIndex: 1,
      text: "mid Dec. 2022",
      texts: [
        "mid Dec. 2022",
        "early Dec. 2022",
        "late Nov. 2022",
        "mid Nov. 2022",
        "early Nov. 2022",
        "late Oct. 2022",
        "mid Oct. 2022",
      ],
    });
  });

  test("late(18-27)", () => {
    vi.setSystemTime(new Date(2022, 11, 18));
    expect(makeSchedule({ customSchedules: [] }, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 21 - 31",
      term: "late",
      termIndex: 2,
      text: "late Dec. 2022",
      texts: [
        "late Dec. 2022",
        "mid Dec. 2022",
        "early Dec. 2022",
        "late Nov. 2022",
        "mid Nov. 2022",
        "early Nov. 2022",
        "late Oct. 2022",
      ],
    });

    vi.setSystemTime(new Date(2022, 11, 27));
    expect(makeSchedule({ customSchedules: [] }, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 21 - 31",
      term: "late",
      termIndex: 2,
      text: "late Dec. 2022",
      texts: [
        "late Dec. 2022",
        "mid Dec. 2022",
        "early Dec. 2022",
        "late Nov. 2022",
        "mid Nov. 2022",
        "early Nov. 2022",
        "late Oct. 2022",
      ],
    });
  });

  test("Straddling the year and the month", () => {
    vi.setSystemTime(new Date(2022, 11, 28));
    expect(makeSchedule({ customSchedules: [] }, "en")).toEqual({
      year: 2023,
      month: 1,
      subText: "Jan. 1 - 10",
      term: "early",
      termIndex: 0,
      text: "early Jan. 2023",
      texts: [
        "early Jan. 2023",
        "late Dec. 2022",
        "mid Dec. 2022",
        "early Dec. 2022",
        "late Nov. 2022",
        "mid Nov. 2022",
        "early Nov. 2022",
      ],
    });
  });

  test("custom schedule", () => {
    vi.setSystemTime(new Date(2022, 10, 28));
    expect(
      makeSchedule(
        {
          customSchedules: [
            {
              beginOn: "2022-11-20",
              endOn: "2022-11-30",
              deliverySchedule: "2023-01-early",
            },
          ],
        },
        "en"
      )
    ).toEqual({
      year: 2023,
      month: 1,
      subText: "Jan. 1 - 10",
      term: "early",
      termIndex: 0,
      text: "early Jan. 2023",
      texts: [
        "early Jan. 2023",
        "late Dec. 2022",
        "mid Dec. 2022",
        "early Dec. 2022",
        "late Nov. 2022",
        "mid Nov. 2022",
        "early Nov. 2022",
      ],
    });
  });
});
