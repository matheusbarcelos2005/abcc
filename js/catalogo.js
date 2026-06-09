'use strict';

const appConfig = APP_CONFIG;

// ── State ────────────────────────────────────────────────────
let cart = [];
let currentCategory = 'Todos';
let searchQuery = '';
let sortMode = 'default';
let destaqueOnly = false;

// ── Utils ────────────────────────────────────────────────────
const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').trim();
const tokenize = s => normalize(s).split(/\s+/).filter(Boolean);
const formatPrice = n => n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

const TOKEN_SYNONYMS = {
    disco:['discos'], discos:['disco'], flap:['flapdisc'], lixa:['lixas','abrasivo'], lixas:['lixa','abrasivo'],
    cinta:['cintas'], cintas:['cinta'], roda:['rodas'], rodas:['roda'],
    sisal:['algodao','polimento'], algodao:['sisal'], flanela:['polimento'],
    escova:['escovas'], escovas:['escova'], massa:['massas','polir'], massas:['massa','polir'],
    epi:['epis','protecao'], epis:['epi','protecao'], luva:['luvas'], luvas:['luva'],
    pgs:['pg','roda'], pg:['pgs','roda'], scoth:['scotch','scotchbrite'], scotch:['scoth','scotchbrite'],
};

function matchTokens(productTokens, queryTokens) {
    return queryTokens.every(qt => {
        const synonyms = TOKEN_SYNONYMS[qt] || [];
        return productTokens.some(pt => [qt,...synonyms].some(c => pt.includes(c) || c.includes(pt)));
    });
}

function showToast(msg, type = '') {
    const tc = document.getElementById('toast-container');
    if (!tc) return;
    const el = document.createElement('div');
    el.className = `toast-item${type ? ' '+type : ''}`;
    el.textContent = msg;
    tc.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ── Cart ─────────────────────────────────────────────────────
function loadCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(appConfig.storageKey));
        cart = Array.isArray(saved) ? saved : [];
    } catch { cart = []; }
    updateCartCount();
}
function saveCart() {
    localStorage.setItem(appConfig.storageKey, JSON.stringify(cart));
    updateCartCount();
}
function updateCartCount() {
    const total = cart.reduce((s,i) => s+i.qty, 0);
    document.querySelectorAll('#cartCount, #fabCartCount').forEach(el => {
        el.textContent = total;
        el.style.display = total > 0 ? '' : 'none';
    });
}
function addToCart(product) {
    const ex = cart.find(i => i.id === product.id);
    if (ex) { ex.qty++; } else { cart.push({...product, qty:1}); }
    saveCart();
    showToast(`${product.nome.slice(0,40)} adicionado!`, 'success');
}
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); saveCart(); renderCart(); }
function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) { item.qty = Math.max(1, item.qty + delta); saveCart(); renderCart(); }
}

// ── Filter & sort ─────────────────────────────────────────────
function getCategories() {
    return [...new Set(produtos.map(p => p.categoria))].sort();
}

function filterProducts() {
    const tokens = tokenize(searchQuery);
    let result = produtos.filter(p => {
        const catOk = currentCategory === 'Todos' || p.categoria === currentCategory;
        if (!catOk) return false;
        if (destaqueOnly && !p.destaque) return false;
        if (!tokens.length) return true;
        return matchTokens(tokenize(p.nome + ' ' + p.categoria), tokens);
    });
    switch (sortMode) {
        case 'name-az':    result.sort((a,b) => a.nome.localeCompare(b.nome)); break;
        case 'name-za':    result.sort((a,b) => b.nome.localeCompare(a.nome)); break;
        case 'price-asc':  result.sort((a,b) => a.preco - b.preco); break;
        case 'price-desc': result.sort((a,b) => b.preco - a.preco); break;
        default:
            if (currentCategory === 'Cintas') result.sort((a,b) => a.nome.localeCompare(b.nome));
    }
    return result;
}

