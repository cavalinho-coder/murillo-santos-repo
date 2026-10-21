export function articleInput(body: Record<string, unknown>) {
  const text = (key: string) => typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  const title = text('title'), excerpt = text('excerpt'), content = text('content');
  if (!title || !excerpt || !content) throw new Error('Preencha título, resumo e conteúdo.');
  return { title, excerpt, content, category: text('category') || 'Saúde da mulher', image: text('image') || undefined, youtube: text('youtube') || undefined };
}

export function articleSlug(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80).replace(/(^-|-$)/g, '');
}
