import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BIRDID_CLIENT_ID = process.env.BIRDID_CLIENT_ID || '';
const BIRDID_CLIENT_SECRET = process.env.BIRDID_CLIENT_SECRET || '';
const BIRDID_VAULT_URL = process.env.BIRDID_VAULT_URL || 'https://v3-homolog.birdid.com.br';

export interface BirdIdAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export class BirdIdService {
    /**
     * Placeholder para autenticação com Bird ID.
     * Requer Client ID e Client Secret da Soluti/VaultID.
     */
    static async authenticate(): Promise<string | null> {
        if (!BIRDID_CLIENT_ID || !BIRDID_CLIENT_SECRET) {
            console.warn('⚠️ Bird ID Credentials missing. Signature will be simulated.');
            return null;
        }

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', BIRDID_CLIENT_ID);
            params.append('client_secret', BIRDID_CLIENT_SECRET);

            const response = await axios.post(`${BIRDID_VAULT_URL}/oauth/token`, params);
            return response.data.access_token;
        } catch (error: any) {
            console.error('❌ Bird ID Auth Error:', error.message);
            return null;
        }
    }

    /**
     * Placeholder para assinatura de Hash.
     * Na integração real, o PDF é "hasheado" e enviado para assinatura via PAdES.
     */
    static async signHash(hash: string, token: string): Promise<string> {
        console.log('📝 Assinando hash com Bird ID (Simulado)...');
        // Simulação de delay de rede
        await new Promise(resolve => setTimeout(resolve, 1500));
        return `signed_${hash}_${Date.now()}`;
    }
}
