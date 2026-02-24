import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LobbyComponent } from './components/lobby/lobby.component';
import { GameComponent } from './components/game/game.component';
import { ResultsComponent } from './components/results/results.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'lobby/:roomId', component: LobbyComponent },
    { path: 'game/:roomId', component: GameComponent },
    { path: 'results/:roomId', component: ResultsComponent },
    { path: '**', redirectTo: '' }
];
