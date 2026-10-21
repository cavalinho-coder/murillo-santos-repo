import type { MetadataRoute } from 'next'; import { getArticles } from '@/lib/articles';
export const dynamic='force-dynamic';
export const revalidate=0;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base=process.env.NEXT_PUBLIC_SITE_URL||'https://drmurillosantos.com.br';const pages=['','/sobre','/tratamentos','/artigos','/contato'].map((p,i)=>({url:base+p,lastModified:new Date(),changeFrequency:(i===0?'weekly':'monthly') as 'weekly'|'monthly',priority:i===0?1:.8}));const articles=(await getArticles()).map(a=>({url:`${base}/artigos/${a.slug}`,lastModified:new Date(a.updatedAt),changeFrequency:'monthly' as const,priority:.7}));return[...pages,...articles]}
