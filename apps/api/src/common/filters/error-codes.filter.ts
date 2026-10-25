import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ErrorTrackingService } from "../monitoring/error-tracking.service";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    @Optional() private readonly errorTracking?: ErrorTrackingService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = "INTERNAL_SERVER_ERROR";
    let message: string | string[] = "An unexpected error occurred";
    let errorId: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        if (resObj.errorCode) {
          errorCode = resObj.errorCode;
        } else {
          errorCode = this.mapStatusToErrorCode(status);
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = exception.message;
    }

    if (status >= 500 && this.errorTracking) {
      errorId = this.errorTracking.captureException(exception, {
        route: request.url,
        method: request.method,
        statusCode: status,
      });
    }

    if (Array.isArray(message)) {
      message = message.join(", ");
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      errorId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "VALIDATION_FAILED";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      default:
        return "INTERNAL_SERVER_ERROR";
    }
  }
}
