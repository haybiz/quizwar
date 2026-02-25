import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../services/room.service';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    nickname = signal('');
    roomCode = signal('');
    errorMsg = signal('');
    isLoading = signal(false);

    availableAvatars = ['😎', '🤖', '🧙‍♂️', '🥷', '👽', '👻', '🦄', '🦖', '🤠', '🦊', '🐯', '🦁'];
    selectedAvatar = signal(this.availableAvatars[0]);

    constructor(
        private roomService: RoomService,
        private router: Router
    ) {
        const saved = sessionStorage.getItem('quizwar_nickname');
        if (saved) this.nickname.set(saved);

        const savedAvatar = sessionStorage.getItem('quizwar_avatar');
        if (savedAvatar && this.availableAvatars.includes(savedAvatar)) {
            this.selectedAvatar.set(savedAvatar);
        }
    }

    selectAvatar(emoji: string): void {
        this.selectedAvatar.set(emoji);
    }

    get isNicknameValid(): boolean {
        const n = this.nickname().trim();
        return n.length >= 2 && n.length <= 15;
    }

    async createRoom(): Promise<void> {
        if (!this.isNicknameValid) {
            this.errorMsg.set('Nickname must be 2-15 characters');
            return;
        }
        this.isLoading.set(true);
        this.errorMsg.set('');
        try {
            const roomId = await this.roomService.createRoom(this.nickname().trim(), this.selectedAvatar());
            this.router.navigate(['/lobby', roomId]);
        } catch (e) {
            this.errorMsg.set('Failed to create room. Check your Firebase config.');
            this.isLoading.set(false);
        }
    }

    async joinRoom(): Promise<void> {
        if (!this.isNicknameValid) {
            this.errorMsg.set('Nickname must be 2-15 characters');
            return;
        }
        const code = this.roomCode().trim().toUpperCase();
        if (code.length !== 4) {
            this.errorMsg.set('Room code must be 4 letters');
            return;
        }
        this.isLoading.set(true);
        this.errorMsg.set('');
        try {
            const joined = await this.roomService.joinRoom(code, this.nickname().trim(), this.selectedAvatar());
            if (joined) {
                this.router.navigate(['/lobby', code]);
            } else {
                this.errorMsg.set('Room not found or game already started');
                this.isLoading.set(false);
            }
        } catch (e) {
            this.errorMsg.set('Failed to join room. Check your connection.');
            this.isLoading.set(false);
        }
    }
}
