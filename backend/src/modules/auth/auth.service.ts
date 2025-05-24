import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, WalletType } from '../user/entities/user.entity';
import { SignatureService } from '../../common/services/signature.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { RedisService } from '../../common/services/redis.service';
import { AppConfigService } from '../../common/services/config.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Authentication service
 */
@Injectable()
export class AuthService {
  private readonly logger: AppLoggerService;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private signatureService: SignatureService,
    private redisService: RedisService,
    private configService: AppConfigService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(AuthService.name);
  }

  /**
   * Get or create a user by address
   * @param address Ethereum address
   * @returns User entity
   */
  async getUserByAddress(address: string): Promise<User> {
    try {
      // Normalize the address
      const normalizedAddress = address.toLowerCase();
      
      // Find the user
      let user = await this.userRepository.findOne({ 
        where: { walletAddress: normalizedAddress } 
      });
      
      // If the user doesn't exist, create a new one
      if (!user) {
        this.logger.log(`Creating new user for address: ${normalizedAddress}`);
        
        user = this.userRepository.create({
          walletAddress: normalizedAddress,
          walletType: WalletType.ETHEREUM,
          nonce: this.signatureService.generateNonce(),
        });
        
        await this.userRepository.save(user);
      }
      
      return user;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting user by address: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generate a nonce for a user
   * @param address Ethereum address
   * @returns Nonce
   */
  async generateNonce(address: string): Promise<string> {
    try {
      const user = await this.getUserByAddress(address);
      
      // Generate a new nonce
      user.nonce = this.signatureService.generateNonce();
      await this.userRepository.save(user);
      
      return user.nonce;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error generating nonce: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Generate an authentication message for a user to sign
   * @param address Ethereum address
   * @returns Authentication message
   */
  async getAuthMessage(address: string): Promise<{ message: string, nonce: string }> {
    try {
      const user = await this.getUserByAddress(address);
      
      // Generate the message
      const message = this.signatureService.generateAuthMessage(user.nonce);
      
      return { message, nonce: user.nonce };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error generating auth message: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Verify a signature and authenticate a user
   * @param address User address (Ethereum or Starknet)
   * @param signature Signature (format depends on wallet type)
   * @param walletType Type of wallet ('ethereum' or 'starknet')
   * @returns JWT token and user data
   */
  async verifySignature(
    address: string, 
    signature: string | any, 
    walletType: string
  ): Promise<{ token: string, user: any }> {
    try {
      // Normalize the address for Ethereum
      const normalizedAddress = walletType === 'ethereum' ? address.toLowerCase() : address;
      
      // Find the user by wallet address
      let user = await this.userRepository.findOne({ 
        where: { walletAddress: normalizedAddress },
      });
      
      // If user doesn't exist, create a new one
      if (!user) {
        this.logger.log(`Creating new user for address: ${normalizedAddress} (${walletType})`);
        
        user = this.userRepository.create({
          walletAddress: normalizedAddress,
          walletType: walletType as WalletType,
          nonce: this.signatureService.generateNonce(),
          roles: ['user'],
        });
        
        await this.userRepository.save(user);
      }
      
      // Generate the message that was signed
      const timestamp = Date.now();
      const message = `Login to Kanaka Protocol: ${timestamp}`;
      
      // Verify the signature based on wallet type
      let isValid = false;
      
      if (walletType === 'ethereum') {
        // For Ethereum, use ethers.js to recover the address from the signature
        isValid = await this.signatureService.verifyEthereumSignature(
          message,
          signature as string,
          normalizedAddress,
        );
      } else {
        // For other wallet types, we'll need to implement specific verification
        // This is a placeholder - you'll need to implement the actual verification
        isValid = true;
      }
      
      if (!isValid) {
        this.logger.warn(`Invalid signature for address: ${normalizedAddress} (${walletType})`);
        throw new UnauthorizedException('Invalid signature');
      }
      
      // Generate a new nonce for next time
      user.nonce = this.signatureService.generateNonce();
      await this.userRepository.save(user);
      
      // Generate a JWT token
      const token = this.jwtService.sign({
        sub: user.id,
        address: normalizedAddress,
        walletType,
        roles: user.roles,
      });
      
      this.logger.log(`User authenticated: ${normalizedAddress} (${walletType})`);
      
      return { 
        token,
        user: {
          id: user.id,
          address: normalizedAddress,
          walletType,
          roles: user.roles,
        }
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      const err = error as Error;
      this.logger.error(`Error verifying signature: ${err.message}`, err.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Generate an API key for a user
   * @param userId User ID
   * @param name API key name
   * @param expiresIn Expiration time in seconds (default: 30 days)
   * @returns API key
   */
  async generateApiKey(
    userId: string,
    name: string,
    expiresIn: number = 30 * 24 * 60 * 60, // 30 days
  ): Promise<{ apiKey: string, expiresAt: Date }> {
    try {
      // Find the user
      const user = await this.userRepository.findOne({ 
        where: { id: Number(userId) }
      });
      
      if (!user) {
        throw new BadRequestException('User not found');
      }
      
      // Generate a random API key
      const apiKey = uuidv4().replace(/-/g, '');
      
      // Map user roles to strings
      const roles = user.roles ? user.roles.map(role => role.name) : [];
      
      // Store the API key in Redis
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      await this.redisService.setJson(`apikey:${apiKey}`, {
        userId: user.id,
        walletAddress: user.walletAddress,
        name,
        roles,
        createdAt: new Date(),
        expiresAt,
      }, expiresIn);
      
      this.logger.log(`API key generated for user ${user.walletAddress}: ${name}`);
      
      return { apiKey, expiresAt };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error generating API key: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Revoke an API key
   * @param apiKey API key
   */
  async revokeApiKey(apiKey: string): Promise<void> {
    try {
      // Delete the API key from Redis
      await this.redisService.del(`apikey:${apiKey}`);
      
      this.logger.log(`API key revoked: ${apiKey}`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error revoking API key: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * List API keys for a user
   * @param userId User ID
   * @returns List of API keys
   */
  async listApiKeys(userId: string): Promise<any[]> {
    try {
      // Find the user
      const user = await this.userRepository.findOne({ 
        where: { id: Number(userId) } 
      });
      
      if (!user) {
        throw new BadRequestException('User not found');
      }
      
      // Get all keys from Redis that match the pattern
      const keys = await this.redisService.keys(`apikey:*`);
      const apiKeys = [];
      
      for (const key of keys) {
        const apiKeyData = await this.redisService.getJson(key);
        
        if (apiKeyData && apiKeyData.userId === userId.toString()) {
          // Extract the actual API key from the Redis key
          const apiKey = key.replace('apikey:', '');
          
          const data = apiKeyData as any;
          apiKeys.push({
            apiKey: apiKey.substring(0, 8) + '...',
            name: data.name || 'Unknown',
            createdAt: data.createdAt || new Date(),
            expiresAt: data.expiresAt || new Date(),
          });
        }
      }
      
      return apiKeys;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error listing API keys: ${err.message}`, err.stack);
      throw err;
    }
  }
}