import { describe, expect, test } from "vitest";

// idは適宜変更
const unshippedOrderId = "5939472793805";

describe("cancellation", () => {
  describe("POST /cancellation/cancel", () => {
    test("invalid request", async () => {
      const res = await fetch("http://localhost:8787/cancellation/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "123" }),
      });

      expect(res.status).toBe(400);
    });

    test("not found", async () => {
      const res = await fetch("http://localhost:8787/cancellation/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "123", reason: "test" }),
      });

      expect(res.status).toBe(404);
    });

    test("not cancelable cause of shipped", async () => {
      const res = await fetch("http://localhost:8787/cancellation/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // #S69179
        body: JSON.stringify({ id: "5792499302605", reason: "test" }),
      });

      expect(res.status).toBe(400);
    });

    test("success", async () => {
      const res = await fetch("http://localhost:8787/cancellation/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: unshippedOrderId, reason: "test" }),
      });

      expect(res.status).toBe(200);
      const data: { id: number } = await res.json();
      const requestId = data.id;

      // 再度リクエストを送るとすでにリクエスト済みとなる
      const res2 = await fetch("http://localhost:8787/cancellation/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: unshippedOrderId, reason: "test" }),
      });

      expect(res2.status).toBe(400);

      // リクエストを削除する
      const res3 = await fetch(`http://localhost:8787/cancellation/cancel/${requestId}`, {
        method: "DELETE",
      });

      expect(res3.status).toBe(200);
    });
  });
});
