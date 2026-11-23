import { AchievementDefinition } from '../types/achievements';

const BROKEN_TRASH_IDS = [
  'common-eraser-crumbs',
  'common-empty-lead-case',
  'common-bent-sharp',
  'common-leaking-marker',
  'trash-empty-whiteout',
];

const MYTHIC_IDS = [
  'mythic-celestial-quill',
  'mythic-starlight-sharp',
  'mythic-akashic-eraser',
  'mythic-eternal-grimoire',
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Study Habit & Hours Achievements
  {
    id: 'ach-first-session',
    titleName: '첫 발걸음',
    rarity: 'common',
    category: 'study',
    conditionText: '공부 기록 1회 이상 남기기',
    funnyEffect: '샤프심이 덜 부러질 것 같은 기분 +0.5%',
    evaluate: (ctx) => {
      const count = ctx.sessions.length;
      return {
        unlocked: count >= 1,
        progressText: `${Math.min(count, 1)} / 1회`,
        progressPercent: count >= 1 ? 100 : 0,
      };
    },
  },
  {
    id: 'ach-study-10h',
    titleName: '책상 지박령',
    rarity: 'rare',
    category: 'study',
    conditionText: '누적 공부 시간 10시간 달성',
    funnyEffect: '의자가 삐걱거리는 소리에 대한 내성 +1.2%',
    evaluate: (ctx) => {
      const hours = ctx.totalStudySeconds / 3600;
      return {
        unlocked: hours >= 10,
        progressText: `${Math.min(hours, 10).toFixed(1)} / 10시간`,
        progressPercent: Math.min(100, (hours / 10) * 100),
      };
    },
  },
  {
    id: 'ach-pomodoro-10',
    titleName: '토마토 소믈리에',
    rarity: 'rare',
    category: 'study',
    conditionText: '뽀모도로 모드로 공부 10회 이상 완료',
    funnyEffect: '방울토마토가 0.3% 더 붉어 보임',
    evaluate: (ctx) => {
      const pomoCount = ctx.sessions.filter((s) => s.mode === 'pomodoro').length;
      return {
        unlocked: pomoCount >= 10,
        progressText: `${Math.min(pomoCount, 10)} / 10회`,
        progressPercent: Math.min(100, (pomoCount / 10) * 100),
      };
    },
  },
  {
    id: 'ach-study-100h',
    titleName: '노력가',
    rarity: 'epic',
    category: 'study',
    conditionText: '누적 공부 시간 100시간 달성',
    funnyEffect: '졸릴 때 하품 소리 데시벨 -0.3dB',
    evaluate: (ctx) => {
      const hours = ctx.totalStudySeconds / 3600;
      return {
        unlocked: hours >= 100,
        progressText: `${Math.min(hours, 100).toFixed(1)} / 100시간`,
        progressPercent: Math.min(100, (hours / 100) * 100),
      };
    },
  },
  {
    id: 'ach-quiz-30',
    titleName: '오답 노트 수집가',
    rarity: 'epic',
    category: 'quiz',
    conditionText: 'AI 문제 풀기 누적 30문제 이상 풀기',
    funnyEffect: '찍은 객관식 문제가 3번일 확률 +0.05%',
    evaluate: (ctx) => {
      const count = ctx.totalQuizAnswered;
      return {
        unlocked: count >= 30,
        progressText: `${Math.min(count, 30)} / 30문제`,
        progressPercent: Math.min(100, (count / 30) * 100),
      };
    },
  },
  {
    id: 'ach-study-300h',
    titleName: '시간의 지배자',
    rarity: 'legendary',
    category: 'study',
    conditionText: '누적 공부 시간 300시간 달성',
    funnyEffect: '벽시계 초침 소리가 0.01% 덜 거슬림',
    evaluate: (ctx) => {
      const hours = ctx.totalStudySeconds / 3600;
      return {
        unlocked: hours >= 300,
        progressText: `${Math.min(hours, 300).toFixed(1)} / 300시간`,
        progressPercent: Math.min(100, (hours / 300) * 100),
      };
    },
  },

  // Gacha & Stationery Collection Achievements
  {
    id: 'ach-gacha-10',
    titleName: '문구점 단골',
    rarity: 'common',
    category: 'gacha',
    conditionText: '포인트 상점 뽑기 총 10회 진행',
    funnyEffect: '뽑기 버튼을 누를 때 손가락 리듬감 +0.4%',
    evaluate: (ctx) => ({
      unlocked: ctx.totalDraws >= 10,
      progressText: `${Math.min(ctx.totalDraws, 10)} / 10회`,
      progressPercent: Math.min(100, (ctx.totalDraws / 10) * 100),
    }),
  },
  {
    id: 'ach-broken-5',
    titleName: '폐급 감정사',
    rarity: 'rare',
    category: 'gacha',
    conditionText: '쓰레기 등급 기본 5종 문구 모두 수집',
    funnyEffect: '지우개 똥을 완벽한 구형으로 뭉치는 손재주 +2%',
    evaluate: (ctx) => {
      const owned = BROKEN_TRASH_IDS.filter((id) => (ctx.inventory[id]?.count || 0) > 0).length;
      return {
        unlocked: owned >= BROKEN_TRASH_IDS.length,
        progressText: `${owned} / ${BROKEN_TRASH_IDS.length}종`,
        progressPercent: (owned / BROKEN_TRASH_IDS.length) * 100,
      };
    },
  },
  {
    id: 'ach-gacha-100',
    titleName: '백전노장',
    rarity: 'epic',
    category: 'gacha',
    conditionText: '포인트 상점 뽑기 총 100회 달성',
    funnyEffect: '룰렛 바늘을 지긋이 바라보는 집중력 +0.1%',
    evaluate: (ctx) => ({
      unlocked: ctx.totalDraws >= 100,
      progressText: `${Math.min(ctx.totalDraws, 100)} / 100회`,
      progressPercent: Math.min(100, (ctx.totalDraws / 100) * 100),
    }),
  },
  {
    id: 'ach-gods-agent',
    titleName: '신의 대리자',
    rarity: 'legendary',
    category: 'gacha',
    conditionText: '신화 등급 문구 [성좌의 황금 깃펜] 획득',
    funnyEffect: '동전이 앞면이 나올 확률 +0.2%',
    evaluate: (ctx) => {
      const has = (ctx.inventory['mythic-celestial-quill']?.count || 0) > 0;
      return {
        unlocked: has,
        progressText: has ? '달성 완료' : '미획득',
        progressPercent: has ? 100 : 0,
      };
    },
  },
  {
    id: 'ach-eclipse-witness',
    titleName: '일식의 관측자',
    rarity: 'legendary',
    category: 'gacha',
    conditionText: '신화 등급 문구 [시공의 아카식 지우개] 획득',
    funnyEffect: '하품할 때 눈물이 아주 약간 덜 고임 +0.3%',
    evaluate: (ctx) => {
      const has = (ctx.inventory['mythic-akashic-eraser']?.count || 0) > 0;
      return {
        unlocked: has,
        progressText: has ? '달성 완료' : '미획득',
        progressPercent: has ? 100 : 0,
      };
    },
  },
  {
    id: 'ach-star-astronomer',
    titleName: '천칭의 천문학자',
    rarity: 'legendary',
    category: 'gacha',
    conditionText: '신화 등급 문구 [천공의 별빛 샤프] 획득',
    funnyEffect: '밤하늘을 올려다볼 때 목 뻐근함 감소 +0.2%',
    evaluate: (ctx) => {
      const has = (ctx.inventory['mythic-starlight-sharp']?.count || 0) > 0;
      return {
        unlocked: has,
        progressText: has ? '달성 완료' : '미획득',
        progressPercent: has ? 100 : 0,
      };
    },
  },
  {
    id: 'ach-library-keeper',
    titleName: '금서의 수호자',
    rarity: 'legendary',
    category: 'gacha',
    conditionText: '신화 등급 문구 [영원의 지혜 스터디 노트] 획득',
    funnyEffect: '새 책 페이지 넘길 때 손끝 벨 확률 -0.05%',
    evaluate: (ctx) => {
      const has = (ctx.inventory['mythic-eternal-grimoire']?.count || 0) > 0;
      return {
        unlocked: has,
        progressText: has ? '달성 완료' : '미획득',
        progressPercent: has ? 100 : 0,
      };
    },
  },
  {
    id: 'ach-mythic-all',
    titleName: '전설의 대필통장',
    rarity: 'mythic',
    category: 'gacha',
    conditionText: '모든 신화 등급 문구 4종 모두 수집',
    funnyEffect: '가위바위보에서 보자기를 낼 때의 위엄 +0.7%',
    evaluate: (ctx) => {
      const owned = MYTHIC_IDS.filter((id) => (ctx.inventory[id]?.count || 0) > 0).length;
      return {
        unlocked: owned >= MYTHIC_IDS.length,
        progressText: `${owned} / ${MYTHIC_IDS.length}종`,
        progressPercent: (owned / MYTHIC_IDS.length) * 100,
      };
    },
  },
  {
    id: 'ach-gacha-500',
    titleName: '성좌의 후원자',
    rarity: 'mythic',
    category: 'gacha',
    conditionText: '포인트 상점 뽑기 총 500회 달성',
    funnyEffect: '횡단보도 초록불에 딱 맞춰 도착할 확률 +0.01%',
    evaluate: (ctx) => ({
      unlocked: ctx.totalDraws >= 500,
      progressText: `${Math.min(ctx.totalDraws, 500)} / 500회`,
      progressPercent: Math.min(100, (ctx.totalDraws / 500) * 100),
    }),
  },
  {
    id: 'ach-transcendent-glasses',
    titleName: '초월자',
    rarity: 'transcendent',
    category: 'gacha',
    conditionText: '신화 4종 성물을 합성해 초월 등급 [스마트 안경] 획득',
    funnyEffect: '겨울철 따뜻한 라면 먹을 때 안경에 김이 서릴 확률 -0.01%',
    evaluate: (ctx) => {
      const has = (ctx.inventory['transcendent-smart-glasses']?.count || 0) > 0;
      return {
        unlocked: has,
        progressText: has ? '달성 완료' : '미획득',
        progressPercent: has ? 100 : 0,
      };
    },
  },
];
