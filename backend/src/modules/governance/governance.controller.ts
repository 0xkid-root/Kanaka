import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  ValidationPipe,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { GovernanceService } from './governance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { 
  CreateProposalDto, 
  ProposalDto, 
  CastVoteDto, 
  VoteResponseDto 
} from '../../common/dtos/proposal.dto';

@ApiTags('Governance')
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get('proposals')
  @ApiOperation({ summary: 'Get all proposals' })
  @ApiQuery({ 
    name: 'active', 
    required: false, 
    type: Boolean,
    description: 'Filter for active proposals only'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Number of proposals to return'
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false, 
    type: Number,
    description: 'Number of proposals to skip'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a list of all proposals',
    type: [ProposalDto]
  })
  async getProposals(
    @Query('active', new DefaultValuePipe(false), ParseBoolPipe) active: boolean,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    try {
      return await this.governanceService.getProposals(active, limit, offset);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch proposals',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('proposals/:id')
  @ApiOperation({ summary: 'Get proposal by ID' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the proposal details',
    type: ProposalDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  async getProposal(@Param('id', ParseIntPipe) id: number) {
    try {
      const proposal = await this.governanceService.getProposal(id);
      if (!proposal) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Proposal with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return proposal;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch proposal',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('proposals/:id/votes')
  @ApiOperation({ summary: 'Get votes for a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiQuery({ 
    name: 'support', 
    required: false, 
    type: Boolean,
    description: 'Filter by vote support (true for yes, false for no)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the votes for the proposal',
    type: [VoteResponseDto]
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  async getVotes(
    @Param('id', ParseIntPipe) id: number,
    @Query('support') support?: boolean,
  ) {
    try {
      // First check if the proposal exists
      const proposal = await this.governanceService.getProposal(id);
      if (!proposal) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Proposal with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      return await this.governanceService.getVotes(id, support);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch votes',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiBody({ type: CreateProposalDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The proposal has been successfully created',
    type: ProposalDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid proposal data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  async createProposal(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateProposalDto, 
    @Req() req: any
  ) {
    try {
      return await this.governanceService.createProposal(dto, req.user.privateKey);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to create proposal',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('proposals/:id/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiBody({ type: CastVoteDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The vote has been successfully cast',
    type: VoteResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid vote data or voting period ended',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  async castVote(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CastVoteDto,
    @Req() req: any,
  ) {
    try {
      // First check if the proposal exists
      const proposal = await this.governanceService.getProposal(id);
      if (!proposal) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Proposal with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      // Check if voting period is active
      const now = Math.floor(Date.now() / 1000);
      if (now < proposal.startTime || now > proposal.endTime) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Voting period is not active for this proposal',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.governanceService.castVote(id, dto.support, req.user.privateKey, dto.reason);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to cast vote',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('proposals/:id/execute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'governance')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Execute a proposal (Admin/Governance only)' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The proposal has been successfully executed',
    type: ProposalDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Proposal cannot be executed (e.g., voting period not ended, already executed)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires admin or governance role',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  async executeProposal(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    try {
      // First check if the proposal exists
      const proposal = await this.governanceService.getProposal(id);
      if (!proposal) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Proposal with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      // Check if proposal can be executed
      if (proposal.executed) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Proposal has already been executed',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      if (proposal.canceled) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Proposal has been canceled and cannot be executed',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      const now = Math.floor(Date.now() / 1000);
      if (now <= proposal.endTime) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Voting period has not ended yet',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.governanceService.executeProposal(id, req.user.privateKey);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to execute proposal',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('proposals/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'governance')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Cancel a proposal (Admin/Governance only)' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The proposal has been successfully canceled',
    type: ProposalDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Proposal cannot be canceled (e.g., already executed, already canceled)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires admin or governance role',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  async cancelProposal(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    try {
      // First check if the proposal exists
      const proposal = await this.governanceService.getProposal(id);
      if (!proposal) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Proposal with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      // Check if proposal can be canceled
      if (proposal.executed) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Proposal has already been executed and cannot be canceled',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      if (proposal.canceled) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Proposal has already been canceled',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.governanceService.cancelProposal(id, req.user.privateKey);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to cancel proposal',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}