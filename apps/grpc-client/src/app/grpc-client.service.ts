import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { rejects } from 'assert';
import { map, Observable, ReplaySubject, toArray } from 'rxjs';
import { HeroById } from './hero/interfaces/hero-by-id.interface';
import { Hero } from './hero/interfaces/hero.interface';

interface HeroService {
  findOne(data: HeroById): Observable<Hero>;
  findMany(upstream: Observable<HeroById>): Observable<Hero>;
}

@Injectable()
export default class GrpcClientService implements OnModuleInit {
  private heroService: HeroService;

  constructor(@Inject('HERO_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.heroService = this.client.getService<HeroService>('HeroService');
  }

  public async run(): Promise<void> {
    const ids$ = new ReplaySubject<HeroById>();
    // ids$.next({ id: 1 });
    ids$.next({ id: 2 });
    // ids$.complete();
    const stream = this.heroService.findMany(ids$.asObservable());
    // const result = this.heroService.findOne({ id: 1 });
    // result.subscribe({
    //   next(x) {
    //     console.log('got value findone', x);
    //   },
    // });
    // return result;
    return new Promise((resolve, reject) => {
      stream.subscribe({
        next(x) {
          console.log('got value ', x);
        },
        complete() {
          resolve();
          console.log('Complete!');
        },
      });
    });
  }
}
