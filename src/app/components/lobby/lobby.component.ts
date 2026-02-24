import { Component, OnInit, DestroyRef, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-lobby',
    standalone: true,
    imports: [],
    templateUrl: './lobby.component.html',
    styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private gameService = inject(GameService);
    private authService = inject(AuthService);
    private destroyRef = inject(DestroyRef);

    roomId = signal('');
    isStarting = signal(false);
    copied = signal(false);
    errorMsg = signal('');

    isHost = this.gameService.isHost;
    players = this.gameService.sortedPlayers;
    playerCount = this.gameService.playerCount;
    room = this.gameService.room;

    canStart = computed(() => this.playerCount() >= 2 && this.isHost());

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('roomId') || '';
        this.roomId.set(id);
        this.gameService.listenToRoom(id);

        this.destroyRef.onDestroy(() => {
            // Don't clean up if navigating to game
            const room = this.room();
            if (!room || room.status === 'lobby') {
                this.gameService.cleanup();
            }
        });

        // Watch for status change to 'playing'
        const checkInterval = setInterval(() => {
            const room = this.room();
            if (room && room.status === 'playing') {
                clearInterval(checkInterval);
                this.router.navigate(['/game', this.roomId()]);
            }
        }, 300);

        this.destroyRef.onDestroy(() => clearInterval(checkInterval));
    }

    async startGame(): Promise<void> {
        if (!this.canStart()) return;
        this.isStarting.set(true);
        this.errorMsg.set('');
        try {
            await this.gameService.startGame(this.roomId());
        } catch (e) {
            this.errorMsg.set('Failed to start game. Please try again.');
            this.isStarting.set(false);
        }
    }

    copyCode(): void {
        navigator.clipboard.writeText(this.roomId());
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
    }

    getPlayerId(): string {
        return this.authService.userId || '';
    }
}
