import { Component, OnInit, DestroyRef, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';

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

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('roomId') || '';
        this.roomId.set(id);

        if (!this.room()) {
            this.gameService.listenToRoom(id);
        }

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
