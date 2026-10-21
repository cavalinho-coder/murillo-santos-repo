import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getArticles, readArticleIndex, writeArticleIndex, sharedIndexUrl, articleToken } from '@/lib/articles';
import { articleInput, articleSlug } from '@/lib/article-input';

export const dynamic = 'force-dynamic';

export async function GET(){
 try { return NextResponse.json(await getArticles(), { headers: { 'Cache-Control': 'no-store' } }); }
 catch { return NextResponse.json({error:'Não foi possível carregar os artigos publicados.'},{status:503}); }
}

export async function POST(req:Request){
 try{
  if(!articleToken())return NextResponse.json({error:'Armazenamento ainda não conectado.'},{status:503});
  const body=await req.json();
  let input;
  try { input = articleInput(body); } catch { return NextResponse.json({error:'Preencha título, resumo e conteúdo.'},{status:400}); }
  const now=new Date().toISOString();
  const slug=articleSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : input.title);
  if(!slug)return NextResponse.json({error:'Informe um endereço válido para o artigo.'},{status:400});
  const rows = sharedIndexUrl ? await readArticleIndex() : await getArticles();
  if(rows.some(row=>row.slug===slug))return NextResponse.json({error:'Já existe um artigo com este endereço. Edite o existente ou escolha outro endereço.'},{status:409});
  const article={
    slug,
    ...input,
    publishedAt:now,
    updatedAt:now
  };
  if(sharedIndexUrl){
    await writeArticleIndex([...rows,{...article,id:crypto.randomUUID(),published:true,createdAt:now,coverImage:article.image}]);
  }else{
    const {put}=await import('@vercel/blob');
    await put(`articles/${slug}.json`,JSON.stringify(article),{access:'public',contentType:'application/json',addRandomSuffix:false,allowOverwrite:false,cacheControlMaxAge:0,token:articleToken()});
  }
  revalidatePath('/');
  revalidatePath('/artigos');
  revalidatePath(`/artigos/${slug}`);
  revalidatePath('/sitemap.xml');
  return NextResponse.json(article,{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao publicar artigo.'},{status:500})}
}
