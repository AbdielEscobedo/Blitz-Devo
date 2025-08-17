import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const { SUPABASE_URL, SUPABASE_ANON_KEY, API_BIBLE_KEY, BIBLE_ID } = window.APP_CONFIG;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Versículo del día ---
async function fetchVerseOfTheDay() {
  const url = `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/versesOfTheDay`;
  const res = await fetch(url, { headers: { 'api-key': API_BIBLE_KEY } });
  const json = await res.json();
  const verse = json.data[0];
  return { referencia: verse.reference, html: verse.content, version: verse.bibleId || BIBLE_ID };
}

async function showVerse() {
  const verse = await fetchVerseOfTheDay();
  document.getElementById('verse-ref').textContent = verse.referencia;
  document.getElementById('verse-version').textContent = ` · ${verse.version}`;
  document.getElementById('verse-content').innerHTML = verse.html;
}

// --- Comentarios ---
async function loadComments() {
  const todayDate = new Date().toISOString().slice(0, 10);
  const { data: comments } = await supabase
    .from('comentarios')
    .select('*')
    .eq('versiculo_fecha', todayDate)
    .eq('visible', true)
    .order('created_at', { ascending: true });

  const list = document.getElementById('comments-list');
  list.innerHTML = '';
  comments.forEach(c => {
    const li = document.createElement('li');
    li.classList.add('comment-item');
    li.innerHTML = `
      <b>${c.usuario}</b>: ${c.comentario}
      <button onclick="react('${c.id}', 'like', this)">👍 ${c.reacciones?.like || 0}</button>
      <button onclick="react('${c.id}', 'love', this)">❤️ ${c.reacciones?.love || 0}</button>
    `;
    list.appendChild(li);
  });
}


document.getElementById('comment-submit').addEventListener('click', async () => {
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text) return;

  const todayDate = new Date().toISOString().slice(0, 10);
  await supabase.from('comentarios').insert({
    versiculo_fecha: todayDate,
    usuario: "Anónimo",
    comentario: text,
    reacciones: {},
    visible: true
  });

  input.value = '';
  loadComments();
});

window.react = async function(commentId, type, btn) {
  const { data: comment } = await supabase
    .from('comentarios')
    .select('reacciones')
    .eq('id', commentId)
    .maybeSingle();

  const reactions = comment.reacciones || {};
  reactions[type] = (reactions[type] || 0) + 1;

  await supabase
    .from('comentarios')
    .update({ reacciones: reactions })
    .eq('id', commentId);

  // Animación del botón
  btn.classList.add('react-animate');
  setTimeout(() => btn.classList.remove('react-animate'), 300);

  loadComments();
};



// --- Ocultar histórico semanal ---
async function hideOldRecords() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  await supabase.from('comentarios').update({ visible: false }).lt('created_at', weekAgoISO);
}

// --- Inicializar ---
(async function init() {
  await hideOldRecords();
  await showVerse();
  await loadComments();
})();

