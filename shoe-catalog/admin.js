let settings = null;
let products = [];
let filterCat = 'Всі';
let showSold = true;
let searchQ = '';
let cardPhotoIndex = {};
let pendingPhotos = [];

const app = document.getElementById('app');

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function contactHref(contact){
  if(!contact) return null;
  if(/^\+?\d[\d\s\-]{6,}$/.test(contact)) return 'tel:' + contact.replace(/[^\d+]/g,'');
  return contact;
}
async function api(url, opts){
  const res = await fetch(url, Object.assign({ headers:{'Content-Type':'application/json'} }, opts));
  let body = null;
  try{ body = await res.json(); }catch(e){}
  return { ok: res.ok, status: res.status, body };
}

async function boot(){
  const statusRes = await api('/api/auth-status');
  if(!statusRes.body || !statusRes.body.admin){
    renderLogin();
    return;
  }
  await loadData();
  if(!settings){
    renderSettingsSetup();
    return;
  }
  render();
}

async function loadData(){
  const res = await api('/api/data');
  settings = res.body ? res.body.settings : null;
  products = res.body ? (res.body.products || []) : [];
}

async function saveData(){
  await api('/api/data', { method:'POST', body: JSON.stringify({ settings, products }) });
}

/* ---------- LOGIN ---------- */
function renderLogin(){
  app.innerHTML = `
    <div class="login-box">
      <h1 class="slab" style="font-size:24px;margin:0 0 4px;">Вхід для продавця</h1>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 20px;">Введіть спільний пароль, щоб керувати каталогом.</p>
      <div class="field">
        <label for="l-pass">Пароль</label>
        <input type="password" id="l-pass">
      </div>
      <div class="err" id="l-err"></div>
      <div class="modal-actions" style="justify-content:flex-start;">
        <button class="btn primary" id="l-ok">Увійти</button>
      </div>
    </div>
  `;
  const passInput = document.getElementById('l-pass');
  passInput.focus();
  const tryLogin = async () => {
    const res = await api('/api/login', { method:'POST', body: JSON.stringify({ password: passInput.value }) });
    if(res.ok){
      boot();
    } else {
      document.getElementById('l-err').textContent = (res.body && res.body.error) || 'Невірний пароль.';
    }
  };
  document.getElementById('l-ok').onclick = tryLogin;
  passInput.onkeydown = e => { if(e.key === 'Enter') tryLogin(); };
}

/* ---------- FIRST-TIME SETTINGS ---------- */
function renderSettingsSetup(){
  app.innerHTML = `
    <div class="login-box" style="max-width:440px;">
      <h1 class="slab" style="font-size:24px;margin:0 0 4px;">Налаштування каталогу</h1>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 20px;">Це перший запуск — заповніть основні дані каталогу.</p>
      <div class="field">
        <label for="s-name">Назва каталогу</label>
        <input type="text" id="s-name" placeholder="Наприклад: Взуття від Світлани">
      </div>
      <div class="field">
        <label for="s-tag">Короткий опис (необов'язково)</label>
        <input type="text" id="s-tag" placeholder="Наприклад: вживане і нове взуття в хорошому стані">
      </div>
      <div class="field">
        <label for="s-contact">Посилання для зв'язку (необов'язково)</label>
        <input type="url" id="s-contact" placeholder="https://wa.me/380... або https://t.me/imya">
      </div>
      <div class="err" id="s-err"></div>
      <div class="modal-actions" style="justify-content:flex-start;">
        <button class="btn primary" id="s-save">Створити каталог</button>
      </div>
    </div>
  `;
  document.getElementById('s-save').onclick = async () => {
    const name = document.getElementById('s-name').value.trim();
    if(!name){ document.getElementById('s-err').textContent = 'Введіть назву каталогу.'; return; }
    settings = {
      name,
      tagline: document.getElementById('s-tag').value.trim(),
      contact: document.getElementById('s-contact').value.trim()
    };
    products = [];
    await saveData();
    render();
  };
}

