// Back-End/swagger.ts
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const definition: swaggerJsdoc.Options['definition'] = {
  openapi: '3.0.3',
  info: {
    title: 'TrackMyDegree API',
    version: '1.0.0',
    description: 'OpenAPI docs for the TrackMyDegree API.',
  },
  // Same-origin: works with https://localhost/ behind a proxy
  servers: [{ url: '/', description: 'Same origin' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      // Add commonly reused models here
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['student', 'admin', 'advisor'] },
        },
        required: ['_id', 'email', 'name'],
        additionalProperties: false,
      },
    },
  },
  // Uncomment to require JWT by default on all operations:
  // security: [{ bearerAuth: [] }],
};

export const swaggerSpec = swaggerJsdoc({
  definition,
  apis: [
    path.resolve(__dirname, './routes/*.ts'), // dev (ts-node)
    path.resolve(process.cwd(), 'dist/routes/*.js'), // prod (compiled)
  ],
});
