import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { ChatbotGateway } from './chatbot.gateway';
import { BureauModule } from '../bureau/bureau.module';
import { BREModule } from '../bre/bre.module';

@Module({
  imports: [BureauModule, BREModule],
  controllers: [AIController],
  providers: [AIService, ChatbotGateway],
  exports: [AIService],
})
export class AIModule {}
