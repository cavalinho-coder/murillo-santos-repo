export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image?: string;
  youtube?: string;
  publishedAt: string;
  updatedAt: string;
};

// Preserve the existing panel's record format and publication status.
export type StoredArticle = Article & {
  id?: string;
  published?: boolean;
  coverImage?: string;
  createdAt?: string;
};

export function parseArticleIndex(data: unknown): StoredArticle[] {
  if (!Array.isArray(data)) throw new Error('Formato inválido do arquivo de artigos.');
  return data.map((value: Record<string, unknown>) => {
    if (!value || ['slug', 'title', 'excerpt', 'content'].some(key => typeof value[key] !== 'string') || !value.slug || !value.title || !value.content) {
      throw new Error('Um artigo contém dados inválidos.');
    }
    const publishedAt = value.publishedAt || value.createdAt;
    const updatedAt = value.updatedAt || publishedAt;
    if (typeof publishedAt !== 'string' || typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(publishedAt)) || !Number.isFinite(Date.parse(updatedAt))) {
      throw new Error('Um artigo contém uma data inválida.');
    }
    return {
      ...value,
      category: typeof value.category === 'string' && value.category.trim() ? value.category : 'Saúde da mulher',
      image: typeof value.coverImage === 'string' ? value.coverImage : typeof value.image === 'string' ? value.image : undefined,
      publishedAt,
      updatedAt,
    } as StoredArticle;
  });
}

export function publishedArticles(rows: StoredArticle[]): Article[] {
  return rows.filter(row => row.published !== false).map(row => ({
    slug: row.slug, title: row.title, excerpt: row.excerpt, content: row.content,
    category: row.category, image: row.image, youtube: row.youtube,
    publishedAt: row.publishedAt, updatedAt: row.updatedAt,
  })).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
