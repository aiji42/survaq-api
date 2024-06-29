import { BigQuery, QueryResult } from "cfw-bq";
import { BQ_PROJECT_ID } from "../../../constants";

export class BigQueryClient {
  private bq: BigQuery;
  constructor(env: { GCP_SERVICE_ACCOUNT: string }) {
    this.bq = new BigQuery(JSON.parse(env.GCP_SERVICE_ACCOUNT), BQ_PROJECT_ID);
  }

  async query<T extends QueryResult>(query: string): Promise<T[]> {
    return this.bq.query<T>(query);
  }

  table(dataset: string, table: string) {
    return `${dataset}.${table}`;
  }

  makeInsertQuery(
    dataset: string,
    table: string,
    rows: Record<string, string | number | Date | boolean | null>[],
  ) {
    const [firstRow] = rows;
    if (!firstRow) throw new Error("rows must not be empty");

    const columns = Object.keys(firstRow);

    return `
      INSERT INTO \`${this.table(dataset, table)}\`
      (${columns.map((column) => `\`${column}\``).join(", ")})
      VALUES
      ${rows.map((row) => `(${columns.map((column) => this.formatValue(row[column]!)).join(", ")})`).join(", ")}
    `;
  }

  async insert(
    dataset: string,
    table: string,
    rows: Record<string, string | number | Date | boolean | null>[],
  ) {
    if (rows.length < 1) return;

    const query = this.makeInsertQuery(dataset, table, rows);
    await this.query(query);
  }

  makeDeleteQuery(dataset: string, table: string, key: string, _values: (string | number)[]) {
    if (_values.length < 1) throw new Error("values must not be empty");
    const values = [...new Set(_values)];
    return `
      DELETE FROM \`${this.table(dataset, table)}\`
      WHERE \`${key}\` IN (${values.map((value) => this.formatValue(value)).join(", ")})
    `;
  }

  async delete(dataset: string, table: string, key: string, values: (string | number)[]) {
    if (values.length < 1) return;

    const query = this.makeDeleteQuery(dataset, table, key, values);
    await this.query(query);
  }

  makeTruncateQuery(dataset: string, table: string) {
    return `TRUNCATE TABLE \`${this.table(dataset, table)}\``;
  }

  async truncate(dataset: string, table: string) {
    const query = this.makeTruncateQuery(dataset, table);
    await this.query(query);
  }

  makeUpdateQuery(
    dataset: string,
    table: string,
    targetKey: string,
    targets: (string | number)[],
    row: Record<string, string | number | Date | boolean | null>,
  ) {
    const setClause = Object.entries(row)
      .map(([column, value]) => {
        return `\`${column}\` = ${this.formatValue(value)}`;
      })
      .join(", ");
    return `
      UPDATE \`${this.table(dataset, table)}\`
      SET ${setClause}
      WHERE \`${targetKey}\` IN (${targets.map((target) => this.formatValue(target)).join(", ")})
    `;
  }

  async deleteAndInsert<Row extends Record<string, string | number | Date | boolean | null>>(
    dataset: string,
    table: string,
    key: keyof Row,
    rows: Row[],
  ) {
    if (rows.length < 1) return;

    const deleteValues = rows.map((row) => {
      const value = row[key];
      if (!(typeof value === "string" || typeof value === "number"))
        throw new Error(`key must be string or number: ${key.toString()}`);
      return value;
    });

    const deleteQuery = this.makeDeleteQuery(dataset, table, key.toString(), deleteValues);
    const insertQuery = this.makeInsertQuery(dataset, table, rows);
    await this.query(`${deleteQuery};\n${insertQuery}`);
  }

  private formatValue(value: string | number | Date | boolean | null) {
    if (value === null) return "NULL";
    if (typeof value === "string") return `'${value}'`;
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (value instanceof Date) return `'${value.toISOString().slice(0, 19)}'`;
    return value;
  }
}
