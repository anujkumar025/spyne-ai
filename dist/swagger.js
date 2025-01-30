"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_autogen_1 = __importDefault(require("swagger-autogen"));
const doc = {
    info: {
        title: 'Car Marketplace API',
        description: 'API documentation for Car Marketplace application',
        version: '1.0.0'
    },
    host: 'localhost:5000', // Your server URL
    basePath: '/api', // Base API path
    schemes: ['http'], // Protocol
    consumes: ['application/json'], // Request content types
    produces: ['application/json'], // Response content types
    securityDefinitions: {
        bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            scheme: 'bearer',
            in: 'header'
        }
    },
    tags: [
        { name: 'Authentication', description: 'User authentication endpoints' },
        { name: 'Cars', description: 'Car management endpoints' }
    ],
    definitions: {
        Car: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' }
                },
                tags: {
                    type: 'object',
                    properties: {
                        carType: { type: 'string' },
                        company: { type: 'string' },
                        dealer: { type: 'string' }
                    }
                }
            }
        }
    }
};
const outputFile = './swagger_output.json';
const endpointsFiles = ['./src/index.ts']; // Your main server file
(0, swagger_autogen_1.default)(outputFile, endpointsFiles, doc);
