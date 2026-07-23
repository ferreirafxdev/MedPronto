// Legacy Daily.co service - replaced by native WebRTC & Socket.io
export const createDailyRoom = async (_consultationId: string) => {
  throw new Error('Daily.co foi descontinuado em favor do WebRTC P2P Nativo.');
};

export const createDailyToken = async (_roomName: string, _isDoctor: boolean, _userName: string) => {
  throw new Error('Daily.co foi descontinuado em favor do WebRTC P2P Nativo.');
};
