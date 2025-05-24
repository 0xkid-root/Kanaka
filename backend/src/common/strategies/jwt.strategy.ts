import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../services/config.service';
import { AppLoggerService } from '../services/logging.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../modules/user/entities/user.entity';

/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string;
  address: string;
  nonce: string;
  iat: number;
  exp: number;
}

/**
 * JWT authentication strategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger: AppLoggerService;

  constructor(
    private configService: AppConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    loggerService: AppLoggerService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
    
    this.logger = loggerService.createLogger(JwtStrategy.name);
  }

  /**
   * Validate the JWT payload and return the user
   * @param payload JWT payload
   * @returns User object
   */
  async validate(payload: JwtPayload): Promise<any> {
    try {
      const { sub, address } = payload;
      
      // Find the user in the database
      const user = await this.userRepository.findOne({ 
        where: { id: sub },
        relations: ['roles'],
      });
      
      if (!user) {
        this.logger.warn(`JWT validation failed: User ${sub} not found`);
        throw new UnauthorizedException('User not found');
      }
      
      if (user.address.toLowerCase() !== address.toLowerCase()) {
        this.logger.warn(`JWT validation failed: Address mismatch for user ${sub}`);
        throw new UnauthorizedException('Invalid token');
      }
      
      // Map user roles to strings
      const roles = user.roles ? user.roles.map(role => role.name) : [];
      
      return {
        id: user.id,
        address: user.address,
        nonce: user.nonce,
        roles,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}