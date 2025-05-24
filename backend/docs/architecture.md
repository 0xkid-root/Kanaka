# Kanaka Protocol Backend Architecture

## Overview

The Kanaka Protocol backend is a modular, scalable NestJS application that serves as the API layer between the frontend and the blockchain infrastructure. It handles user authentication, analytics, and interaction with the Starknet smart contracts.

## System Architecture

```mermaid
graph TB
    Client[Frontend Client]
    WebSocket[WebSocket Server]
    API[API Gateway]
    Auth[Auth Service]
    Analytics[Analytics Service]
    CDR[CDR Oracle Service]
    Registry[Strategy Registry]
    Redis[Redis Cache]
    DB[(PostgreSQL)]
    Starknet[Starknet Node]

    Client --> WebSocket
    Client --> API
    API --> Auth
    API --> Analytics
    API --> CDR
    API --> Registry
    
    Auth --> Redis
    Analytics --> Redis
    CDR --> Redis
    Registry --> Redis
    
    Auth --> DB
    Analytics --> DB
    CDR --> DB
    Registry --> DB
    
    CDR --> Starknet
    Registry --> Starknet
```

## Module Architecture

### Core Modules

1. **Authentication Module**
   - Wallet signature verification
   - JWT token management
   - Role-based access control
   - API key management

2. **Analytics Module**
   - Pool metrics tracking
   - Correlation analysis
   - CDR (Crypto Drawdown Risk) calculations
   - Real-time metrics updates

3. **CDR Oracle Module**
   - Pool risk assessment
   - Volatility tracking
   - Yield rate monitoring
   - Cross-pool correlation tracking

4. **Strategy Registry Module**
   - Pool management
   - Strategy deployment
   - Portfolio rebalancing
   - Yield optimization

### Support Modules

1. **Common Module**
   - Guards
   - Interceptors
   - Filters
   - Decorators
   - DTOs
   - Interfaces

2. **Database Module**
   - TypeORM configuration
   - Migrations
   - Entities
   - Repositories

### Infrastructure

```mermaid
graph LR
    LB[Load Balancer]
    K8S[Kubernetes Cluster]
    Redis[Redis Cluster]
    DB[(PostgreSQL)]
    S3[S3 Storage]
    
    LB --> K8S
    K8S --> Redis
    K8S --> DB
    K8S --> S3
```

## Data Flow

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    participant Redis
    participant DB

    Client->>API: Request nonce
    API->>Auth: Generate nonce
    Auth->>Redis: Cache nonce
    Auth->>Client: Return nonce
    Client->>API: Submit signature
    API->>Auth: Verify signature
    Auth->>Redis: Get nonce
    Auth->>DB: Save session
    Auth->>Client: Return JWT
```

### Analytics Update Flow

```mermaid
sequenceDiagram
    participant Oracle
    participant API
    participant Analytics
    participant WebSocket
    participant DB
    participant Redis

    Oracle->>API: Update metrics
    API->>Analytics: Process update
    Analytics->>DB: Save metrics
    Analytics->>Redis: Update cache
    Analytics->>WebSocket: Broadcast update
    WebSocket->>Client: Push notification
```

## Security Architecture

### Authentication Layers

1. **Network Level**
   - TLS encryption
   - Network policies
   - Rate limiting

2. **Application Level**
   - JWT validation
   - Role checking
   - Request signing

3. **Data Level**
   - Field encryption
   - Data masking
   - Audit logging

### Security Flow

```mermaid
graph TB
    Request[Client Request]
    TLS[TLS Termination]
    WAF[Web Application Firewall]
    Rate[Rate Limiter]
    Auth[Authentication]
    RBAC[Role Check]
    Handler[Request Handler]
    
    Request --> TLS
    TLS --> WAF
    WAF --> Rate
    Rate --> Auth
    Auth --> RBAC
    RBAC --> Handler
```

## Real-time Updates Architecture

### WebSocket Integration

```mermaid
graph TB
    Client[Client]
    Gateway[Socket.IO Gateway]
    Redis[Redis PubSub]
    Service[Business Service]
    
    Client -->|Subscribe| Gateway
    Service -->|Publish| Redis
    Redis -->|Notify| Gateway
    Gateway -->|Emit| Client
```

## Monitoring Architecture

### Health Checks

1. **Liveness Probe**
   - Basic application health
   - Memory usage
   - Event loop latency

2. **Readiness Probe**
   - Database connectivity
   - Redis connectivity
   - External services

3. **Metrics Collection**
   - Request rate
   - Error rate
   - Response time
   - Resource usage

### Monitoring Flow

```mermaid
graph TB
    App[Application]
    Metrics[Metrics Endpoint]
    Prometheus[Prometheus]
    Grafana[Grafana]
    Alert[Alert Manager]
    
    App --> Metrics
    Prometheus -->|Scrape| Metrics
    Grafana -->|Query| Prometheus
    Prometheus -->|Notify| Alert
```

## Cache Architecture

### Cache Layers

1. **Application Cache**
   - Request results
   - Computed values
   - Session data

2. **Distributed Cache**
   - Shared state
   - Rate limiting
   - Lock management

### Cache Flow

```mermaid
graph LR
    Request[Request]
    Local[Local Cache]
    Redis[Redis Cache]
    DB[(Database)]
    
    Request -->|Check| Local
    Local -->|Miss| Redis
    Redis -->|Miss| DB
    DB -->|Update| Redis
    Redis -->|Update| Local
```
