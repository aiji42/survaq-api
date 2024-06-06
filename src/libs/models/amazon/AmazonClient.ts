import { DB } from "../../db";
import { Bindings } from "../../../../bindings";

type AuthResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export class AmazonClient {
  protected marketplaceId = "A1VC38T7YXB528"; // JP (https://docs.developer.amazonservices.com/ja_JP/dev_guide/DG_Endpoints.html)
  private tokenCache: AuthResult | null = null;
  private db: DB;

  constructor(env: Bindings) {
    this.db = new DB(env);
  }

  // FIXME: KVに保存して取得の頻度を減らす
  async getAccessToken(): Promise<AuthResult> {
    if (this.tokenCache && Date.now() < this.tokenCache.expires_in) return this.tokenCache;

    const { amazonSpApiClientId, amazonSpApiClientSecret, amazonSpApiRefreshToken } =
      await this.db.prisma.tokens.findFirstOrThrow();
    if (!amazonSpApiClientId || !amazonSpApiClientSecret || !amazonSpApiRefreshToken)
      throw new Error("Amazon SP API credentials not found");

    const res = await fetch(
      `https://api.amazon.com/auth/o2/token?grant_type=refresh_token&refresh_token=${amazonSpApiRefreshToken}&client_id=${amazonSpApiClientId}&client_secret=${amazonSpApiClientSecret}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    if (!res.ok) throw new Error("Failed to get token");
    const token = (await res.json()) as AuthResult;
    this.tokenCache = token;

    return token;
  }

  async request<T>(url: string | URL): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(url, {
      headers: {
        "x-amz-access-token": token.access_token,
        "x-amz-date": new Date().toISOString(),
      },
    });
    console.log("x-amzn-RateLimit-Limit", res.headers.get("x-amzn-RateLimit-Limit"));

    if (!res.ok) throw new Error(JSON.stringify(await res.json(), null, 2));
    return res.json();
  }
}
