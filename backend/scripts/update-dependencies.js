// @ts-check
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, 'package.json');
const pkg = require(packageJsonPath);

// Update TypeScript and related dev dependencies
const devDependenciesToUpdate = {
  "@types/node": "^20.2.5",
  "@typescript-eslint/eslint-plugin": "^5.59.8",
  "@typescript-eslint/parser": "^5.59.8",
  "ts-jest": "^29.1.0",
  "ts-loader": "^9.4.3",
  "ts-node": "^10.9.1",
  "tsconfig-paths": "^4.2.0",
  "typescript": "^5.0.4"
};

// Update core NestJS dependencies
const nestDependenciesToUpdate = {
  "@nestjs/common": "^10.0.0",
  "@nestjs/config": "^3.1.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/jwt": "^10.1.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "@nestjs/swagger": "^7.1.0",
  "@nestjs/throttler": "^5.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "@nestjs/websockets": "^10.0.0"
};

// Update utility dependencies
const utilDependenciesToUpdate = {
  "class-transformer": "^0.5.1",
  "class-validator": "^0.14.0",
  "rxjs": "^7.8.1",
  "socket.io": "^4.6.1",
  "typeorm": "^0.3.16"
};

pkg.devDependencies = {
  ...pkg.devDependencies,
  ...devDependenciesToUpdate
};

pkg.dependencies = {
  ...pkg.dependencies,
  ...nestDependenciesToUpdate,
  ...utilDependenciesToUpdate
};

// Add TypeScript-specific scripts
pkg.scripts = {
  ...pkg.scripts,
  "type-check": "tsc --noEmit",
  "type-check:watch": "tsc --noEmit --watch",
  "build:types": "tsc --emitDeclarationOnly"
};

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
