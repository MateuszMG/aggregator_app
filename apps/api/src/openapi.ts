import type { RequestHandler } from 'express';

export const openApiSchema = {
  openapi: '3.0.0',
  info: {
    title: 'Reports API',
    version: '1.0.0',
  },
  paths: {
    '/health_check': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    redis: { type: 'boolean' },
                    database: { type: 'boolean' },
                    gcpEmulator: { type: 'boolean' },
                    aggregator: { type: 'boolean' },
                  },
                  required: ['redis', 'database', 'gcpEmulator', 'aggregator'],
                },
              },
            },
          },
        },
      },
    },
    '/api/reports/available-months': {
      get: {
        summary: 'Get available months',
        responses: {
          '200': {
            description: 'List of available months',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      year: { type: 'integer' },
                      month: { type: 'integer' },
                    },
                    required: ['year', 'month'],
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/reports/generate': {
      post: {
        summary: 'Generate monthly report',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  year: { type: 'integer' },
                  month: { type: 'integer' },
                },
                required: ['year', 'month'],
              },
            },
          },
        },
        responses: {
          '202': { description: 'Accepted' },
        },
      },
    },
    '/api/reports/monthly/{year}/{month}': {
      get: {
        summary: 'Get monthly report',
        parameters: [
          {
            name: 'year',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
          {
            name: 'month',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'Monthly report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    year: { type: 'integer' },
                    month: { type: 'integer' },
                    mechanicPerformance: { type: 'object' },
                    weeklyThroughput: { type: 'object' },
                  },
                  required: ['year', 'month', 'mechanicPerformance', 'weeklyThroughput'],
                },
              },
            },
          },
          '404': { description: 'Report not found' },
        },
      },
    },
  },
} as const;

export const openApiHandler: RequestHandler = (_req, res) => {
  res.json(openApiSchema);
};
