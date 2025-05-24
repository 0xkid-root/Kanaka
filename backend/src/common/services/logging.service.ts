import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { AppConfigService } from './config.service';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logLevels: LogLevel[];
  private readonly logToConsole: boolean;
  private readonly logToFile: boolean;
  private readonly logFilePath: string;
  private readonly logFileStream: fs.WriteStream;
  private readonly context: string;

  constructor(
    private configService: AppConfigService,
    context?: string,
  ) {
    this.context = context || 'Application';
    this.logLevels = this.parseLogLevels(this.configService.get('LOG_LEVELS', 'log,error,warn'));
    this.logToConsole = this.configService.get('LOG_TO_CONSOLE', true);
    this.logToFile = this.configService.get('LOG_TO_FILE', false);
    
    if (this.logToFile) {
      const logDir = this.configService.get('LOG_DIR', 'logs');
      
      // Create log directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      this.logFilePath = path.join(
        logDir,
        `${this.configService.nodeEnv}-${new Date().toISOString().split('T')[0]}.log`,
      );
      
      this.logFileStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
    }
  }

  private parseLogLevels(logLevelsStr: string): LogLevel[] {
    return logLevelsStr.split(',').map(level => level.trim()) as LogLevel[];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels.includes(level);
  }

  private formatMessage(level: string, message: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context;
    
    // Format objects and arrays
    const formattedMessage = typeof message === 'object'
      ? util.inspect(message, { depth: 5 })
      : message;
    
    return `[${timestamp}] [${level}] [${ctx}] ${formattedMessage}`;
  }

  private writeLog(level: string, message: any, context?: string, trace?: string): void {
    const formattedMessage = this.formatMessage(level, message, context);
    
    // Log to console if enabled
    if (this.logToConsole) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](formattedMessage);
      
      if (trace) {
        console[consoleMethod](trace);
      }
    }
    
    // Log to file if enabled
    if (this.logToFile && this.logFileStream) {
      this.logFileStream.write(`${formattedMessage}\n`);
      
      if (trace) {
        this.logFileStream.write(`${trace}\n`);
      }
    }
  }

  log(message: any, context?: string): void {
    if (this.shouldLog('log')) {
      this.writeLog('INFO', message, context);
    }
  }

  error(message: any, trace?: string, context?: string): void {
    if (this.shouldLog('error')) {
      this.writeLog('ERROR', message, context, trace);
    }
  }

  warn(message: any, context?: string): void {
    if (this.shouldLog('warn')) {
      this.writeLog('WARN', message, context);
    }
  }

  debug(message: any, context?: string): void {
    if (this.shouldLog('debug')) {
      this.writeLog('DEBUG', message, context);
    }
  }

  verbose(message: any, context?: string): void {
    if (this.shouldLog('verbose')) {
      this.writeLog('VERBOSE', message, context);
    }
  }

  /**
   * Create a new logger with a specific context
   * @param context Logger context
   * @returns New logger instance with the specified context
   */
  createLogger(context: string): AppLoggerService {
    return new AppLoggerService(this.configService, context);
  }

  /**
   * Close the logger and any open file streams
   */
  close(): void {
    if (this.logToFile && this.logFileStream) {
      this.logFileStream.end();
    }
  }
}