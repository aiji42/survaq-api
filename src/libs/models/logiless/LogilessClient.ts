import { Bindings } from "../../../../bindings";

export type Env = Pick<
  Bindings,
  "LOGILESS_CLIENT_SECRET" | "LOGILESS_CLIENT_ID" | "LOGILESS_REDIRECT_URI" | "CACHE" | "KIRIBI"
>;

type AuthResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
  expireAt: Date;
  isExpired: boolean;
};

export class LogilessClient {
  static expireBufferDays = 3;

  constructor(private readonly env: Env) {}

  get loginUrl() {
    return `https://app2.logiless.com/oauth/v2/auth?client_id=${this.env.LOGILESS_CLIENT_ID}&response_type=code&redirect_uri=${this.env.LOGILESS_REDIRECT_URI}`;
  }

  async loginCallback(code: string) {
    const res = await fetch(
      `https://app2.logiless.com/oauth2/token?client_id=${this.env.LOGILESS_CLIENT_ID}&client_secret=${this.env.LOGILESS_CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${this.env.LOGILESS_REDIRECT_URI}`,
    );
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
    const res = await fetch(
      `https://app2.logiless.com/oauth2/token?client_id=${this.env.LOGILESS_CLIENT_ID}&client_secret=${this.env.LOGILESS_CLIENT_SECRET}&refresh_token=${refreshToken}&grant_type=refresh_token`,
    );
    if (!res.ok) throw new Error(`Failed to refresh token: ${await res.text()}`);
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

  private async storeTokens(token: AuthResult) {
    await this.env.CACHE.put("LOGILESS_TOKEN", JSON.stringify(token), {
      expirationTtl: token.expires_in,
      metadata: { expire: new Date(Date.now() + token.expires_in * 1000) },
    });
  }

  private async getTokensViaStore(): Promise<Tokens | null> {
    const { value, metadata } = await this.env.CACHE.getWithMetadata<
      AuthResult,
      { expire: string }
    >("LOGILESS_TOKEN", "json");
    if (!value || !metadata) return null;

    // {expireBufferDays}日前に期限が切れると判断する
    const isExpired =
      new Date(metadata.expire) <
      new Date(Date.now() + 24 * 60 * 60 * 1000 * LogilessClient.expireBufferDays);

    return {
      accessToken: value.access_token,
      refreshToken: value.refresh_token,
      expireAt: new Date(metadata.expire),
      isExpired,
    };
  }

  async purgeTokens() {
    await this.env.CACHE.delete("LOGILESS_TOKEN");
  }

  protected apiPost = async <T>(path: string, body: any) => {
    const url = new URL("https://app2.logiless.com");
    url.pathname = `/api/v1/merchant/1394/${path}`.replace(/\/+/g, "/");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${(await this.getTokens()).accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.log(await res.json());
      throw new Error("Failed to post json");
    }

    return (await res.json()) as T;
  };

  protected apiGet = async <T>(path: string, params: Record<string, string | number | boolean>) => {
    const url = new URL(
      `https://app2.logiless.com/api/v1/merchant/1394/${path}`.replace(/\/+/g, "/"),
    );
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${(await this.getTokens()).accessToken}`,
      },
    });

    if (!res.ok) {
      console.log(await res.json());
      throw new Error("Failed to get");
    }

    return (await res.json()) as T;
  };
}
