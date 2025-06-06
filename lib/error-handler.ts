import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiError {
  message: string;
  type: string;
  field?: string;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  code?: string;
}

export class ErrorHandler {
  static async handle(error: unknown): Promise<NextResponse> {
    console.error("API Error:", error);

    // Validation errors (Zod)
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Validation failed",
          type: "VALIDATION_ERROR",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        } as ApiError,
        { status: 400 }
      );
    }

    // Database constraint errors
    if (error instanceof Error) {
      // Unique constraint violation
      if (this.isUniqueConstraintError(error)) {
        return NextResponse.json(
          {
            message: "A contact with this email already exists",
            type: "DUPLICATE_EMAIL",
            field: "email",
          } as ApiError,
          { status: 409 }
        );
      }

      // Foreign key constraint
      if (this.isForeignKeyError(error)) {
        return NextResponse.json(
          {
            message: "Invalid reference data provided",
            type: "FOREIGN_KEY_ERROR",
          } as ApiError,
          { status: 400 }
        );
      }

      // Not null constraint
      if (this.isNotNullError(error)) {
        const field = this.extractFieldFromError(error.message);
        return NextResponse.json(
          {
            message: `Required field '${field}' is missing`,
            type: "REQUIRED_FIELD_ERROR",
            field: field,
          } as ApiError,
          { status: 400 }
        );
      }

      // Connection/timeout errors
      if (this.isConnectionError(error)) {
        return NextResponse.json(
          {
            message: "Database connection failed. Please try again later.",
            type: "DATABASE_CONNECTION_ERROR",
          } as ApiError,
          { status: 503 }
        );
      }
    }

    // JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return NextResponse.json(
        {
          message: "Invalid JSON format in request body",
          type: "JSON_PARSE_ERROR",
        } as ApiError,
        { status: 400 }
      );
    }

    // Database-specific error codes
    if (error && typeof error === "object" && "code" in error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbError = error as any;

      switch (dbError.code) {
        case "23505": // PostgreSQL unique violation
        case "SQLITE_CONSTRAINT_UNIQUE": // SQLite unique violation
          return NextResponse.json(
            {
              message: "A contact with this email already exists",
              type: "DUPLICATE_EMAIL",
              field: "email",
            } as ApiError,
            { status: 409 }
          );
        case "23502": // PostgreSQL not null violation
        case "SQLITE_CONSTRAINT_NOTNULL": // SQLite not null violation
          return NextResponse.json(
            {
              message: "Required field is missing",
              type: "REQUIRED_FIELD_ERROR",
            } as ApiError,
            { status: 400 }
          );
        case "23503": // PostgreSQL foreign key violation
        case "SQLITE_CONSTRAINT_FOREIGNKEY": // SQLite foreign key violation
          return NextResponse.json(
            {
              message: "Invalid reference data provided",
              type: "FOREIGN_KEY_ERROR",
            } as ApiError,
            { status: 400 }
          );
        default:
          return NextResponse.json(
            {
              message: "Database operation failed",
              type: "DATABASE_ERROR",
              code: dbError.code,
            } as ApiError,
            { status: 500 }
          );
      }
    }

    // Fallback for unknown errors
    return NextResponse.json(
      {
        message: "An unexpected error occurred. Please try again later.",
        type: "UNKNOWN_ERROR",
        // Only include error details in development
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : String(error),
        }),
      } as ApiError,
      { status: 500 }
    );
  }

  private static isUniqueConstraintError(error: Error): boolean {
    return (
      error.message.includes("unique constraint") ||
      error.message.includes("UNIQUE constraint failed") ||
      error.message.includes("duplicate key")
    );
  }

  private static isForeignKeyError(error: Error): boolean {
    return error.message.includes("foreign key constraint");
  }

  private static isNotNullError(error: Error): boolean {
    return error.message.includes("NOT NULL constraint");
  }

  private static isConnectionError(error: Error): boolean {
    return (
      error.message.includes("connection") ||
      error.message.includes("timeout") ||
      error.message.includes("ECONNREFUSED")
    );
  }

  private static extractFieldFromError(message: string): string {
    const match = message.match(/column "([^"]+)"/);
    return match ? match[1] : "unknown";
  }
}

// Client-side error handler
export class ClientErrorHandler {
  static handle(
    error: ApiError,
    setFieldError?: (field: string, message: string) => void
  ) {
    switch (error.type) {
      case "VALIDATION_ERROR":
        if (error.errors && setFieldError) {
          error.errors.forEach((err) => setFieldError(err.field, err.message));
        }
        return "Please check the form for errors";

      case "DUPLICATE_EMAIL":
        if (setFieldError) {
          setFieldError("email", "This email is already registered");
        }
        return "Email already exists";

      case "REQUIRED_FIELD_ERROR":
        if (error.field && setFieldError) {
          setFieldError(error.field, `${error.field} is required`);
        }
        return error.message;

      case "DATABASE_CONNECTION_ERROR":
        return "Service temporarily unavailable. Please try again later.";

      case "JSON_PARSE_ERROR":
        return "Invalid data format. Please refresh and try again.";

      default:
        return error.message || "An unexpected error occurred";
    }
  }
}
