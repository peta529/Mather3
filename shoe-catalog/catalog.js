let settings = null;
let products = [];
let filterCat = 'Всі';
let showSold = true;
let searchQ = '';
let cardPhotoIndex = {};

const app = document.getElementById('app');

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function contactHref(contact){
  if(!contact) return null;
  if(/^\+?\d[\d\s\-]{6,}$/.test(contact)) return 'tel:' + contact.replace(/[^\d+]/g,'');
  return contact;
}

async function boot(){
  try{
    const res = await fetch('/api/data');
    const data = await res.json();
    settings = data.settings;
    products = data.products || [];
  }catch(e){
    settings = null;
    products = [];
  }
  render();
}

function getFilteredProducts(){
  return products.filter(p => {
    if(!showSold && p.status === 'sold') return false;
    if(filterCat !== 'Всі' && p.category !== filterCat) return false;
    if(searchQ){
      const hay = (p.title+' '+p.description).toLowerCase();
      if(!hay.includes(searchQ.toLowerCase())) return false;
    }
    return true;
  });
}

function render(){
  if(!settings){
    app.innerHTML = `
      <div class="empty-state" style="margin-top:60px;">
        <h3>Каталог ще не налаштований</h3>
        <p>Власник ще не заповнив дані. Загляньте трохи пізніше.</p>
      </div>
    `;
    return;
  }

  const categories = ['Всі','Жіноче','Чоловіче','Дитяче','Унісекс'];
  const filtered = getFilteredProducts();
  const contact = contactHref(settings.contact);

  app.innerHTML = `
    <header class="shop-head">
      <div>
        <h1 class="shop-name">${escapeHtml(settings.name)}</h1>
        ${settings.tagline ? `<p class="shop-tagline">${escapeHtml(settings.tagline)}</p>` : ''}
      </div>
      <div class="head-actions">
        ${contact ? `<a class="btn" href="${escapeHtml(contact)}" target="_blank" rel="noopener">Написати</a>` : ''}
      </div>
    </header>

    <div class="controls">
      <input type="text" class="search-input" id="search" placeholder="Пошук за назвою або описом" value="${escapeHtml(searchQ)}">
      ${categories.map(c => `<button class="chip${c===filterCat?' active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
      <label class="toggle-sold"><input type="checkbox" id="show-sold" ${showSold?'checked':''}> Показувати продане</label>
    </div>

    ${filtered.length === 0 ? `
      <div class="empty-state">
        <h3>${products.length === 0 ? 'Поки що тут порожньо' : 'Нічого не знайдено'}</h3>
        <p>${products.length === 0 ? "Скоро тут з'явиться взуття." : 'Спробуйте змінити пошук або фільтр.'}</p>
      </div>
    ` : `<div class="grid">${filtered.map(cardHtml).join('')}</div>`}
  `;

  document.getElementById('search').oninput = e => { searchQ = e.target.value; render(); };
  document.querySelectorAll('.chip').forEach(el => el.onclick = () => { filterCat = el.dataset.cat; render(); });
  document.getElementById('show-sold').onchange = e => { showSold = e.target.checked; render(); };
  document.querySelectorAll('[data-nav]').forEach(el => el.onclick = () => cycleCardPhoto(el.dataset.nav, parseInt(el.dataset.dir,10)));
  document.querySelectorAll('[data-zoom]').forEach(el => el.onclick = () => openLightbox(el.dataset.zoom));
}

function cardHtml(p){
  const photos = p.photos || [];
  cardPhotoIndex[p.id] = 0;
  const photoInner = photos.length
    ? `<img class="card-photo" id="photo-${p.id}" src="${photos[0]}" alt="${escapeHtml(p.title)}" data-zoom="${p.id}">`
    : `<div class="card-photo empty">Без фото</div>`;
  const nav = photos.length > 1 ? `
      <button class="photo-nav prev" data-nav="${p.id}" data-dir="-1" aria-label="Попереднє фото">‹</button>
      <button class="photo-nav next" data-nav="${p.id}" data-dir="1" aria-label="Наступне фото">›</button>
      <div class="photo-dots" id="dots-${p.id}">${photos.map((_,i)=>`<span style="opacity:${i===0?1:.4}"></span>`).join('')}</div>
    ` : '';
  return `
    <div class="card">
      ${p.status === 'sold' ? `<div class="stamp">продано</div>` : ''}
      <div class="photo-box">${photoInner}${nav}</div>
      <h3 class="card-title">${escapeHtml(p.title)}</h3>
      ${p.description ? `<p class="card-desc">${escapeHtml(p.description)}</p>` : ''}
      <div class="card-meta">
        <span class="card-price mono">${escapeHtml(p.price || '—')}</span>
        ${p.sizes ? `<span class="card-size">р. ${escapeHtml(p.sizes)}</span>` : ''}
      </div>
      ${p.category ? `<div class="card-cat">${escapeHtml(p.category)}</div>` : ''}
    </div>
  `;
}

function cycleCardPhoto(id, dir){
  const p = products.find(x => x.id === id);
  if(!p) return;
  const photos = p.photos || [];
  if(photos.length < 2) return;
  const cur = ((cardPhotoIndex[id]||0) + dir + photos.length) % photos.length;
  cardPhotoIndex[id] = cur;
  const img = document.getElementById('photo-'+id);
  if(img) img.src = photos[cur];
  const dotsWrap = document.getElementById('dots-'+id);
  if(dotsWrap) Array.from(dotsWrap.children).forEach((d,i)=> d.style.opacity = i===cur ? '1' : '.4');
}

function openLightbox(id){
  const p = products.find(x => x.id === id);
  if(!p) return;
  const photos = p.photos || [];
  if(!photos.length) return;
  let idx = cardPhotoIndex[id] || 0;

  const bg = document.createElement('div');
  bg.className = 'lightbox-bg';
  const renderInner = () => {
    bg.innerHTML = `
      <div class="lightbox-img-wrap">
        <img class="lightbox-img" src="${photos[idx]}" alt="${escapeHtml(p.title)}">
        <button class="lightbox-close" id="lb-close" aria-label="Закрити">×</button>
        ${photos.length > 1 ? `
          <button class="lightbox-nav prev" id="lb-prev" aria-label="Попереднє фото">‹</button>
          <button class="lightbox-nav next" id="lb-next" aria-label="Наступне фото">›</button>
          <div class="lightbox-count">${idx+1} / ${photos.length}</div>
        ` : ''}
      </div>
    `;
    document.getElementById('lb-close').onclick = close;
    if(photos.length > 1){
      document.getElementById('lb-prev').onclick = e => { e.stopPropagation(); idx=(idx-1+photos.length)%photos.length; cardPhotoIndex[id]=idx; renderInner(); };
      document.getElementById('lb-next').onclick = e => { e.stopPropagation(); idx=(idx+1)%photos.length; cardPhotoIndex[id]=idx; renderInner(); };
    }
  };
  const onKey = e => {
    if(e.key === 'Escape') close();
    else if(e.key === 'ArrowLeft' && photos.length > 1){ idx=(idx-1+photos.length)%photos.length; cardPhotoIndex[id]=idx; renderInner(); }
    else if(e.key === 'ArrowRight' && photos.length > 1){ idx=(idx+1)%photos.length; cardPhotoIndex[id]=idx; renderInner(); }
  };
  function close(){
    document.removeEventListener('keydown', onKey);
    bg.remove();
    const mainImg = document.getElementById('photo-'+id);
    const dotsWrap = document.getElementById('dots-'+id);
    if(mainImg) mainImg.src = photos[idx];
    if(dotsWrap) Array.from(dotsWrap.children).forEach((d,i)=> d.style.opacity = i===idx ? '1' : '.4');
  }
  bg.onclick = e => { if(e.target === bg) close(); };
  document.addEventListener('keydown', onKey);
  document.body.appendChild(bg);
  renderInner();
}

boot();
