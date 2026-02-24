export interface Question {
    category: string;
    question: string;
    correct_answer: string;
    answers: string[];
}

export interface TriviaApiResponse {
    response_code: number;
    results: TriviaApiQuestion[];
}

export interface TriviaApiQuestion {
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
}

export interface TriviaCategory {
    id: number;
    name: string;
}
