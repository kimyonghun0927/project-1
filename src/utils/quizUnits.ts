import { QuizQuestion, QuizUserAnswer } from '../types/quiz';

const SUBJECT_UNIT_PRESETS: { match: RegExp; units: string[] }[] = [
  {
    match: /국어|독서|문학|언어/,
    units: ['비문학 구조 독해', '문법 · 음운 변동', '고전시가 해석', '현대소설 서술상 특징', '화법과 작문'],
  },
  {
    match: /영어|영문|토익|토플/,
    units: ['관계대명사와 관계부사', '가정법', '분사구문', '시제와 수동태', '독해 빈칸 추론'],
  },
  {
    match: /수학|미적|기하|확률|통계/,
    units: ['함수의 극한과 연속', '미분법과 도함수 활용', '적분법', '확률과 조건부확률', '수열과 귀납법'],
  },
  {
    match: /전공|코딩|컴퓨터|개발|프로그래밍|알고리즘/,
    units: ['자료구조와 시간복잡도', '동적 계획법(DP)', '운영체제 프로세스와 스레드', '네트워크 TCP/IP와 HTTP', '데이터베이스 인덱스와 정규화'],
  },
  {
    match: /자격증|한국사|기사|시험/,
    units: ['소프트웨어 설계 · 디자인 패턴', '데이터베이스 구축', '정보보안 기초', '한국사 근현대사', '행정법 핵심 개념'],
  },
];

const FALLBACK_UNITS = ['핵심 개념 정리', '기초 연습 문제', '빈출 유형 집중', '응용 심화 문제'];

export function getSuggestedUnits(subjectName: string): string[] {
  const found = SUBJECT_UNIT_PRESETS.find((preset) => preset.match.test(subjectName));
  return found ? found.units : FALLBACK_UNITS;
}

export function normalizeAnswerText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function evaluateQuestionAnswer(
  question: QuizQuestion,
  userAnswer: QuizUserAnswer | undefined
): boolean {
  if (!userAnswer) return false;

  if (question.type === 'multiple_choice') {
    return userAnswer.choiceIndex !== null && userAnswer.choiceIndex === question.correctChoiceIndex;
  }

  const userNorm = normalizeAnswerText(userAnswer.text || '');
  if (!userNorm) return false;

  const candidates =
    question.acceptedAnswers.length > 0 ? question.acceptedAnswers : [question.shortAnswer];

  return candidates.some((ans) => normalizeAnswerText(ans) === userNorm);
}
