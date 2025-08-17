import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Inicializa Supabase
const supabase = createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_ANON_KEY
);

// Obtener versículo del día
async function fetchVerseOfTheDay() {
  try {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    const verses = [
      'john 3:16',
      'psalm 23:1',
      'romans 8:28',
      'proverbs 3:5',
      'philippians 4:13'
    ];

    const verseOfTheDay = verses[(day + month) % verses.length];
    const url = `https://bible-api.com/${encodeURIComponent(verseOfTheDay)}?translation=rv1909`;

    const res = await fetch(url);
    const data = await res.json();

    return {
      referencia: data.reference,
      text: data.text
    };
  } catch (err) {
    console.error("Error al cargar el versículo:", err);
    return null;
  }
}


// Mostrar versículo
async function showVerse() {
  const verse = await fetchVerseOfTheDay();
  if (!verse) {
    document.getElementById('verse-content').textContent = 'Error al cargar el versículo';
    return;
  }
  
  const refEl = document.getElementById('verse-ref');
  const contentEl = document.getElementById('verse-content');

  refEl.textContent = verse.referencia;
  contentEl.textContent = verse.text;

  refEl.parentElement.style.opacity = 0;
  setTimeout(() => {
    refEl.parentElement.style.transition = 'opacity 0.8s';
    refEl.parentElement.style.opacity = 1;
  }, 50);
}

// Cargar comentarios
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

// Enviar nuevo comentario
document.getElementById('comment-submit').addEventListener('click', async () => {
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text) return;

  const todayDate = new Date().toISOString().slice(0, 10);
  await supabase.from('comentarios').insert([{
    usuario: 'Anon',
    comentario: text,
    versiculo_fecha: todayDate,
    visible: true,
    reacciones: {}
  }]);

  input.value = '';
  loadComments();
});

// Función de reacciones
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

  btn.classList.add('react-animate');
  setTimeout(() => btn.classList.remove('react-animate'), 300);

  loadComments();
};

// Inicialización
showVerse();
loadComments();
