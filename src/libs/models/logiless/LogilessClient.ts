import { Bindings } from "../../../../bindings";

type Env = Pick<
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
  constructor(private readonly env: Env) {}

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

  // TODO: もしリフレッシュトークンの更新が何度も失敗するようなら、isExpiredの判定にもっと余裕を持たせて、強制的にリフレッシュをリクエストさせて検証してみる。
  private async refreshTokens(refreshToken: string): Promise<Tokens> {
    const res = await fetch(
      `https://app2.logiless.com/oauth2/token?client_id=${this.env.LOGILESS_CLIENT_ID}&client_secret=${this.env.LOGILESS_CLIENT_SECRET}&refresh_token=${refreshToken}&grant_type=refresh_token`,
    );
    // TODO: rest.textを使ってエラーメッセージを出力したほうがいいかもしれない
    if (!res.ok) throw new Error("Failed to refresh token");
    const result = (await res.json()) as AuthResult;

    await this.storeTokens(result);

    const expireAt = new Date(Date.now() + result.expires_in * 1000);

    // FIXME: ある程度実績が確認できたら消す
    await this.env.KIRIBI.enqueue("NotifyToSlack", {
      text: "Logilessのトークンがリフレッシュされました",
      attachments: [
        {
          title: "info",
          fields: [{ title: "有効期限", value: expireAt.toISOString() }],
        },
      ],
    });

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expireAt,
      isExpired: false,
    };
  }

  private async storeTokens(token: AuthResult) {
    await this.env.CACHE.put("LOGILESS_TOKEN", JSON.stringify(token), {
      metadata: { expire: new Date(Date.now() + token.expires_in * 1000) },
    });
  }

  private async getTokensViaStore(): Promise<Tokens | null> {
    const { value, metadata } = await this.env.CACHE.getWithMetadata<
      { access_token: string; refresh_token: string },
      { expire: string }
    >("LOGILESS_TOKEN", "json");
    if (!value || !metadata) return null;

    // 24時間前に期限切れとみなす
    const isExpired = new Date(metadata.expire) < new Date(Date.now() + 24 * 60 * 60 * 1000);

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
}
