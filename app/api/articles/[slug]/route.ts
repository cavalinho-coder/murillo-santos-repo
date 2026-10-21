import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getArticle, readArticleIndex, writeArticleIndex, sharedIndexUrl, articleToken } from '@/lib/articles';
import { articleInput } from '@/lib/article-input';

export async function PUT(req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  if(!articleToken())return NextResponse.json({error:'Armazenamento ainda não conectado.'},{status:503});
  const {slug}=await params;
  const rows=sharedIndexUrl?await readArticleIndex():undefined;
  const current=rows?rows.find(row=>row.slug===slug):await getArticle(slug);
  if(!current)return NextResponse.json({error:'Artigo não encontrado.'},{status:404});
  const body=await req.json();
  let input;
  try { input=articleInput(body); } catch { return NextResponse.json({error:'Preencha título, resumo e conteúdo.'},{status:400}); }
  const article={
    ...current,
    ...input,
    updatedAt:new Date().toISOString()
  };
  if(rows){
    await writeArticleIndex(rows.map(row=>row.slug===slug?{...row,...article,coverImage:article.image}:row));
  }else{
    const {put}=await import('@vercel/blob');
    await put(`articles/${slug}.json`,JSON.stringify(article),{access:'public',contentType:'application/json',addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:0,token:articleToken()});
  }
  revalidatePath('/');
  revalidatePath('/artigos');
  revalidatePath(`/artigos/${slug}`);
  revalidatePath('/sitemap.xml');
  return NextResponse.json(article);
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao atualizar artigo.'},{status:500})}
}

export async function DELETE(_req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  if(!articleToken())return NextResponse.json({error:'Armazenamento ainda não conectado.'},{status:503});
  const {slug}=await params;
  if(sharedIndexUrl){
    const rows=await readArticleIndex();
    if(!rows.some(row=>row.slug===slug))return NextResponse.json({error:'Artigo não encontrado.'},{status:404});
    await writeArticleIndex(rows.filter(row=>row.slug!==slug));
  }else{
    const {list,del}=await import('@vercel/blob');
    const result=await list({prefix:`articles/${slug}.json`,token:articleToken()});
    const target=result.blobs.find(b=>b.pathname===`articles/${slug}.json`);
    if(!target)return NextResponse.json({error:'Artigo não encontrado.'},{status:404});
    await del(target.url,{token:articleToken()});
  }
  revalidatePath('/');
  revalidatePath('/artigos');
  revalidatePath(`/artigos/${slug}`);
  revalidatePath('/sitemap.xml');
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao excluir artigo.'},{status:500})}
}
