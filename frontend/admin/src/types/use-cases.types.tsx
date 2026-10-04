export interface UseCaseItem {
  id: string;
  categoryId: number;
  name: string;
  slug: string;
  image: string;
  sortOrder: number;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}
