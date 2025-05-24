#!/bin/bash

# Database backup script for Kanaka Protocol
# This script creates a backup of the PostgreSQL database and stores it in a specified location
# It also maintains a retention policy for backups

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/kanaka_db_backup_$TIMESTAMP.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Function to log messages
log_message() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

# Function to handle errors
handle_error() {
  log_message "ERROR: $1"
  exit 1
}

# Check if we're in production mode (using PostgreSQL)
if [ "$NODE_ENV" = "production" ]; then
  log_message "Starting PostgreSQL database backup..."
  
  # Check if required environment variables are set
  if [ -z "$DATABASE_HOST" ] || [ -z "$DATABASE_PORT" ] || [ -z "$DATABASE_USERNAME" ] || [ -z "$DATABASE_NAME" ]; then
    handle_error "Missing required PostgreSQL environment variables"
  fi
  
  # Create backup
  PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USERNAME" \
    -d "$DATABASE_NAME" \
    -F p \
    | gzip > "$BACKUP_FILE" || handle_error "Failed to create PostgreSQL backup"
  
  log_message "PostgreSQL backup created successfully: $BACKUP_FILE"
else
  log_message "Starting SQLite database backup..."
  
  # Check if SQLite database file exists
  if [ ! -f "$DATABASE_PATH" ]; then
    handle_error "SQLite database file not found: $DATABASE_PATH"
  fi
  
  # Create backup
  sqlite3 "$DATABASE_PATH" .dump | gzip > "$BACKUP_FILE" || handle_error "Failed to create SQLite backup"
  
  log_message "SQLite backup created successfully: $BACKUP_FILE"
fi

# Remove old backups based on retention policy
log_message "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "kanaka_db_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_message "Backup completed. File size: $BACKUP_SIZE"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# if [ "$UPLOAD_TO_CLOUD" = "true" ]; then
#   log_message "Uploading backup to cloud storage..."
#   # AWS S3 example:
#   # aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/database-backups/" || handle_error "Failed to upload to S3"
#   # log_message "Backup uploaded to S3 successfully"
# fi

log_message "Backup process completed successfully"