export class ApiError extends Error {
  status: number;
  userMessage: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.userMessage = message;
  }
}
