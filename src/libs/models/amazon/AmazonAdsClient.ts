import { Bindings } from "../../../../bindings";
import pako from "pako";

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

type GetProfilesResponse = {
  profileId: number;
  countryCode: string;
  currencyCode: string;
  dailyBudget: number;
  timezone: string;
  accountInfo: {
    marketplaceStringId: string;
    id: string;
    type: string;
    name: string;
    validPaymentMethod: boolean;
  };
}[];

type CreateReportResponse = {
  reportId: string;
};

type CheckReportResponse =
  | {
      status: "COMPLETED";
      url: string;
    }
  | {
      status: "PENDING" | "PROCESSING";
      url?: never;
    };

export class AmazonAdsClient {
  // トークンの有効期限が1時間、かつ定期タスクは30分間隔で実行されるため、早めに期限切れと判断する
  static expireBufferMinutes = 40;

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

  async request<T>(url: string | URL, headers?: Record<string, string>): Promise<T> {
    const tokens = await this.getTokens();
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Amazon-Advertising-API-ClientId": this.env.AMAZON_ADS_API_CLIENT_ID,
        "content-type": "application/json",
        ...headers,
      },
    });

    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as T;
  }

  async post<T>(
    url: string | URL,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<T> {
    const tokens = await this.getTokens();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Amazon-Advertising-API-ClientId": this.env.AMAZON_ADS_API_CLIENT_ID,
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as T;
  }

  async getProfiles() {
    return this.request<GetProfilesResponse>("https://advertising-api-fe.amazon.com/v2/profiles");
  }

  async createReport(profileId: number | string, reportConfig: Record<string, unknown>) {
    return this.post<CreateReportResponse>(
      "https://advertising-api-fe.amazon.com/reporting/reports",
      reportConfig,
      {
        "Amazon-Advertising-API-Scope": String(profileId),
        "content-type": "application/vnd.createasyncreportrequest.v3+json",
      },
    );
  }

  async checkReport(reportId: string, profileId: number | string) {
    return this.request<CheckReportResponse>(
      `https://advertising-api-fe.amazon.com/reporting/reports/${reportId}`,
      {
        "Amazon-Advertising-API-Scope": String(profileId),
      },
    );
  }

  async downloadReport<T>(reportId: string, profileId: number | string) {
    const { status, url } = await this.checkReport(reportId, profileId);
    if (status !== "COMPLETED") throw new Error(`Report is not ready: ${status}`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());

    const buffer = await res.arrayBuffer();
    const text = pako.inflate(buffer, { to: "string" });
    return JSON.parse(text) as T;
  }
}
