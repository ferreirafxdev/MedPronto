import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      user: null,
      consultationRoomId: null,
      setUser: (user) => set({ user }),
      setConsultationRoomId: (id) => set({ consultationRoomId: id })
    }),
    {
      name: 'medpronto-store',
    }
  )
);
