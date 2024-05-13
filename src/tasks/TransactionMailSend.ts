import { KiribiPerformer } from "kiribi/performer";
import { Bindings } from "../../bindings";
import { TransactionMail } from "../libs/models/cms/TransactionMail";

export class TransactionMailSend extends KiribiPerformer<{ id: number }, void, Bindings> {
  tm: TransactionMail;
  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.tm = new TransactionMail(env);
  }

  async perform({ id }: { id: number }) {
    await this.tm.prepare(id);
    if (this.tm.isPending) {
      await this.tm.sendMail();
      await this.tm.cleanup();
    }
  }
}
