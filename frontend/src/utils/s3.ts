import apiClient from '../api/client';

/**
 * Fetches a signed URL for a specific document key from the backend.
 * @param key The S3 key (path) of the document.
 * @returns A promise that resolves to the signed URL string.
 */
export const getSignedUrl = async (key: string | undefined | null): Promise<string> => {
  if (!key) return '';
  
  // If the key is already a full URL (legacy or external), just return it
  if (key.startsWith('http')) return key;

  try {
    const resp = await apiClient.post('/api/documents/signed-url', { key });
    if (resp.data.success) {
      return resp.data.url;
    }
    throw new Error('Falha ao obter URL assinada.');
  } catch (error) {
    console.error('Erro ao buscar URL assinada:', error);
    throw error;
  }
};

/**
 * Opens a document from S3 in a new tab using a signed URL.
 * @param key The S3 key of the document.
 */
export const openDocument = async (key: string | undefined | null) => {
  if (!key) return;
  try {
    const url = await getSignedUrl(key);
    if (url) window.open(url, '_blank');
  } catch (error) {
    alert('Não foi possível abrir o documento. Verifique sua conexão ou permissões.');
  }
};
