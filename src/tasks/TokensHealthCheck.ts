import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { LogilessClient } from "../libs/models/logiless/LogilessClient";
import { SlackNotifier } from "../libs/models/slack/SlackNotifier";

/**
 * 各種トークンの有効期限を確認し、Slack通知するタスク
 */
export class TokensHealthCheck extends KiribiPerformer<{}, void, Bindings> {
  private slack: SlackNotifier;
  private logiless: LogilessClient;

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.slack = new SlackNotifier(env);
    this.logiless = new LogilessClient(env);
  }

  async perform() {
    const logilessExpireAt = await this.getLogilessExpireAt();

    // TODO: 通知がうるさいようなら、残り日数が一定以上の場合は通知しないようにする
    this.slack.append({
      title: "ロジレス",
      color: getColor(logilessExpireAt, { good: LogilessClient.expireBufferDays }),
      footer: `実際にはExpireの${LogilessClient.expireBufferDays}日前を内部的な有効期限とし、リフレッシュを行います`,
      fields: [
        {
          title: "Expire(UTC)",
          value: logilessExpireAt.toISOString(),
        },
        {
          title: "Rest",
          value: restDisplay(logilessExpireAt),
        },
      ],
    });
    // MEMO: AmazonAdsは有効期限が1時間なので通知しない

    // TODO: slackのblock-kitを使ってアクションボタンを追加し、手動でリフレッシュできるようにする

    await this.slack.notify("各種トークン情報");
  }

  private async getLogilessExpireAt() {
    const tokens = await this.logiless.getTokens();
    return tokens.expireAt;
  }
}

const getColor = (date: Date, { good, warning }: { good: number; warning?: number }) => {
  const { restDays } = getRest(date);
  if (restDays > good) return "good";
  if (!warning || restDays > warning) return "warning";
  return "danger";
};

const getRest = (date: Date) => {
  const restHours = Math.floor((date.getTime() - Date.now()) / 1000 / 60 / 60);
  const restDays = Math.floor(restHours / 24);
  return { restHours, restDays };
};

const restDisplay = (date: Date) => {
  const { restDays, restHours } = getRest(date);
  return restDays < 1 ? `${restHours}時間` : `${restDays}日`;
};
