'use strict';

const ABC = (() => {
    const config = APP_CONFIG;
    const fallbackImage = 'assets/images/site/logo_favicon.png';

    const searchSynonyms = {
        pgs: ['pg', 'roda', 'rodas'],
        pg: ['pgs', 'roda', 'rodas'],
        disco: ['discos'],
        discos: ['disco'],
        flap: ['flapdisc'],
        lixa: ['lixas', 'abrasivo'],
        lixas: ['lixa', 'abrasivo'],
        cinta: ['cintas', 'correia'],
        cintas: ['cinta', 'correia'],
        scoth: ['scotch', 'scothbrite', 'scotchbrite'],
        scotch: ['scoth', 'scothbrite', 'scotchbrite'],
        zirconia: ['zirconio', 'zirc'],
        roda: ['rodas'],
        rodas: ['roda'],
        sisal: ['algodao', 'polimento'],
        algodao: ['sisal', 'polimento'],
        flanela: ['polimento'],
        ventilada: ['ventilado'],
        plissada: ['plissado'],
        escova: ['escovas'],
        escovas: ['escova'],
        massa: ['massas', 'polir'],
        massas: ['massa', 'polir'],
        sebo: ['lubrificante'],
        epi: ['epis', 'protecao'],
        epis: ['epi', 'protecao'],
        luva: ['luvas'],
        luvas: ['luva'],
        avental: ['aventais'],
        mangote: ['mangotes'],
    };

    let cart = [];

    function normalize(value = '') {
        return String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .trim();
    }

    function tokenize(value = '') {
        return normalize(value).split(/\s+/).filter(Boolean);
    }

    function matchTokens(productTokens, queryTokens) {
        return queryTokens.every((queryToken) => {
            const candidates = [queryToken, ...(searchSynonyms[queryToken] || [])];
            return productTokens.some((productToken) => (
                candidates.some((candidate) => (
                    productToken.includes(candidate) ||
                    (productToken.length >= 3 && candidate.includes(productToken))
                ))
            ));
        });
    }

    function formatPrice(value) {
        return Number(value).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    }

    function showToast(message, type = '') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-item${type ? ` ${type}` : ''}`;
        toast.textContent = message;
        container.appendChild(toast);

        window.setTimeout(() => toast.remove(), 3000);
    }

    function readJson(key, fallback) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key));
            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    }

    function loadCart() {
        const saved = readJson(config.storageKey, []);
        cart = Array.isArray(saved) ? saved : [];
        updateCartBadges();
        return cart;
    }

    function saveCart() {
        localStorage.setItem(config.storageKey, JSON.stringify(cart));
        updateCartBadges();
    }

    function getCart() {
        return cart;
    }

    function updateCartBadges() {
        const total = cart.reduce((sum, item) => sum + item.qty, 0);
        document.querySelectorAll('#cartCount, #fabCartCount').forEach((badge) => {
            badge.textContent = total;
            badge.style.display = total > 0 ? '' : 'none';
        });
    }

    function addToCart(product) {
        const existing = cart.find((item) => item.id === product.id);

        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ ...product, qty: 1 });
        }

        saveCart();
        showToast(`${product.nome.slice(0, 42)} adicionado!`, 'success');
    }

    function removeFromCart(id) {
        cart = cart.filter((item) => item.id !== id);
        saveCart();
    }

    function changeCartQuantity(id, delta) {
        const item = cart.find((cartItem) => cartItem.id === id);
        if (!item) return;

        item.qty = Math.max(1, item.qty + delta);
        saveCart();
    }

    function clearCart() {
        cart = [];
        saveCart();
    }

    function productNumber(product) {
        return product.numero ?? product.id;
    }

    function priceLabel(price) {
        return Number(price) > 0
            ? `<span class="currency">R$</span>${Number(price).toFixed(2).replace('.', ',')}`
            : '<span class="currency">Sob consulta</span>';
    }

    function productCard(product) {
        const displayName = product.nome.replace(/GR (\d+)/g, 'GR&nbsp;$1');
        const number = productNumber(product);

        return `
            <div class="product-card${product.destaque ? ' destaque' : ''}" data-id="${product.id}">
                <div class="product-number" aria-label="Produto ${number}">${number}</div>
                <div class="product-img-wrap">
                    <img src="${product.imagem}" alt="${product.nome}" loading="lazy" onerror="this.src='${fallbackImage}'">
                </div>
                <div class="product-body">
                    <div class="product-cat-tag">${product.categoria}</div>
                    <div class="product-name">${displayName}</div>
                    <div class="product-price">${priceLabel(product.preco)}</div>
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" data-id="${product.id}">
                        <i class="fa-solid fa-plus"></i> Adicionar
                    </button>
                    <button class="btn-wa-quick" data-id="${product.id}" title="Pedir via WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function emptyCartHtml() {
        return `
            <p class="text-center cart-empty">
                <i class="fa-solid fa-cart-shopping d-block mb-2"></i>
                Seu orçamento está vazio.<br>Adicione produtos do catálogo.
            </p>
        `;
    }

    function renderCart() {
        const list = document.getElementById('cartItemsList');
        const totalElement = document.getElementById('budgetTotal');
        if (!list) return;

        if (!cart.length) {
            list.innerHTML = emptyCartHtml();
            if (totalElement) totalElement.innerHTML = 'Total: <span>R$ 0,00</span>';
            return;
        }

        list.innerHTML = cart.map((item) => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-img">
                    <img src="${item.imagem}" alt="${item.nome}" onerror="this.src='${fallbackImage}'">
                </div>
                <div class="cart-item-name">${item.nome}</div>
                <div class="qty-control">
                    <button class="qty-btn" data-action="minus" data-id="${item.id}">-</button>
                    <span class="qty-num">${item.qty}</span>
                    <button class="qty-btn" data-action="plus" data-id="${item.id}">+</button>
                </div>
                <div class="cart-item-price">${formatPrice(item.preco * item.qty)}</div>
                <button class="cart-item-remove" data-id="${item.id}" title="Remover">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `).join('');

        const total = cart.reduce((sum, item) => sum + item.preco * item.qty, 0);
        if (totalElement) totalElement.innerHTML = `Total: <span>${formatPrice(total)}</span>`;

        list.querySelectorAll('.qty-btn').forEach((button) => {
            button.addEventListener('click', () => {
                changeCartQuantity(Number(button.dataset.id), button.dataset.action === 'plus' ? 1 : -1);
                renderCart();
            });
        });

        list.querySelectorAll('.cart-item-remove').forEach((button) => {
            button.addEventListener('click', () => {
                removeFromCart(Number(button.dataset.id));
                renderCart();
            });
        });
    }

    function saveCustomer() {
        const data = {
            name: document.getElementById('customerName')?.value || '',
            company: document.getElementById('customerCompany')?.value || '',
            obs: document.getElementById('customerObs')?.value || '',
        };
        localStorage.setItem(config.customerStorageKey, JSON.stringify(data));
    }

    function loadCustomer() {
        const saved = readJson(config.customerStorageKey, null);
        if (!saved) return;

        const fields = {
            customerName: saved.name,
            customerCompany: saved.company,
            customerObs: saved.obs,
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value || '';
        });
    }

    function buildBudgetMessage() {
        const name = (document.getElementById('customerName')?.value || '').trim();
        const company = (document.getElementById('customerCompany')?.value || '').trim();
        const obs = (document.getElementById('customerObs')?.value || '').trim();
        const total = cart.reduce((sum, item) => sum + item.preco * item.qty, 0);

        let message = `${config.whatsappGreeting}\n\n`;
        if (name) message += `*Nome:* ${name}\n`;
        if (company) message += `*Empresa:* ${company}\n`;
        message += '\n*Produtos do orçamento:*\n';

        cart.forEach((item) => {
            message += `- ${item.nome} (x${item.qty}) - ${formatPrice(item.preco * item.qty)}\n`;
        });

        message += `\n*Total estimado:* ${formatPrice(total)}`;
        if (obs) message += `\n\n*Observações:* ${obs}`;
        return message;
    }

    function openWhatsApp(message) {
        window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    }

    function quickWhatsApp(product) {
        const message = [
            'Olá ABC Abrasivos! Tenho interesse no produto:',
            '',
            `*${product.nome}*`,
            Number(product.preco) > 0 ? formatPrice(product.preco) : 'Preço sob consulta',
            '',
            'Poderia me passar mais informações?',
        ].join('\n');

        openWhatsApp(message);
    }

    function sendBudgetToWhatsApp(emptyMessage = 'Adicione produtos ao orçamento primeiro.') {
        if (!cart.length) {
            showToast(emptyMessage);
            return;
        }

        openWhatsApp(buildBudgetMessage());
    }

    function wireCartModal(options = {}) {
        const emptyMessage = options.emptyMessage || 'Adicione produtos ao orçamento primeiro.';

        ['customerName', 'customerCompany', 'customerObs'].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', saveCustomer);
        });

        document.getElementById('budgetModal')?.addEventListener('show.bs.modal', () => {
            renderCart();
            loadCustomer();
        });

        document.getElementById('sendWaBtn')?.addEventListener('click', () => {
            sendBudgetToWhatsApp(emptyMessage);
        });

        document.getElementById('clearCartBtn')?.addEventListener('click', () => {
            clearCart();
            renderCart();
            showToast('Orçamento limpo.');
        });
    }

    function setLink(id, href) {
        const element = document.getElementById(id);
        if (element) element.href = href;
    }

    function wireSocialLinks() {
        const whatsappUrl = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(config.whatsappGreeting)}`;

        ['heroWaBtn', 'waContactLink', 'footerWaBtn', 'footerWaLink', 'footerWa'].forEach((id) => {
            setLink(id, whatsappUrl);
        });

        setLink('instaLink', config.socialLinks.instagram || '#');
        setLink('footerInstaLink', config.socialLinks.instagram || '#');
        setLink('sideInsta', config.socialLinks.instagram || '#');

        setLink('fbLink', config.socialLinks.facebook || '#');
        setLink('footerFbLink', config.socialLinks.facebook || '#');
        setLink('sideFb', config.socialLinks.facebook || '#');

        setLink('liLink', config.socialLinks.linkedin || '#');
        setLink('footerLiLink', config.socialLinks.linkedin || '#');
        setLink('sideLi', config.socialLinks.linkedin || '#');

        if (config.socialLinks.youtube) setLink('ytLink', config.socialLinks.youtube);

        if (!config.contact) return;
        setLink('phoneLinkContact', config.contact.phoneHref);
        setLink('emailLinkContact', config.contact.emailHref);
        setLink('footerPhone', config.contact.phoneHref);
        setLink('footerEmail', config.contact.emailHref);

        const address = document.getElementById('addressContact');
        if (address && config.contact.addressHtml) address.innerHTML = config.contact.addressHtml;

        const map = document.getElementById('contactMapIframe');
        if (map && config.contact.mapEmbedUrl) map.src = config.contact.mapEmbedUrl;
    }

    return {
        config,
        fallbackImage,
        normalize,
        tokenize,
        matchTokens,
        formatPrice,
        showToast,
        loadCart,
        saveCart,
        getCart,
        addToCart,
        clearCart,
        productCard,
        quickWhatsApp,
        renderCart,
        wireCartModal,
        wireSocialLinks,
    };
})();
