import { ItemRarity, OwnedItemEntry } from './shop';
import { StudySession } from './study';

export type AchievementCategory = 'study' | 'gacha' | 'quiz';

export interface AchievementContext {
  sessions: StudySession[];
  totalStudySeconds: number;
  inventory: Record<string, OwnedItemEntry>;
  totalDraws: number;
  totalQuizAnswered: number;
}

export interface AchievementProgress {
  unlocked: boolean;
  progressText: string;
  progressPercent: number;
}

export interface AchievementDefinition {
  id: string;
  titleName: string;
  rarity: ItemRarity;
  category: AchievementCategory;
  conditionText: string;
  funnyEffect: string;
  evaluate: (ctx: AchievementContext) => AchievementProgress;
}
