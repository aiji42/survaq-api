export class CustomNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomNotFoundError";
  }
}
