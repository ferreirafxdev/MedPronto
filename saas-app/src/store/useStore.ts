import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: 'patient' | 'doctor' | 'admin';
  cpf?: string;
  age?: string;
  email?: string;
  token?: string;
}

interface StoreState {
  user: User | null;
  consultationRoomId: string | null;
  setUser: (user: User | null) => void;
  setConsultationRoomId: (id: string | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  user: null,
  consultationRoomId: null,
  setUser: (user) => set({ user }),
  setConsultationRoomId: (id) => set({ consultationRoomId: id })
}));
