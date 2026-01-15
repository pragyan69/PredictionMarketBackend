import WebSocket from 'ws';
import { env } from '../../../config/env';

export class CLOBWebSocketService {
  private ws: WebSocket | null = null;

  connect(): void {
    this.ws = new WebSocket(env.polymarket.clobWsUrl);
    this.ws.on('open', () => console.log('CLOB WS connected'));
    this.ws.on('message', (data) => this.handleMessage(data));
  }

  private handleMessage(data: any): void {
    const message = JSON.parse(data.toString());
    console.log('CLOB Message:', message.event_type);
  }

  disconnect(): void {
    this.ws?.close();
  }
}

export const clobWsService = new CLOBWebSocketService();
