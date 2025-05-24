import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1716608400000 implements MigrationInterface {
  name = 'InitialSchema1716608400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create pools table
    await queryRunner.query(`
      CREATE TABLE "pools" (
        "poolId" character varying NOT NULL,
        "token" character varying NOT NULL,
        "strategy" character varying NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "minDeposit" numeric(36,0) NOT NULL DEFAULT '0',
        "maxCapacity" numeric(36,0) NOT NULL DEFAULT '0',
        "totalSupply" numeric(36,0) NOT NULL DEFAULT '0',
        "apy" real NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pools" PRIMARY KEY ("poolId")
      )
    `);

    // Create pool_balances table
    await queryRunner.query(`
      CREATE TABLE "pool_balances" (
        "poolId" character varying NOT NULL,
        "user" character varying NOT NULL,
        "balance" numeric(36,0) NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pool_balances" PRIMARY KEY ("poolId", "user")
      )
    `);

    // Create pool_metrics table
    await queryRunner.query(`
      CREATE TABLE "pool_metrics" (
        "poolId" character varying NOT NULL,
        "tvl" numeric(36,0) NOT NULL DEFAULT '0',
        "volatility" numeric(36,0) NOT NULL DEFAULT '0',
        "yieldRate" numeric(36,0) NOT NULL DEFAULT '0',
        "lastUpdate" bigint NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pool_metrics" PRIMARY KEY ("poolId")
      )
    `);

    // Create pool_correlations table
    await queryRunner.query(`
      CREATE TABLE "pool_correlations" (
        "poolA" character varying NOT NULL,
        "poolB" character varying NOT NULL,
        "correlation" numeric(36,0) NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pool_correlations" PRIMARY KEY ("poolA", "poolB")
      )
    `);

    // Create strategy_executions table
    await queryRunner.query(`
      CREATE TABLE "strategy_executions" (
        "id" integer NOT NULL,
        "poolId" character varying NOT NULL,
        "strategy" character varying NOT NULL,
        "weight" numeric(36,0) NOT NULL,
        "executedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_strategy_executions" PRIMARY KEY ("id")
      )
    `);

    // Create yield_harvest table
    await queryRunner.query(`
      CREATE TABLE "yield_harvest" (
        "id" SERIAL NOT NULL,
        "poolId" character varying NOT NULL,
        "amount" character varying NOT NULL,
        "timestamp" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_yield_harvest" PRIMARY KEY ("id")
      )
    `);

    // Create pool_weight table
    await queryRunner.query(`
      CREATE TABLE "pool_weight" (
        "id" SERIAL NOT NULL,
        "poolId" character varying NOT NULL,
        "weight" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pool_weight" PRIMARY KEY ("id")
      )
    `);

    // Create proposals table
    await queryRunner.query(`
      CREATE TABLE "proposals" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL DEFAULT 'Untitled Proposal',
        "description" text NOT NULL,
        "proposer" character varying NOT NULL,
        "startTime" bigint NOT NULL,
        "endTime" bigint NOT NULL,
        "forVotes" numeric(36,0) NOT NULL DEFAULT '0',
        "againstVotes" numeric(36,0) NOT NULL DEFAULT '0',
        "executed" boolean NOT NULL DEFAULT false,
        "canceled" boolean NOT NULL DEFAULT false,
        "quorum" numeric(36,0) NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_proposals" PRIMARY KEY ("id")
      )
    `);

    // Create votes table
    await queryRunner.query(`
      CREATE TABLE "votes" (
        "id" SERIAL NOT NULL,
        "proposalId" integer NOT NULL,
        "voter" character varying NOT NULL,
        "weight" numeric(36,0) NOT NULL,
        "vote" character varying NOT NULL,
        "reason" text,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_votes" PRIMARY KEY ("id")
      )
    `);

    // Create rewards table
    await queryRunner.query(`
      CREATE TABLE "rewards" (
        "id" SERIAL NOT NULL,
        "user" character varying NOT NULL,
        "amount" numeric(36,0) NOT NULL DEFAULT '0',
        "reason" character varying NOT NULL,
        "claimed" boolean NOT NULL DEFAULT false,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rewards" PRIMARY KEY ("id")
      )
    `);

    // Create authorized_distributors table
    await queryRunner.query(`
      CREATE TABLE "authorized_distributors" (
        "id" SERIAL NOT NULL,
        "address" character varying NOT NULL,
        "authorized" boolean NOT NULL DEFAULT true,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_authorized_distributors" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "votes" ADD CONSTRAINT "FK_votes_proposals" 
      FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "pool_balances" ADD CONSTRAINT "FK_pool_balances_pools" 
      FOREIGN KEY ("poolId") REFERENCES "pools"("poolId") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "pool_metrics" ADD CONSTRAINT "FK_pool_metrics_pools" 
      FOREIGN KEY ("poolId") REFERENCES "pools"("poolId") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "yield_harvest" ADD CONSTRAINT "FK_yield_harvest_pools" 
      FOREIGN KEY ("poolId") REFERENCES "pools"("poolId") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "pool_weight" ADD CONSTRAINT "FK_pool_weight_pools" 
      FOREIGN KEY ("poolId") REFERENCES "pools"("poolId") ON DELETE CASCADE
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_pool_balances_user" ON "pool_balances" ("user")`);
    await queryRunner.query(`CREATE INDEX "IDX_votes_voter" ON "votes" ("voter")`);
    await queryRunner.query(`CREATE INDEX "IDX_votes_proposalId" ON "votes" ("proposalId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rewards_user" ON "rewards" ("user")`);
    await queryRunner.query(`CREATE INDEX "IDX_rewards_claimed" ON "rewards" ("claimed")`);
    await queryRunner.query(`CREATE INDEX "IDX_strategy_executions_poolId" ON "strategy_executions" ("poolId")`);
    await queryRunner.query(`CREATE INDEX "IDX_yield_harvest_poolId" ON "yield_harvest" ("poolId")`);
    await queryRunner.query(`CREATE INDEX "IDX_pool_weight_poolId" ON "pool_weight" ("poolId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "votes" DROP CONSTRAINT "FK_votes_proposals"`);
    await queryRunner.query(`ALTER TABLE "pool_balances" DROP CONSTRAINT "FK_pool_balances_pools"`);
    await queryRunner.query(`ALTER TABLE "pool_metrics" DROP CONSTRAINT "FK_pool_metrics_pools"`);
    await queryRunner.query(`ALTER TABLE "yield_harvest" DROP CONSTRAINT "FK_yield_harvest_pools"`);
    await queryRunner.query(`ALTER TABLE "pool_weight" DROP CONSTRAINT "FK_pool_weight_pools"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_pool_balances_user"`);
    await queryRunner.query(`DROP INDEX "IDX_votes_voter"`);
    await queryRunner.query(`DROP INDEX "IDX_votes_proposalId"`);
    await queryRunner.query(`DROP INDEX "IDX_rewards_user"`);
    await queryRunner.query(`DROP INDEX "IDX_rewards_claimed"`);
    await queryRunner.query(`DROP INDEX "IDX_strategy_executions_poolId"`);
    await queryRunner.query(`DROP INDEX "IDX_yield_harvest_poolId"`);
    await queryRunner.query(`DROP INDEX "IDX_pool_weight_poolId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "authorized_distributors"`);
    await queryRunner.query(`DROP TABLE "rewards"`);
    await queryRunner.query(`DROP TABLE "votes"`);
    await queryRunner.query(`DROP TABLE "proposals"`);
    await queryRunner.query(`DROP TABLE "pool_weight"`);
    await queryRunner.query(`DROP TABLE "yield_harvest"`);
    await queryRunner.query(`DROP TABLE "strategy_executions"`);
    await queryRunner.query(`DROP TABLE "pool_correlations"`);
    await queryRunner.query(`DROP TABLE "pool_metrics"`);
    await queryRunner.query(`DROP TABLE "pool_balances"`);
    await queryRunner.query(`DROP TABLE "pools"`);
  }
}