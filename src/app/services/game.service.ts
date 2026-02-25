import { Injectable, signal, computed } from '@angular/core';
import {
    ref, set, update, onValue, off, get, remove,
    serverTimestamp, DatabaseReference, Unsubscribe
} from 'firebase/database';
import { getFirebaseDb } from '../firebase.init';
import { AuthService } from './auth.service';
import { TriviaService } from './trivia.service';
import { Room, Player, RoomQuestion } from '../models/room.model';
import { Question } from '../models/question.model';

@Injectable({ providedIn: 'root' })
export class GameService {
    private db = getFirebaseDb();
    private listeners: Unsubscribe[] = [];

    // Signals for reactive state
    readonly room = signal<Room | null>(null);
    readonly players = signal<{ [id: string]: Player }>({});
    readonly currentQuestion = signal<RoomQuestion | null>(null);
    readonly questionStartedAt = signal<number | null>(null);

    // Computed
    readonly isHost = computed(() => {
        const r = this.room();
        return r ? r.hostId === this.authService.userId : false;
    });

    readonly playerCount = computed(() => {
        return Object.keys(this.players()).length;
    });

    readonly sortedPlayers = computed(() => {
        const p = this.players();
        return Object.entries(p)
            .map(([id, player]) => ({ id, ...player }))
            .sort((a, b) => b.score - a.score);
    });

    constructor(
        private authService: AuthService,
        private triviaService: TriviaService
    ) { }

