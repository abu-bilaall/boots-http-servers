class AppError extends Error {
  constructor(
    name: string,
    message: string,
    public statusCode: number,
    public cause?: unknown,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = name;
  }
}

class BadRequestError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("BadRequestError", message, 400, cause);
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("UnauthorizedError", message, 401, cause);
  }
}
class ForbiddenError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("ForbiddenError", message, 403, cause);
  }
}
class NotFoundError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("NotFoundError", message, 404, cause);
  }
}

class ConflictError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("ConflictError", message, 409, cause);
  }
}

class InternalServerError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("InternalServerError", message, 500, cause, false);
  }
}

export {
  AppError,
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
};
