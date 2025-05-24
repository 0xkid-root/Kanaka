#!/bin/bash

# Setup cron job for scheduled database backups
# This script adds a cron job to run the backup script daily

# Function to log messages
log_message() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

# Get the absolute path to the scripts directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/scheduled-backup.js"
NODE_PATH=$(which node)

# Check if node is available
if [ -z "$NODE_PATH" ]; then
  log_message "ERROR: Node.js not found. Please install Node.js."
  exit 1
fi

# Check if the backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  log_message "ERROR: Backup script not found: $BACKUP_SCRIPT"
  exit 1
fi

# Create a temporary file for the new crontab
TEMP_CRONTAB=$(mktemp)

# Export current crontab
crontab -l > "$TEMP_CRONTAB" 2>/dev/null || echo "# Kanaka Protocol Database Backup Cron Jobs" > "$TEMP_CRONTAB"

# Check if the backup job already exists
if grep -q "$BACKUP_SCRIPT" "$TEMP_CRONTAB"; then
  log_message "Backup cron job already exists. Skipping."
else
  # Add the backup job to run daily at 2 AM
  echo "0 2 * * * $NODE_PATH $BACKUP_SCRIPT >> $SCRIPT_DIR/../logs/cron.log 2>&1" >> "$TEMP_CRONTAB"
  log_message "Added daily backup job to crontab"
fi

# Install the new crontab
crontab "$TEMP_CRONTAB"
rm "$TEMP_CRONTAB"

log_message "Cron job setup completed successfully"
log_message "Backup will run daily at 2:00 AM"