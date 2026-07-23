import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from './config';

export function initializeWebSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Nova conexão WebSocket: ${socket.id}`);

    // Um usuário quer entrar em uma sala de consulta
    socket.on('join-room', ({ roomId, role }) => {
      console.log(`👤 ${role} entrando na sala ${roomId} via Socket ${socket.id}`);
      socket.join(roomId);
      
      // Notifica os outros participantes que alguém entrou
      socket.to(roomId).emit('user-joined', { socketId: socket.id, role });
    });

    // Envio do Sinal P2P (Offer, Answer, Candidate)
    socket.on('signal', ({ roomId, signal, to }) => {
      // Se houver um destinatário específico
      if (to) {
        io.to(to).emit('signal', { sender: socket.id, signal });
      } else {
        // Envia para todos da sala exceto o remetente
        socket.to(roomId).emit('signal', { sender: socket.id, signal });
      }
    });

    // Médico termina a chamada ou recusa paciente
    socket.on('end-call', ({ roomId }) => {
      socket.to(roomId).emit('call-ended');
    });

    socket.on('disconnect', () => {
      console.log(`❌ Conexão WebSocket encerrada: ${socket.id}`);
    });
  });

  return io;
}
