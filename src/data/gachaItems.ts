import { GachaItem, ItemRarity } from '../types/shop';
import { getSharedAudioContext } from '../utils/audio';

export const DRAW_COST_SINGLE = 100;
export const DRAW_COST_FIVE = 450;

export const PITY_LEGENDARY_INTERVAL = 100;
export const PITY_MYTHIC_INTERVAL = 500;

export const MYTHIC_RELIC_IDS = [
  'mythic-celestial-quill',
  'mythic-starlight-sharp',
  'mythic-akashic-eraser',
  'mythic-eternal-grimoire',
] as const;

export const RARITY_ORDER: ItemRarity[] = [
  'transcendent',
  'mythic',
  'legendary',
  'epic',
  'rare',
  'common',
  'trash',
];

export const DRAW_POOL_RARITIES: ItemRarity[] = [
  'mythic',
  'legendary',
  'epic',
  'rare',
  'common',
  'trash',
];

export const RARITY_META: Record<
  ItemRarity,
  {
    label: string;
    ratePercent: number;
    duplicateRefund: number;
    textColor: string;
    borderColor: string;
    surfaceBg: string;
    accentHex: string;
  }
> = {
  transcendent: {
    label: '초월',
    ratePercent: 0,
    duplicateRefund: 1000,
    textColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-400 dark:border-cyan-400',
    surfaceBg:
      'bg-gradient-to-br from-cyan-50 via-amber-50 to-fuchsia-50 dark:from-cyan-950/60 dark:via-slate-900 dark:to-fuchsia-950/50',
    accentHex: '#06B6D4',
  },
  mythic: {
    label: '신화',
    ratePercent: 0.5,
    duplicateRefund: 250,
    textColor: 'text-fuchsia-700 dark:text-fuchsia-300',
    borderColor: 'border-fuchsia-400 dark:border-fuchsia-500',
    surfaceBg:
      'bg-gradient-to-br from-fuchsia-50 via-violet-50 to-amber-50 dark:from-fuchsia-950/60 dark:via-violet-950/50 dark:to-amber-950/40',
    accentHex: '#D946EF',
  },
  legendary: {
    label: '레전더리',
    ratePercent: 2.5,
    duplicateRefund: 110,
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-500',
    surfaceBg:
      'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/40',
    accentHex: '#F59E0B',
  },
  epic: {
    label: '에픽',
    ratePercent: 12,
    duplicateRefund: 45,
    textColor: 'text-violet-700 dark:text-violet-300',
    borderColor: 'border-violet-300 dark:border-violet-600',
    surfaceBg: 'bg-violet-50/80 dark:bg-violet-950/40',
    accentHex: '#8B5CF6',
  },
  rare: {
    label: '레어',
    ratePercent: 30,
    duplicateRefund: 25,
    textColor: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-300 dark:border-sky-700',
    surfaceBg: 'bg-sky-50/80 dark:bg-sky-950/40',
    accentHex: '#0EA5E9',
  },
  common: {
    label: '일반',
    ratePercent: 30,
    duplicateRefund: 15,
    textColor: 'text-slate-600 dark:text-slate-300',
    borderColor: 'border-slate-200 dark:border-slate-700',
    surfaceBg: 'bg-slate-50 dark:bg-slate-800/70',
    accentHex: '#64748B',
  },
  trash: {
    label: '쓰레기',
    ratePercent: 25,
    duplicateRefund: 5,
    textColor: 'text-stone-600 dark:text-stone-400',
    borderColor: 'border-stone-300 dark:border-stone-700',
    surfaceBg: 'bg-stone-100/90 dark:bg-stone-900/70',
    accentHex: '#78716C',
  },
};

export const TRANSCENDENT_ITEM: GachaItem = {
  id: 'transcendent-smart-glasses',
  name: '스마트 안경',
  rarity: 'transcendent',
  category: 'desk',
  description:
    '네 개의 신화 성물이 지구의 격변을 넘어 하나로 융합되어 탄생한 초월 등급 스마트 안경. 시선이 닿는 모든 개념과 풀이 구조가 허공에 투영됩니다.',
  cutsceneQuote:
    '「별과 대지, 화산과 폭풍이 빚어낸 초월의 결정.\n이제 세상의 모든 지식을 꿰뚫어 볼 새로운 시야가 열렸노라.」',
};

