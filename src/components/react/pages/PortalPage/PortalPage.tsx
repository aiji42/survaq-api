import { FC } from "react";
import { IconType } from "react-icons";
import { FaBook } from "react-icons/fa6";
import { BsFileSpreadsheetFill } from "react-icons/bs";
import { SiGooglebigquery } from "react-icons/si";
import { BsFillBagCheckFill } from "react-icons/bs";
import { SiRakuten } from "react-icons/si";
import { PortalContainer } from "../PortalContainer/PortalContainer";

export const PortalPage: FC = () => {
  return (
    <PortalContainer h1="サバキューポータル">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LinkCard title="CMS" href="https://cms.survaq.com" icon={FaBook} targetBlank />
        <LinkCard
          title="CMS上データ一括管理表"
          href="https://docs.google.com/spreadsheets/d/1-Dmec0ZJ0whlqtlb6vzADg5lLhfq0MZOYhf-JfLcEAI/edit"
          icon={BsFileSpreadsheetFill}
          description={`スプレッドシートでCMSのデータを更新可能。\nデザイナーアカウントでログインしてください。`}
          targetBlank
        />
        <LinkCard
          title="データポータル"
          href="https://lookerstudio.google.com/u/0/reporting/70e4f66c-1540-449b-a9ae-48736bd94e63/page/3ITXC?pli=1"
          icon={SiGooglebigquery}
          targetBlank
        />
        <LinkCard
          title="商品管理システム 整合性チェック"
          href="/portal/status"
          description="各種商品関連データの設定が正常かどうかを確認できます。"
          icon={BsFillBagCheckFill}
        />
        <LinkCard
          title="Rakuten Ads データインポート"
          href="/portal/rakuten"
          description="Rakuten広告のパフォーマンスレポートデータ(CSV)をアップロードします。"
          icon={SiRakuten}
        />
      </div>
    </PortalContainer>
  );
};

const LinkCard: FC<{
  title: string;
  href: string;
  description?: string;
  icon: IconType;
  targetBlank?: boolean;
}> = ({ title, href, description, icon: Icon, targetBlank }) => {
  return (
    <a
      href={href}
      target={targetBlank ? "_blank" : undefined}
      className="flex flex-col text-slate-600 items-center gap-2 p-4 bg-white shadow-md rounded-lg hover:shadow-lg hover:bg-slate-50 hover:text-slate-800"
    >
      <Icon size={32} />
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="text-xs text-slate-500 whitespace-pre-wrap">{description}</p>}
    </a>
  );
};
