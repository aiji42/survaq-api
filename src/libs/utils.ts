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