/* ---------- MAIN ADMIN VIEW ---------- */
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
        <p>${products.length === 0 ? 'Додайте першу пару взуття кнопкою нижче.' : 'Спробуйте змінити пошук або фільтр.'}</p>
      </div>
    ` : `<div class="grid">${filtered.map(cardHtml).join('')}</div>`}
  `;

  document.getElementById('search').oninput = e => { searchQ = e.target.value; render(); };
  document.querySelectorAll('.chip').forEach(el => el.onclick = () => { filterCat = el.dataset.cat; render(); });
  document.getElementById('show-sold').onchange = e => { showSold = e.target.checked; render(); };
  document.querySelectorAll('[data-nav]').forEach(el => el.onclick = () => cycleCardPhoto(el.dataset.nav, parseInt(el.dataset.dir,10)));
  document.querySelectorAll('[data-zoom]').forEach(el => el.onclick = () => openLightbox(el.dataset.zoom));
  document.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => openProductModal(el.dataset.edit));
  document.querySelectorAll('[data-delete]').forEach(el => el.onclick = () => confirmDelete(el.dataset.delete));

  renderDock();
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
      <div class="card-admin-row">
        <button class="btn small" data-edit="${p.id}">Змінити</button>
        <button class="btn small ghost" data-delete="${p.id}">Видалити</button>
      </div>
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

/* ---------- DOCK ---------- */
function renderDock(){
  let dock = document.querySelector('.dock');
  if(dock) dock.remove();
  dock = document.createElement('div');
  dock.className = 'dock';
  dock.innerHTML = `
    <button class="btn ghost" id="dock-settings">Налаштування</button>
    <button class="btn ghost" id="dock-logout">Вийти</button>
    <button class="btn primary" id="dock-add">+ Додати товар</button>
  `;
  document.body.appendChild(dock);
  document.getElementById('dock-add').onclick = () => openProductModal(null);
  document.getElementById('dock-logout').onclick = async () => { await api('/api/logout', { method:'POST' }); boot(); };
  document.getElementById('dock-settings').onclick = () => openSettingsModal();
}

/* ---------- SETTINGS MODAL ---------- */
function openSettingsModal(){
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h2>Налаштування каталогу</h2>
      <div class="field">
        <label for="st-name">Назва</label>
        <input type="text" id="st-name" value="${escapeHtml(settings.name)}">
      </div>
      <div class="field">
        <label for="st-tag">Короткий опис</label>
        <input type="text" id="st-tag" value="${escapeHtml(settings.tagline||'')}">
      </div>
      <div class="field">
        <label for="st-contact">Посилання для зв'язку</label>
        <input type="url" id="st-contact" value="${escapeHtml(settings.contact||'')}" placeholder="https://wa.me/380...">
      </div>
      <p class="hint">Щоб змінити пароль входу, оновіть змінну ADMIN_PASSWORD у налаштуваннях проєкту на Vercel.</p>
      <div class="err" id="st-err"></div>
      <div class="modal-actions">
        <button class="btn ghost" id="st-cancel">Скасувати</button>
        <button class="btn primary" id="st-save">Зберегти</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  document.getElementById('st-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };
  document.getElementById('st-save').onclick = async () => {
    const name = document.getElementById('st-name').value.trim();
    if(!name){ document.getElementById('st-err').textContent = 'Назва не може бути порожньою.'; return; }
    settings.name = name;
    settings.tagline = document.getElementById('st-tag').value.trim();
    settings.contact = document.getElementById('st-contact').value.trim();
    await saveData();
    bg.remove();
    render();
  };
}

/* ---------- PHOTO COMPRESS + UPLOAD ---------- */
function fileToCompressedDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        const maxW = 1000;
        if(w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while(dataUrl.length > 1200000 && quality > 0.35){
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('image load failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('file read failed'));
    reader.readAsDataURL(file);
  });
}

function renderPhotoArea(){
  const area = document.getElementById('photo-area');
  if(!area) return;
  area.innerHTML = `
    ${pendingPhotos.length ? `<div class="thumbs" id="thumbs">${pendingPhotos.map((src,i) => `
      <div class="thumb-item">
        <img src="${src}">
        <button type="button" class="thumb-remove" data-remove="${i}" aria-label="Видалити фото">×</button>
      </div>
    `).join('')}</div>` : ''}
    <div class="photo-drop" id="photo-drop">${pendingPhotos.length ? 'Додати ще фото' : 'Натисніть, щоб додати фото (можна декілька)'}</div>
    <input type="file" accept="image/*" id="photo-file" multiple style="display:none;">
  `;
  document.getElementById('photo-drop').onclick = () => document.getElementById('photo-file').click();
  document.getElementById('photo-file').onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if(!files.length) return;
    document.getElementById('photo-drop').textContent = 'Завантажуємо фото…';
    for(const file of files){
      try{
        const dataUrl = await fileToCompressedDataUrl(file);
        const up = await api('/api/upload', { method:'POST', body: JSON.stringify({ dataUrl }) });
        if(up.ok && up.body && up.body.url){
          pendingPhotos.push(up.body.url);
        }
      }catch(err){}
    }
    renderPhotoArea();
  };
  area.querySelectorAll('[data-remove]').forEach(btn => {
    btn.onclick = () => { pendingPhotos.splice(parseInt(btn.dataset.remove,10), 1); renderPhotoArea(); };
  });
}

