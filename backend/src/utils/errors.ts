export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  invalidCredentials: () =>
    new AppError(401, "INVALID_CREDENTIALS", "Telefon raqam yoki parol noto'g'ri"),
  unauthorized: () => new AppError(401, "UNAUTHORIZED", "Avtorizatsiyadan o'tilmagan"),
  forbidden: () => new AppError(403, "FORBIDDEN", "Ruxsat berilmagan"),
  blocked: () => new AppError(403, "BLOCKED", "Bu foydalanuvchi bilan muloqot qila olmaysiz"),
  notFound: (what = "Resurs") => new AppError(404, "NOT_FOUND", `${what} topilmadi`),
  conflict: (message: string) => new AppError(409, "CONFLICT", message),
  badRequest: (message: string) => new AppError(400, "BAD_REQUEST", message),
};
