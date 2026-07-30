import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from './config';

// Exportamos o io para ser usado em outros módulos (ex: doctor.controller)
export let io: Server;

export function initializeWebSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Nova conexão WebSocket: ${socket.id}`);

    // Usuário entra em uma sala de consulta (identificada pelo patientId)
    socket.on('join-room', ({ roomId, role }: { roomId: string; role: string }) => {
      console.log(`👤 ${role} entrando na sala ${roomId} via Socket ${socket.id}`);
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', { socketId: socket.id, role });
    });

    // Sinalização WebRTC P2P (fallback)
    socket.on('signal', ({ roomId, signal, to }: { roomId: string; signal: any; to?: string }) => {
      if (to) {
        io.to(to).emit('signal', { sender: socket.id, signal });
      } else {
        socket.to(roomId).emit('signal', { sender: socket.id, signal });
      }
    });

    // Médico encerra a chamada via socket
    socket.on('end-call', ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit('call-ended');
    });

    socket.on('disconnect', () => {
      console.log(`❌ Conexão WebSocket encerrada: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emite o evento de consulta finalizada para o paciente em tempo real.
 * Chamado pelo doctor.controller após salvar todos os documentos.
 */
export function emitConsultationEnded(patientId: string, payload: {
  atestado?: { code: string; content: string; daysOff: number; cid?: string };
  consultation?: { code: string; notes: string; prescriptions: string; exams: string };
  doctorName?: string;
}) {
  if (!io) {
    console.warn('[WebSocket] io não inicializado ao tentar emitir consultation-ended');
    return;
  }
  console.log(`📡 Emitindo consultation-ended para sala ${patientId}`);
  io.to(patientId).emit('consultation-ended', {
    patientId,
    ...payload,
    timestamp: new Date().toISOString()
  });
}
