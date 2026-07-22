import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

export const SESSION_ID_HEADER = 'X-Session-Id';

/** Any UUID version. crypto.randomUUID() on the client emits v4. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extracts the caller's session from the X-Session-Id header.
 *
 * This is the only thing standing between one visitor's conversations and
 * another's, so a malformed value is rejected outright rather than passed
 * through to the query layer.
 *
 * The value is lower-cased before use: UUIDs are case-insensitive, and a client
 * that echoed back an upper-cased id would otherwise silently land in a second,
 * empty session and appear to have lost its history.
 */
export const SessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const sessionId = request.header(SESSION_ID_HEADER);

    if (!sessionId || !UUID_PATTERN.test(sessionId)) {
      throw new BadRequestException(
        `${SESSION_ID_HEADER} header must be a UUID`,
      );
    }

    return sessionId.toLowerCase();
  },
);
