import { Injectable } from '@angular/core';
import { Question, TriviaApiResponse, TriviaCategory } from '../models/question.model';

@Injectable({ providedIn: 'root' })
export class TriviaService {

    private readonly API_URL = 'https://opentdb.com/api.php';
    private readonly CATEGORY_URL = 'https://opentdb.com/api_category.php';

    async fetchCategories(): Promise<TriviaCategory[]> {
        const response = await fetch(this.CATEGORY_URL);
        const data = await response.json();
        return data.trivia_categories as TriviaCategory[];
    }

    async fetchQuestions(categoryIds: number[], amount: number, difficulty: string = 'any'): Promise<Question[]> {
        const fetchDiff = difficulty === 'escalating' ? 'any' : difficulty;

        // If multiple categories, split amount evenly and fetch per category
        if (categoryIds.length === 0) {
            const qs = await this.fetchFromApi(amount, undefined, fetchDiff);
            return this.finalizeQuestions(qs, amount, difficulty);
        }

        const perCategory = Math.ceil(amount / categoryIds.length);
        const allQuestions: Question[] = [];

        for (let i = 0; i < categoryIds.length; i++) {
            if (i > 0) {
                // OpenTDB limits to 1 request per 5 seconds
                await new Promise(resolve => setTimeout(resolve, 5200));
            }
            const batch = await this.fetchFromApi(perCategory, categoryIds[i], fetchDiff);
            allQuestions.push(...batch);
        }

        return this.finalizeQuestions(allQuestions, amount, difficulty);
    }

    private finalizeQuestions(questions: Question[], amount: number, difficulty: string): Question[] {
        if (difficulty === 'escalating') {
            const order: { [key: string]: number } = { easy: 1, medium: 2, hard: 3 };
            questions.sort((a, b) => {
                const valA = order[a.difficulty] || 2;
                const valB = order[b.difficulty] || 2;
                return valA - valB;
            });
        } else {
            this.shuffleArray(questions as any[]);
        }
        return questions.slice(0, amount);
    }

    private async fetchFromApi(amount: number, categoryId?: number, difficulty?: string): Promise<Question[]> {
        let url = `${this.API_URL}?amount=${amount}&type=multiple`;
        if (categoryId) {
            url += `&category=${categoryId}`;
        }
        if (difficulty && difficulty !== 'any') {
            url += `&difficulty=${difficulty}`;
        }

        const response = await fetch(url);
        const data: TriviaApiResponse = await response.json();

        if (data.response_code !== 0) {
            // If not enough questions, try with fewer
            if (data.response_code === 1 && amount > 5) {
                return this.fetchFromApi(Math.min(amount, 10), categoryId, difficulty);
            }
            return [];
        }

        return data.results.map(q => {
            const allAnswers = [...q.incorrect_answers, q.correct_answer]
                .map(a => this.decodeHtml(a));
            this.shuffleAnswers(allAnswers);

            return {
                category: this.decodeHtml(q.category),
                difficulty: q.difficulty,
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

    private shuffleAnswers(arr: string[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    private shuffleArray(arr: any[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
