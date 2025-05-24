# Kanaka Protocol Backend

This is the backend API for the Kanaka Protocol - A decentralized, non-custodial, real-yield optimizer on Starknet.

## Features

- RESTful API for interacting with the Kanaka Protocol
- Blockchain integration with Starknet
- Authentication with JWT and wallet signatures
- Role-based access control
- Rate limiting and security features
- Comprehensive error handling
- Health monitoring and metrics

## Prerequisites

- Node.js 18+
- npm or yarn
- Redis (for caching and rate limiting)
- Access to a Starknet node (local or remote)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/kanaka.git
   cd kanaka/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration.

## Development

Start the development server:

```bash
npm run start:dev
```

The API will be available at http://localhost:3000/api.

## Docker Development

You can also use Docker for development:

```bash
docker-compose up backend
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:cov
```

## Production Build

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm run start:prod
```

## Docker Production

Build and run the Docker container:

```bash
docker build -t kanaka-backend .
docker run -p 3000:3000 --env-file .env kanaka-backend
```

## API Documentation

The API is structured into the following modules, each handling specific functionality:

### Authentication
Base path: `/api/auth`

- `GET /auth/nonce/:address` - Get a nonce for authentication
- `POST /auth/login` - Authenticate with wallet signature
- `POST /auth/api-key` - Generate an API key (authenticated)
- `GET /auth/api-keys` - List API keys (authenticated)
- `GET /auth/me` - Get current user profile (authenticated)

### Analytics
Base path: `/api/analytics`

All endpoints require authentication.

- `GET /analytics/pools/:id/metrics` - Get metrics for a specific pool
- `GET /analytics/correlations` - Get latest correlation matrix
- `GET /analytics/pools/:id/cdr` - Get CDR metrics for a pool
- `POST /analytics/pools/:id/metrics` - Update pool metrics
- `POST /analytics/correlations` - Update correlation matrix
- `POST /analytics/pools/:id/cdr` - Update pool CDR metrics

### CDR Oracle
Base path: `/api/cdr-oracle`

- `GET /cdr-oracle/metrics/:poolId` - Get pool metrics
- `GET /cdr-oracle/correlation/:poolA/:poolB` - Get correlation between two pools
- `GET /cdr-oracle/yield/:poolId` - Get pool yield
- `POST /cdr-oracle/metrics` - Update pool metrics (admin/oracle only)
- `POST /cdr-oracle/volatility` - Update pool volatility (admin/oracle only)

### Strategy Registry
Base path: `/api/strategy-registry`

- `GET /strategy-registry/pools` - Get all pools
- `GET /strategy-registry/pool-count` - Get total pool count
- `GET /strategy-registry/valid-deposit/:poolId/:amount` - Check if a deposit is valid
- `POST /strategy-registry/rebalance` - Execute rebalancing (authenticated)

### System Health
Base path: `/api/health`

- `GET /health` - Check API health status (includes database, blockchain, memory stats)
- `GET /health/liveness` - Simple liveness check

## API Security

The API implements several security measures:

1. **Authentication**
   - JWT-based authentication using wallet signatures
   - API key authentication for automated access
   - Role-based access control (RBAC)

2. **Rate Limiting**
   - Request rate limiting per IP and user
   - Configurable limits per endpoint

3. **Data Protection**
   - Input validation and sanitization
   - Sensitive data filtering
   - CORS protection

4. **Monitoring**
   - Health checks
   - Circuit breaker for external services
   - Error tracking and logging

## WebSocket Events

The API provides real-time updates through WebSocket connections for:

- Pool metrics updates
- Correlation matrix changes
- CDR metric updates

Connect to the WebSocket endpoint at `ws://hostname/socket.io` and subscribe to relevant events.

## Error Handling

API errors follow a consistent format:

```json
{
  "status": 400-599,
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2025-05-24T12:00:00Z"
}
```

Common error status codes:
- 400: Bad Request (invalid input)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

## Deployment

### Docker Deployment

1. Build the production Docker image:
   ```bash
   docker build -t kanaka-backend:latest .
   ```

2. Configure environment variables in a `.env` file:
   ```bash
   # Required environment variables
   DATABASE_HOST=postgres
   DATABASE_PORT=5432
   DATABASE_USERNAME=kanaka
   DATABASE_PASSWORD=your-secure-password
   DATABASE_NAME=kanaka_prod
   REDIS_HOST=redis
   REDIS_PORT=6379
   JWT_SECRET=your-jwt-secret
   NODE_ENV=production
   STARKNET_RPC_URL=your-starknet-node-url
   ```

3. Deploy with Docker Compose:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Kubernetes Deployment

1. Update configuration in `k8s/` directory:
   - Database credentials in secrets
   - Environment variables in ConfigMap
   - Resource limits and requests
   - Service configurations

2. Apply Kubernetes manifests:
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/redis-config.yaml
   kubectl apply -f k8s/redis-statefulset.yaml
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   kubectl apply -f k8s/ingress.yaml
   kubectl apply -f k8s/hpa.yaml
   kubectl apply -f k8s/network-policies.yaml
   ```

### Database Migration

1. Create a database backup:
   ```bash
   ./scripts/backup-db.sh
   ```

2. Run database migrations:
   ```bash
   npm run migrate:prod
   ```

3. Verify migration status:
   ```bash
   npm run migration:status
   ```

### Monitoring & Logging

1. Health Monitoring:
   - `/health` endpoint for uptime monitoring
   - `/health/liveness` for Kubernetes liveness probe
   - Metrics exposed for Prometheus scraping

2. Logging:
   - Production logs in `/logs` directory
   - Structured JSON logging format
   - Log rotation configured

3. Alerting:
   - Health check failures
   - Error rate thresholds
   - Resource utilization alerts

### Backup & Recovery

1. Automated Backups:
   - Daily database backups using `scripts/scheduled-backup.js`
   - Backups stored in `/backups` directory
   - Configurable retention period

2. Recovery Procedure:
   ```bash
   # Stop the application
   kubectl scale deployment kanaka-backend --replicas=0
   
   # Restore from backup
   ./scripts/restore-db.sh <backup-file>
   
   # Restart the application
   kubectl scale deployment kanaka-backend --replicas=3
   ```

### SSL/TLS Configuration

1. Update Nginx configuration:
   ```bash
   # Copy SSL certificates
   cp ssl/cert.pem nginx/ssl/
   cp ssl/key.pem nginx/ssl/
   
   # Update Nginx config
   vi nginx/conf.d/default.conf
   ```

2. Apply changes:
   ```bash
   kubectl delete pod -l app=nginx
   ```

### Maintenance

1. Dependencies Update:
   ```bash
   ./scripts/update-dependencies.js
   ```

2. Cron Jobs Setup:
   ```bash
   ./scripts/setup-cron.sh
   ```

### Troubleshooting

1. Check application logs:
   ```bash
   kubectl logs -l app=kanaka-backend
   ```

2. Check database connectivity:
   ```bash
   kubectl exec -it kanaka-backend-pod -- npm run db:check
   ```

3. Verify Redis cache:
   ```bash
   kubectl exec -it redis-0 -- redis-cli ping
   ```

## Architecture

Detailed architecture documentation is available in [docs/architecture.md](docs/architecture.md). This includes:

- System architecture diagrams
- Module structure
- Data flow
- Security architecture
- Real-time updates
- Monitoring
- Caching strategy

## License

[MIT](LICENSE)