import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private logLevel: LogLevel;
  private logDir: string;

  constructor() {
    this.logLevel = process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO;
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }

  private writeToFile(level: string, message: string) {
    const filename = `${new Date().toISOString().split('T')[0]}.log`;
    const filepath = path.join(this.logDir, filename);
    
    try {
      fs.appendFileSync(filepath, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  error(message: string, meta?: any) {
    if (this.logLevel >= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, meta);
      console.error(formattedMessage);
      this.writeToFile('ERROR', formattedMessage);
    }
  }

  warn(message: string, meta?: any) {
    if (this.logLevel >= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, meta);
      console.warn(formattedMessage);
      this.writeToFile('WARN', formattedMessage);
    }
  }

  info(message: string, meta?: any) {
    if (this.logLevel >= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, meta);
      console.log(formattedMessage);
      this.writeToFile('INFO', formattedMessage);
    }
  }

  debug(message: string, meta?: any) {
    if (this.logLevel >= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, meta);
      console.log(formattedMessage);
      this.writeToFile('DEBUG', formattedMessage);
    }
  }
}

export const logger = new Logger();