import { AmazonAdsClient } from "./AmazonAdsClient";
import { BigQueryClient } from "../bigquery/BigQueryClient";
import { Bindings } from "../../../../bindings";

type SponsoredCampaignReportData = {
  impressions: number;
  clicks: number;
  cost: number;
  costPerClick: number;
  clickThroughRate: number | null;
  campaignId: number;
  campaignName: string;
  date: string;
};

export class AmazonAdsSyncToBQ extends AmazonAdsClient {
  private bq: BigQueryClient;

  constructor(env: Bindings) {
    super(env);
    this.bq = new BigQueryClient(env);
  }

  async createSponsoredCampaignReports(startDate: string, endDate: string) {
    const profiles = (await this.getProfiles()).map((profile) => ({
      profileId: profile.profileId,
      accountId: profile.accountInfo.id,
      accountName: profile.accountInfo.name,
    }));

    return await Promise.all(
      profiles.map(async ({ profileId, accountId, accountName }) => {
        const res = await this.createReport(profileId, {
          startDate,
          endDate,
          configuration: {
            adProduct: "SPONSORED_PRODUCTS",
            groupBy: ["campaign"],
            columns: [
              "impressions",
              "clicks",
              "cost",
              "costPerClick",
              "clickThroughRate",
              "campaignId",
              "campaignName",
              "date",
            ],
            reportTypeId: "spCampaigns",
            timeUnit: "DAILY",
            format: "GZIP_JSON",
          },
        });
        return { reportId: res.reportId, profileId, accountId, accountName };
      }),
    );
  }

  async syncSponsoredCampaignReport(
    reportId: string,
    profile: { profileId: number; accountId: string; accountName: string },
  ) {
    const data = await this.downloadReport<SponsoredCampaignReportData[]>(
      reportId,
      profile.profileId,
    );

    const rows = data.map((d) => parseSponsoredCampaignReportToBQAdPerformancesTable(d, profile));
    await this.bq.deleteAndInsert("amazon", "ad_performances", "id", rows);
  }
}

type BQAdPerformancesTable = {
  id: string;
  account_id: string;
  account_name: string;
  date: string;
  campaign_id: number;
  campaign_name: string;
  impressions: number;
  clicks: number;
  cost: number;
  cpc: number;
  ctr: number | null;
};

const parseSponsoredCampaignReportToBQAdPerformancesTable = (
  data: SponsoredCampaignReportData,
  profile: { profileId: number; accountId: string; accountName: string },
): BQAdPerformancesTable => {
  return {
    id: `${profile.accountId}_${data.date}_${data.campaignId}`,
    account_id: profile.accountId,
    account_name: profile.accountName,
    date: data.date,
    campaign_id: data.campaignId,
    campaign_name: data.campaignName,
    impressions: data.impressions,
    clicks: data.clicks,
    cost: data.cost,
    cpc: data.costPerClick,
    ctr: data.clickThroughRate,
  };
};