/* ---------- PRODUCT MODAL ---------- */
function openProductModal(id){
  const existing = id ? products.find(x => x.id === id) : null;
  const p = existing || { title:'', description:'', price:'', sizes:'', category:'Жіноче', status:'available', photos:[] };
  pendingPhotos = (p.photos || []).slice();

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h2>${id ? 'Змінити товар' : 'Новий товар'}</h2>
      <div class="field">
        <label>Фото (можна додати декілька)</label>
        <div id="photo-area"></div>
      </div>
      <div class="field">
        <label for="p-title">Назва</label>
        <input type="text" id="p-title" placeholder="Наприклад: Кросівки Nike Air, білі" value="${escapeHtml(p.title)}">
      </div>
      <div class="field">
        <label for="p-desc">Опис</label>
        <textarea id="p-desc" placeholder="Стан, матеріал, особливості…">${escapeHtml(p.description)}</textarea>
      </div>
      <div class="row2">
        <div class="field">
          <label for="p-price">Ціна</label>
          <input type="text" id="p-price" placeholder="Наприклад: 800 грн" value="${escapeHtml(p.price)}">
        </div>
        <div class="field">
          <label for="p-sizes">Розмір</label>
          <input type="text" id="p-sizes" placeholder="Наприклад: 38" value="${escapeHtml(p.sizes)}">
        </div>
      </div>
      <div class="row2">
        <div class="field">
          <label for="p-cat">Категорія</label>
          <select id="p-cat">
            ${['Жіноче','Чоловіче','Дитяче','Унісекс'].map(c => `<option ${c===p.category?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="p-status">Статус</label>
          <select id="p-status">
            <option value="available" ${p.status==='available'?'selected':''}>В наявності</option>
            <option value="sold" ${p.status==='sold'?'selected':''}>Продано</option>
          </select>
        </div>
      </div>
      <div class="err" id="p-err"></div>
      <div class="modal-actions">
        <button class="btn ghost" id="p-cancel">Скасувати</button>
        <button class="btn primary" id="p-save">Зберегти</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  renderPhotoArea();
  document.getElementById('p-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };

  document.getElementById('p-save').onclick = async () => {
    const title = document.getElementById('p-title').value.trim();
    if(!title){ document.getElementById('p-err').textContent = 'Введіть назву товару.'; return; }
    const saveBtn = document.getElementById('p-save');
    saveBtn.textContent = 'Зберігаємо…'; saveBtn.disabled = true;
    const product = {
      id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : 'id-'+Date.now()),
      title,
      description: document.getElementById('p-desc').value.trim(),
      price: document.getElementById('p-price').value.trim(),
      sizes: document.getElementById('p-sizes').value.trim(),
      category: document.getElementById('p-cat').value,
      status: document.getElementById('p-status').value,
      photos: pendingPhotos.slice(),
      createdAt: existing ? existing.createdAt : Date.now()
    };
    if(existing){
      products = products.map(x => x.id === product.id ? product : x);
    } else {
      products.unshift(product);
    }
    await saveData();
    bg.remove();
    render();
  };
}

/* ---------- DELETE ---------- */
function confirmDelete(id){
  const p = products.find(x => x.id === id);
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <h2>Видалити товар?</h2>
      <p class="sub">«${escapeHtml(p ? p.title : '')}» буде видалено без можливості відновити.</p>
      <div class="modal-actions">
        <button class="btn ghost" id="d-cancel">Скасувати</button>
        <button class="btn primary" id="d-ok" style="background:var(--rust);border-color:var(--rust);">Видалити</button>
      </div>
    </div>
  `;
  document.body.appendChild(bg);
  document.getElementById('d-cancel').onclick = () => bg.remove();
  bg.onclick = e => { if(e.target === bg) bg.remove(); };
  document.getElementById('d-ok').onclick = async () => {
    products = products.filter(x => x.id !== id);
    await saveData();
    bg.remove();
    render();
  };
}

boot();
