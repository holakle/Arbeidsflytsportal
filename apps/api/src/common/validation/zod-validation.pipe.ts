import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodSchema) {}

  transform(value: unknown) {
    let payload = value;

    // Some proxy/client paths may pass JSON payloads as strings
    // (and occasionally JSON-stringified strings). Unwrap safely
    // before validating with Zod.
    if (typeof payload === 'string') {
      let candidate: unknown = payload.trim();
      for (let i = 0; i < 3 && typeof candidate === 'string'; i += 1) {
        const trimmed = candidate.trim();
        const looksLikeJson =
          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          ((trimmed.startsWith('"') && trimmed.endsWith('"')) && trimmed.includes('{'));

        if (!looksLikeJson) break;
        try {
          candidate = JSON.parse(trimmed);
        } catch {
          break;
        }
      }
      payload = candidate;
    }

    const result = this.schema.safeParse(payload);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
