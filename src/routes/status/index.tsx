import { Hono } from "hono";
import { Layout } from "../../components/Layout";
import { CMSChecker } from "../../tasks";
import { needLogin } from "../../libs/utils";

const app = new Hono<{ Bindings: { DEV?: string; CMSChecker: CMSChecker } }>();

app.use("*", needLogin);

app.get("/data", async (c) => {
  const res = await c.env.CMSChecker.validate();

  return c.html(
    <Layout isDev={!!c.env.DEV} title="商品管理システム 整合性チェック">
      <div className="text-slate-900 p-4">
        <h1 className="text-xl font-bold mb-8">商品管理システム 整合性チェック</h1>
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between max-w-96">
              <h2 className="text-lg font-semibold">プロダクト</h2>
              <p className="text-slate-600">
                {res.products.length ? `🚨 ${res.products.length}件の問題が発生中` : "✅ 異常なし"}
              </p>
            </div>
            {res.products.length > 0 && (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">プロダクトID</th>
                      <th className="px-6 py-3">プロダクト名</th>
                      <th className="px-6 py-3">エラー</th>
                      <th className="px-6 py-3">管理画面</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.products.map((product) => (
                      <tr key={product.id} className="bg-white border-b">
                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {product.id}
                        </th>
                        <td className="px-6 py-3">{product.name}</td>
                        <td className="px-6 py-3">{product.message}</td>
                        <td className="px-6 py-3">
                          <a
                            href={product.cmsLink}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            開く
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between max-w-96">
              <h2 className="text-lg font-semibold">バリエーション</h2>
              <p className="text-slate-600">
                {res.variations.length
                  ? `🚨 ${res.variations.length}件の問題が発生中`
                  : "✅ 異常なし"}
              </p>
            </div>
            {res.variations.length > 0 && (
              <div>
                <p className="text-sm mb-2">
                  修正は
                  <a
                    target="_blank"
                    className="text-blue-600 underline"
                    href="https://docs.google.com/spreadsheets/d/1-Dmec0ZJ0whlqtlb6vzADg5lLhfq0MZOYhf-JfLcEAI/edit#gid=707529879"
                  >
                    スプレッドシート
                  </a>
                  からも行えます。
                </p>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-6 py-3">バリエーションID</th>
                        <th className="px-6 py-3">バリエーション名</th>
                        <th className="px-6 py-3">エラー</th>
                        <th className="px-6 py-3">管理画面</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.variations.map((variant) => (
                        <tr key={variant.id} className="bg-white border-b">
                          <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                            {variant.id}
                          </th>
                          <td className="px-6 py-3">{variant.name}</td>
                          <td className="px-6 py-3">{variant.message}</td>
                          <td className="px-6 py-3">
                            <a
                              href={variant.cmsLink}
                              target="_blank"
                              className="text-blue-600 underline"
                            >
                              開く
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between max-w-96">
              <h2 className="text-lg font-semibold">SKU</h2>
              <p className="text-slate-600">
                {res.skus.length ? `🚨 ${res.skus.length}件の問題が発生中` : "✅ 異常なし"}
              </p>
            </div>
            {res.skus.length > 0 && (
              <div>
                <p className="text-sm mb-2">
                  修正は
                  <a
                    target="_blank"
                    className="text-blue-600 underline"
                    href="https://docs.google.com/spreadsheets/d/1-Dmec0ZJ0whlqtlb6vzADg5lLhfq0MZOYhf-JfLcEAI/edit#gid=274977737"
                  >
                    スプレッドシート
                  </a>
                  からも行えます。
                </p>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-6 py-3">SKUコード</th>
                        <th className="px-6 py-3">SKU名</th>
                        <th className="px-6 py-3">エラー</th>
                        <th className="px-6 py-3">管理画面</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.skus.map((sku) => (
                        <tr key={sku.code} className="bg-white border-b">
                          <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                            {sku.code}
                          </th>
                          <td className="px-6 py-3">{sku.name}</td>
                          <td className="px-6 py-3">{sku.message}</td>
                          <td className="px-6 py-3">
                            <a
                              href={sku.cmsLink}
                              target="_blank"
                              className="text-blue-600 underline"
                            >
                              開く
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between max-w-96">
              <h2 className="text-lg font-semibold">在庫・発注</h2>
              <p className="text-slate-600">
                {res.inventories.length
                  ? `🚨 ${res.inventories.length}件の問題が発生中`
                  : "✅ 異常なし"}
              </p>
            </div>
            {res.inventories.length > 0 && (
              <div>
                <p className="text-sm mb-2">
                  修正は
                  <a
                    target="_blank"
                    className="text-blue-600 underline"
                    href="https://docs.google.com/spreadsheets/d/1-Dmec0ZJ0whlqtlb6vzADg5lLhfq0MZOYhf-JfLcEAI/edit#gid=1084372215"
                  >
                    スプレッドシート
                  </a>
                  からも行えます。
                </p>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-6 py-3">発注ID</th>
                        <th className="px-6 py-3">発注名</th>
                        <th className="px-6 py-3">エラー</th>
                        <th className="px-6 py-3">管理画面</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.inventories.map((inventory) => (
                        <tr key={inventory.id} className="bg-white border-b">
                          <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                            {inventory.id}
                          </th>
                          <td className="px-6 py-3">{inventory.name}</td>
                          <td className="px-6 py-3">{inventory.message}</td>
                          <td className="px-6 py-3">
                            <a
                              href={inventory.cmsLink}
                              target="_blank"
                              className="text-blue-600 underline"
                            >
                              開く
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>,
  );
});

export default app;