    listenToRoom(roomId: string): void {
        this.cleanup();

        // Room state listener
        const roomRef = ref(this.db, `rooms/${roomId}`);
        const unsub1 = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val() as Room;
                this.room.set(data);
                this.players.set(data.players || {});

                if (data.questions && data.currentQuestionIndex !== undefined) {
                    const q = data.questions[data.currentQuestionIndex];
                    this.currentQuestion.set(q || null);
                }

                this.questionStartedAt.set(data.questionStartedAt || null);
            } else {
                this.room.set(null);
            }
        });

        this.listeners.push(unsub1);
    }

    async startGame(roomId: string, categoryIds: number[], questionCount: number, difficulty: string): Promise<void> {
        const questions = await this.triviaService.fetchQuestions(categoryIds, questionCount, difficulty);

        if (questions.length === 0) {
            throw new Error('No questions available for selected categories');
        }

        const roomQuestions: RoomQuestion[] = questions.map(q => ({
            category: q.category,
            difficulty: q.difficulty || 'unknown',
            question: q.question,
            correct_answer: q.correct_answer,
            answers: q.answers
        }));

        // Reset all player scores and answers
        const players = this.players();
        const playerUpdates: { [key: string]: any } = {};
        for (const pid of Object.keys(players)) {
            playerUpdates[`rooms/${roomId}/players/${pid}/score`] = 0;
            playerUpdates[`rooms/${roomId}/players/${pid}/answeredAt`] = 0;
            playerUpdates[`rooms/${roomId}/players/${pid}/selectedAnswer`] = 'NONE';
            playerUpdates[`rooms/${roomId}/players/${pid}/isCorrect`] = 'NONE';
            playerUpdates[`rooms/${roomId}/players/${pid}/streak`] = 0;
            playerUpdates[`rooms/${roomId}/players/${pid}/correctAnswersCount`] = 0;
            playerUpdates[`rooms/${roomId}/players/${pid}/totalResponseTime`] = 0;
            playerUpdates[`rooms/${roomId}/players/${pid}/activeEmote`] = null;
        }

        await update(ref(this.db), {
            [`rooms/${roomId}/status`]: 'countdown',
            [`rooms/${roomId}/countdownEndAt`]: Date.now() + 3500,
            [`rooms/${roomId}/questions`]: roomQuestions,
            [`rooms/${roomId}/currentQuestionIndex`]: 0,
            [`rooms/${roomId}/questionStartedAt`]: null,
            ...playerUpdates
        });

        setTimeout(async () => {
            import('firebase/database').then(({ get }) => {
                get(ref(this.db, `rooms/${roomId}`)).then(snapshot => {
                    const data = snapshot.val();
                    if (data && data.status === 'countdown') {
                        update(ref(this.db, `rooms/${roomId}`), {
                            status: 'playing',
                            questionStartedAt: Date.now()
                        });
                    }
                });
            });
        }, 3500);
    }

    async submitAnswer(roomId: string, answer: string): Promise<void> {
        const playerId = this.authService.userId;
        if (!playerId) return;

        const room = this.room();
        if (!room || !room.questions) return;

        const currentQ = room.questions[room.currentQuestionIndex];
        if (!currentQ) return;

        const isCorrect = answer === currentQ.correct_answer;
        const now = Date.now();
        const startedAt = room.questionStartedAt || now;
        const timeTaken = (now - startedAt) / 1000; // seconds
        const timeBonus = Math.max(0, Math.floor((15 - timeTaken) * 0.67)); // bonus for speed

        // Get current stats
        const currentPlayer = this.players()[playerId];
        const currentScore = currentPlayer?.score || 0;
        let streak = currentPlayer?.streak || 0;
        let correctAnswersCount = currentPlayer?.correctAnswersCount || 0;
        let totalResponseTime = currentPlayer?.totalResponseTime || 0;

        let scoreAdd = 0;
        if (isCorrect) {
            streak++;
            correctAnswersCount++;
            totalResponseTime += timeTaken;
            const multiplier = streak >= 3 ? 1.5 : 1.0;
            scoreAdd = Math.floor((10 + timeBonus) * multiplier);
        } else {
            streak = 0;
            totalResponseTime += timeTaken;
        }

        await update(ref(this.db, `rooms/${roomId}/players/${playerId}`), {
            selectedAnswer: answer,
            answeredAt: now,
            isCorrect: isCorrect,
            score: currentScore + scoreAdd,
            streak,
            correctAnswersCount,
            totalResponseTime
        });
    }

    async sendEmote(roomId: string, emote: string): Promise<void> {
        const playerId = this.authService.userId;
        if (!playerId) return;

        await update(ref(this.db, `rooms/${roomId}/players/${playerId}`), {
            activeEmote: emote
        });

        // Auto clear after 3 seconds
        setTimeout(() => {
            update(ref(this.db, `rooms/${roomId}/players/${playerId}`), {
                activeEmote: null
            });
        }, 3000);
    }

    async advanceQuestion(roomId: string): Promise<void> {
        const room = this.room();
        if (!room) return;

        const nextIndex = room.currentQuestionIndex + 1;

        if (nextIndex >= (room.questions?.length || 0)) {
            // Game over
            await update(ref(this.db, `rooms/${roomId}`), {
                status: 'results'
            });
            return;
        }

        // Reset player answers for next question
        const players = this.players();
        const playerUpdates: { [key: string]: any } = {};
        for (const pid of Object.keys(players)) {
            playerUpdates[`rooms/${roomId}/players/${pid}/answeredAt`] = 0;
            playerUpdates[`rooms/${roomId}/players/${pid}/selectedAnswer`] = 'NONE';
            playerUpdates[`rooms/${roomId}/players/${pid}/isCorrect`] = 'NONE';
        }

        await update(ref(this.db), {
            [`rooms/${roomId}/currentQuestionIndex`]: nextIndex,
            [`rooms/${roomId}/questionStartedAt`]: Date.now(),
            ...playerUpdates
        });
    }

    async resetRoom(roomId: string): Promise<void> {
        const players = this.players();
        const playerUpdates: { [key: string]: any } = {};
        for (const pid of Object.keys(players)) {
            playerUpdates[`rooms/${roomId}/players/${pid}/score`] = 0;
            playerUpdates[`rooms/${roomId}/players/${pid}/answeredAt`] = 0;
            playerUpdates[`rooms/${roomId}/players/${pid}/selectedAnswer`] = 'NONE';
            playerUpdates[`rooms/${roomId}/players/${pid}/isCorrect`] = 'NONE';
        }

        await update(ref(this.db), {
            [`rooms/${roomId}/status`]: 'lobby',
            [`rooms/${roomId}/currentQuestionIndex`]: 0,
            [`rooms/${roomId}/questionStartedAt`]: null,
            [`rooms/${roomId}/questions`]: [],
            ...playerUpdates
        });
    }

    async leaveRoom(roomId: string): Promise<void> {
        const playerId = this.authService.userId;
        if (!playerId) return;

        const room = this.room();
        if (!room) return;

        // Remove player
        await remove(ref(this.db, `rooms/${roomId}/players/${playerId}`));

        // If host left, assign new host or delete room
        if (room.hostId === playerId) {
            const remainingPlayers = { ...this.players() };
            delete remainingPlayers[playerId];
            const remaining = Object.keys(remainingPlayers);

            if (remaining.length > 0) {
                await update(ref(this.db, `rooms/${roomId}`), {
                    hostId: remaining[0]
                });
            } else {
                await remove(ref(this.db, `rooms/${roomId}`));
            }
        }

        this.cleanup();
    }

    cleanup(): void {
        this.listeners.forEach(unsub => unsub());
        this.listeners = [];
        this.room.set(null);
        this.players.set({});
        this.currentQuestion.set(null);
        this.questionStartedAt.set(null);
    }
}
