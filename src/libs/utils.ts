import type { ErrorHandler } from "hono/dist/types/types";
import { HTTPException } from "hono/http-exception";
import { Bindings } from "../../bindings";
import { inlineCode, SlackNotifier } from "./slack";
import { Context } from "hono";

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
      await c.env.KIRIBI.enqueue("NotifyToSlack", {
        text: `Occurred error on ${inlineCode(c.req.url)}`,
        attachments: [SlackNotifier.makeErrorAttachment(err)],
      });
    }

    if (alwaysReturn) return alwaysReturn(c);
    return c.res;
  };
