# Kanaka Protocol Database Documentation

This document provides information about the database setup, migrations, backup, and recovery procedures for the Kanaka Protocol backend.

## Database Configuration

The Kanaka Protocol backend supports two database systems:

1. **SQLite** (Development): Used for local development and testing.
2. **PostgreSQL** (Production): Used for production deployments for better performance, reliability, and scalability.

The database configuration is managed through environment variables in the `.env` file:

### SQLite Configuration (Development)
```
DATABASE_PATH=kanaka.db
DATABASE_LOGGING=false
```

### PostgreSQL Configuration (Production)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=kanaka
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=10
```

## Entity Structure

The database schema consists of the following main entities:

1. **Pools**: Stores information about liquidity pools.
2. **Pool Balances**: Tracks user balances in each pool.
3. **Pool Metrics**: Stores metrics like TVL, volatility, and yield rate for each pool.
4. **Pool Correlations**: Tracks correlations between different pools.
5. **Strategy Executions**: Records strategy execution history.
6. **Yield Harvests**: Tracks yield harvesting events.
7. **Pool Weights**: Stores weight allocations for each pool.
8. **Proposals**: Stores governance proposals.
9. **Votes**: Records votes on governance proposals.
10. **Rewards**: Tracks rewards distributed to users.
11. **Authorized Distributors**: Manages addresses authorized to distribute rewards.

## Database Migrations

Database migrations are managed using TypeORM's migration system. This ensures that database schema changes are applied consistently across all environments.

### Migration Commands

- **Generate a new migration**: Creates a new migration based on entity changes.
  ```
  npm run migration:generate -- -n MigrationName
  ```

- **Create an empty migration**: Creates an empty migration file for manual schema changes.
  ```
  npm run migration:create -- -n MigrationName
  ```

- **Run pending migrations**: Applies all pending migrations to the database.
  ```
  npm run migration:run
  ```

- **Revert the last migration**: Rolls back the most recently applied migration.
  ```
  npm run migration:revert
  ```

- **Show migration status**: Displays the status of all migrations.
  ```
  npm run migration:show
  ```

## Database Seeding

The database can be seeded with initial data using the seed script:

```
npm run db:seed
```

This will populate the database with:
- Initial pools
- Pool metrics
- Pool correlations
- Authorized distributors

## Backup and Recovery

### Backup Procedure

The Kanaka Protocol includes automated backup scripts for both SQLite and PostgreSQL databases.

#### Manual Backup

To manually create a backup:

```bash
./scripts/backup-db.sh
```

This will create a compressed backup file in the `backups` directory with a timestamp.

#### Scheduled Backups

To set up scheduled daily backups:

```bash
./scripts/setup-cron.sh
```

This will create a cron job that runs the backup script daily at 2:00 AM.

### Recovery Procedure

To restore a database from a backup:

```bash
./scripts/restore-db.sh backups/kanaka_db_backup_20250524_120000.sql.gz
```

**Warning**: This will overwrite the current database. Make sure you have a backup of the current data if needed.

## Backup Retention Policy

By default, backups are kept for 30 days. Older backups are automatically deleted during the backup process.

To change the retention period, set the `RETENTION_DAYS` environment variable:

```
RETENTION_DAYS=60
```

## Cloud Storage Integration

The backup script includes commented code for uploading backups to cloud storage services like AWS S3. To enable this feature:

1. Uncomment the cloud storage section in the `backup-db.sh` script.
2. Configure the necessary environment variables:
   ```
   UPLOAD_TO_CLOUD=true
   S3_BUCKET=your-backup-bucket
   ```
3. Ensure the appropriate cloud provider CLI tools are installed and configured.

## Best Practices

1. **Regular Backups**: Ensure that scheduled backups are running correctly.
2. **Backup Verification**: Periodically verify that backups can be successfully restored.
3. **Off-site Storage**: Store backups in multiple locations, including off-site or cloud storage.
4. **Monitoring**: Set up monitoring to alert on backup failures.
5. **Documentation**: Keep this documentation updated with any changes to the backup and recovery procedures.

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the scripts have execute permissions:
   ```bash
   chmod +x scripts/*.sh
   ```

2. **Database Connection Failures**: Verify that the database connection parameters in the `.env` file are correct.

3. **Backup Failures**: Check the logs in the `logs` directory for error messages.

### Getting Help

If you encounter issues with the database setup, migrations, or backup/recovery procedures, please contact the Kanaka Protocol development team or open an issue in the project repository.