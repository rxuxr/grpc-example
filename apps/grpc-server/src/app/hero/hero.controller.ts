import { Metadata, ServerDuplexStream } from '@grpc/grpc-js';
import { EventEmitter } from 'node:events';
import {
  Body,
  Controller,
  Get,
  Inject,
  OnModuleInit,
  Param,
  Post,
} from '@nestjs/common';
import {
  ClientGrpc,
  GrpcMethod,
  GrpcStreamMethod,
} from '@nestjs/microservices';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { HeroById } from './interfaces/hero-by-id.interface';
import { Hero } from './interfaces/hero.interface';

class GrpcEventEmitter extends EventEmitter {}

interface HeroService {
  findOne(data: HeroById): Observable<Hero>;
  findMany(upstream: Observable<HeroById>): Observable<Hero>;
}

@Controller('hero')
export class HeroController implements OnModuleInit {
  private readonly items: Hero[] = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Doe' },
  ];
  private heroService: HeroService;
  private grpcEventEmitter: GrpcEventEmitter;

  constructor(@Inject('HERO_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.heroService = this.client.getService<HeroService>('HeroService');
    this.grpcEventEmitter = new GrpcEventEmitter();
  }

  @Get()
  getMany(): Observable<Hero[]> {
    const ids$ = new ReplaySubject<HeroById>();
    ids$.next({ id: 1 });
    ids$.next({ id: 2 });
    ids$.complete();
    const stream = this.heroService.findMany(ids$.asObservable());
    return stream.pipe(toArray());
  }

  @Post()
  async sendOne(@Body() hero: Hero): Promise<boolean> {
    console.log('Body:', hero);
    this.grpcEventEmitter.emit('grpcEvent', hero);
    return true;
  }

  @Get(':id')
  getById(@Param('id') id: string): Observable<Hero> {
    return this.heroService.findOne({ id: +id });
  }

  @GrpcMethod('HeroService')
  findOne(data: HeroById): Hero {
    return this.items.find(({ id }) => id === data.id);
  }

  @GrpcStreamMethod('HeroService')
  async findMany(data$: Observable<HeroById>): Promise<Observable<Hero>> {
    const hero$ = new Subject<Hero>();
    const onNext = async (heroById: HeroById) => {
      new Promise<void>((resolve) => {
        const cb = (event) => {
          const listeners = this.grpcEventEmitter.listeners('grpcEvent');
          console.log('Event!', event, listeners.length, listeners[0].length);
          hero$.next(event);
          resolve();
        };
        this.grpcEventEmitter.on('grpcEvent', cb);
      });
      // const item = this.items.find(({ id }) => id === heroById.id);
      // hero$.next(item);
    };
    const onComplete = async () => {
      this.grpcEventEmitter.removeAllListeners();
      hero$.complete();
    };
    data$.subscribe({
      next: onNext,
      complete: onComplete,
    });

    return hero$.asObservable();
  }
}
