import WebSocket from 'ws';
import { env } from '../../../config/env';

export class RTDSWebSocketService {
  private ws: WebSocket | null = null;

  connect(): void {
    this.ws = new WebSocket(env.polymarket.rtdsWsUrl);
    this.ws.on('open', () => console.log('RTDS WS connected'));
    this.ws.on('message', (data) => this.handleMessage(data));
  }

  private handleMessage(data: any): void {
    const message = JSON.parse(data.toString());
    console.log('RTDS Message:', message.topic);
  }

  disconnect(): void {
    this.ws?.close();
  }
}

export const rtdsWsService = new RTDSWebSocketService();
