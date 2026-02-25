import { Component, OnInit, DestroyRef, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { AudioService } from '../../services/audio.service';

@Component({
    selector: 'app-game',
    standalone: true,
    imports: [],
    templateUrl: './game.component.html',
    styleUrl: './game.component.css'
})
export class GameComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private gameService = inject(GameService);
    private authService = inject(AuthService);
    private audioService = inject(AudioService);
    private destroyRef = inject(DestroyRef);

    roomId = signal('');
    selectedAnswer = signal<string | null>(null);
    hasAnswered = signal(false);
    timeRemaining = signal(15);
    countdownRemaining = signal(0);
    showingResults = signal(false);
    private activeQuestionIndex = -1;
    private timerInterval: any = null;
    private autoAdvanceTimeout: any = null;

    availableEmotes = ['😂', '😱', '😭', '🚀', '🔥', '👀', '💡', '🎉'];

    room = this.gameService.room;
    currentQuestion = this.gameService.currentQuestion;
    players = this.gameService.sortedPlayers;
    isHost = this.gameService.isHost;
    questionStartedAt = this.gameService.questionStartedAt;

    currentQuestionNum = computed(() => {
        const r = this.room();
        return r ? r.currentQuestionIndex + 1 : 0;
    });

    totalQuestions = computed(() => {
        const r = this.room();
        return r?.questions?.length || 10;
    });

    currentPlayerId = computed(() => this.authService.userId || '');

    currentPlayerData = computed(() => {
        const p = this.gameService.players();
        const id = this.currentPlayerId();
        return p[id] || null;
    });

    fastestCorrectPlayer = computed(() => {
        const p = this.gameService.players();
        let fastest: { id: string; nickname: string; answeredAt: number } | null = null;
        for (const [id, player] of Object.entries(p)) {
            if (player.isCorrect === true && player.answeredAt) {
                if (!fastest || player.answeredAt < fastest.answeredAt) {
                    fastest = { id, nickname: player.nickname, answeredAt: player.answeredAt };
                }
            }
        }
        return fastest;
    });

    allPlayersAnswered = computed(() => {
        const p = this.gameService.players();
        const entries = Object.values(p);
        if (entries.length === 0) return false;
        return entries.every(player =>
            typeof player.selectedAnswer === 'string' &&
            player.selectedAnswer !== 'NONE' &&
            player.selectedAnswer.length > 0
        );
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('roomId') || '';
        this.roomId.set(id);

        if (!this.room()) {
            this.gameService.listenToRoom(id);
        }

        this.startTimer();

        const checkInterval = setInterval(() => {
            const room = this.room();
            if (!room) return;

            // Navigate to results
            if (room.status === 'results') {
                clearInterval(checkInterval);
                this.router.navigate(['/results', this.roomId()]);
                return;
            }

            // Question changed
            if (room.currentQuestionIndex !== this.activeQuestionIndex) {
                this.activeQuestionIndex = room.currentQuestionIndex;
                this.resetForNewQuestion();
            }

            // Handle countdown state
            if (room.status === 'countdown') {
                if (room.countdownEndAt) {
                    const remaining = Math.max(0, Math.ceil((room.countdownEndAt - Date.now()) / 1000));
                    this.countdownRemaining.set(remaining);
                }
                return;
            }

            // Sync answer state from Firebase
            const myData = this.currentPlayerData();
            const ans = myData?.selectedAnswer;
            if (ans && typeof ans === 'string' && ans !== 'NONE' && ans.length > 0 && !this.hasAnswered()) {
                this.selectedAnswer.set(ans);
                this.hasAnswered.set(true);
            }

            // End timer early when all players answered
            if (this.allPlayersAnswered() && !this.showingResults()) {
                this.onTimerEnd();
            }
        }, 200);

        this.destroyRef.onDestroy(() => {
            clearInterval(checkInterval);
            this.clearTimers();
        });
    }

    private resetForNewQuestion(): void {
        this.selectedAnswer.set(null);
        this.hasAnswered.set(false);
        this.showingResults.set(false);
        this.timeRemaining.set(15);
        this.clearTimers();
        this.startTimer();
    }

    private startTimer(): void {
        this.timerInterval = setInterval(() => {
            const startedAt = this.questionStartedAt();
            if (!startedAt) return;

            const elapsed = (Date.now() - startedAt) / 1000;
            const remaining = Math.max(0, Math.ceil(15 - elapsed));

            if (this.timeRemaining() !== remaining) {
                if (remaining <= 3 && remaining > 0 && !this.showingResults()) {
                    this.audioService.playTick();
                }
            }

            this.timeRemaining.set(remaining);

            if (remaining <= 0) {
                this.onTimerEnd();
            }
        }, 100);
    }

    private onTimerEnd(): void {
        if (this.showingResults()) return; // Already ended
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.showingResults.set(true);

        const myData = this.currentPlayerData();
        if (myData?.isCorrect === true) {
            this.audioService.playCorrect();
        } else if (myData?.selectedAnswer && myData.selectedAnswer !== 'NONE') {
            this.audioService.playWrong();
        } else {
            this.audioService.playTimeout();
        }

        // Host auto-advances after 3 seconds
        if (this.isHost()) {
            this.autoAdvanceTimeout = setTimeout(() => {
                this.gameService.advanceQuestion(this.roomId());
            }, 3000);
        }
    }

    private clearTimers(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.autoAdvanceTimeout) {
            clearTimeout(this.autoAdvanceTimeout);
            this.autoAdvanceTimeout = null;
        }
    }

    async selectAnswer(answer: string): Promise<void> {
        if (this.hasAnswered() || this.timeRemaining() <= 0) return;
        this.selectedAnswer.set(answer);
        this.hasAnswered.set(true);
        await this.gameService.submitAnswer(this.roomId(), answer);
    }

    getAnswerLabel(index: number): string {
        return ['A', 'B', 'C', 'D'][index] || '';
    }

    getAnswerClass(answer: string): string {
        const q = this.currentQuestion();
        const room = this.room();
        if (!q || !room) return '';

        // Prevent UI flash when question changes before interval catches it
        if (room.currentQuestionIndex !== this.activeQuestionIndex) {
            return '';
        }

        // Only reveal correct/wrong AFTER showingResults (timer ended or all answered)
        if (this.showingResults()) {
            if (answer === q.correct_answer) return 'correct';
            if (answer === this.selectedAnswer() && answer !== q.correct_answer) return 'wrong';
        }

        // Before results: just show "selected" highlight (no green/red)
        if (answer === this.selectedAnswer()) return 'selected';
        return '';
    }

    getTimerClass(): string {
        const t = this.timeRemaining();
        if (t <= 3) return 'timer-critical';
        if (t <= 7) return 'timer-warning';
        return '';
    }

    getTimerWidth(): number {
        return (this.timeRemaining() / 15) * 100;
    }

    isFastest(playerId: string): boolean {
        const f = this.fastestCorrectPlayer();
        return f ? f.id === playerId : false;
    }

    playersArray = computed(() => {
        const p = this.gameService.players();
        return Object.entries(p).map(([id, player]) => ({ id, ...player }));
    });

    sendEmote(emote: string): void {
        const roomId = this.roomId();
        if (roomId) {
            this.gameService.sendEmote(roomId, emote);
        }
    }

    getEmotePosition(playerId: string): number {
        const players = this.playersArray();
        const index = players.findIndex(p => p.id === playerId);
        const total = Math.max(1, players.length);
        const sectionWidth = 80 / total; // Use middle 80% of screen
        return 10 + (index * sectionWidth) + (sectionWidth / 2);
    }
}
