export type QuizGradingMode = 'batch' | 'instant';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export type QuizQuestionType = 'multiple_choice' | 'short_answer' | 'mixed';

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer';
  question: string;
  choices: string[];
  correctChoiceIndex: number;
  shortAnswer: string;
  acceptedAnswers: string[];
  explanation: string;
  hint: string;
}

export interface QuizUserAnswer {
  choiceIndex: number | null;
  text: string;
  checked: boolean; // used in instant mode or after batch grading
  isCorrect: boolean | null;
}

export interface QuizSessionRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  unitName: string;
  gradingMode: QuizGradingMode;
  difficulty: QuizDifficulty;
  createdAt: number;
  elapsedSeconds: number;
  questions: QuizQuestion[];
  answers: Record<string, QuizUserAnswer>;
  scoreCount: number;
  pointsEarned?: number;
  pointsAwarded?: boolean;
  loggedToStudy: boolean;
}
