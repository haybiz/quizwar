import { Component, OnInit, DestroyRef, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { TriviaService } from '../../services/trivia.service';
import { TriviaCategory } from '../../models/question.model';

@Component({
    selector: 'app-lobby',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './lobby.component.html',
    styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private gameService = inject(GameService);
    private authService = inject(AuthService);
    private triviaService = inject(TriviaService);
    private destroyRef = inject(DestroyRef);

    roomId = signal('');
    isStarting = signal(false);
    copied = signal(false);
    errorMsg = signal('');

    // Category / question settings (host only)
    categories = signal<TriviaCategory[]>([]);
    selectedCategoryIds = signal<number[]>([]);
    questionCount = signal(10);

    isHost = this.gameService.isHost;
    players = this.gameService.sortedPlayers;
    playerCount = this.gameService.playerCount;
    room = this.gameService.room;

    canStart = computed(() => this.playerCount() >= 2 && this.isHost());

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('roomId') || '';
        this.roomId.set(id);
        this.gameService.listenToRoom(id);

        // Load categories
        this.triviaService.fetchCategories().then(cats => {
            this.categories.set(cats);
        });

        this.destroyRef.onDestroy(() => {
            const room = this.room();
            if (!room || room.status === 'lobby') {
                this.gameService.cleanup();
            }
        });

        // Watch for status change
        const checkInterval = setInterval(() => {
            const room = this.room();
            if (room && (room.status === 'countdown' || room.status === 'playing')) {
                clearInterval(checkInterval);
                this.router.navigate(['/game', this.roomId()]);
            }
        }, 300);

        this.destroyRef.onDestroy(() => clearInterval(checkInterval));
    }

    toggleCategory(catId: number): void {
        const current = [...this.selectedCategoryIds()];
        const idx = current.indexOf(catId);
        if (idx >= 0) {
            current.splice(idx, 1);
        } else if (current.length < 4) {
            current.push(catId);
        }
        this.selectedCategoryIds.set(current);
    }

    isCategorySelected(catId: number): boolean {
        return this.selectedCategoryIds().includes(catId);
    }

    setQuestionCount(count: number): void {
        this.questionCount.set(Math.max(10, Math.min(50, count)));
    }

    getShortCategoryName(name: string): string {
        return name.replace('Entertainment: ', '').replace('Science: ', '');
    }

    async startGame(): Promise<void> {
        if (!this.canStart()) return;
        this.isStarting.set(true);
        this.errorMsg.set('');
        try {
            await this.gameService.startGame(
                this.roomId(),
                this.selectedCategoryIds(),
                this.questionCount()
            );
        } catch (e: any) {
            this.errorMsg.set(e?.message || 'Failed to start game. Please try again.');
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
