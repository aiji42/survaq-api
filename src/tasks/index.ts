import { Kiribi } from "kiribi";
import { client } from "kiribi/client";
import { rest } from "kiribi/rest";
export { Cancel } from "./cancel";

export default class extends Kiribi {
  client = client;
  rest = rest;
}
