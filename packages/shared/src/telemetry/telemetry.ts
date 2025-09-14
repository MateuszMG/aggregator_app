import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PubSubInstrumentation } from 'opentelemetry-instrumentation-pubsub';
import { envConfig } from '../config/config';
import { logger } from '../middleware/logger';

let sdk: NodeSDK | undefined;

export const initTelemetry = async () => {
  if (sdk) return;

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: envConfig.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers: envConfig.OTEL_EXPORTER_OTLP_HEADERS
        ? Object.fromEntries(
            envConfig.OTEL_EXPORTER_OTLP_HEADERS.split(',').map((h) => {
              const [k, v] = h.split('=');
              return [k.trim(), v.trim()];
            }),
          )
        : undefined,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-redis': { enabled: true },
      }),
      new PubSubInstrumentation(),
    ],
  });

  await sdk.start();
  logger.info('Telemetry initialized');

  const shutdown = async () => {
    try {
      await sdk?.shutdown();
      logger.info('Telemetry terminated');
    } catch (err) {
      logger.error({ err }, 'Error terminating telemetry');
    }
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
};
