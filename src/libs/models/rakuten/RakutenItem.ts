import { RakutenClient } from "./RakutenClient";

type Variant = {
  merchantDefinedSkuId: string | null; // システム連携用SKU番号
};

export type ItemModel = {
  manageNumber: string; // 商品管理番号
  itemNumber: string | null; // 商品番号
  title: string;
  variants: { [variantId: string]: Variant };
  created: string;
  updated: string;
};

type RakutenItemSearchResult = {
  item: ItemModel | null;
};

type RakutenItemSearchResponse =
  | {
      numFound: number;
      offSet: number;
      results: RakutenItemSearchResult[];
    }
  | {
      errors: {
        code: string;
        message: string;
      }[];
    };

export class RakutenItem extends RakutenClient {
  static searchEndpoint = "https://api.rms.rakuten.co.jp/es/2.0/items/search";

  // MEMO: https://webservice.rms.rakuten.co.jp/merchant-portal/view/ja/common/1-1_service_index/itemapi2/searchitem/
  async search(params: { limit?: number; offset?: number }) {
    const hits = Math.min(params.limit ?? 10, 100); // 仕様上は100件まで指定可能
    const offset = params.offset ?? 0;
    const searchParams = new URLSearchParams({ hits: String(hits), offset: String(offset) });

    const res = await this.jsonGet<RakutenItemSearchResponse>(
      RakutenItem.searchEndpoint,
      searchParams,
    );
    if ("errors" in res)
      throw new Error(res.errors.map((e) => `${e.code}: ${e.message}`).join(", "));

    const hasNext = res.numFound > offset + hits;

    return {
      data: res.results.flatMap(({ item }) => item ?? []),
      next: hasNext ? () => this.search({ ...params, offset: offset + hits }) : undefined,
    };
  }
}