export const GACHA_ITEMS: GachaItem[] = [
  TRANSCENDENT_ITEM,
  // 신화 (Mythic) - 4종
  {
    id: 'mythic-celestial-quill',
    name: '성좌의 황금 깃펜',
    rarity: 'mythic',
    category: 'pen',
    description: '밤하늘의 궤적을 닮은 성스러운 황금 깃펜. 핵심 개념을 노트에 새길 때마다 별빛이 번집니다.',
    cutsceneQuote:
      '「밤하늘의 모든 성좌가 그대의 손끝에 응답하였노라.\n이제 백지 위에 꺾이지 않을 운명을 새길지어다…」',
  },
  {
    id: 'mythic-starlight-sharp',
    name: '천공의 별빛 샤프',
    rarity: 'mythic',
    category: 'pencil',
    description: '별빛이 깃든 초정밀 메탈 샤프. 어떤 어려운 문제도 술술 풀릴 것 같은 필기감을 전합니다.',
    cutsceneQuote:
      '「0.5mm의 은하수가 지금 눈을 떴다.\n이 샤프가 닿는 곳마다 풀리지 않을 방정식은 존재하지 않는다…」',
  },
  {
    id: 'mythic-akashic-eraser',
    name: '시공의 아카식 지우개',
    rarity: 'mythic',
    category: 'eraser',
    description: '틀린 오답의 기억까지 깨끗하게 지워주는 전설 속의 투명 크리스탈 지우개입니다.',
    cutsceneQuote:
      '「과거의 오답도, 흔들렸던 망설임도…\n시공의 잔향과 함께 흔적조차 남기지 않고 소멸시켜 주지.」',
  },
  {
    id: 'mythic-eternal-grimoire',
    name: '영원의 지혜 스터디 노트',
    rarity: 'mythic',
    category: 'notebook',
    description: '읽은 모든 내용이 머릿속에 깊이 각인되는 듯한 최고급 양장 비법 노트입니다.',
    cutsceneQuote:
      '「천 년의 봉인이 풀리고 지혜의 서가 열렸노라.\n첫 장을 펼치는 순간, 그대의 각성이 시작된다…」',
  },

  // 레전더리 (Legendary) - 5종
  {
    id: 'legendary-titanium-sharp',
    name: '티타늄 크로노 샤프',
    rarity: 'legendary',
    category: 'pencil',
    description: '항공용 티타늄 바디와 완벽한 무게 중심으로 장시간 풀이에 최적화된 샤프입니다.',
    cutsceneQuote:
      '「시간마저 압도하는 강철의 정밀함.\n단 1초의 오차도 허락하지 않는 집념이 이곳에 강림했다.」',
  },
  {
    id: 'legendary-crystal-eraser',
    name: '에버클린 크리스탈 지우개',
    rarity: 'legendary',
    category: 'eraser',
    description: '가루가 거의 날리지 않고 단 한 번의 터치로 흔적을 완벽히 지우는 프리미엄 지우개입니다.',
    cutsceneQuote:
      '「티끌 하나 허용치 않는 순백의 결계.\n단 한 번의 스침으로 모든 어둠을 지워내리라.」',
  },
  {
    id: 'legendary-goldnib-pen',
    name: '18K 골드닙 만년필',
    rarity: 'legendary',
    category: 'pen',
    description: '부드러운 금촉이 종이 위를 미끄러지며 필기의 즐거움을 극대화합니다.',
    cutsceneQuote:
      '「황금빛 잉크가 종이 위를 유영할 때,\n평범한 기록조차 하나의 전설로 거듭난다.」',
  },
  {
    id: 'legendary-aurora-highlighter',
    name: '오로라 프리즘 형광펜 세트',
    rarity: 'legendary',
    category: 'highlighter',
    description: '눈이 편안하면서도 핵심 키워드가 단번에 들어오는 영롱한 파스텔 프리즘 컬러입니다.',
    cutsceneQuote:
      '「극야를 가르는 일곱 빛깔 오로라.\n그대가 밑줄 긋는 문장이 곧 시험의 정답이 되리라.」',
  },
  {
    id: 'legendary-grand-stand',
    name: '마스터 원목 북스탠드',
    rarity: 'legendary',
    category: 'desk',
    description: '바른 자세로 오래 집중할 수 있도록 각도를 정밀하게 받쳐주는 최고급 북스탠드입니다.',
    cutsceneQuote:
      '「흔들리지 않는 대지처럼 굳건한 받침.\n이제 어떤 두꺼운 전공서적도 그대를 막을 수 없다.」',
  },

  // 에픽 (Epic) - 5종
  {
    id: 'epic-drafting-sharp',
    name: '풀메탈 제도용 샤프 0.5',
    rarity: 'epic',
    category: 'pencil',
    description: '미세한 수식과 도표 작성에 강한 묵직한 풀메탈 제도 샤프입니다.',
  },
  {
    id: 'epic-electric-eraser',
    name: '전동 정밀 지우개 프로',
    rarity: 'epic',
    category: 'eraser',
    description: '좁은 여백 속 오답만 핀포인트로 깔끔하게 지워주는 전동 지우개입니다.',
  },
  {
    id: 'epic-deepsea-pen',
    name: '딥블루 잉크 롤러펜',
    rarity: 'epic',
    category: 'pen',
    description: '속건성 잉크 덕분에 손에 묻지 않고 빠르게 필기할 수 있는 펜입니다.',
  },
  {
    id: 'epic-wrongnote-binder',
    name: '오답 정복 가죽 바인더',
    rarity: 'epic',
    category: 'notebook',
    description: '틀린 문제만 따로 모아 반복 회독하기 좋은 튼튼한 루즈리프 바인더입니다.',
  },
  {
    id: 'epic-silent-timer',
    name: '무소음 디지털 스톱워치',
    rarity: 'epic',
    category: 'desk',
    description: '도서관이나 독서실에서도 조용하게 시간을 측정할 수 있는 집중 타이머입니다.',
  },

  // 레어 (Rare) - 5종
  {
    id: 'rare-lowcenter-sharp',
    name: '저중심 제트 샤프',
    rarity: 'rare',
    category: 'pencil',
    description: '무게 중심이 펜촉 쪽에 있어 손목 피로를 줄여주는 샤프입니다.',
  },
  {
    id: 'rare-dustfree-eraser',
    name: '가루뭉침 깔끔 지우개',
    rarity: 'rare',
    category: 'eraser',
    description: '지우개 가루가 한곳에 잘 뭉쳐 책상 정리가 편한 실용적인 지우개입니다.',
  },
  {
    id: 'rare-pastel-highlighter',
    name: '소프트 밀크 형광펜',
    rarity: 'rare',
    category: 'highlighter',
    description: '뒷비침이 적고 부드러운 색감으로 복습하기 좋은 형광펜입니다.',
  },
  {
    id: 'rare-grid-notebook',
    name: '모눈 코넬 스터디 노트',
    rarity: 'rare',
    category: 'notebook',
    description: '핵심 요약 영역이 나뉘어 있어 복습 효율을 높여주는 노트입니다.',
  },
  {
    id: 'rare-multipen-3',
    name: '슬림 3색 멀티 볼펜',
    rarity: 'rare',
    category: 'pen',
    description: '검정, 파랑, 빨강을 한 번에 전환하며 필기 색상을 구분할 수 있습니다.',
  },

  // 일반 (Common) - 6종
  {
    id: 'common-crooked-ruler',
    name: '눈금이 맞지 않는 자',
    rarity: 'common',
    category: 'desk',
    description: '1cm 간격이 마음대로 늘었다 줄었다 해서 도형 그릴 때 절대 쓰면 안 되는 자입니다.',
  },
  {
    id: 'common-basic-sharp',
    name: '스탠다드 0.5mm 샤프',
    rarity: 'common',
    category: 'pencil',
    description: '가볍고 튼튼해 매일 부담 없이 쓰기 좋은 기본 샤프입니다.',
  },
  {
    id: 'common-classic-eraser',
    name: '클래식 화이트 지우개',
    rarity: 'common',
    category: 'eraser',
    description: '가장 친숙하고 믿음직한 기본 사각 지우개입니다.',
  },
  {
    id: 'common-yellow-highlighter',
    name: '선명한 노랑 형광펜',
    rarity: 'common',
    category: 'highlighter',
    description: '중요한 문장에 밑줄 긋기 좋은 정석 노랑 형광펜입니다.',
  },
  {
    id: 'common-b5-notebook',
    name: 'B5 줄 공책',
    rarity: 'common',
    category: 'notebook',
    description: '어느 과목에나 활용하기 좋은 깔끔한 B5 노트입니다.',
  },
  {
    id: 'common-index-flags',
    name: '포스트 인덱스 플래그',
    rarity: 'common',
    category: 'desk',
    description: '중요한 페이지나 다시 볼 문제를 표시해두는 필수 소품입니다.',
  },

  // 쓰레기 (Trash) - 일반 등급 아래 (6종, 이 중 부서진 여원준의 안경은 비밀 0.1% 출현)
  {
    id: 'common-eraser-crumbs',
    name: '지우개 똥',
    rarity: 'trash',
    category: 'eraser',
    description: '열심히 공부한 흔적…이지만 쓸 수는 없는 책상 위 지우개 똥 뭉치입니다.',
  },
  {
    id: 'common-empty-lead-case',
    name: '다 쓴 샤프통',
    rarity: 'trash',
    category: 'pencil',
    description: '흔들어봐도 딸깍 소리조차 나지 않는 완전히 비어있는 샤프심 통입니다.',
  },
  {
    id: 'common-bent-sharp',
    name: '끝이 꺾인 샤프',
    rarity: 'trash',
    category: 'pencil',
    description: '필통에서 떨어뜨려 선단 파이프가 90도로 휘어버려 심이 안 나오는 샤프입니다.',
  },
  {
    id: 'common-leaking-marker',
    name: '잉크가 새는 컴싸',
    rarity: 'trash',
    category: 'pen',
    description: '뚜껑을 여는 순간 손가락과 OMR 카드를 검게 물들이는 위험한 컴퓨터용 사인펜입니다.',
  },
  {
    id: 'trash-empty-whiteout',
    name: '다 써버린 화이트',
    rarity: 'trash',
    category: 'eraser',
    description: '고칠 글자는 산더미인데 테이프가 1mm도 안 남고 툭 끊겨버린 빈 수정테이프입니다.',
  },
  {
    id: 'trash-broken-yeowonjun-glasses',
    name: '부서진 여원준의 안경',
    rarity: 'trash',
    category: 'desk',
    isSecret: true,
    description:
      '어느 날 교실 바닥에서 발견된 왼쪽 렌즈가 깨지고 테이프로 간신히 붙어 있는 안경입니다.',
  },
];

