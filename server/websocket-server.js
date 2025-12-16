import WebSocket from 'ws';
import jwt from 'jsonwebtoken';

class WebSocketServer {
  constructor(options = {}) {
    this.wss = new WebSocket.Server({ 
      ...options,
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map(); // Map to store connected clients
    this.rooms = new Map(); // Map to store room memberships
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.wss.on('connection', (ws, request) => {
      console.log('🔌 New WebSocket connection established');
      
      // Store client connection
      const clientId = this.generateClientId();
      ws.clientId = clientId;
      this.clients.set(clientId, {
        ws,
        user: null,
        rooms: new Set(),
        lastPing: Date.now()
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        message: 'Connected to real-time service'
      }));
      
      // Handle incoming messages
      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });
      
      // Handle connection close
      ws.on('close', () => {
        this.handleDisconnection(ws);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });
      
      // Start heartbeat for this client
      this.startHeartbeat(ws);
    });
  }
  
  verifyClient(info) {
    // Allow all connections initially, authentication will be handled via messages
    return true;
  }
  
  async handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(ws.clientId);
      
      if (!client) {
        console.error('Client not found:', ws.clientId);
        return;
      }
      
      switch (message.type) {
        case 'auth':
          await this.handleAuthentication(ws, message.token);
          break;
          
        case 'join_room':
          this.handleJoinRoom(ws, message.room);
          break;
          
        case 'leave_room':
          this.handleLeaveRoom(ws, message.room);
          break;
          
        case 'ping':
          client.lastPing = Date.now();
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }
  
  async handleAuthentication(ws, token) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Get user details from database
      const { Pool } = require('pg');
      const pool = new Pool({
        host: '127.0.0.1',
        port: 5437,
        database: 'bio_appointment',
        user: 'app_user',
        password: 'secure_password_123',
      });
      
      const result = await pool.query(
        'SELECT id, full_name, role, store_id FROM profiles WHERE id = $1',
        [decoded.userId]
      );
      
      if (result.rows.length === 0) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'User not found'
        }));
        ws.close();
        return;
      }
      
      const user = result.rows[0];
      const client = this.clients.get(ws.clientId);
      
      if (client) {
        client.user = user;
        
        // Auto-join rooms based on user profile
        this.joinRooms(ws, user);
        
        ws.send(JSON.stringify({
          type: 'auth_success',
          user: {
            id: user.id,
            name: user.full_name,
            role: user.role,
            store_id: user.store_id
          }
        }));
        
        console.log(`🔐 User authenticated: ${user.full_name} (${user.role})`);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication failed'
      }));
      ws.close();
    }
  }
  
  joinRooms(ws, user) {
    // Join user-specific room
    this.handleJoinRoom(ws, `user:${user.id}`);
    
    // Join role-specific room
    this.handleJoinRoom(ws, `role:${user.role}`);
    
    // Join store-specific room if user has a store
    if (user.store_id) {
      this.handleJoinRoom(ws, `store:${user.store_id}`);
    }
  }
  
  handleJoinRoom(ws, roomName) {
    const client = this.clients.get(ws.clientId);
    if (!client) return;
    
    // Add to client's room list
    client.rooms.add(roomName);
    
    // Add client to room
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(ws.clientId);
    
    ws.send(JSON.stringify({
      type: 'room_joined',
      room: roomName
    }));
    
    console.log(`📢 Client ${ws.clientId} joined room: ${roomName}`);
  }
  
  handleLeaveRoom(ws, roomName) {
    const client = this.clients.get(ws.clientId);
    if (!client) return;
    
    // Remove from client's room list
    client.rooms.delete(roomName);
    
    // Remove client from room
    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(ws.clientId);
      
      // Clean up empty rooms
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }
    
    ws.send(JSON.stringify({
      type: 'room_left',
      room: roomName
    }));
    
    console.log(`📢 Client ${ws.clientId} left room: ${roomName}`);
  }
  
  handleDisconnection(ws) {
    const client = this.clients.get(ws.clientId);
    if (!client) return;
    
    // Remove client from all rooms
    for (const roomName of client.rooms) {
      if (this.rooms.has(roomName)) {
        this.rooms.get(roomName).delete(ws.clientId);
        
        // Clean up empty rooms
        if (this.rooms.get(roomName).size === 0) {
          this.rooms.delete(roomName);
        }
      }
    }
    
    // Remove client
    this.clients.delete(ws.clientId);
    
    console.log(`🔌 Client ${ws.clientId} disconnected`);
  }
  
  startHeartbeat(ws) {
    const interval = setInterval(() => {
      const client = this.clients.get(ws.clientId);
      if (!client) {
        clearInterval(interval);
        return;
      }
      
      // Check if client is still alive (ping within last 30 seconds)
      if (Date.now() - client.lastPing > 30000) {
        console.log(`💔 Client ${ws.clientId} heartbeat failed, closing connection`);
        ws.close();
        clearInterval(interval);
        return;
      }
      
      // Send ping
      ws.send(JSON.stringify({ type: 'ping' }));
    }, 15000); // Send ping every 15 seconds
  }
  
  broadcast(message, roomName = null) {
    const messageStr = JSON.stringify(message);
    let targetClients = new Set();
    
    if (roomName) {
      // Broadcast to specific room
      if (this.rooms.has(roomName)) {
        const clientIds = this.rooms.get(roomName);
        for (const clientId of clientIds) {
          targetClients.add(clientId);
        }
      }
    } else {
      // Broadcast to all clients
      for (const clientId of this.clients.keys()) {
        targetClients.add(clientId);
      }
    }
    
    // Send message to all target clients
    let sentCount = 0;
    for (const clientId of targetClients) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to client ${clientId}:`, error);
        }
      }
    }
    
    console.log(`📢 Broadcast message to ${sentCount} clients` + (roomName ? ` in room: ${roomName}` : ''));
    return sentCount;
  }
  
  sendToUser(userId, message) {
    return this.broadcast(message, `user:${userId}`);
  }
  
  sendToRole(role, message) {
    return this.broadcast(message, `role:${role}`);
  }
  
  sendToStore(storeId, message) {
    return this.broadcast(message, `store:${storeId}`);
  }
  
  generateClientId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
  
  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      roomDetails: Array.from(this.rooms.entries()).map(([room, clients]) => ({
        name: room,
        clientCount: clients.size
      }))
    };
  }
}

export { WebSocketServer };