import { Injectable } from '@angular/core';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase.init';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = getFirebaseAuth();
    private _userId: string | null = null;

    get userId(): string | null {
        return this._userId || sessionStorage.getItem('quizwar_playerId');
    }

    async ensureAuth(): Promise<string> {
        const stored = sessionStorage.getItem('quizwar_playerId');
        if (stored && this.auth.currentUser) {
            this._userId = stored;
            return stored;
        }

        return new Promise<string>((resolve, reject) => {
            if (this.auth.currentUser) {
                this._userId = this.auth.currentUser.uid;
                sessionStorage.setItem('quizwar_playerId', this._userId);
                resolve(this._userId);
                return;
            }

            signInAnonymously(this.auth)
                .then((cred) => {
                    this._userId = cred.user.uid;
                    sessionStorage.setItem('quizwar_playerId', this._userId);
                    resolve(this._userId);
                })
                .catch(reject);
        });
    }
}
