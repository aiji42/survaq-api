import { Bindings } from "../../../../bindings";
import { DB } from "../../db";

export class RakutenClient {
  private db: DB;
  private tokenCache: string | null = null;
  constructor(env: Bindings) {
    this.db = new DB(env);
  }

  async getBearerToken() {
    if (this.tokenCache) return this.tokenCache;
    const { rakutenServiceSecret, rakutenLicenseKey } =
      await this.db.prisma.tokens.findFirstOrThrow();
    if (!rakutenServiceSecret || !rakutenLicenseKey)
      throw new Error("Rakuten API credentials not found");

    // https://webservice.rms.rakuten.co.jp/merchant-portal/view/ja/common/1-1_service_index/rmsWebServiceAuthentication
    const bearerToken = `ESA ${Buffer.from(`${rakutenServiceSecret}:${rakutenLicenseKey}`).toString("base64")}`;
    this.tokenCache = bearerToken;

    return bearerToken;
  }

  protected async jsonPost<T>(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Authorization: await this.getBearerToken(),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok)
      throw new Error(`Failed to fetch ${url}: ${JSON.stringify(await res.json(), null, 2)}`);
    return (await res.json()) as T;
  }

  protected async jsonGet<T>(_url: string, params?: URLSearchParams) {
    const url = params ? `${_url}?${params.toString()}` : _url;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Authorization: await this.getBearerToken(),
      },
    });
    if (!res.ok)
      throw new Error(`Failed to fetch ${url}: ${JSON.stringify(await res.json(), null, 2)}`);
    return (await res.json()) as T;
  }
}
