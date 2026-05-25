import { Module } from '@nestjs/common';
import { BureauController } from './bureau.controller';
import { BureauService } from './bureau.service';

@Module({
  controllers: [BureauController],
  providers: [BureauService],
  exports: [BureauService],
})
export class BureauModule {}
