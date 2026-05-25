import { Module } from '@nestjs/common';
import { BREController } from './bre.controller';
import { BREService } from './bre.service';
import { BureauModule } from '../bureau/bureau.module';

@Module({
  imports: [BureauModule],
  controllers: [BREController],
  providers: [BREService],
  exports: [BREService],
})
export class BREModule {}
