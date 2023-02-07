import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { grpcClientOptions } from '../../grpc-client.options';
import { HeroController } from './hero.controller';
import GrpcClientService from '../grpc-client.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HERO_PACKAGE',
        ...grpcClientOptions,
      },
    ]),
  ],
  controllers: [HeroController],
  providers: [GrpcClientService],
  exports: [GrpcClientService],
})
export class HeroModule {}
