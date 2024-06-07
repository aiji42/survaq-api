import type { ErrorHandler, Next } from "hono/dist/types/types";
import { HTTPException } from "hono/http-exception";
import { Bindings } from "../../bindings";
import { inlineCode, SlackNotifier } from "./models/slack/SlackNotifier";
import { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

export const chunks = <T>(a: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(a.length / size) }, (_, i) => a.slice(i * size, i * size + size));

/**
 * 指定秒間同一キーのコールバックの実行を抑制する(メールが二重に送られないようにするとか)
 * KVの仕様上60秒未満にはできない
 */
export const blockReRun = async (
  key: string,
  kv: KVNamespace,
  callback: () => Promise<unknown>,
  option?: { boundarySeconds?: number },
) => {
  if (await kv.get(key)) return;
  await kv.put(key, "processing", { expirationTtl: Math.max(option?.boundarySeconds ?? 60, 60) });
  await callback();
};

/**
 * エラーが発生した際にSlackに通知するエラーハンドラを生成する
 */
export const makeNotifiableErrorHandler =
  <Env extends { Bindings: Bindings }>({
    alwaysReturn,
  }: {
    alwaysReturn?: (c: Context<Env>) => Response | Promise<Response>;
  } = {}): ErrorHandler<Env> =>
  async (err, c) => {
    if (!(err instanceof HTTPException && err.status === 404)) {
      console.error(err);
      if (!c.env.DEV)
        await c.env.KIRIBI.enqueue("NotifyToSlack", {
          text: `Error on ${inlineCode(c.req.url)}`,
          attachments: [
            {
              fields: [
                { title: "Method", value: c.req.method },
                { title: "Referer", value: c.req.header("referer") ?? "-" },
                { title: "UA", value: c.req.header("user-agent") ?? "-" },
              ],
            },
            SlackNotifier.makeErrorAttachment(err),
          ],
        });
    }

    if (alwaysReturn) return alwaysReturn(c);
    throw err;
  };

/**
 * KVにキャッシュがあればキャッシュを返しつつ、waitUntilでキャッシュを更新する
 * KVにキャッシュがなければそのまま返却してwaitUntilでキャッシュを作成する
 */
export const asyncCache = async <T, Env extends { Bindings: { DEV?: string } }>(
  key: string,
  c: Context<Env>,
  kv: KVNamespace,
  expirationTtl: number, // seconds
  callback: () => Promise<T>,
): Promise<T> => {
  // 開発環境ではキャッシュを使わない
  if (c.env.DEV) return callback();

  const cached = await kv.get<T>(key, "json");

  if (cached) {
    const callbackPromise = callback();
    c.executionCtx.waitUntil(
      callbackPromise.then((result) => kv.put(key, JSON.stringify(result), { expirationTtl })),
    );

    return cached;
  }

  const result = await callback();
  c.executionCtx.waitUntil(kv.put(key, JSON.stringify(result), { expirationTtl }));

  return result;
};

export const needLogin = async (c: Context, next: Next) => {
  if (!(await verify(c))) {
    const url = new URL(c.req.url);
    setCookie(c, "redirect", url.pathname + url.search);
    return c.redirect("/oauth/login", 302);
  }

  await next();
};

const verify = async (c: Context) => {
  const token = getCookie(c, "Authorization");
  if (!token) return false;
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
  return res.ok;
};
