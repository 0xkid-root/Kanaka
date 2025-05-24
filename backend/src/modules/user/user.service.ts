import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { SignatureService } from '../../common/services/signature.service';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private signatureService: SignatureService,
    private redisService: RedisService,
  ) {}

  async createNonce(walletAddress: string): Promise<string> {
    const nonce = this.signatureService.generateNonce();
    await this.redisService.set(
      `auth:nonce:${walletAddress}`,
      nonce,
      300, // 5 minutes expiry
    );
    return this.signatureService.generateAuthMessage(nonce);
  }

  async verifySignature(
    walletAddress: string,
    signature: string,
  ): Promise<{ token: string }> {
    const nonce = await this.redisService.get(`auth:nonce:${walletAddress}`);
    if (!nonce) {
      throw new UnauthorizedException('Nonce expired or not found');
    }

    const message = this.signatureService.generateAuthMessage(nonce);
    const isValid = await this.signatureService.verifySignature(
      message,
      signature,
      walletAddress,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Delete the nonce after successful verification
    await this.redisService.del(`auth:nonce:${walletAddress}`);

    // Get or create user
    let user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      user = this.userRepository.create({
        walletAddress: walletAddress.toLowerCase(),
      });
      await this.userRepository.save(user);
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      walletAddress: user.walletAddress,
      roles: user.roles || ['user'],
    });

    return { token };
  }

  async findById(id: number): Promise<User> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findByWalletAddress(walletAddress: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }

  async updateProfile(id: number, data: Partial<User>): Promise<User> {
    await this.userRepository.update(id, data);
    return await this.findById(id);
  }

  async updateUserRoles(id: number, roles: string[]): Promise<User> {
    await this.userRepository.update(id, { roles });
    return await this.findById(id);
  }
}
