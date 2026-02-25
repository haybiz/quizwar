export interface Player {
    nickname: string;
    score: number;
    answeredAt: number;
    selectedAnswer: string;
    isCorrect: boolean | string;
    avatar: string;
    streak: number;
    correctAnswersCount: number;
    totalResponseTime: number;
    activeEmote: string | null;
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
    difficulty: string;
    question: string;
    correct_answer: string;
    answers: string[];
}
