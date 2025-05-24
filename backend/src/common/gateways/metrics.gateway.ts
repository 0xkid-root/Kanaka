import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PoolMetricsWebSocketDto } from '../dtos/pool-metrics.dto';
import { VaultPerformanceDto } from '../dtos/vault.dto';
import { StrategyUpdateDto } from '../dtos/strategy.dto';
import { ProposalUpdateDto } from '../dtos/proposal.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/metrics',
})
export class MetricsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private connectedClients: Map<string, Socket> = new Map();
  private readonly roomTypes = ['pool', 'vault', 'strategy', 'proposal'] as const;

  async handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    // Clean up all room subscriptions
    this.roomTypes.forEach(async (type) => {
      const rooms = this.server.sockets.adapter.rooms;
      for (const room of rooms.keys()) {
        if (room.startsWith(`${type}:`)) {
          await client.leave(room);
        }
      }
    });
    console.log(`Client disconnected: ${client.id}`);
  }

  // Pool Metrics Subscriptions
  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('subscribeToPool')
  async handleSubscribeToPool(client: Socket, poolId: string) {
    await client.join(`pool:${poolId}`);
    console.log(`Client ${client.id} subscribed to pool ${poolId}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('unsubscribeFromPool')
  async handleUnsubscribeFromPool(client: Socket, poolId: string) {
    await client.leave(`pool:${poolId}`);
    console.log(`Client ${client.id} unsubscribed from pool ${poolId}`);
  }

  // Vault Performance Subscriptions
  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('subscribeToVault')
  async handleSubscribeToVault(client: Socket, vaultId: string) {
    await client.join(`vault:${vaultId}`);
    console.log(`Client ${client.id} subscribed to vault ${vaultId}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('unsubscribeFromVault')
  async handleUnsubscribeFromVault(client: Socket, vaultId: string) {
    await client.leave(`vault:${vaultId}`);
    console.log(`Client ${client.id} unsubscribed from vault ${vaultId}`);
  }

  // Strategy Updates Subscriptions
  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('subscribeToStrategy')
  async handleSubscribeToStrategy(client: Socket, strategyId: string) {
    await client.join(`strategy:${strategyId}`);
    console.log(`Client ${client.id} subscribed to strategy ${strategyId}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('unsubscribeFromStrategy')
  async handleUnsubscribeFromStrategy(client: Socket, strategyId: string) {
    await client.leave(`strategy:${strategyId}`);
    console.log(`Client ${client.id} unsubscribed from strategy ${strategyId}`);
  }

  // Governance Proposal Subscriptions
  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('subscribeToProposal')
  async handleSubscribeToProposal(client: Socket, proposalId: string) {
    await client.join(`proposal:${proposalId}`);
    console.log(`Client ${client.id} subscribed to proposal ${proposalId}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('unsubscribeFromProposal')
  async handleUnsubscribeFromProposal(client: Socket, proposalId: string) {
    await client.leave(`proposal:${proposalId}`);
    console.log(`Client ${client.id} unsubscribed from proposal ${proposalId}`);
  }

  // Broadcasting Methods with Strong Typing
  broadcastPoolUpdate(poolId: string, data: PoolMetricsWebSocketDto) {
    this.server.to(`pool:${poolId}`).emit('poolUpdate', {
      type: 'pool',
      timestamp: new Date().toISOString(),
      data: {
        ...data
      }
    });
  }

  broadcastVaultUpdate(vaultId: string, data: VaultPerformanceDto) {
    this.server.to(`vault:${vaultId}`).emit('vaultUpdate', {
      type: 'vault',
      timestamp: new Date().toISOString(),
      data: {
        ...data
      }
    });
  }

  broadcastStrategyUpdate(strategyId: string, data: StrategyUpdateDto) {
    this.server.to(`strategy:${strategyId}`).emit('strategyUpdate', {
      type: 'strategy',
      timestamp: new Date().toISOString(),
      data: {
        ...data
      }
    });
  }

  broadcastProposalUpdate(proposalId: string, data: ProposalUpdateDto) {
    this.server.to(`proposal:${proposalId}`).emit('proposalUpdate', {
      type: 'proposal',
      timestamp: new Date().toISOString(),
      data: {
        ...data
      }
    });
  }

  // Broadcast to all clients
  broadcastSystemUpdate(type: 'pool' | 'vault' | 'strategy' | 'governance', data: any) {
    this.server.emit('systemUpdate', {
      type,
      timestamp: new Date().toISOString(),
      data
    });
  }

  // Batch updates for efficiency
  broadcastBatchUpdates(updates: Array<{
    type: 'pool' | 'vault' | 'strategy' | 'proposal';
    id: string;
    data: any;
  }>) {
    updates.forEach(update => {
      switch (update.type) {
        case 'pool':
          this.broadcastPoolUpdate(update.id, update.data);
          break;
        case 'vault':
          this.broadcastVaultUpdate(update.id, update.data);
          break;
        case 'strategy':
          this.broadcastStrategyUpdate(update.id, update.data);
          break;
        case 'proposal':
          this.broadcastProposalUpdate(update.id, update.data);
          break;
      }
    });
  }
}
