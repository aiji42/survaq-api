import { Bindings } from "../../../../bindings";

type Env = Pick<
  Bindings,
  | "AMAZON_ADS_API_CLIENT_SECRET"
  | "AMAZON_ADS_API_CLIENT_ID"
  | "AMAZON_ADS_API_REDIRECT_URI"
  | "CACHE"
  | "KIRIBI"
>;

type AuthResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
  expireAt: Date;
  isExpired: boolean;
};

export class AmazonAdsClient {
  static expireBufferMinutes = 10;

  constructor(private readonly env: Env) {}

  get loginUrl() {
    return `https://apac.account.amazon.com/ap/oa?client_id=${this.env.AMAZON_ADS_API_CLIENT_ID}&scope=advertising::campaign_management&response_type=code&redirect_uri=${this.env.AMAZON_ADS_API_REDIRECT_URI}`;
  }

  async loginCallback(code: string) {
    const body = {
      grant_type: "authorization_code",
      code,
      client_id: this.env.AMAZON_ADS_API_CLIENT_ID,
      client_secret: this.env.AMAZON_ADS_API_CLIENT_SECRET,
      redirect_uri: this.env.AMAZON_ADS_API_REDIRECT_URI,
    };
    const res = await fetch("https://api.amazon.co.jp/auth/o2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!res.ok) throw new Error("Failed to get token");
    const result = (await res.json()) as AuthResult;

    await this.storeTokens(result);
  }

  async getTokens() {
    const tokens = await this.getTokensViaStore();
    if (!tokens) throw new Error("Not logged in");

    if (tokens.isExpired) return this.refreshTokens(tokens.refreshToken);

    return tokens;
  }

  private async refreshTokens(refreshToken: string): Promise<Tokens> {
    const body = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.env.AMAZON_ADS_API_CLIENT_ID,
      client_secret: this.env.AMAZON_ADS_API_CLIENT_SECRET,
    };
    const res = await fetch("https://api.amazon.co.jp/auth/o2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!res.ok) throw new Error(await res.text());
    const result = (await res.json()) as AuthResult;

    await this.storeTokens(result);

    const expireAt = new Date(Date.now() + result.expires_in * 1000);

    // FIXME: ある程度実績が確認できたら消す
    await this.env.KIRIBI.enqueue("NotifyToSlack", {
      text: "AmazonAdsのトークンがリフレッシュされました",
    });

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expireAt,
      isExpired: false,
    };
  }

  private async storeTokens(tokens: AuthResult) {
    await this.env.CACHE.put("AmazonAdsTokens", JSON.stringify(tokens), {
      expirationTtl: tokens.expires_in,
      metadata: { expire: new Date(Date.now() + tokens.expires_in * 1000) },
    });
  }

  private async getTokensViaStore(): Promise<Tokens | null> {
    const { value, metadata } = await this.env.CACHE.getWithMetadata<
      AuthResult,
      { expire: string }
    >("AmazonAdsTokens", "json");
    if (!value || !metadata) return null;

    const expire = new Date(metadata.expire);
    // {expireBufferMinutes}分前に期限が切れると判断する
    const isExpired =
      expire < new Date(Date.now() + AmazonAdsClient.expireBufferMinutes * 60 * 1000);

    return {
      accessToken: value.access_token,
      refreshToken: value.refresh_token,
      expireAt: expire,
      isExpired,
    };
  }
}
