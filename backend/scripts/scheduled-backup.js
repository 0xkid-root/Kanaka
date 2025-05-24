/**
 * Scheduled database backup script for Kanaka Protocol
 * This script can be run as a cron job to perform regular backups
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const BACKUP_SCRIPT = path.join(__dirname, 'backup-db.sh');
const LOG_FILE = path.join(__dirname, '../logs/backup.log');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Function to log messages
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  // Log to console
  console.log(message);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logEntry);
}

// Function to run the backup script
function runBackup() {
  logMessage('Starting scheduled database backup...');
  
  exec(`bash ${BACKUP_SCRIPT}`, (error, stdout, stderr) => {
    if (error) {
      logMessage(`Backup failed with error: ${error.message}`);
      logMessage(`Error details: ${stderr}`);
      return;
    }
    
    // Log the output from the backup script
    stdout.split('\n').forEach(line => {
      if (line.trim()) {
        logMessage(`Backup script: ${line}`);
      }
    });
    
    logMessage('Scheduled backup completed successfully');
  });
}

// Run the backup
runBackup();