// ── Render sidebar ───────────────────────────────────────────
function renderSidebar() {
    const container = document.getElementById('sidebarCats');
    if (!container) return;
    const cats = getCategories();
    const countMap = {};
    produtos.forEach(p => { countMap[p.categoria] = (countMap[p.categoria]||0) + 1; });

    // "Todos" entry
    const totalEl = document.createElement('div');
    totalEl.className = `sidebar-cat-item${currentCategory === 'Todos' ? ' active' : ''}`;
    totalEl.dataset.cat = 'Todos';
    totalEl.innerHTML = `<span>Todos</span><span class="cat-count">${produtos.length}</span>`;
    container.innerHTML = '';
    container.appendChild(totalEl);

    cats.forEach(cat => {
        const el = document.createElement('div');
        el.className = `sidebar-cat-item${currentCategory === cat ? ' active' : ''}`;
        el.dataset.cat = cat;
        el.innerHTML = `<span>${cat}</span><span class="cat-count">${countMap[cat]||0}</span>`;
        container.appendChild(el);
    });

    container.querySelectorAll('.sidebar-cat-item').forEach(el => {
        el.addEventListener('click', () => {
            currentCategory = el.dataset.cat;
            renderSidebar();
            renderProducts();
            renderActiveFilters();
        });
    });

    // update header stats
    const tc = document.getElementById('totalCategories');
    if (tc) tc.textContent = cats.length;
}

// ── Render active filter chips ────────────────────────────────
function renderActiveFilters() {
    const container = document.getElementById('activeFilters');
    if (!container) return;
    container.innerHTML = '';
    if (currentCategory !== 'Todos') {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `<i class="fa-solid fa-tag"></i>${currentCategory}<button onclick="removeCatFilter()"><i class="fa-solid fa-xmark"></i></button>`;
        container.appendChild(chip);
    }
    if (searchQuery) {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i>"${searchQuery}"<button onclick="clearSearch()"><i class="fa-solid fa-xmark"></i></button>`;
        container.appendChild(chip);
    }
    if (destaqueOnly) {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `<i class="fa-solid fa-star"></i>Destaques<button onclick="clearDestaque()"><i class="fa-solid fa-xmark"></i></button>`;
        container.appendChild(chip);
    }
}

// ── Render products ──────────────────────────────────────────
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    const resultsInfo = document.getElementById('resultsInfo');
    if (!grid) return;

    const filtered = filterProducts();

    if (!filtered.length) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        const term = document.getElementById('noResultsTerm');
        if (term) term.textContent = searchQuery || currentCategory;
        if (resultsInfo) resultsInfo.textContent = '';
        return;
    }

    if (noResults) noResults.style.display = 'none';
    if (resultsInfo) resultsInfo.textContent = `${filtered.length} produto${filtered.length !== 1 ? 's' : ''}`;

    grid.innerHTML = filtered.map(p => {
        const displayName = p.nome.replace(/GR (\d+)/g, 'GR $1');
        return `
        <div class="product-card${p.destaque ? ' destaque' : ''}">
            <div class="product-number" aria-label="Produto ${p.numero} de ${produtos.length}">${p.numero}</div>
            <div class="product-img-wrap">
                <img src="${p.imagem}" alt="${p.nome}" loading="lazy"
                     onerror="this.src='assets/images/logo_favicon.png'">
            </div>
            <div class="product-body">
                <div class="product-cat-tag">${p.categoria}</div>
                <div class="product-name">${displayName}</div>
                <div class="product-price">
                    <span class="currency">R$</span>${p.preco.toFixed(2).replace('.',',')}
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-add-cart" data-id="${p.id}">
                    <i class="fa-solid fa-plus"></i> Adicionar
                </button>
                <button class="btn-wa-quick" data-id="${p.id}" title="Pedir via WhatsApp">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');

    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = produtos.find(x => x.id === +btn.dataset.id);
            if (!p) return;
            addToCart(p);
            btn.classList.add('added');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Adicionado';
            setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar'; }, 1500);
        });
    });

    grid.querySelectorAll('.btn-wa-quick').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = produtos.find(x => x.id === +btn.dataset.id);
            if (p) quickWa(p);
        });
    });
}

