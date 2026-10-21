import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { articleToken, sharedIndexUrl, readArticleIndex } from '@/lib/articles';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!articleToken()) {
    return NextResponse.json({ connected: false, readable: false }, { status: 503 });
  }
  try {
    if(sharedIndexUrl){
      const rows=await readArticleIndex();
      return NextResponse.json({connected:true,readable:true,publishedCount:rows.filter(row=>row.published!==false).length},{headers:{'Cache-Control':'no-store'}});
    }
    await list({ prefix: 'articles/', limit: 1, token: articleToken() });
    return NextResponse.json({ connected: true, readable: true },{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    console.error('Article storage check failed:', error);
    return NextResponse.json({ connected: true, readable: false }, { status: 503 });
  }
}
