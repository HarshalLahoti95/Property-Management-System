import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggingService implements LoggerService {
  private appendLog(level: string, message: any, ...optionalParams: any[]) {
    const logPath = path.join(process.cwd(), 'app.log');
    const line = `[${level}] [${new Date().toISOString()}] ${message} ${optionalParams.join(' ')}\n`;
    fs.appendFileSync(logPath, line);
    console.log(line.trim());
  }

  log(message: any, ...optionalParams: any[]) {
    this.appendLog('INFO', message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.appendLog('ERROR', message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.appendLog('WARN', message, ...optionalParams);
  }

  debug?(message: any, ...optionalParams: any[]) {
    this.appendLog('DEBUG', message, ...optionalParams);
  }

  verbose?(message: any, ...optionalParams: any[]) {
    this.appendLog('VERBOSE', message, ...optionalParams);
  }
}
