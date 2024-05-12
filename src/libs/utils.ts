export const chunks = <T>(a: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(a.length / size) }, (_, i) => a.slice(i * size, i * size + size));

/**
 * 60秒間同一キーのコールバックの実行を抑制する(メールが二重に送られないようにするとか)
 * KVの仕様上expirationTtlを60秒未満にできない
 */
export const blockReRun = async (
  key: string,
  kv: KVNamespace,
  callback: () => Promise<unknown>,
) => {
  if (await kv.get(key)) return;
  await kv.put(key, "processing", { expirationTtl: 60 });
  await callback();
};
