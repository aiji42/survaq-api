export class Logger {
  logs: string[] = [];

  push(log: string, level: "info" | "warn" | "error" | "debug" = "info") {
    if (!log) return;
    this.logs.push(`[${new Date().toISOString().slice(0, 19)}][${level}] ${log}`);
  }

  toString() {
    return this.logs.join("\n");
  }
}
