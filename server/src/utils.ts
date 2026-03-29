import { Readable } from 'stream';

// Utility for converting streams if needed, 
// primarily we use doc.on('data') directly, but here is a placeholder
export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const buffers: any[] = [];
        stream.on('error', reject);
        stream.on('data', (data) => buffers.push(data));
        stream.on('end', () => resolve(Buffer.concat(buffers)));
    });
};
