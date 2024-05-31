import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { earliest, latest, makeSchedule } from "./makeSchedule";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("no custom schedules", () => {
  test("early(28-7)", () => {
    vi.setSystemTime(new Date(2022, 10, 28));
    expect(makeSchedule(null)).toEqual({
      year: 2022,
      month: 12,
      subText: "12/1〜12/10",
      term: "early",
      termIndex: 0,
      numeric: 2022120,
      text: "2022年12月上旬",
    });

    vi.setSystemTime(new Date(2022, 11, 7));
    expect(makeSchedule(null)).toEqual({
      year: 2022,
      month: 12,
      subText: "12/1〜12/10",
      term: "early",
      termIndex: 0,
      numeric: 2022120,
      text: "2022年12月上旬",
    });
  });

  test("middle(8-17)", () => {
    vi.setSystemTime(new Date(2022, 11, 8));
    expect(makeSchedule(null)).toEqual({
      year: 2022,
      month: 12,
      subText: "12/11〜12/20",
      term: "middle",
      termIndex: 1,
      numeric: 2022121,
      text: "2022年12月中旬",
    });

    vi.setSystemTime(new Date(2022, 11, 17));
    expect(makeSchedule(null)).toEqual({
      year: 2022,
      month: 12,
      subText: "12/11〜12/20",
      term: "middle",
      termIndex: 1,
      numeric: 2022121,
      text: "2022年12月中旬",
    });
  });

  test("late(18-27)", () => {
    vi.setSystemTime(new Date(2022, 11, 18));
    expect(makeSchedule(null)).toEqual({
      year: 2022,
      month: 12,
      subText: "12/21〜12/31",
      term: "late",
      termIndex: 2,
      numeric: 2022122,
      text: "2022年12月下旬",
    });

    vi.setSystemTime(new Date(2022, 11, 27));
    expect(makeSchedule(null)).toEqual({
      year: 2022,
      month: 12,
      subText: "12/21〜12/31",
      term: "late",
      termIndex: 2,
      numeric: 2022122,
      text: "2022年12月下旬",
    });
  });

  test("Straddling the year and the month", () => {
    vi.setSystemTime(new Date(2022, 11, 28));
    expect(makeSchedule(null)).toEqual({
      year: 2023,
      month: 1,
      subText: "1/1〜1/10",
      term: "early",
      termIndex: 0,
      numeric: 2023010,
      text: "2023年1月上旬",
    });
  });
});

describe("custom schedule", () => {
  test("Current date and time is before custom schedule", () => {
    vi.setSystemTime(new Date(2022, 10, 28));
    expect(makeSchedule("2023-01-early")).toEqual({
      year: 2023,
      month: 1,
      subText: "1/1〜1/10",
      term: "early",
      termIndex: 0,
      numeric: 2023010,
      text: "2023年1月上旬",
    });

    expect(makeSchedule("2023-01-middle")).toEqual({
      year: 2023,
      month: 1,
      subText: "1/11〜1/20",
      term: "middle",
      termIndex: 1,
      numeric: 2023011,
      text: "2023年1月中旬",
    });

    expect(makeSchedule("2023-01-late")).toEqual({
      year: 2023,
      month: 1,
      subText: "1/21〜1/31",
      term: "late",
      termIndex: 2,
      numeric: 2023012,
      text: "2023年1月下旬",
    });
  });

  test("If the current date/time is past the custom schedule, the schedule is calculated based on the current date/time", () => {
    vi.setSystemTime(new Date(2023, 0, 8));
    expect(makeSchedule("2023-01-early")).toEqual({
      year: 2023,
      month: 1,
      subText: "1/11〜1/20",
      term: "middle",
      termIndex: 1,
      numeric: 2023011,
      text: "2023年1月中旬",
    });
  });
});

