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
     * Inicia o fluxo de assinatura digital via Push Notification.
     * @param cpf CPF do médico que possui a conta Bird ID.
     */
    static async startSignatureFlow(cpf: string): Promise<string | null> {
        if (!BIRDID_CLIENT_ID || !BIRDID_CLIENT_SECRET) {
            console.warn('⚠️ Bird ID Credentials missing. Simulation mode.');
            // Retorna um ID de sessão simulado
            return `sim_session_${Date.now()}`;
        }

        try {
            // 1. Obtém token de acesso da Soluti
            const token = await this.authenticate();
            if (!token) return null;

            // 2. Inicia o processo de assinatura/autorização (Vault ID /oauth/start)
            // Identifica o médico pelo CPF e solicita notificação push
            const response = await axios.post(`${BIRDID_VAULT_URL}/oauth/start`, {
                username: cpf,
                client_id: BIRDID_CLIENT_ID,
                scope: 'signature_session',
                lifetime: 600 // 10 minutos
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const sessionId = response.data.session_id;

            // 3. Dispara a notificação Push explicitamente (opcional se não automático)
            await axios.post(`${BIRDID_VAULT_URL}/oauth/notify`, {
                session_id: sessionId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return sessionId;
        } catch (error: any) {
            console.error('❌ Error initiating Bird ID flow:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Verifica o status da assinatura no App do médico.
     * @param sessionId ID da sessão retornado no startSignatureFlow.
     */
    static async checkSignatureStatus(sessionId: string): Promise<'pending' | 'ready' | 'denied'> {
        if (sessionId.startsWith('sim_session_')) {
            // Simulação: pronto após 3 segundos
            const age = Date.now() - parseInt(sessionId.split('_')[2]);
            return age > 5000 ? 'ready' : 'pending';
        }

        try {
            const token = await this.authenticate();
            const response = await axios.get(`${BIRDID_VAULT_URL}/oauth/status/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const status = response.data.status; // 'approved', 'pending', 'rejected'
            if (status === 'approved') return 'ready';
            if (status === 'rejected') return 'denied';
            return 'pending';
        } catch (error: any) {
            return 'pending';
        }
    }
}
