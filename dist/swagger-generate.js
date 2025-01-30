"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_autogen_1 = __importDefault(require("swagger-autogen"));
const outputFile = './swagger-output.json';
const endpointsFiles = ['./index.ts'];
(0, swagger_autogen_1.default)(outputFile, endpointsFiles);