describe("locale en", () => {
  test("early(28-7)", () => {
    vi.setSystemTime(new Date(2022, 10, 28));
    expect(makeSchedule(null, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 1 - 10",
      term: "early",
      termIndex: 0,
      numeric: 2022120,
      text: "early Dec. 2022",
    });

    vi.setSystemTime(new Date(2022, 11, 7));
    expect(makeSchedule(null, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 1 - 10",
      term: "early",
      termIndex: 0,
      numeric: 2022120,
      text: "early Dec. 2022",
    });
  });

  test("middle(8-17)", () => {
    vi.setSystemTime(new Date(2022, 11, 8));
    expect(makeSchedule(null, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 11 - 20",
      term: "middle",
      termIndex: 1,
      numeric: 2022121,
      text: "mid Dec. 2022",
    });

    vi.setSystemTime(new Date(2022, 11, 17));
    expect(makeSchedule(null, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 11 - 20",
      term: "middle",
      termIndex: 1,
      numeric: 2022121,
      text: "mid Dec. 2022",
    });
  });

  test("late(18-27)", () => {
    vi.setSystemTime(new Date(2022, 11, 18));
    expect(makeSchedule(null, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 21 - 31",
      term: "late",
      termIndex: 2,
      numeric: 2022122,
      text: "late Dec. 2022",
    });

    vi.setSystemTime(new Date(2022, 11, 27));
    expect(makeSchedule(null, "en")).toEqual({
      year: 2022,
      month: 12,
      subText: "Dec. 21 - 31",
      term: "late",
      termIndex: 2,
      numeric: 2022122,
      text: "late Dec. 2022",
    });
  });

  test("Straddling the year and the month", () => {
    vi.setSystemTime(new Date(2022, 11, 28));
    expect(makeSchedule(null, "en")).toEqual({
      year: 2023,
      month: 1,
      subText: "Jan. 1 - 10",
      term: "early",
      termIndex: 0,
      numeric: 2023010,
      text: "early Jan. 2023",
    });
  });

  describe("custom schedule", () => {
    test("Current date and time is before custom schedule", () => {
      vi.setSystemTime(new Date(2022, 10, 28));
      expect(makeSchedule("2023-01-early", "en")).toEqual({
        year: 2023,
        month: 1,
        subText: "Jan. 1 - 10",
        term: "early",
        termIndex: 0,
        numeric: 2023010,
        text: "early Jan. 2023",
      });
    });

    test("If the current date/time is past the custom schedule, the schedule is calculated based on the current date/time", () => {
      vi.setSystemTime(new Date(2023, 0, 8));
      expect(makeSchedule("2023-01-early", "en")).toEqual({
        month: 1,
        subText: "Jan. 11 - 20",
        term: "middle",
        termIndex: 1,
        numeric: 2023011,
        text: "mid Jan. 2023",
        year: 2023,
      });
    });
  });

  describe("latest/earliest", () => {
    test("latest", () => {
      expect(
        latest([
          makeSchedule("2024-01-early"),
          makeSchedule("2023-12-early"),
          makeSchedule("2024-01-late"),
          makeSchedule("2024-01-early"),
        ]),
      ).toEqual(makeSchedule("2024-01-late"));
    });

    test("latest with null and future dates", () => {
      vi.setSystemTime(new Date(2023, 0, 1));
      expect(
        latest([
          null,
          null,
          makeSchedule("2024-01-early"),
          makeSchedule("2023-12-early"),
          makeSchedule("2024-01-late"),
          makeSchedule("2024-01-early"),
        ]),
      ).toEqual(makeSchedule("2024-01-late"));
    });

    test("latest with null and past dates", () => {
      vi.setSystemTime(new Date(2024, 12, 1));
      expect(
        latest([
          null,
          null,
          makeSchedule("2024-01-early"),
          makeSchedule("2023-12-early"),
          makeSchedule("2024-01-late"),
          makeSchedule("2024-01-early"),
        ]),
      ).toEqual(null);
    });

    test("earliest", () => {
      expect(
        earliest([
          makeSchedule("2024-01-early"),
          makeSchedule("2023-12-early"),
          makeSchedule("2024-01-late"),
          makeSchedule("2023-01-early"),
        ]),
      ).toEqual(makeSchedule("2023-01-early"));
    });

    test("earliest with null", () => {
      vi.setSystemTime(new Date(2023, 0, 1));
      expect(
        earliest([
          null,
          null,
          makeSchedule("2024-01-early"),
          makeSchedule("2023-12-early"),
          makeSchedule("2024-01-late"),
          makeSchedule("2023-01-early"),
        ]),
      ).toEqual(null);
    });
  });
});