function quickWa(product) {
    const msg = `Olá ABC Abrasivos! Tenho interesse no produto:\n\n*${product.nome}*\nR$ ${product.preco.toFixed(2).replace('.',',')}\n\nPoderia me passar mais informações?`;
    window.open(`https://wa.me/${appConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Cart modal ────────────────────────────────────────────────
function renderCart() {
    const list = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('budgetTotal');
    if (!list) return;
    if (!cart.length) {
        list.innerHTML = `<p class="text-center" style="color:var(--text-muted);padding:2rem 0;"><i class="fa-solid fa-cart-shopping d-block mb-2" style="font-size:2rem;color:var(--text-dim);"></i>Seu orçamento está vazio.</p>`;
        if (totalEl) totalEl.innerHTML = 'Total: <span>R$ 0,00</span>';
        return;
    }
    list.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-img"><img src="${item.imagem}" alt="${item.nome}" onerror="this.src='assets/images/logo_favicon.png'"></div>
            <div class="cart-item-name">${item.nome}</div>
            <div class="qty-control">
                <button class="qty-btn" data-action="minus" data-id="${item.id}">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-btn" data-action="plus" data-id="${item.id}">+</button>
            </div>
            <div class="cart-item-price">${formatPrice(item.preco * item.qty)}</div>
            <button class="cart-item-remove" data-id="${item.id}"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
    const total = cart.reduce((s,i) => s + i.preco * i.qty, 0);
    if (totalEl) totalEl.innerHTML = `Total: <span>${formatPrice(total)}</span>`;
    list.querySelectorAll('.qty-btn').forEach(btn => btn.addEventListener('click', () => changeQty(+btn.dataset.id, btn.dataset.action === 'plus' ? 1 : -1)));
    list.querySelectorAll('.cart-item-remove').forEach(btn => btn.addEventListener('click', () => removeFromCart(+btn.dataset.id)));
}

function buildWaMessage() {
    const name = (document.getElementById('customerName')?.value||'').trim();
    const company = (document.getElementById('customerCompany')?.value||'').trim();
    const obs = (document.getElementById('customerObs')?.value||'').trim();
    let msg = `${appConfig.whatsappGreeting}\n\n`;
    if (name) msg += `*Nome:* ${name}\n`;
    if (company) msg += `*Empresa:* ${company}\n`;
    msg += '\n*Produtos do orçamento:*\n';
    cart.forEach(i => { msg += `• ${i.nome} (x${i.qty}) — ${formatPrice(i.preco * i.qty)}\n`; });
    msg += `\n*Total estimado:* ${formatPrice(cart.reduce((s,i) => s + i.preco * i.qty, 0))}`;
    if (obs) msg += `\n\n*Observações:* ${obs}`;
    return msg;
}

// ── Render drawer categories ─────────────────────────────────
function renderDrawerCats() {
    const container = document.getElementById('drawerCats');
    if (!container) return;
    const cats = getCategories();
    const countMap = {};
    produtos.forEach(p => { countMap[p.categoria] = (countMap[p.categoria]||0)+1; });

    container.innerHTML = ['Todos', ...cats].map(cat => `
        <div class="drawer-cat-item${currentCategory === cat ? ' active' : ''}" data-cat="${cat}">
            <span>${cat}</span>
            <span class="cat-count">${cat === 'Todos' ? produtos.length : (countMap[cat]||0)}</span>
        </div>
    `).join('');

    container.querySelectorAll('.drawer-cat-item').forEach(el => {
        el.addEventListener('click', () => {
            currentCategory = el.dataset.cat;
            container.querySelectorAll('.drawer-cat-item').forEach(x => x.classList.remove('active'));
            el.classList.add('active');
        });
    });
}

// ── Update filter badge count ────────────────────────────────
function updateFilterBadge() {
    const badge = document.getElementById('filterBadge');
    if (!badge) return;
    let count = 0;
    if (currentCategory !== 'Todos') count++;
    if (searchQuery) count++;
    if (destaqueOnly) count++;
    if (sortMode !== 'default') count++;
    badge.textContent = count || '';
    badge.classList.toggle('visible', count > 0);
    const btn = document.getElementById('btnFiltros');
    btn?.classList.toggle('active', count > 0);
}

// ── Wire social/WA links ──────────────────────────────────────
function wireLinks() {
    const wa = `https://wa.me/${appConfig.whatsappNumber}?text=${encodeURIComponent(appConfig.whatsappGreeting)}`;
    ['footerWa'].forEach(id => { const el=document.getElementById(id); if(el) el.href=wa; });
}

// ── Global helpers (called from HTML onclick) ─────────────────
window.removeCatFilter  = () => { currentCategory = 'Todos'; renderSidebar(); renderProducts(); renderActiveFilters(); };
window.clearSearch      = () => { const inp=document.getElementById('searchInput'); if(inp) inp.value=''; searchQuery=''; const cc=document.getElementById('searchClear'); if(cc) cc.classList.remove('visible'); renderProducts(); renderActiveFilters(); };
window.clearDestaque    = () => { destaqueOnly=false; const cb=document.getElementById('destaqueFilter'); if(cb) cb.checked=false; renderProducts(); renderActiveFilters(); };
window.clearAllFilters  = () => { window.removeCatFilter(); window.clearSearch(); window.clearDestaque(); };

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    renderSidebar();
    renderProducts();
    wireLinks();

    // update header total count
    const tc = document.getElementById('totalProducts');
    if (tc) tc.textContent = produtos.length;

    // navbar scroll
    const nav = document.getElementById('mainNavbar');
    window.addEventListener('scroll', () => nav?.classList.toggle('scrolled', window.scrollY > 60));

    // ── Desktop search ──
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    searchInput?.addEventListener('input', () => {
        searchQuery = searchInput.value.trim();
        searchClear?.classList.toggle('visible', searchQuery.length > 0);
        renderProducts();
        renderActiveFilters();
        updateFilterBadge();
    });
    searchClear?.addEventListener('click', () => window.clearSearch());

    // ── Mobile search ──
    const mobileSearch = document.getElementById('mobileSearchInput');
    mobileSearch?.addEventListener('input', () => {
        searchQuery = mobileSearch.value.trim();
        renderProducts();
        renderActiveFilters();
        updateFilterBadge();
    });

    // ── Desktop sort ──
    document.getElementById('sortSelect')?.addEventListener('change', e => {
        sortMode = e.target.value;
        renderProducts();
    });

    // ── Desktop destaque ──
    document.getElementById('destaqueFilter')?.addEventListener('change', e => {
        destaqueOnly = e.target.checked;
        renderProducts();
        renderActiveFilters();
        updateFilterBadge();
    });

    // ── DRAWER logic ──
    const drawer        = document.getElementById('filterDrawer');
    const overlay       = document.getElementById('drawerOverlay');
    const btnFiltros    = document.getElementById('btnFiltros');
    const drawerClose   = document.getElementById('drawerClose');
    const drawerApply   = document.getElementById('drawerApply');
    const drawerClear   = document.getElementById('drawerClear');

    function openDrawer() {
        renderDrawerCats();
        drawer?.classList.add('open');
        overlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
        drawer?.classList.remove('open');
        overlay?.classList.remove('open');
        document.body.style.overflow = '';
    }

    btnFiltros?.addEventListener('click', openDrawer);
    drawerClose?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);
    drawerApply?.addEventListener('click', () => { renderProducts(); renderActiveFilters(); updateFilterBadge(); closeDrawer(); });
    drawerClear?.addEventListener('click', () => {
        currentCategory = 'Todos'; sortMode = 'default'; destaqueOnly = false;
        const ms = document.getElementById('mobileSearchInput'); if (ms) ms.value = '';
        searchQuery = '';
        document.getElementById('drawerDestaque') && (document.getElementById('drawerDestaque').checked = false);
        document.querySelectorAll('.sort-pill').forEach(p => p.classList.toggle('active', p.dataset.sort === 'default'));
        renderDrawerCats();
        renderProducts(); renderActiveFilters(); updateFilterBadge();
    });

    // Drawer sort pills
    document.getElementById('drawerSort')?.querySelectorAll('.sort-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.sort-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            sortMode = pill.dataset.sort;
        });
    });

    // Drawer destaque
    document.getElementById('drawerDestaque')?.addEventListener('change', e => { destaqueOnly = e.target.checked; });

    // view toggle
    document.getElementById('viewGrid')?.addEventListener('click', () => {
        document.body.classList.remove('list-view');
        document.getElementById('viewGrid')?.classList.add('active');
        document.getElementById('viewList')?.classList.remove('active');
    });
    document.getElementById('viewList')?.addEventListener('click', () => {
        document.body.classList.add('list-view');
        document.getElementById('viewList')?.classList.add('active');
        document.getElementById('viewGrid')?.classList.remove('active');
    });

    // modal
    document.getElementById('budgetModal')?.addEventListener('show.bs.modal', renderCart);
    document.getElementById('sendWaBtn')?.addEventListener('click', () => {
        if (!cart.length) { showToast('Adicione produtos primeiro.'); return; }
        window.open(`https://wa.me/${appConfig.whatsappNumber}?text=${encodeURIComponent(buildWaMessage())}`, '_blank');
    });
    document.getElementById('clearCartBtn')?.addEventListener('click', () => {
        cart = []; saveCart(); renderCart(); showToast('Orçamento limpo.');
    });
});