export const SECRET_YEOWONJUN_GLASSES_ID = 'trash-broken-yeowonjun-glasses';
export const SECRET_YEOWONJUN_RATE = 0.001; // 0.1%

export const GACHA_POOL_ITEMS: GachaItem[] = GACHA_ITEMS.filter(
  (item) => item.rarity !== 'transcendent' && !item.isSecret
);

export function rollRarity(): ItemRarity {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const rarity of DRAW_POOL_RARITIES) {
    cumulative += RARITY_META[rarity].ratePercent;
    if (roll < cumulative) {
      return rarity;
    }
  }
  return 'common';
}

export function rollGachaItemByRarity(rarity: ItemRarity): GachaItem {
  const pool = GACHA_ITEMS.filter((item) => item.rarity === rarity && !item.isSecret);
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] || GACHA_ITEMS[GACHA_ITEMS.length - 2];
}

export function rollSingleGachaItem(): GachaItem {
  // Secret 0.1% roll for 부서진 여원준의 안경
  if (Math.random() < SECRET_YEOWONJUN_RATE) {
    const secretItem = GACHA_ITEMS.find((item) => item.id === SECRET_YEOWONJUN_GLASSES_ID);
    if (secretItem) return secretItem;
  }
  return rollGachaItemByRarity(rollRarity());
}

