import { RedisClientType } from 'redis';

export interface IRedisOperations {
  zAdd(key: string, score: number, member: string): Promise<void>;
  zRemRangeByScore(key: string, min: number, max: number): Promise<void>;
  zCard(key: string): Promise<number>;
  zCount(key: string, min: number, max: number): Promise<number>;
  del(key: string): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
  multi(): RedisClientType['multi'];
  executeMulti(commands: Array<() => Promise<void>>): Promise<Array<unknown>>;
}
