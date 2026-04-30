class BadRequestError extends Error {}
class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}
class NotFoundError extends Error {}

export { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError };
