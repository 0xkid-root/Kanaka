#!/bin/bash

# Database restore script for Kanaka Protocol
# This script restores a database from a backup file

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Function to log messages
log_message() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

# Function to handle errors
handle_error() {
  log_message "ERROR: $1"
  exit 1
}

# Check if backup file is provided
if [ -z "$1" ]; then
  handle_error "No backup file specified. Usage: ./restore-db.sh <backup_file>"
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  handle_error "Backup file not found: $BACKUP_FILE"
fi

# Confirm restoration
read -p "WARNING: This will overwrite the current database. Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_message "Restore operation cancelled by user"
  exit 0
fi

# Check if we're in production mode (using PostgreSQL)
if [ "$NODE_ENV" = "production" ]; then
  log_message "Starting PostgreSQL database restore..."
  
  # Check if required environment variables are set
  if [ -z "$DATABASE_HOST" ] || [ -z "$DATABASE_PORT" ] || [ -z "$DATABASE_USERNAME" ] || [ -z "$DATABASE_NAME" ]; then
    handle_error "Missing required PostgreSQL environment variables"
  fi
  
  # Create temporary file for uncompressed backup
  TEMP_FILE=$(mktemp)
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE" || handle_error "Failed to decompress backup file"
  
  # Restore database
  log_message "Dropping existing database..."
  PGPASSWORD="$DATABASE_PASSWORD" psql \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USERNAME" \
    -c "DROP DATABASE IF EXISTS $DATABASE_NAME;" || handle_error "Failed to drop database"
  
  log_message "Creating new database..."
  PGPASSWORD="$DATABASE_PASSWORD" psql \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USERNAME" \
    -c "CREATE DATABASE $DATABASE_NAME;" || handle_error "Failed to create database"
  
  log_message "Restoring data..."
  PGPASSWORD="$DATABASE_PASSWORD" psql \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USERNAME" \
    -d "$DATABASE_NAME" \
    -f "$TEMP_FILE" || handle_error "Failed to restore PostgreSQL database"
  
  # Clean up temporary file
  rm "$TEMP_FILE"
  
  log_message "PostgreSQL database restored successfully from: $BACKUP_FILE"
else
  log_message "Starting SQLite database restore..."
  
  # Check if SQLite database file exists
  if [ -z "$DATABASE_PATH" ]; then
    handle_error "DATABASE_PATH environment variable not set"
  fi
  
  # Backup the current database before restoring
  CURRENT_BACKUP="$DATABASE_PATH.bak.$(date +"%Y%m%d_%H%M%S")"
  log_message "Creating backup of current database: $CURRENT_BACKUP"
  cp "$DATABASE_PATH" "$CURRENT_BACKUP" 2>/dev/null || log_message "No existing database to backup"
  
  # Create temporary file for uncompressed backup
  TEMP_FILE=$(mktemp)
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE" || handle_error "Failed to decompress backup file"
  
  # Restore database
  log_message "Restoring SQLite database..."
  rm -f "$DATABASE_PATH"
  sqlite3 "$DATABASE_PATH" < "$TEMP_FILE" || handle_error "Failed to restore SQLite database"
  
  # Clean up temporary file
  rm "$TEMP_FILE"
  
  log_message "SQLite database restored successfully from: $BACKUP_FILE"
fi

log_message "Restore process completed successfully"