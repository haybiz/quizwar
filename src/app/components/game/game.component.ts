import { Component, OnInit, DestroyRef, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';

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
    private destroyRef = inject(DestroyRef);

    roomId = signal('');
    selectedAnswer = signal<string | null>(null);
    hasAnswered = signal(false);
    timeRemaining = signal(15);
    showingResults = signal(false);
    private timerInterval: any = null;
    private autoAdvanceTimeout: any = null;

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
            if (player.isCorrect && player.answeredAt) {
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
        return entries.every(player => player.selectedAnswer != null && player.selectedAnswer !== '');
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('roomId') || '';
        this.roomId.set(id);

        if (!this.room()) {
            this.gameService.listenToRoom(id);
        }

        this.startTimer();

        let lastQuestionIndex = -1;

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
            if (room.currentQuestionIndex !== lastQuestionIndex) {
                lastQuestionIndex = room.currentQuestionIndex;
                this.resetForNewQuestion();
            }

            // Sync answer state from Firebase (e.g. on reconnect)
            const myData = this.currentPlayerData();
            if (myData && myData.selectedAnswer && !this.hasAnswered()) {
                this.selectedAnswer.set(myData.selectedAnswer);
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
        if (!q) return '';

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
}
