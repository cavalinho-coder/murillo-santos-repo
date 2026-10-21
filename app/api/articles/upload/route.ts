import { NextResponse } from 'next/server';
import { articleToken } from '@/lib/articles';

export async function POST(req:Request){
 try{
  if(!articleToken())return NextResponse.json({error:'Armazenamento ainda não conectado.'},{status:503});
  const form=await req.formData();
  const file=form.get('file');
  if(!(file instanceof File))return NextResponse.json({error:'Selecione uma imagem.'},{status:400});
  if(!file.type.startsWith('image/'))return NextResponse.json({error:'O arquivo deve ser uma imagem.'},{status:400});
  if(file.size>8*1024*1024)return NextResponse.json({error:'A imagem deve ter no máximo 8 MB.'},{status:400});
  const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
  const {put}=await import('@vercel/blob');
  const blob=await put(`article-media/${Date.now()}-${safe}`,file,{access:'public',addRandomSuffix:false,token:articleToken()});
  return NextResponse.json({url:blob.url});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao enviar imagem.'},{status:500})}
}
