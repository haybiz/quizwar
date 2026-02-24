export interface Player {
    nickname: string;
    score: number;
    answeredAt: number | null;
    selectedAnswer: string | null;
    isCorrect: boolean | null;
}

export interface Room {
    status: 'lobby' | 'playing' | 'results';
    hostId: string;
    currentQuestionIndex: number;
    questionStartedAt: number | null;
    questions: RoomQuestion[];
    players: { [playerId: string]: Player };
}

export interface RoomQuestion {
    question: string;
    correct_answer: string;
    answers: string[];
}