export function isHighRarity(rarity: ItemRarity): boolean {
  return rarity === 'transcendent' || rarity === 'mythic' || rarity === 'legendary';
}

export function getRarityRank(rarity: ItemRarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

export function playRouletteTick(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // Ignore audio errors
  }
}

export function playRareFanfare(rarity: ItemRarity): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Deep cathedral bell / chord swell followed by bright arpeggio
    const notes =
      rarity === 'transcendent'
        ? [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
        : rarity === 'mythic'
          ? [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51]
          : [220.0, 329.63, 440.0, 554.37, 659.25, 880.0];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx < 2 ? 'sine' : rarity === 'mythic' ? 'triangle' : 'sine';
      const startAt = now + idx * 0.14;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.exponentialRampToValueAtTime(idx < 2 ? 0.16 : 0.12, startAt + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.88);
    });
  } catch {
    // Ignore audio errors
  }
}

export function playCutsceneCue(kind: 'rumble' | 'chime' | 'climax'): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (kind === 'rumble') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(88, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.9);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1);
      return;
    }

    const freqs =
      kind === 'chime'
        ? [523.25, 659.25, 783.99]
        : [392.0, 523.25, 659.25, 783.99, 1046.5];

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.09;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.1, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.15);
    });
  } catch {
    // Ignore audio errors
  }
}
