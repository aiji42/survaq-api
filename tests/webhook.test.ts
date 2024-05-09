import { describe, test } from "vitest";
import { order } from "./dummys/shopify-order";

// ここにテスト用のemailを入力してください
const email = "";

// MEMO: テストを実行する際はskipを外して、ShopifyOrderForNoteAttrs.updateNoteAttributesのAPI処理をコメントアウトし、console.logに書き換える
describe.skip("Webhook", () => {
  if (!email) throw new Error("emailを入力してください");

  describe("shopify order created/updated", () => {
    test("新規注文(SKU情報はline_itemsに入力された状態)", async () => {
      await fetch("http://localhost:8787/shopify/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          order({
            email,
          }),
        ),
      });

      // スケジュールメールが送信され、line_itemsの_sku情報によってnote_attributesが更新される
    });

    test("新規注文(SKU情報が入っていない状態)", async () => {
      await fetch("http://localhost:8787/shopify/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          order({
            email,
            noSKUProperties: true,
          }),
        ),
      });

      // スケジュールメールが送信され、DBの情報によってnote_attributesが更新される
    });

    test("注文更新(すべてのnote_attributesが入力済み)", async () => {
      await fetch("http://localhost:8787/shopify/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          order({
            email,
            additionalNoteAttributes: [
              {
                name: "__delivery_schedule",
                value: '{"estimate":"2024-5-middle"}',
              },
              {
                name: "__line_items",
                value:
                  '[{"id":15132713976013,"name":"★キャンペーン中★首と肩がホッとする枕PLUS | 首と肩を40度で15分間温めることで心地よい睡眠を手に入れる為のホットまくら【PH01-CPA】 - PLUS-ダークグレー / なし / なし","_skus":["double1-PHDG","doublecover1-PHDG"]}]',
              },
            ],
          }),
        ),
      });

      // メールの送信・アップデート等は発生しない
    });

    test("前回Webhook通過時にSKU情報が取得できなかった状態で再更新がかかった", async () => {
      await fetch("http://localhost:8787/shopify/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          order({
            email,
            additionalNoteAttributes: [
              {
                name: "__line_items",
                value:
                  '[{"id":15132713976013,"name":"★キャンペーン中★首と肩がホッとする枕PLUS | 首と肩を40度で15分間温めることで心地よい睡眠を手に入れる為のホットまくら【PH01-CPA】 - PLUS-ダークグレー / なし / なし","_skus":[]}]',
              },
            ],
            noSKUProperties: true,
          }),
        ),
      });

      // スケジュールメールが送信され、DBの情報によってnote_attributesが更新される
    });

    test("まだメールは送っていないが、すでにキャンセルされた申込み", async () => {
      await fetch("http://localhost:8787/shopify/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          order({
            email,
            additionalNoteAttributes: [
              {
                name: "__line_items",
                value:
                  '[{"id":15132713976013,"name":"★キャンペーン中★首と肩がホッとする枕PLUS | 首と肩を40度で15分間温めることで心地よい睡眠を手に入れる為のホットまくら【PH01-CPA】 - PLUS-ダークグレー / なし / なし","_skus":[]}]',
              },
            ],
            noSKUProperties: true,
            cancelled_at: new Date(),
          }),
        ),
      });

      // 時期通知メールは送信されないが、lineItems用のnote_attributesは更新される
    });

    test("まだメールは送っていないが、すでに発送された申込み", async () => {
      await fetch("http://localhost:8787/shopify/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          order({
            email,
            additionalNoteAttributes: [
              {
                name: "__line_items",
                value:
                  '[{"id":15132713976013,"name":"★キャンペーン中★首と肩がホッとする枕PLUS | 首と肩を40度で15分間温めることで心地よい睡眠を手に入れる為のホットまくら【PH01-CPA】 - PLUS-ダークグレー / なし / なし","_skus":[]}]',
              },
            ],
            noSKUProperties: true,
            fulfillment_status: "fulfilled",
          }),
        ),
      });

      // 時期通知メールは送信されないが、lineItems用のnote_attributesは更新される
    });

    test("CMS上にvariationが存在しない注文", async () => {
      await fetch("http://localhost:8787/shopify/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          order({
            email,
            additionalLineItems: [
              {
                id: 999999999999,
                name: "テストの商品",
                variant_id: 111111111111,
                properties: [],
              },
            ],
          }),
        ),
      });

      // 時期通知メールは送信されない。lineItems用のnote_attributesは更新される
      // Slackにアラート(SKUなし注文)通知が飛ぶ
    });
  });
});
