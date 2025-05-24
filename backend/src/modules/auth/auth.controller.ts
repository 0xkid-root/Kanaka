import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  UseGuards, 
  Req, 
  Delete,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkipThrottle } from '../../common/decorators/skip-throttle.decorator';

/**
 * Authentication controller
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Get a nonce for authentication
   */
  @Get('nonce/:address')
  @ApiOperation({ summary: 'Get a nonce for authentication' })
  @ApiResponse({ status: 200, description: 'Nonce generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid address' })
  async getNonce(@Param('address') address: string) {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }
    
    const { message, nonce } = await this.authService.getAuthMessage(address);
    return { message, nonce };
  }

  /**
   * Authenticate with a signature
   */
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with a signature' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async login(
    @Body('address') address: string,
    @Body('signature') signature: string,
    @Body('walletType') walletType: string,
  ) {
    if (!address) {
      throw new BadRequestException('Address is required');
    }
    
    if (!signature) {
      throw new BadRequestException('Signature is required');
    }
    
    if (!walletType) {
      throw new BadRequestException('Wallet type is required');
    }
    
    // Validate address format based on wallet type
    if (walletType === 'ethereum' && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }
    
    // Validate signature format for Ethereum
    if (walletType === 'ethereum' && typeof signature === 'string' && !/^0x[a-fA-F0-9]{130}$/.test(signature)) {
      throw new BadRequestException('Invalid Ethereum signature');
    }
    
    return this.authService.verifySignature(address, signature, walletType);
  }

  /**
   * Generate an API key
   */
  @Post('api-key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate an API key' })
  @ApiResponse({ status: 201, description: 'API key generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateApiKey(
    @Req() req,
    @Body('name') name: string,
    @Body('expiresIn') expiresIn?: number,
  ) {
    if (!name) {
      throw new BadRequestException('API key name is required');
    }
    
    return this.authService.generateApiKey(req.user.id, name, expiresIn);
  }

  /**
   * Revoke an API key
   */
  @Delete('api-key/:apiKey')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeApiKey(@Param('apiKey') apiKey: string) {
    if (!apiKey) {
      throw new BadRequestException('API key is required');
    }
    
    await this.authService.revokeApiKey(apiKey);
    return { success: true };
  }

  /**
   * List API keys
   */
  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List API keys' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listApiKeys(@Req() req) {
    return this.authService.listApiKeys(req.user.id);
  }

  /**
   * Get the current user
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipThrottle()
  @ApiOperation({ summary: 'Get the current user' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Req() req) {
    return {
      id: req.user.id,
      address: req.user.address,
      roles: req.user.roles,
    };
  }
}