export class RakutenClient {
  constructor(
    private serviceSecret: string,
    private licenseKey: string,
  ) {}

  get bearerToken() {
    // https://webservice.rms.rakuten.co.jp/merchant-portal/view/ja/common/1-1_service_index/rmsWebServiceAuthentication
    return `ESA ${Buffer.from(`${this.serviceSecret}:${this.licenseKey}`).toString("base64")}`;
  }

  protected async jsonPost<T>(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Authorization: this.bearerToken,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok)
      throw new Error(`Failed to fetch ${url}: ${JSON.stringify(await res.json(), null, 2)}`);
    return (await res.json()) as T;
  }
}
