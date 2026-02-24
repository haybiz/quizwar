import { Injectable } from '@angular/core';
import { ref, set, get, update } from 'firebase/database';
import { getFirebaseDb } from '../firebase.init';
import { AuthService } from './auth.service';
import { Player } from '../models/room.model';

@Injectable({ providedIn: 'root' })
export class RoomService {
    private db = getFirebaseDb();

    constructor(private authService: AuthService) { }

    generateRoomCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async createRoom(nickname: string): Promise<string> {
        const playerId = await this.authService.ensureAuth();
        let roomId = this.generateRoomCode();

        // Ensure uniqueness
        let existing = await get(ref(this.db, `rooms/${roomId}`));
        while (existing.exists()) {
            roomId = this.generateRoomCode();
            existing = await get(ref(this.db, `rooms/${roomId}`));
        }

        const player: Player = {
            nickname,
            score: 0,
            answeredAt: null,
            selectedAnswer: null,
            isCorrect: null
        };

        await set(ref(this.db, `rooms/${roomId}`), {
            status: 'lobby',
            hostId: playerId,
            currentQuestionIndex: 0,
            questionStartedAt: null,
            questions: [],
            players: {
                [playerId]: player
            }
        });

        sessionStorage.setItem('quizwar_nickname', nickname);
        return roomId;
    }

    async joinRoom(roomId: string, nickname: string): Promise<boolean> {
        const playerId = await this.authService.ensureAuth();
        const roomRef = ref(this.db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);

        if (!snapshot.exists()) {
            return false;
        }

        const roomData = snapshot.val();
        if (roomData.status !== 'lobby') {
            return false;
        }

        const player: Player = {
            nickname,
            score: 0,
            answeredAt: null,
            selectedAnswer: null,
            isCorrect: null
        };

        await update(ref(this.db, `rooms/${roomId}/players`), {
            [playerId]: player
        });

        sessionStorage.setItem('quizwar_nickname', nickname);
        return true;
    }

    async roomExists(roomId: string): Promise<boolean> {
        const snapshot = await get(ref(this.db, `rooms/${roomId}`));
        return snapshot.exists();
    }
}
