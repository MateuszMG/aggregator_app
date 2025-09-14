import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

export const logger = pino({
  level: 'info',
  redact: ['*.password', '*.token', 'req.headers.authorization', 'req.headers.cookie'],
  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const { traceId, spanId } = span.spanContext();
    return { trace_id: traceId, span_id: spanId };
  },
});
