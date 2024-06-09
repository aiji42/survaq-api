import { ValidationResult } from "../../../../tasks/CMSChecker";
import { FC, ReactNode } from "react";
import { PortalContainer } from "../PortalContainer/PortalContainer";

const Section: FC<{
  children: ReactNode;
  title: string;
  alertsCount?: number;
  warningCount?: number;
}> = ({ children, alertsCount = 0, warningCount = 0, title }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between max-w-96">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-slate-600">
          {alertsCount > 0 && (
            <span className="text-red-500 font-medium">🚨 {alertsCount}件のエラー</span>
          )}
          {alertsCount > 0 && warningCount > 0 && "・"}
          {warningCount > 0 && (
            <span className="text-yellow-500 font-medium">📣 {warningCount}件の警告</span>
          )}
          {alertsCount === 0 && warningCount === 0 && "✅ 異常なし"}
        </p>
      </div>
      {children}
    </div>
  );
};

export const StatusPage: FC<ValidationResult> = ({
  products,
  variations,
  skus,
  inventories,
  tokens,
}) => {
  return (
    <PortalContainer h1="商品管理システム 整合性チェック">
      <div className="space-y-12">
        <Section title="プロダクト" alertsCount={products.length}>
          {products.length > 0 && (
            <div>
              <p className="text-xs mb-2 text-orange-400">
                ※Rakutenの「商品グループの未設定」に関しては、まだ準備中のためSlackへのアラート通知はしていません。
              </p>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr className="whitespace-nowrap">
                      <th className="px-6 py-3">プロダクトID</th>
                      <th className="px-6 py-3">プロバイダ</th>
                      <th className="px-6 py-3">プロダクト名</th>
                      <th className="px-6 py-3">エラー</th>
                      <th className="px-6 py-3">管理画面</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="bg-white border-b">
                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {product.id}
                        </th>
                        <th className="px-6 py-4">{product.provider}</th>
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
            </div>
          )}
        </Section>
        <Section title="バリエーション" alertsCount={variations.length}>
          {variations.length > 0 && (
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
                    <tr className="whitespace-nowrap">
                      <th className="px-6 py-3">バリエーションID</th>
                      <th className="px-6 py-3">バリエーション名</th>
                      <th className="px-6 py-3">エラー</th>
                      <th className="px-6 py-3">管理画面</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variations.map((variant) => (
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
        </Section>
        <Section title="SKU" alertsCount={skus.length}>
          {skus.length > 0 && (
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
                    <tr className="whitespace-nowrap">
                      <th className="px-6 py-3">SKUコード</th>
                      <th className="px-6 py-3">SKU名</th>
                      <th className="px-6 py-3">エラー</th>
                      <th className="px-6 py-3">管理画面</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skus.map((sku) => (
                      <tr key={sku.code} className="bg-white border-b">
                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {sku.code}
                        </th>
                        <td className="px-6 py-3">{sku.name}</td>
                        <td className="px-6 py-3">{sku.message}</td>
                        <td className="px-6 py-3">
                          <a href={sku.cmsLink} target="_blank" className="text-blue-600 underline">
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
        </Section>
        <Section title="在庫・発注" alertsCount={inventories.length}>
          {inventories.length > 0 && (
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
                    <tr className="whitespace-nowrap">
                      <th className="px-6 py-3">発注ID</th>
                      <th className="px-6 py-3">発注名</th>
                      <th className="px-6 py-3">エラー</th>
                      <th className="px-6 py-3">管理画面</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventories.map((inventory) => (
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
        </Section>
        <Section
          title="各種トークン"
          alertsCount={tokens.filter(({ level }) => level === "danger").length}
          warningCount={tokens.filter(({ level }) => level === "warning").length}
        >
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr className="whitespace-nowrap">
                  <th className="px-6 py-3">種別</th>
                  <th className="px-6 py-3">ステータス</th>
                  <th className="px-6 py-3">管理画面</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token, index) => (
                  <tr key={index} className="bg-white border-b">
                    <th className="px-6 py-4">{token.name}</th>
                    <td className="px-6 py-3">{token.message}</td>
                    <td className="px-6 py-3">
                      <a href={token.cmsLink} target="_blank" className="text-blue-600 underline">
                        開く
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </PortalContainer>
  );
};
