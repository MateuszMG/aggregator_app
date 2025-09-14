import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('initTelemetry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('initializes NodeSDK once and registers shutdown handlers', async () => {
    const start = vi.fn().mockResolvedValue(undefined);
    const shutdown = vi.fn().mockResolvedValue(undefined);

    const NodeSDKMock: any = vi.fn(function (this: any, config: any) {
      (NodeSDKMock as any).config = config;
      this.start = start;
      this.shutdown = shutdown;
    });

    class OTLPTraceExporterMock {
      static config: any;
      constructor(config: any) {
        OTLPTraceExporterMock.config = config;
      }
    }

    const autoInst = {};
    const getNodeAutoInstrumentations = vi.fn(() => autoInst);
    const pubInst = {};
    const PubSubInstrumentation = vi.fn(function () {
      return pubInst;
    });

    const info = vi.fn();
    const error = vi.fn();

    vi.doMock('@opentelemetry/sdk-node', () => ({ NodeSDK: NodeSDKMock }));
    vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
      OTLPTraceExporter: OTLPTraceExporterMock,
    }));
    vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
      getNodeAutoInstrumentations,
    }));
    vi.doMock('opentelemetry-instrumentation-pubsub', () => ({
      PubSubInstrumentation,
    }));
    vi.doMock('../config/config', () => ({
      envConfig: {
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector',
        OTEL_EXPORTER_OTLP_HEADERS: 'a=b, c=d',
      },
    }));
    vi.doMock('../middleware/logger', () => ({ logger: { info, error } }));

    const onceSpy = vi.spyOn(process, 'once').mockImplementation(() => process);

    const { initTelemetry } = await import('./telemetry');

    await initTelemetry();
    await initTelemetry();

    expect(getNodeAutoInstrumentations).toHaveBeenCalledWith({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
    });

    expect(OTLPTraceExporterMock.config).toEqual({
      url: 'http://collector',
      headers: { a: 'b', c: 'd' },
    });

    expect(NodeSDKMock).toHaveBeenCalledTimes(1);
    expect((NodeSDKMock as any).config.instrumentations).toEqual([autoInst, pubInst]);
    expect(start).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('Telemetry initialized');

    expect(onceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    const sigtermHandler = onceSpy.mock.calls.find((c) => c[0] === 'SIGTERM')![1];
    await sigtermHandler();

    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('Telemetry terminated');
  });

  it('logs error if shutdown fails', async () => {
    const start = vi.fn().mockResolvedValue(undefined);
    const shutdown = vi.fn().mockRejectedValue(new Error('boom'));

    class NodeSDKMock {
      constructor(_config: any) {}
      start = start;
      shutdown = shutdown;
    }

    class OTLPTraceExporterMock {
      constructor(_config: any) {}
    }

    const getNodeAutoInstrumentations = vi.fn(() => ({}));
    const PubSubInstrumentation = vi.fn(function () {
      return {};
    });

    const info = vi.fn();
    const error = vi.fn();

    vi.doMock('@opentelemetry/sdk-node', () => ({ NodeSDK: NodeSDKMock }));
    vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
      OTLPTraceExporter: OTLPTraceExporterMock,
    }));
    vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
      getNodeAutoInstrumentations,
    }));
    vi.doMock('opentelemetry-instrumentation-pubsub', () => ({
      PubSubInstrumentation,
    }));
    vi.doMock('../config/config', () => ({
      envConfig: { OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector' },
    }));
    vi.doMock('../middleware/logger', () => ({ logger: { info, error } }));

    const onceSpy = vi.spyOn(process, 'once').mockImplementation(() => process);

    const { initTelemetry } = await import('./telemetry');

    await initTelemetry();

    const handler = onceSpy.mock.calls.find((c) => c[0] === 'SIGTERM')![1];
    await handler();

    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith({ err: expect.any(Error) }, 'Error terminating telemetry');
    expect((error.mock.calls[0][0] as any).err.message).toBe('boom');
    expect(info).toHaveBeenCalledWith('Telemetry initialized');
    expect(info).not.toHaveBeenCalledWith('Telemetry terminated');
  });
});
