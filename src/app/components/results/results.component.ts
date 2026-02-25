import { Component, OnInit, DestroyRef, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { AudioService } from '../../services/audio.service';

@Component({
    selector: 'app-results',
    standalone: true,
    imports: [],
    templateUrl: './results.component.html',
    styleUrl: './results.component.css'
})
export class ResultsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private gameService = inject(GameService);
    private authService = inject(AuthService);
    private audioService = inject(AudioService);
    private destroyRef = inject(DestroyRef);

    roomId = signal('');
    isResetting = signal(false);

    room = this.gameService.room;
    isHost = this.gameService.isHost;
    players = this.gameService.sortedPlayers;

    currentPlayerId = computed(() => this.authService.userId || '');

    podium = computed(() => {
        const sorted = this.players();
        return {
            first: sorted[0] || null,
            second: sorted[1] || null,
            third: sorted[2] || null
        };
    });

    superlatives = computed(() => {
        const players = this.players();
        if (players.length === 0) return [];

        const result = [];

        // Fastest Finger (lowest average time per correct answer, min 1 correct)
        const eligibleFastest = players.filter(p => (p.correctAnswersCount || 0) > 0);
        if (eligibleFastest.length > 0) {
            const sortedBySpeed = [...eligibleFastest].sort((a, b) => {
                const avgA = (a.totalResponseTime || 999) / (a.correctAnswersCount || 1);
                const avgB = (b.totalResponseTime || 999) / (b.correctAnswersCount || 1);
                return avgA - avgB;
            });
            const best = sortedBySpeed[0];
            const avgTime = ((best.totalResponseTime || 0) / (best.correctAnswersCount || 1)).toFixed(1);
            result.push({ title: '⚡ Fastest Finger', player: best.nickname, detail: `Avg ${avgTime}s` });
        }

        // On Fire! (highest streak >= 3)
        const eligibleStreak = players.filter(p => (p.streak || 0) >= 3);
        if (eligibleStreak.length > 0) {
            const sortedByStreak = [...eligibleStreak].sort((a, b) => (b.streak || 0) - (a.streak || 0));
            const best = sortedByStreak[0];
            result.push({ title: '🔥 On Fire!', player: best.nickname, detail: `Streak of ${best.streak}` });
        }

        // Sharp Shooter (highest accuracy, min 1 correct)
        const room = this.room();
        const totalQ = room?.questions?.length || 10;
        if (eligibleFastest.length > 0) {
            const sortedByAccuracy = [...eligibleFastest].sort((a, b) => (b.correctAnswersCount || 0) - (a.correctAnswersCount || 0));
            const best = sortedByAccuracy[0];
            const acc = Math.round(((best.correctAnswersCount || 0) / totalQ) * 100);
            result.push({ title: '🎯 Sharp Shooter', player: best.nickname, detail: `${acc}% Accuracy` });
        }

        return result;
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('roomId') || '';
        this.roomId.set(id);

        if (!this.room()) {
            this.gameService.listenToRoom(id);
        }

        this.audioService.playFanfare();

        // Watch for status change to lobby (Play Again)
        const checkInterval = setInterval(() => {
            const room = this.room();
            if (room && room.status === 'lobby') {
                clearInterval(checkInterval);
                this.router.navigate(['/lobby', this.roomId()]);
            }
        }, 300);

        this.destroyRef.onDestroy(() => clearInterval(checkInterval));
    }

    async playAgain(): Promise<void> {
        this.isResetting.set(true);
        try {
            await this.gameService.resetRoom(this.roomId());
        } catch (e) {
            this.isResetting.set(false);
        }
    }

    async leaveRoom(): Promise<void> {
        await this.gameService.leaveRoom(this.roomId());
        this.router.navigate(['/']);
    }

    getMedal(index: number): string {
        return ['🥇', '🥈', '🥉'][index] || '';
    }

    getPodiumHeight(place: number): string {
        switch (place) {
            case 1: return '160px';
            case 2: return '120px';
            case 3: return '90px';
            default: return '60px';
        }
    }
}
