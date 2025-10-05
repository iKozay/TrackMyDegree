import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

export const setupSwagger = (app: Express) => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'Centralized Swagger documentation',
      },
      servers: [{ url: 'http://localhost:8000' }],
    },
    apis: [
      path.join(__dirname, './docs/*.yaml'),     // External YAML docs
    ],
  };

  const specs = swaggerJsdoc(options);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

  console.log('Swagger docs available at http://localhost:8000/api-docs');
};
