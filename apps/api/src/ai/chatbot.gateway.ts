import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { AIService } from './ai.service';

interface ChatMessage {
  message: string;
  context?: {
    userId?: string;
    bureau?: any;
    strategies?: any[];
    conversationHistory?: Array<{ role: string; content: string }>;
  };
}

interface TypingEvent {
  userId?: string;
}

/**
 * ChatbotGateway — Socket.io WebSocket gateway for real-time AI chat.
 *
 * Events emitted by client:
 *   - `chat`       : Send a message to the AI assistant
 *   - `typing`     : User is typing indicator
 *   - `join-room`  : Join a user-specific room for targeted messages
 *
 * Events emitted by server:
 *   - `reply`      : AI response to a chat message
 *   - `bot-typing` : Bot is processing indicator
 *   - `error`      : Error message
 *   - `connected`  : Connection confirmation
 *
 * PRODUCTION ENHANCEMENTS:
 * - Add JWT validation via socket middleware
 * - Persist conversation history to ChatHistory model (Prisma)
 * - Rate limiting per socket connection
 * - Queue long-running AI requests
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatbotGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatbotGateway.name);

  // Active connections: socketId → userId
  private readonly connections = new Map<string, string>();

  // Conversation history per socket (in-memory; use Redis in production)
  private readonly conversationHistory = new Map<
    string,
    Array<{ role: string; content: string; timestamp: string }>
  >();

  constructor(private readonly aiService: AIService) {}

  afterInit(server: Server) {
    this.logger.log('ChatbotGateway initialized on namespace /chat');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} (${client.handshake.address})`);

    // Initialize conversation history for this socket
    this.conversationHistory.set(client.id, []);

    // Send welcome message
    client.emit('connected', {
      socketId: client.id,
      message: 'Connected to Finfinity AI Assistant',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up
    this.connections.delete(client.id);
    this.conversationHistory.delete(client.id);
  }

  /**
   * Handle `join-room` event — associates a socket with a userId.
   * Allows sending targeted messages to a specific user.
   */
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ): void {
    if (data?.userId) {
      const roomName = `user:${data.userId}`;
      client.join(roomName);
      this.connections.set(client.id, data.userId);
      this.logger.log(`Socket ${client.id} joined room ${roomName}`);

      client.emit('joined', { room: roomName, userId: data.userId });
    }
  }

  /**
   * Handle `chat` event — main AI chat handler.
   *
   * Flow:
   * 1. Receive message from client
   * 2. Emit `bot-typing` to show loading state
   * 3. Build context with conversation history
   * 4. Get AI response
   * 5. Store in history
   * 6. Emit `reply` with response
   */
  @SubscribeMessage('chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatMessage,
  ): Promise<void> {
    if (!data?.message?.trim()) {
      client.emit('error', { message: 'Empty message received' });
      return;
    }

    const socketId = client.id;
    const userMessage = data.message.trim();
    const timestamp = new Date().toISOString();

    this.logger.log(`Chat from ${socketId}: "${userMessage.slice(0, 50)}..."`);

    // Store user message in history
    const history = this.conversationHistory.get(socketId) || [];
    history.push({ role: 'user', content: userMessage, timestamp });
    this.conversationHistory.set(socketId, history);

    // Signal bot is processing
    client.emit('bot-typing', { typing: true });

    try {
      // Build context including conversation history
      const context = {
        ...data.context,
        conversationHistory: history.slice(-10).map(h => ({
          role: h.role,
          content: h.content,
        })),
      };

      // Get AI response
      const response = await this.aiService.chat(userMessage, context);

      // Simulate slight delay for natural feel (remove in production)
      // In production, the LLM call itself provides natural latency
      await new Promise(resolve => setTimeout(resolve, 300));

      // Store bot response in history
      history.push({ role: 'assistant', content: response.reply, timestamp: new Date().toISOString() });
      this.conversationHistory.set(socketId, history);

      // Emit reply to client
      client.emit('bot-typing', { typing: false });
      client.emit('reply', {
        message: response.reply,
        suggestions: response.suggestions || [],
        timestamp: new Date().toISOString(),
        messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      });

      // PRODUCTION: Persist to database
      // const userId = this.connections.get(socketId);
      // if (userId) {
      //   await this.prisma.chatHistory.upsert({
      //     where: { userId },
      //     update: { messages: history, updatedAt: new Date() },
      //     create: { userId, messages: history },
      //   });
      // }

    } catch (error) {
      this.logger.error(`Error processing chat for ${socketId}:`, error);
      client.emit('bot-typing', { typing: false });
      client.emit('error', {
        message: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle `typing` event — user is typing indicator.
   * Broadcasts to relevant rooms if needed (e.g., agent-assisted chat).
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingEvent,
  ): void {
    // In agent-assisted mode, broadcast typing to agent room
    // For now, just acknowledge
    const userId = data?.userId || this.connections.get(client.id);
    if (userId) {
      this.logger.debug(`User ${userId} is typing`);
    }
  }

  /**
   * Broadcast a proactive insight to a specific user.
   * Called by other services (e.g., scheduled job detects rate drop).
   */
  broadcastInsightToUser(userId: string, insight: any): void {
    const room = `user:${userId}`;
    this.server.to(room).emit('proactive-insight', {
      insight,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcast insight to room ${room}`);
  }

  /**
   * Get active connection count (useful for monitoring).
   */
  getActiveConnections(): number {
    return this.connections.size;
  }
}
