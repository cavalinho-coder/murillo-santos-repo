'use client';
import { useEffect, useState } from 'react';

type Article={
  slug:string; title:string; excerpt:string; content:string; category:string;
  image?:string; youtube?:string; publishedAt:string; updatedAt:string;
};

const empty={title:'',category:'Saúde da mulher',excerpt:'',content:'',slug:'',image:'',youtube:''};

export default function Editor(){
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [storage,setStorage]=useState<'checking'|'connected'|'missing'>('checking');
  const [articles,setArticles]=useState<Article[]>([]);
  const [editing,setEditing]=useState<string|null>(null);
  const [form,setForm]=useState(empty);

  async function load():Promise<Article[]>{
    const [statusResponse,articlesResponse]=await Promise.all([
      fetch('/api/articles/status',{cache:'no-store'}),
      fetch('/api/articles',{cache:'no-store'})
    ]);
    const state=await statusResponse.json();
    if(!statusResponse.ok||!state.readable){
      setStorage('missing');
      throw new Error('Não foi possível acessar o armazenamento dos artigos.');
    }
    if(!articlesResponse.ok)throw new Error('Não foi possível carregar os artigos publicados.');
    const rows=await articlesResponse.json();
    if(!Array.isArray(rows))throw new Error('Resposta inválida ao carregar artigos.');
    setStorage('connected');
    setArticles(rows);
    return rows;
  }

  useEffect(()=>{load().catch(e=>setStatus(e instanceof Error?e.message:'Erro ao carregar artigos.'))},[]);

  function newArticle(){
    setEditing(null); setForm(empty); setStatus('');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function editArticle(a:Article){
    setEditing(a.slug);
    setForm({title:a.title,category:a.category,excerpt:a.excerpt,content:a.content,slug:a.slug,image:a.image||'',youtube:a.youtube||''});
    setStatus('');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function uploadImage(file:File){
    setUploading(true); setStatus('Enviando imagem…');
    try{
      const fd=new FormData(); fd.append('file',file);
      const r=await fetch('/api/articles/upload',{method:'POST',body:fd});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||'Erro ao enviar imagem.');
      setForm(v=>({...v,image:j.url}));
      setStatus('Imagem enviada.');
    }catch(e){setStatus(e instanceof Error?e.message:'Erro ao enviar imagem.')}
    finally{setUploading(false)}
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setStatus(editing?'Salvando alterações…':'Publicando…');
    try{
      const url=editing?`/api/articles/${editing}`:'/api/articles';
      const method=editing?'PUT':'POST';
      const r=await fetch(url,{method,headers:{'content-type':'application/json'},body:JSON.stringify(form)});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||'Erro ao salvar artigo.');
      setEditing(j.slug); setForm(v=>({...v,slug:j.slug}));
      const updated=await load();
      if(!updated.some(article=>article.slug===j.slug)){
        throw new Error('O artigo foi enviado, mas não apareceu na biblioteca. Não publique novamente; entre em contato com o suporte.');
      }
      setStatus(editing?'Artigo atualizado com sucesso.':`Publicado com sucesso: /artigos/${j.slug}`);
    }catch(e){setStatus(e instanceof Error?e.message:'Erro ao salvar artigo.')}
    finally{setBusy(false)}
  }

  async function remove(a:Article){
    if(busy)return;
    if(!confirm(`Excluir definitivamente “${a.title}”?`))return;
    setBusy(true);
    try {
    setStatus('Excluindo artigo…');
    const r=await fetch(`/api/articles/${a.slug}`,{method:'DELETE'});
    const j=await r.json();
    if(!r.ok){setStatus(j.error||'Erro ao excluir artigo.');return}
    if(editing===a.slug)newArticle();
    setStatus('Artigo excluído.');
    await load();
    } catch(e){setStatus(e instanceof Error?e.message:'Erro ao excluir artigo.')}
    finally{setBusy(false)}
  }

  return <div className="editor-shell">
    <div className="editor-topbar"><strong>Murillo Santos</strong><span>Editor de conteúdo · www.drmurillosantos.com.br</span></div>

    <div className="editor-dashboard">
      <section className="editor-card editor-main">
        <div className="editor-intro">
          <div><span className="kicker">{editing?'Edição':'Artigos'}</span><h1>{editing?'Editar artigo':'Novo artigo'}</h1><p>{editing?'Atualize texto, imagem ou vídeo e salve as alterações.':'Crie um artigo completo com imagem de capa e vídeo do YouTube, se necessário.'}</p></div>
          <div className={`storage-badge ${storage}`}>{storage==='checking'?'Verificando armazenamento…':storage==='connected'?'Armazenamento conectado':'Armazenamento desconectado'}</div>
        </div>

        <form onSubmit={submit}>
          <label>Título<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></label>
          <div className="editor-two">
            <label>Categoria<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label>
            <label>Slug<input value={form.slug} disabled={!!editing} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="gerado-automaticamente"/></label>
          </div>
          <label>Resumo<textarea rows={3} value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})} required/></label>

          <div className="media-fields">
            <label>Imagem de capa
              <input type="file" accept="image/*" disabled={uploading||storage!=='connected'} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/>
            </label>
            {form.image&&<div className="editor-image-preview"><img src={form.image} alt="Prévia da capa"/><button type="button" onClick={()=>setForm({...form,image:''})}>Remover imagem</button></div>}
            <label>Link do YouTube<input type="url" value={form.youtube} onChange={e=>setForm({...form,youtube:e.target.value})} placeholder="https://www.youtube.com/watch?v=..."/></label>
          </div>

          <label>Conteúdo<textarea rows={18} value={form.content} onChange={e=>setForm({...form,content:e.target.value})} required placeholder="Escreva em parágrafos. Use uma linha em branco entre eles."/></label>

          <div className="editor-actions">
            <button className="btn primary" disabled={busy||uploading||storage!=='connected'}>{busy?'Salvando…':editing?'Salvar alterações':'Publicar artigo'}</button>
            {editing&&<button type="button" className="btn ghost" onClick={newArticle}>Novo artigo</button>}
          </div>
          <div className="editor-status" role="status" aria-live="polite">{status}</div>
        </form>
      </section>

      <aside className="editor-library">
        <div className="editor-library-head"><div><span className="kicker">Biblioteca</span><h2>Artigos publicados ({articles.length})</h2></div><button type="button" onClick={newArticle}>+ Novo</button></div>
        {articles.length===0?<p className="editor-empty">Nenhum artigo publicado.</p>:<div className="editor-article-list">{articles.map(a=><article key={a.slug} className={editing===a.slug?'active':''}>
          <div><span>{a.category}</span><h3>{a.title}</h3><small>{new Date(a.publishedAt).toLocaleDateString('pt-BR')}</small></div>
          <div className="editor-item-actions"><button type="button" disabled={busy} onClick={()=>editArticle(a)}>Editar</button><a href={`/artigos/${a.slug}`} target="_blank">Ver</a><button className="danger" type="button" disabled={busy} onClick={()=>remove(a)}>Excluir</button></div>
        </article>)}</div>}
      </aside>
    </div>
  </div>
}
