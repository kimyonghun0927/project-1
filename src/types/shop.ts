export type ItemRarity =
  | 'transcendent'
  | 'mythic'
  | 'legendary'
  | 'epic'
  | 'rare'
  | 'common'
  | 'trash';

export type StationeryCategory = 'pencil' | 'eraser' | 'pen' | 'highlighter' | 'notebook' | 'desk';

export interface GachaItem {
  id: string;
  name: string;
  rarity: ItemRarity;
  category: StationeryCategory;
  description: string;
  cutsceneQuote?: string;
  isSecret?: boolean;
}

export interface OwnedItemEntry {
  itemId: string;
  count: number;
  firstObtainedAt: number;
}

export interface GachaDrawResult {
  item: GachaItem;
  isNew: boolean;
  refundPoints: number;
  guaranteedRarity?: 'transcendent' | 'mythic' | 'legendary';
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: number;
}
