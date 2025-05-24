import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, Provider, Account, constants } from 'starknet';
import { RedisService } from './redis.service';

@Injectable()
export class ContractService {
  private provider: Provider;
  private contracts: Map<string, Contract> = new Map();

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.provider = new Provider({
      sequencer: {
        network: this.configService.get('STARKNET_NETWORK'),
      },
    });
  }

  async getContract(name: string): Promise<Contract> {
    if (this.contracts.has(name)) {
      return this.contracts.get(name);
    }

    const contract = new Contract(
      require(`../abis/${name}.json`),
      this.configService.get(`${name.toUpperCase()}_ADDRESS`),
      this.provider,
    );

    this.contracts.set(name, contract);
    return contract;
  }

  async getAccount(privateKey: string): Promise<Account> {
    return new Account(
      this.provider,
      this.configService.get('ACCOUNT_ADDRESS'),
      privateKey,
    );
  }

  async callView(
    contractName: string,
    method: string,
    args: any[] = [],
    useCache = true,
  ): Promise<any> {
    if (useCache) {
      const cacheKey = `contract:${contractName}:${method}:${JSON.stringify(args)}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const contract = await this.getContract(contractName);
    const result = await contract.call(method, args);

    if (useCache) {
      const cacheKey = `contract:${contractName}:${method}:${JSON.stringify(args)}`;
      await this.redisService.setJson(cacheKey, result, 300); // Cache for 5 minutes
    }

    return result;
  }

  async execute(
    contractName: string,
    method: string,
    args: any[],
    account?: Account,
  ): Promise<any> {
    const contract = await this.getContract(contractName);
    
    if (!account) {
      account = await this.getAccount(
        this.configService.get('ADMIN_PRIVATE_KEY'),
      );
    }

    const execution = await contract.invoke(method, args, {
      maxFee: constants.ZERO,
      nonce: await account.getNonce(),
    });

    return execution;
  }

  async waitForTransaction(txHash: string): Promise<any> {
    return await this.provider.waitForTransaction(txHash);
  }
}
