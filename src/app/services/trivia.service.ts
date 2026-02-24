import { Injectable } from '@angular/core';
import { Question, TriviaApiResponse } from '../models/question.model';

@Injectable({ providedIn: 'root' })
export class TriviaService {

    private readonly API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';

    async fetchQuestions(): Promise<Question[]> {
        const response = await fetch(this.API_URL);
        const data: TriviaApiResponse = await response.json();

        if (data.response_code !== 0) {
            throw new Error('Failed to fetch trivia questions');
        }

        return data.results.map(q => {
            const allAnswers = [...q.incorrect_answers, q.correct_answer]
                .map(a => this.decodeHtml(a));
            this.shuffleArray(allAnswers);

            return {
                question: this.decodeHtml(q.question),
                correct_answer: this.decodeHtml(q.correct_answer),
                answers: allAnswers
            };
        });
    }

    private decodeHtml(html: string): string {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    private shuffleArray(arr: string[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
