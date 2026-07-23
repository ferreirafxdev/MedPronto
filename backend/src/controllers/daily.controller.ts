// Legacy Daily.co controller - replaced by native WebRTC & Socket.io
export const getDailyRoomAndToken = async (_req: any, res: any) => {
  res.status(410).json({ error: 'Daily.co foi descontinuado. Utilize a API nativa de WebRTC.' });
};
