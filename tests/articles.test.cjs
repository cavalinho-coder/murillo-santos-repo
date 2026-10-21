const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const crypto=require('node:crypto');

function runtime(){
  const url='https://shared.public.blob.vercel-storage.com/articles/index.json';
  let rows=Array.from({length:6},(_,i)=>({id:`panel-${i}`,slug:`artigo-${i}`,title:`Artigo ${i}`,excerpt:'Resumo',content:'Conteúdo completo',category:'Saúde',coverImage:'https://example.com/cover.png',published:i<5,createdAt:`2026-10-${String(i+1).padStart(2,'0')}T12:00:00.000Z`,updatedAt:'2026-10-18T12:00:00.000Z'}));
  let fail=false;
  let writes=0;
  const cache=new Map();
  const invalidated=[];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const blob={
    list:async()=>({blobs:[{pathname:'articles/index.json',url}],hasMore:false}),
    put:async(name,data,options)=>{assert.equal(name,'articles/index.json');assert.equal(options.cacheControlMaxAge,0);assert.equal(options.token,'test-store-token');rows=JSON.parse(data);writes++;return{url};},
  };
  function load(file){
    file=path.resolve(__dirname,'..',file);
    if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const requireMock=name=>{
      if(name==='next/server')return{NextResponse:Response};
      if(name==='next/cache')return{revalidatePath:p=>invalidated.push(p)};
      if(name==='@vercel/blob')return blob;
      if(name.startsWith('@/')){const p=name.slice(2);return p.endsWith('.json')?JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',p),'utf8')):load(p+'.ts');}
      if(name.startsWith('.'))return load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(file),name))+'.ts');
      throw Error('Unexpected dependency: '+name);
    };
    const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(output,{module,exports:module.exports,require:requireMock,URL,Request,Response,crypto,console,process:{env:{ARTICLES_INDEX_URL:url,ARTICLES_BLOB_READ_WRITE_TOKEN:'test-store-token'}},fetch:async(target,options)=>{assert.equal(new URL(target).origin,new URL(url).origin);assert.equal(options.cache,'no-store');return fail?new Response('storage unavailable',{status:503}):Response.json(clone(rows));}},{filename:file});
    return module.exports;
  }
  return{list:load('app/api/articles/route.ts'),item:load('app/api/articles/[slug]/route.ts'),rows:()=>rows,setRows:value=>{rows=value},setFail:()=>{fail=true},writes:()=>writes,invalidated};
}
const request=(method,body)=>new Request('https://example.com/api/articles',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const input={title:'Novo artigo',excerpt:'Novo resumo',content:'Texto completo',image:'https://example.com/new.png',youtube:'https://youtu.be/abcdefghijk'};

test('all five published panel records appear, with original covers and dates, newest first',async()=>{
 const app=runtime(),response=await app.list.GET(),articles=await response.json();
 assert.equal(response.status,200);assert.equal(articles.length,5);assert.equal(articles[0].slug,'artigo-4');assert.equal(articles[0].image,'https://example.com/cover.png');assert.equal(articles[0].publishedAt,'2026-10-05T12:00:00.000Z');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.ok(!articles.some(a=>a.slug==='artigo-5'));
});
test('publications, edits, unpublishing and deletion in the original panel are reflected on the next read',async()=>{
 const app=runtime();let rows=app.rows();rows.push({...rows[0],id:'new',slug:'new-panel-record',published:true});rows[0].title='Alterado no painel';app.setRows(rows);
 let articles=await(await app.list.GET()).json();assert.equal(articles.length,6);assert.equal(articles.find(a=>a.slug==='artigo-0').title,'Alterado no painel');
 rows[0].published=false;rows=rows.filter(a=>a.slug!=='artigo-1');app.setRows(rows);articles=await(await app.list.GET()).json();assert.equal(articles.length,4);assert.ok(!articles.some(a=>['artigo-0','artigo-1'].includes(a.slug)));
});
test('website editor CRUD updates the original index and preserves panel IDs, drafts and cover fields',async()=>{
 const app=runtime();const created=await app.list.POST(request('POST',input));assert.equal(created.status,201);const article=await created.json();let stored=app.rows().find(a=>a.slug===article.slug);assert.ok(stored.id);assert.equal(stored.published,true);assert.equal(stored.coverImage,input.image);const id=stored.id;
 const duplicate=await app.list.POST(request('POST',input));assert.equal(duplicate.status,409);
 const edited=await app.item.PUT(request('PUT',{...input,title:'Título revisado',image:'',youtube:''}),{params:Promise.resolve({slug:article.slug})});assert.equal(edited.status,200);stored=app.rows().find(a=>a.slug===article.slug);assert.equal(stored.id,id);assert.equal(stored.title,'Título revisado');assert.equal(stored.coverImage,undefined);assert.equal(stored.image,undefined);assert.equal(stored.youtube,undefined);assert.equal(app.rows().find(a=>a.slug==='artigo-5').published,false);
 const deleted=await app.item.DELETE(new Request('https://example.com'),{params:Promise.resolve({slug:article.slug})});assert.equal(deleted.status,200);assert.equal(app.rows().length,6);assert.equal(app.writes(),3);assert.ok(app.invalidated.includes('/sitemap.xml'));
});
test('storage failures return an error instead of substituting old seed articles or overwriting the index',async()=>{
 const app=runtime();app.setFail();assert.equal((await app.list.GET()).status,503);assert.equal((await app.list.POST(request('POST',input))).status,500);assert.equal(app.writes(),0);
});
test('invalid, whitespace-only and duplicate draft slugs cannot overwrite existing content',async()=>{
 const app=runtime();assert.equal((await app.list.POST(request('POST',{...input,title:'  '}))).status,400);assert.equal((await app.list.POST(request('POST',{...input,slug:'!!!'}))).status,400);assert.equal((await app.list.POST(request('POST',{...input,slug:'artigo-5'}))).status,409);assert.equal(app.writes(),0);
});
test('a malformed shared index fails visibly instead of reducing the article list',async()=>{
 const app=runtime();app.setRows({articles:[]});assert.equal((await app.list.GET()).status,503);
});
