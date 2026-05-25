import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { AIService, ProactiveInsight } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsObject()
  @IsOptional()
  context?: {
    userId?: string;
    bureau?: any;
    strategies?: any[];
    conversationHistory?: Array<{ role: string; content: string }>;
  };
}

export class ExplainDto {
  @IsString()
  @IsNotEmpty()
  strategyId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

@ApiTags('ai')
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('insights/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get proactive AI insights for a user',
    description:
      'Analyzes the user's bureau data and BRE strategies to generate proactive, ' +
      'personalized financial insights. Rule-based in demo mode. ' +
      'PRODUCTION: Integrate FinGPT / RAG pipeline here.',
  })
  @ApiResponse({ status: 200, description: 'Array of proactive insights' })
  async getInsights(
    @Param('userId') userId: string,
    @Request() req,
  ): Promise<ProactiveInsight[]> {
    return this.aiService.generateInsights(userId);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a chat message to the AI assistant',
    description:
      'Processes a user message with financial context. ' +
      'Returns rule-based response in demo mode. ' +
      'PRODUCTION: Route to FinGPT or Claude/GPT-4 with RAG context.',
  })
  @ApiResponse({ status: 200, description: 'AI reply' })
  async chat(
    @Body() dto: ChatDto,
    @Request() req,
  ): Promise<{ reply: string; suggestions?: string[] }> {
    return this.aiService.chat(dto.message, {
      ...dto.context,
      userId: dto.context?.userId || req.user.userId,
    });
  }

  @Post('explain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a plain-English explanation of a BRE strategy',
    description:
      'Returns a detailed, user-friendly explanation of a given strategy. ' +
      'Explains why it was recommended, what the user needs to do, and what to watch out for.',
  })
  @ApiResponse({ status: 200, description: 'Strategy explanation' })
  async explainStrategy(
    @Body() dto: ExplainDto,
    @Request() req,
  ): Promise<{ explanation: string; steps: string[]; faqs: Array<{ q: string; a: string }> }> {
    return this.aiService.explainStrategy(dto.strategyId, dto.userId || req.user.userId);
  }
}
