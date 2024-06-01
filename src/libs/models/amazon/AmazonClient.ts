type AuthResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export class AmazonClient {
  protected marketplaceId = "A1VC38T7YXB528"; // JP (https://docs.developer.amazonservices.com/ja_JP/dev_guide/DG_Endpoints.html)
  private tokenCache: AuthResult | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private refreshToken: string,
  ) {}

  // FIXME: KVに保存して取得の頻度を減らす
  async getAccessToken(): Promise<AuthResult> {
    if (this.tokenCache && Date.now() < this.tokenCache.expires_in) return this.tokenCache;

    const res = await fetch(
      `https://api.amazon.com/auth/o2/token?grant_type=refresh_token&refresh_token=${this.refreshToken}&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
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

    if (!res.ok) throw new Error(JSON.stringify(await res.json(), null, 2));
    return res.json();
  }
}
