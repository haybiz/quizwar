export interface Player {
    nickname: string;
    score: number;
    answeredAt: number;
    selectedAnswer: string;
    isCorrect: boolean | string;
}

export interface Room {
    status: 'lobby' | 'countdown' | 'playing' | 'results';
    hostId: string;
    countdownEndAt?: number;
    currentQuestionIndex: number;
    questionStartedAt: number | null;
    questions: RoomQuestion[];
    players: { [playerId: string]: Player };
}

export interface RoomQuestion {
    category: string;
    question: string;
    correct_answer: string;
    answers: string[];
}
