import seed from '@/data/articles.json';
import { parseArticleIndex, publishedArticles, type Article, type StoredArticle } from './article-model';
export type { Article } from './article-model';

export const sharedIndexUrl = process.env.ARTICLES_INDEX_URL;
export const articleToken = () => process.env.ARTICLES_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

export async function readArticleIndex(): Promise<StoredArticle[]> {
  if (!sharedIndexUrl) throw new Error('O arquivo compartilhado de artigos não está configurado.');
  const url = new URL(sharedIndexUrl);
  // Bypass framework and Blob caches after changes in either editor.
  url.searchParams.set('v', String(Date.now()));
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível carregar os artigos publicados.');
  return parseArticleIndex(await response.json());
}

export async function writeArticleIndex(rows: StoredArticle[]): Promise<void> {
  if (!sharedIndexUrl || !articleToken()) throw new Error('Armazenamento não conectado.');
  const { list, put } = await import('@vercel/blob');
  const store = await list({prefix:'articles/index.json',limit:1,token:articleToken()});
  const index = store.blobs.find(blob=>blob.pathname==='articles/index.json');
  if(!index || index.url !== sharedIndexUrl) throw new Error('O armazenamento não corresponde ao painel de artigos.');
  const blob = await put('articles/index.json', JSON.stringify(rows, null, 2), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false,
    allowOverwrite: true, cacheControlMaxAge: 0, token: articleToken(),
  });
  if (new URL(blob.url).origin !== new URL(sharedIndexUrl).origin) {
    throw new Error('O armazenamento não corresponde ao painel de artigos.');
  }
}

export async function getArticles(): Promise<Article[]> {
  if (sharedIndexUrl) return publishedArticles(await readArticleIndex());
  if (!process.env.BLOB_READ_WRITE_TOKEN) return publishedArticles(parseArticleIndex(seed));
  const { list } = await import('@vercel/blob');
  let cursor: string | undefined;
  const rows: StoredArticle[] = [];
  do {
    const page = await list({ prefix: 'articles/', cursor });
    for (const blob of page.blobs.filter(blob => blob.pathname.endsWith('.json'))) {
      const response = await fetch(blob.url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar um artigo.');
      const data = await response.json();
      rows.push(...parseArticleIndex(Array.isArray(data) ? data : [data]));
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return publishedArticles(rows);
}

export async function getArticle(slug: string): Promise<Article | undefined> {
  return (await getArticles()).find(article => article.slug === slug);
}
