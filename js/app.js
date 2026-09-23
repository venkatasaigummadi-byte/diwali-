// ==========================================================================
// Sri Ayyappa Crackers - Application Engine
// ==========================================================================

// Global State
let currentCategory = 'all';
let searchQuery = '';
let sortBy = 'popular';
let cart = loadCart();
let currentSlide = 0;
let slideInterval = null;
let soundEnabled = localStorage.getItem('ayyappa_sound') === 'true';
let activeContactPhone = CONTACTS[0].phone;
let reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('ayyappa_cart')) || [];
  } catch (e) {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem('ayyappa_cart', JSON.stringify(cart));
  } catch (e) {
    // Storage unavailable (private mode) - cart still works for the session
  }
}

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const categoryScrollContainer = document.getElementById('categoryScrollContainer');
const sortSelect = document.getElementById('sortSelect');
const catalogCountEl = document.getElementById('catalogCount');
const activeCategoryNameEl = document.getElementById('activeCategoryName');

// Cart DOM
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartSubtotalEl = document.getElementById('cartSubtotal');
const cartDiscountEl = document.getElementById('cartDiscount');
const cartGrandTotalEl = document.getElementById('cartGrandTotal');
const cartRecipientSelect = document.getElementById('cartRecipientSelect');
const cartCustomerName = document.getElementById('cartCustomerName');
const cartCustomerAddress = document.getElementById('cartCustomerAddress');
const btnCartCheckout = document.getElementById('btnCartCheckout');
const headerCartCount = document.getElementById('headerCartCount');
const fabCartCount = document.getElementById('fabCartCount');
const toastNotice = document.getElementById('toastNotice');
const toastMessage = document.getElementById('toastMessage');
const soundToggleBtn = document.getElementById('soundToggleBtn');

// Bill Modal DOM
const billModal = document.getElementById('billModal');
const billModalOverlay = document.getElementById('billModalOverlay');
const billModalCloseBtn = document.getElementById('billModalCloseBtn');
const billPreviewImage = document.getElementById('billPreviewImage');
const btnSendWhatsAppWithBill = document.getElementById('btnSendWhatsAppWithBill');
let lastGeneratedBill = null;

// Mobile Navigation DOM
const navToggleBtn = document.getElementById('navToggleBtn');
const mobileNavPanel = document.getElementById('mobileNavPanel');

// ==========================================================================
// Synthesized Web Audio API Crackle Sound
// ==========================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playCrackerSound(intensity = 1) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200 * intensity;
    filter.Q.value = 3.0;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.3 * intensity, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
  } catch (e) {
    console.debug('Audio error', e);
  }
}

function updateSoundButton() {
  if (!soundToggleBtn) return;
  if (soundEnabled) {
    soundToggleBtn.innerHTML = '🔊 Sound ON';
    soundToggleBtn.style.color = '#ffd700';
    soundToggleBtn.setAttribute('aria-pressed', 'true');
    soundToggleBtn.setAttribute('aria-label', 'Mute festive sound effects');
  } else {
    soundToggleBtn.innerHTML = '🔇 Sound OFF';
    soundToggleBtn.style.color = '#9f9bb8';
    soundToggleBtn.setAttribute('aria-pressed', 'false');
    soundToggleBtn.setAttribute('aria-label', 'Enable festive sound effects');
  }
}

// ==========================================================================
// Category Pills Initialization
// ==========================================================================
function renderCategoryPills() {
  if (!categoryScrollContainer) return;
  categoryScrollContainer.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const isActive = cat.id === currentCategory;
    const pill = document.createElement('button');
    pill.className = `category-pill ${isActive ? 'active' : ''}`;
    pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    pill.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span>`;
    pill.addEventListener('click', () => {
      currentCategory = cat.id;
      renderCategoryPills();
      filterAndRenderProducts();
      playCrackerSound(0.8);
    });
    categoryScrollContainer.appendChild(pill);
  });
}

// ==========================================================================
// Contact Selector Initialization
// ==========================================================================
function initContactSelector() {
  if (!cartRecipientSelect) return;
  cartRecipientSelect.innerHTML = '';
  CONTACTS.forEach(contact => {
    const opt = document.createElement('option');
    opt.value = contact.phone;
    opt.textContent = `${contact.name} (${contact.displayPhone}) - ${contact.role}`;
    if (contact.isDefault) opt.selected = true;
    cartRecipientSelect.appendChild(opt);
  });

  cartRecipientSelect.addEventListener('change', (e) => {
    activeContactPhone = e.target.value;
  });
}

// ==========================================================================
// Product Filtering & Sorting
// ==========================================================================
function getFilteredProducts() {
  return PRODUCTS.filter(product => {
    const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      product.name.toLowerCase().includes(q) ||
      (product.teluguName && product.teluguName.toLowerCase().includes(q)) ||
      product.category.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q);

    return matchesCategory && matchesQuery;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    // default popular
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });
}

// ==========================================================================
// Render Products Grid
// ==========================================================================
function filterAndRenderProducts() {
  const filtered = getFilteredProducts();

  if (catalogCountEl) catalogCountEl.textContent = `Showing ${filtered.length} products`;
  if (activeCategoryNameEl) {
    const catObj = CATEGORIES.find(c => c.id === currentCategory);
    activeCategoryNameEl.textContent = catObj ? catObj.name : 'Fireworks';
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="empty-catalog-state">
        <div class="empty-icon">🎆</div>
        <h3>No Fireworks Found</h3>
        <p>Try searching for something else like "Sparklers", "Shots", "Wala", or clear your search.</p>
        <button class="category-pill active" style="margin-top: 1rem;" onclick="resetFilters()">Show All Products</button>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = '';

  filtered.forEach((product, idx) => {
    const card = document.createElement('div');
    card.className = `product-card ${product.featured ? 'featured-card' : ''}`;
    card.setAttribute('data-id', product.id);

    const discountAmount = product.originalPrice ? product.originalPrice - product.price : 0;
    const categoryName = CATEGORIES.find(c => c.id === product.category)?.name.split(' ')[0] || 'Fireworks';

    card.innerHTML = `
      <div class="product-image-box">
        <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='images/banner.png';">
        ${product.discount ? `<span class="discount-badge-overlay">${product.discount}</span>` : ''}
        ${product.badge ? `<span class="custom-badge-overlay">${product.badge}</span>` : ''}
      </div>
      <div class="product-body">
        <div class="product-category-chip">${categoryName}</div>
        <h3 class="product-title" title="${product.name}">${product.name}</h3>
        ${product.teluguName ? `<div class="product-telugu-name">${product.teluguName}</div>` : ''}
        <span class="product-pieces-chip">📦 ${product.pieces}</span>
        
        <div class="product-pricing-box">
          <div class="price-row">
            <span class="sale-price">₹${product.price}</span>
            ${product.originalPrice ? `<span class="original-price">₹${product.originalPrice}</span>` : ''}
            ${discountAmount > 0 ? `<span class="save-pill">Save ₹${discountAmount}</span>` : ''}
          </div>

          <div class="card-cart-action-row">
            <div class="quantity-controller-compact">
              <button class="qty-btn-sm dec-btn" data-id="${product.id}" aria-label="Decrease quantity">−</button>
              <span class="qty-display-sm" id="qty-${product.id}">1</span>
              <button class="qty-btn-sm inc-btn" data-id="${product.id}" aria-label="Increase quantity">+</button>
            </div>

            <button class="btn-card-add-cart" data-id="${product.id}">
              <span>🛒</span> Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;

    productsGrid.appendChild(card);
  });

  // Attach card event listeners
  attachProductCardEvents();
  bindProductDetailTriggers();

  // Trigger scroll reveal observer
  observeCards();
}

function resetFilters() {
  currentCategory = 'all';
  searchQuery = '';
  if (searchInput) searchInput.value = '';
  if (searchClearBtn) searchClearBtn.style.display = 'none';
  renderCategoryPills();
  filterAndRenderProducts();
}

// ==========================================================================
// Card Actions: Quantity & Add to Cart
// ==========================================================================
function attachProductCardEvents() {
  // Quantity buttons
  document.querySelectorAll('.qty-btn-sm.inc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const qtyEl = document.getElementById(`qty-${id}`);
      let currentQty = parseInt(qtyEl.textContent, 10) || 1;
      if (currentQty < 99) {
        qtyEl.textContent = currentQty + 1;
        playCrackerSound(0.9);
      }
    });
  });

  document.querySelectorAll('.qty-btn-sm.dec-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const qtyEl = document.getElementById(`qty-${id}`);
      let currentQty = parseInt(qtyEl.textContent, 10) || 1;
      if (currentQty > 1) {
        qtyEl.textContent = currentQty - 1;
        playCrackerSound(0.7);
      }
    });
  });

  // Add to Cart
  document.querySelectorAll('.btn-card-add-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return;

      const qtyEl = document.getElementById(`qty-${id}`);
      const quantity = parseInt(qtyEl ? qtyEl.textContent : '1', 10) || 1;

      addToCart(product, quantity);
      playCrackerSound(1.2);
    });
  });
}

// ==========================================================================
// Cart Logic
// ==========================================================================
function addToCart(product, quantity = 1) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      teluguName: product.teluguName,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      pieces: product.pieces,
      image: product.image,
      quantity: quantity
    });
  }

  saveCart();
  updateCartUI();
  showToast(`Added ${quantity}x ${product.name} to Diwali Cart! 🎇`);
  triggerFireworksBurst(window.innerWidth - 80, window.innerHeight - 80);
}

function updateCartItemQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  saveCart();
  updateCartUI();
  playCrackerSound(0.8);
}

function removeCartItem(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
  playCrackerSound(0.6);
  showToast('Item removed from cart.');
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (headerCartCount) headerCartCount.textContent = totalCount;
  if (fabCartCount) fabCartCount.textContent = totalCount;

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-view">
        <div class="empty-cart-icon">🛒</div>
        <h3>Your Diwali Cart is Empty</h3>
        <p style="margin-top: 0.5rem; font-size: 0.88rem;">Explore our 2026 cracker collection and add your favourite fireworks!</p>
      </div>
    `;
    if (cartSubtotalEl) cartSubtotalEl.textContent = '₹0';
    if (cartDiscountEl) cartDiscountEl.textContent = '₹0';
    if (cartGrandTotalEl) cartGrandTotalEl.textContent = '₹0';
    return;
  }

  let subtotal = 0;
  let originalSubtotal = 0;

  cartItemsContainer.innerHTML = '';
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    originalSubtotal += (item.originalPrice || item.price) * item.quantity;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <div class="cart-item-thumbnail">
        <img src="${item.image}" alt="${item.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='images/banner.png';">
      </div>
      <div>
        <h4 class="cart-item-name">${item.name}</h4>
        <div class="cart-item-price">₹${item.price} each · ₹${itemTotal}</div>
      </div>
      <div style="display: flex; align-items: center;">
        <div class="cart-item-qty-adjuster">
          <button class="cart-item-qty-btn" onclick="updateCartItemQty('${item.id}', -1)" aria-label="Decrease quantity of ${item.name}">−</button>
          <span class="cart-item-qty-val">${item.quantity}</span>
          <button class="cart-item-qty-btn" onclick="updateCartItemQty('${item.id}', 1)" aria-label="Increase quantity of ${item.name}">+</button>
        </div>
        <button class="cart-item-delete" onclick="removeCartItem('${item.id}')" title="Remove item" aria-label="Remove ${item.name} from cart">✕</button>
      </div>
    `;
    cartItemsContainer.appendChild(row);
  });

  const totalDiscount = Math.max(0, originalSubtotal - subtotal);

  if (cartSubtotalEl) cartSubtotalEl.textContent = `₹${originalSubtotal}`;
  if (cartDiscountEl) cartDiscountEl.textContent = `-₹${totalDiscount} (20% OFF)`;
  if (cartGrandTotalEl) cartGrandTotalEl.textContent = `₹${subtotal}`;
}

// Cart Drawer open/close
function openCart() {
  if (cartDrawer && cartOverlay) {
    closeMobileNav();
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const closeBtn = document.getElementById('cartCloseBtn');
    if (closeBtn) closeBtn.focus();
  }
}

function closeCart() {
  if (cartDrawer && cartOverlay) {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// ==========================================================================
// Bill Receipt Canvas Generator & Checkout Flow
// ==========================================================================
function generateBillReceipt(customerName, customerAddress, targetPhone) {
  const canvas = document.getElementById('billCanvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const width = 800;
  const headerHeight = 145;
  const metaHeight = 135;
  const itemRowHeight = 38;
  const tableHeaderHeight = 40;
  const itemsHeight = Math.max(1, cart.length) * itemRowHeight + tableHeaderHeight;
  const totalsHeight = 135;
  const footerHeight = 105;
  const height = headerHeight + metaHeight + itemsHeight + totalsHeight + footerHeight;

  canvas.width = width;
  canvas.height = height;

  // Background - clean crisp ivory white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer Decorative Borders
  ctx.strokeStyle = '#800000';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // Header Banner Ribbon
  const ribbonGrad = ctx.createLinearGradient(0, 22, width, 22);
  ribbonGrad.addColorStop(0, '#6B0000');
  ribbonGrad.addColorStop(0.5, '#A30000');
  ribbonGrad.addColorStop(1, '#6B0000');
  ctx.fillStyle = ribbonGrad;
  ctx.fillRect(22, 22, width - 44, 108);

  // Gold Trim on Header
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, width - 52, 100);

  // Title & Subtitle
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('🪔 SRI AYYAPPA CRACKERS 🪔', width / 2, 65);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 15px sans-serif';
  ctx.fillText('100% Genuine Sivakasi Fireworks Depot · Retail & Wholesale Booking', width / 2, 92);

  ctx.fillStyle = '#FFE082';
  ctx.font = '500 13px sans-serif';
  ctx.fillText('Helplines: +91 96404 99753 · +91 95730 47342', width / 2, 112);

  // Invoice & Customer Info Box
  const metaY = 145;
  ctx.fillStyle = '#FDFBF7';
  ctx.fillRect(25, metaY, width - 50, 115);
  ctx.strokeStyle = '#E2D5BE';
  ctx.lineWidth = 1;
  ctx.strokeRect(25, metaY, width - 50, 115);

  const now = new Date();
  const invoiceNo = 'SAC-2026-' + Math.floor(1000 + Math.random() * 9000);
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#444444';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('INVOICE NO:', 40, metaY + 28);
  ctx.fillStyle = '#8B0000';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(invoiceNo, 165, metaY + 28);

  ctx.fillStyle = '#444444';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('BILL DATE:', 440, metaY + 28);
  ctx.fillStyle = '#222222';
  ctx.font = '600 13px sans-serif';
  ctx.fillText(dateStr, 535, metaY + 28);

  ctx.fillStyle = '#444444';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('CUSTOMER:', 40, metaY + 58);
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(customerName || 'Valued Customer', 165, metaY + 58);

  ctx.fillStyle = '#444444';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('DELIVERY TO:', 40, metaY + 88);
  ctx.fillStyle = '#111111';
  ctx.font = '500 13px sans-serif';
  const displayAddress = customerAddress || 'Direct Store Pickup / Address to be confirmed via WhatsApp';
  ctx.fillText(displayAddress.length > 70 ? displayAddress.substring(0, 68) + '...' : displayAddress, 165, metaY + 88);

  // Table Header
  const tableY = metaY + 130;
  ctx.fillStyle = '#800000';
  ctx.fillRect(25, tableY, width - 50, tableHeaderHeight);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('#', 45, tableY + 25);
  ctx.textAlign = 'left';
  ctx.fillText('FIREWORKS DESCRIPTION', 80, tableY + 25);
  ctx.textAlign = 'center';
  ctx.fillText('PACKING', 420, tableY + 25);
  ctx.fillText('QTY', 510, tableY + 25);
  ctx.textAlign = 'right';
  ctx.fillText('RATE (₹)', 630, tableY + 25);
  ctx.fillText('AMOUNT (₹)', 755, tableY + 25);

  // Table Rows
  let curY = tableY + tableHeaderHeight;
  let subtotal = 0;
  let originalSubtotal = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    originalSubtotal += (item.originalPrice || item.price) * item.quantity;

    ctx.fillStyle = index % 2 === 0 ? '#FFFFFF' : '#F9F7F2';
    ctx.fillRect(25, curY, width - 50, itemRowHeight);

    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 1;
    ctx.strokeRect(25, curY, width - 50, itemRowHeight);

    ctx.fillStyle = '#666666';
    ctx.font = '500 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(index + 1, 45, curY + 24);

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#222222';
    const itemName = item.name.length > 38 ? item.name.substring(0, 36) + '..' : item.name;
    ctx.fillText(itemName, 80, curY + 24);

    ctx.textAlign = 'center';
    ctx.font = '500 12px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(item.pieces || '-', 420, curY + 24);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(item.quantity, 510, curY + 24);

    ctx.textAlign = 'right';
    ctx.font = '500 13px sans-serif';
    ctx.fillText('₹' + item.price, 630, curY + 24);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('₹' + itemTotal, 755, curY + 24);

    curY += itemRowHeight;
  });

  // Totals Calculation & Display
  const totalDiscount = Math.max(0, originalSubtotal - subtotal);
  curY += 15;

  ctx.fillStyle = '#FFFDF8';
  ctx.fillRect(410, curY, 365, 110);
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 1;
  ctx.strokeRect(410, curY, 365, 110);

  ctx.textAlign = 'left';
  ctx.font = '600 14px sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText('Catalog Subtotal:', 430, curY + 28);
  ctx.textAlign = 'right';
  ctx.fillText('₹' + originalSubtotal, 755, curY + 28);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#2E7D32';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Special Discount (20% OFF):', 430, curY + 54);
  ctx.textAlign = 'right';
  ctx.fillText('-₹' + totalDiscount, 755, curY + 54);

  // Grand Total Banner
  ctx.fillStyle = '#800000';
  ctx.fillRect(410, curY + 68, 365, 42);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL PAYABLE:', 430, curY + 95);
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('₹' + subtotal, 755, curY + 95);

  // Left Side Official Stamp Seal
  const sealX = 180;
  const sealY = curY + 50;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sealX, sealY, 46, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(160, 0, 0, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sealX, sealY, 41, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(218, 165, 32, 0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#800000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('SRI AYYAPPA CRACKERS', sealX, sealY - 16);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#B22222';
  ctx.fillText('★ VERIFIED ★', sealX, sealY + 2);
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#800000';
  ctx.fillText('OFFICIAL BILL', sealX, sealY + 16);
  ctx.restore();

  // Footer Message
  const footerY = curY + 125;
  ctx.fillStyle = '#666666';
  ctx.font = 'italic 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ Thank you for choosing Sri Ayyappa Crackers! Wishing you a Safe & Prosperous Diwali! ✨', width / 2, footerY + 16);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#888888';
  ctx.fillText('Terms: All products are genuine Sivakasi standard fireworks. Order confirmed upon WhatsApp notification.', width / 2, footerY + 36);

  const dataUrl = canvas.toDataURL('image/png');

  return {
    invoiceNo,
    dateStr,
    subtotal,
    grandTotal: subtotal,
    totalDiscount,
    customerName: customerName || 'Valued Customer',
    customerAddress: displayAddress,
    targetPhone: targetPhone || '9640499753',
    dataUrl
  };
}

// Open / Close Bill Modal
function openBillModal(bill) {
  lastGeneratedBill = bill;
  if (billPreviewImage) {
    billPreviewImage.src = bill.dataUrl;
  }
  if (billModal && billModalOverlay) {
    billModal.classList.add('active');
    billModalOverlay.classList.add('active');
    billModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const closeBtn = document.getElementById('billModalCloseBtn');
    if (closeBtn) closeBtn.focus();
  }
}

function closeBillModal() {
  if (billModal && billModalOverlay) {
    billModal.classList.remove('active');
    billModalOverlay.classList.remove('active');
    billModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// Download Bill Receipt PNG
function downloadBillReceipt() {
  if (!lastGeneratedBill || !lastGeneratedBill.dataUrl) return;
  const link = document.createElement('a');
  link.download = `Sri_Ayyappa_Crackers_Bill_${lastGeneratedBill.invoiceNo}.png`;
  link.href = lastGeneratedBill.dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Bill receipt image downloaded! 📥');
}

// Copy Bill Image to Clipboard
async function copyBillImageToClipboard() {
  const canvas = document.getElementById('billCanvas');
  if (!canvas || !canvas.toBlob) return;

  canvas.toBlob(async (blob) => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('📋 Bill Image Copied! Just Paste (Ctrl+V) in WhatsApp!');
        playCrackerSound(1.0);
      } else {
        downloadBillReceipt();
        showToast('📥 Bill downloaded! Please attach image in WhatsApp.');
      }
    } catch (e) {
      console.warn('Clipboard write error', e);
      downloadBillReceipt();
      showToast('📥 Bill downloaded! Please attach image in WhatsApp.');
    }
  }, 'image/png');
}

// Upload receipt image to get direct public URL for WhatsApp image preview
async function uploadBillImage(canvas) {
  return new Promise((resolve) => {
    if (!canvas || !canvas.toBlob) return resolve(null);
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(null);
        const formData = new FormData();
        formData.append('file', blob, 'Sri_Ayyappa_Crackers_Bill.png');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        try {
          const res = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && data.data && data.data.url) {
              const directUrl = data.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
              return resolve(directUrl);
            }
          }
        } catch (e) {
          console.warn('Upload timed out or failed, proceeding with direct WhatsApp text:', e);
        }
        resolve(null);
      }, 'image/png');
    } catch (err) {
      resolve(null);
    }
  });
}

// Send Order via WhatsApp (Direct Redirect with Bill Image Link)
function canvasToFile(canvas, filename = 'Sri_Ayyappa_Crackers_Bill.png') {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (blob && window.File) {
          resolve(new File([blob], filename, { type: 'image/png' }));
        } else {
          resolve(null);
        }
      }, 'image/png');
    } catch (e) {
      resolve(null);
    }
  });
}

async function sendWhatsAppBillOrder() {
  if (!lastGeneratedBill) return;

  const btn = document.getElementById('btnSendWhatsAppWithBill');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = '<span>⏳ Preparing Bill & Redirecting to WhatsApp...</span>';
    btn.disabled = true;
  }

  const canvas = document.getElementById('billCanvas');
  let imageUrl = null;
  let billFile = null;

  if (canvas) {
    // Try uploading to get a direct image preview link (paste-able fallback)
    imageUrl = await uploadBillImage(canvas);

    // Also copy image to clipboard for desktop users to easily paste (Ctrl+V)
    try {
      if (canvas.toBlob && navigator.clipboard && window.ClipboardItem) {
        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).catch(() => {});
          }
        }, 'image/png');
      }
    } catch (e) {}

    // Convert to a File so it can be attached via the native share sheet
    billFile = await canvasToFile(canvas);
  }

  let itemsList = '';
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    itemsList += `${index + 1}. *${item.name}* (${item.pieces}) - Qty: ${item.quantity} × ₹${item.price} = *₹${itemTotal}*\n`;
  });

  const message = 
`🎆 *SRI AYYAPPA CRACKERS - OFFICIAL ORDER BILL* 🎆
--------------------------------------------
🧾 *Bill No:* ${lastGeneratedBill.invoiceNo}
📅 *Date:* ${lastGeneratedBill.dateStr}
👤 *Customer Name:* ${lastGeneratedBill.customerName}
📍 *Delivery Address:* ${lastGeneratedBill.customerAddress}
--------------------------------------------
📦 *SELECTED FIREWORKS:*
${itemsList}
--------------------------------------------
📊 *Total Items:* ${cart.reduce((sum, i) => sum + i.quantity, 0)}
💰 *Grand Total Payable:* ₹${lastGeneratedBill.grandTotal} (20% Festive Discount Applied)
--------------------------------------------
Please confirm my order and share payment modes & delivery dispatch. Thank you! 🙏`;

  const targetPhone = lastGeneratedBill.targetPhone || '9640499753';
  const waUrl = `https://wa.me/91${targetPhone}?text=${encodeURIComponent(message)}`;

  if (btn) {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }

  playCrackerSound(2.0);
  triggerFireworksBurst(window.innerWidth / 2, window.innerHeight / 2);

  // 1) Prefer the native share sheet so the actual bill photo is ATTACHED
  //    to WhatsApp (wa.me links can only carry text, not images).
  if (billFile && navigator.share && navigator.canShare && navigator.canShare({ files: [billFile] })) {
    try {
      await navigator.share({ files: [billFile], text: message });
      return; // done — image + text delivered via the chosen app
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user cancelled the share sheet
      // Share failed for another reason: fall through to the wa.me deep link.
    }
  }

  // 2) Fallback: wa.me deep link with full text + the bill receipt image link
  if (imageUrl) {
    window.open(`${waUrl.replace(/\?text=.*$/, '')}?text=${encodeURIComponent(message + '\n🖼️ Official Bill Receipt Image:\n' + imageUrl)}`, '_blank');
  } else {
    window.open(waUrl, '_blank');
  }
}

// Checkout Entire Cart: Validate address, generate Bill Receipt Image, and open modal
function checkoutCartWhatsApp() {
  if (cart.length === 0) {
    showToast('Your cart is empty! Please add some fireworks first.');
    return;
  }

  const customerName = cartCustomerName ? cartCustomerName.value.trim() : '';
  const customerAddress = cartCustomerAddress ? cartCustomerAddress.value.trim() : '';

  if (!customerAddress) {
    if (cartCustomerAddress) {
      cartCustomerAddress.focus();
      cartCustomerAddress.style.borderColor = '#ff2a4b';
      setTimeout(() => {
        if (cartCustomerAddress) cartCustomerAddress.style.borderColor = '';
      }, 3000);
    }
    showToast('⚠️ Please enter your delivery address to generate the bill!');
    return;
  }

  const targetPhone = (cartRecipientSelect && cartRecipientSelect.value) || activeContactPhone || '9640499753';

  // Generate the Bill Image
  const bill = generateBillReceipt(customerName, customerAddress, targetPhone);
  if (!bill) return;

  // Close cart drawer & open Bill Receipt Modal
  closeCart();
  openBillModal(bill);

  playCrackerSound(1.6);
  triggerFireworksBurst(window.innerWidth / 2, window.innerHeight / 2);
  showToast('Official Bill Receipt generated! 🧾');
}

// ==========================================================================
// Toast Notification
// ==========================================================================
let toastTimer = null;
function showToast(message) {
  if (!toastNotice || !toastMessage) return;
  toastMessage.textContent = message;
  toastNotice.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastNotice.classList.remove('show');
  }, 3500);
}

// ==========================================================================
// Scroll-Driven Animation Observer
// ==========================================================================
let cardObserver = null;
function observeCards() {
  const cards = document.querySelectorAll('.product-card');

  // Fallback for browsers without IntersectionObserver: show everything
  if (!('IntersectionObserver' in window)) {
    cards.forEach(card => card.classList.add('revealed'));
    return;
  }

  if (cardObserver) cardObserver.disconnect();

  const options = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
  };

  cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, (index % 4) * 70);
        cardObserver.unobserve(entry.target);
      }
    });
  }, options);

  cards.forEach(card => {
    cardObserver.observe(card);
  });
}

// Scroll progress bar & header scroll effects (rAF-throttled)
let scrollTicking = false;
function onScrollUpdate() {
  scrollTicking = false;
  const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = height > 0 ? (winScroll / height) * 100 : 0;

  const progressBar = document.getElementById('scrollProgressBar');
  if (progressBar) progressBar.style.width = scrolled + '%';

  const header = document.querySelector('.main-header');
  if (header) {
    header.classList.toggle('scrolled', winScroll > 40);
  }
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(onScrollUpdate);
  }
}, { passive: true });

// Track the real header height so the sticky toolbar never overlaps it
function syncHeaderHeightVar() {
  const headerEl = document.querySelector('.main-header');
  if (headerEl) {
    document.documentElement.style.setProperty('--header-h', headerEl.offsetHeight + 'px');
  }
}
window.addEventListener('resize', syncHeaderHeightVar);
window.addEventListener('load', syncHeaderHeightVar);

// ==========================================================================
// Hero Banner Slider
// ==========================================================================
function initHeroSlider() {
  const slidesContainer = document.getElementById('bannerSlidesContainer');
  const slider = document.querySelector('.hero-banner-slider');
  const prevBtn = document.getElementById('sliderPrevBtn');
  const nextBtn = document.getElementById('sliderNextBtn');
  const dots = document.querySelectorAll('.slider-dot');
  const totalSlides = 2;
  let autoPlayPaused = false;
  let touchStartX = 0;

  function goToSlide(index) {
    currentSlide = (index + totalSlides) % totalSlides;
    if (slidesContainer) {
      slidesContainer.style.transform = `translateX(-${currentSlide * 50}%)`;
    }
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
      if (dot.getAttribute('role') === 'tab') {
        dot.setAttribute('aria-selected', idx === currentSlide ? 'true' : 'false');
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      goToSlide(currentSlide - 1);
      resetAutoPlay();
      playCrackerSound(0.5);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      goToSlide(currentSlide + 1);
      resetAutoPlay();
      playCrackerSound(0.5);
    });
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      goToSlide(idx);
      resetAutoPlay();
      playCrackerSound(0.5);
    });
  });

  // Keyboard navigation while the slider is focused
  if (slider) {
    slider.setAttribute('tabindex', '0');
    slider.setAttribute('aria-roledescription', 'carousel');
    slider.setAttribute('aria-label', 'Festive promotions banner. Use the arrow buttons or dots to move between slides.');
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToSlide(currentSlide - 1);
        resetAutoPlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToSlide(currentSlide + 1);
        resetAutoPlay();
      }
    });

    // Pause autoplay while hovering/focused
    slider.addEventListener('mouseenter', pauseAutoPlay);
    slider.addEventListener('mouseleave', resumeAutoPlay);
    slider.addEventListener('focusin', pauseAutoPlay);
    slider.addEventListener('focusout', resumeAutoPlay);

    // Touch swipe support
    slider.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    slider.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const delta = touchStartX - touchEndX;
      if (Math.abs(delta) > 45) {
        goToSlide(currentSlide + (delta > 0 ? 1 : -1));
        resetAutoPlay();
      }
    }, { passive: true });
  }

  // Pause autoplay when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseAutoPlay();
    } else {
      resumeAutoPlay();
    }
  });

  function startAutoPlay() {
    if (autoPlayPaused || reducedMotion) return;
    slideInterval = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, reducedMotion ? 10000 : 6000);
  }

  function clearAutoPlay() {
    if (slideInterval) {
      clearInterval(slideInterval);
      slideInterval = null;
    }
  }

  function resetAutoPlay() {
    clearAutoPlay();
    startAutoPlay();
  }

  function pauseAutoPlay() {
    autoPlayPaused = true;
    clearAutoPlay();
  }

  function resumeAutoPlay() {
    autoPlayPaused = false;
    clearAutoPlay();
    startAutoPlay();
  }

  startAutoPlay();
}

// ==========================================================================
// Interactive Canvas Fireworks Simulator
// ==========================================================================
const canvas = document.getElementById('fireworksCanvas');
let ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

class FireworkParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = Math.random() * 0.02 + 0.015;
    this.size = Math.random() * 3 + 1.5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.06; // gravity
    this.alpha -= this.decay;
  }

  draw(context) {
    context.save();
    context.globalAlpha = Math.max(0, this.alpha);
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function triggerFireworksBurst(x, y) {
  const colors = ['#ffc400', '#ff2a4b', '#ff6b00', '#25d366', '#00e5ff', '#ffea00', '#ffffff'];
  const baseColor = colors[Math.floor(Math.random() * colors.length)];
  for (let i = 0; i < 35; i++) {
    particles.push(new FireworkParticle(x, y, Math.random() > 0.4 ? baseColor : '#ffffff'));
  }
}

function animateFireworks() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  requestAnimationFrame(animateFireworks);
}

// Random ambient firework rocket
setInterval(() => {
  if (reducedMotion) return;
  if (Math.random() > 0.4) {
    const randomX = Math.random() * window.innerWidth;
    const randomY = Math.random() * (window.innerHeight * 0.4) + 60;
    triggerFireworksBurst(randomX, randomY);
  }
}, 4200);

// Burst fireworks anywhere user clicks (skipped on interactive controls)
window.addEventListener('click', (e) => {
  const tag = e.target.tagName;
  if (reducedMotion) return;
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'LABEL'].includes(tag)) return;
  if (e.target.closest('.product-card')) return;
  triggerFireworksBurst(e.clientX, e.clientY);
});

// ==========================================================================
// Mobile Navigation
// ==========================================================================
function closeMobileNav() {
  if (mobileNavPanel) mobileNavPanel.classList.remove('open');
  if (navToggleBtn) navToggleBtn.setAttribute('aria-expanded', 'false');
  syncHeaderHeightVar();
}

function toggleMobileNav() {
  if (!navToggleBtn || !mobileNavPanel) return;
  const isOpen = mobileNavPanel.classList.toggle('open');
  navToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  navToggleBtn.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  syncHeaderHeightVar();
}

// ==========================================================================
// Product Detail Modal (Tap to Zoom)
// ==========================================================================
const detailModal = document.getElementById('detailModal');
const detailModalOverlay = document.getElementById('detailModalOverlay');
const detailModalBody = document.getElementById('detailModalBody');
const detailModalCloseBtn = document.getElementById('detailModalCloseBtn');

function openProductDetail(product) {
  if (!detailModal || !detailModalOverlay || !detailModalBody || !product) return;

  const discountAmount = product.originalPrice ? product.originalPrice - product.price : 0;
  const discountPct = discountAmount > 0 ? Math.round((discountAmount / product.originalPrice) * 100) : 0;
  const categoryName = CATEGORIES.find(c => c.id === product.category)?.name || product.category;

  detailModalBody.innerHTML = `
    <div class="detail-hero">
      <img class="detail-hero-img" src="${product.image}" alt="${product.name}" decoding="async"
           onerror="this.onerror=null;this.src='images/banner.png';">
      ${discountPct > 0 ? `<span class="discount-badge-overlay">${discountPct}% OFF</span>` : ''}
      ${product.badge ? `<span class="custom-badge-overlay">${product.badge}</span>` : ''}
    </div>
    <div class="detail-info">
      <div class="detail-heading-row">
        <div class="detail-heading-text">
          <h3 class="detail-title">${product.name}</h3>
          ${product.teluguName ? `<p class="detail-telugu">${product.teluguName}</p>` : ''}
        </div>
        ${product.rating ? `<span class="detail-rating-pill">⭐ ${product.rating}</span>` : ''}
      </div>
      <div class="detail-chips-row">
        <span class="detail-chip">🎆 ${categoryName}</span>
        ${product.pieces ? `<span class="detail-chip">📦 ${product.pieces}</span>` : ''}
        ${discountAmount > 0 ? `<span class="detail-chip highlight">💰 Save ₹${discountAmount}</span>` : ''}
      </div>
      <p class="detail-description">${product.description || 'Premium quality cracker from Sri Ayyappa Crackers — fresh stock, safe packaging, delivered with care.'}</p>
      <hr class="detail-divider">
      <div class="detail-price-row">
        <span class="detail-price">₹${product.price}</span>
        ${discountAmount > 0 ? `<span class="detail-original-price">₹${product.originalPrice}</span>` : ''}
      </div>
      <div class="detail-actions">
        <div class="detail-qty-controller">
          <button class="detail-qty-btn" data-dqty="dec" aria-label="Decrease quantity">−</button>
          <span class="detail-qty-val" id="detailQtyVal">1</span>
          <button class="detail-qty-btn" data-dqty="inc" aria-label="Increase quantity">+</button>
        </div>
        <button class="detail-add-cart-btn" id="detailAddCartBtn">🛒 Add to Cart</button>
        <a class="detail-wa-btn" target="_blank" rel="noopener noreferrer" id="detailWaBtn">💬 WhatsApp Order</a>
      </div>
    </div>
  `;

  // Quantity controls inside modal
  let qty = 1;
  const qtyVal = detailModalBody.querySelector('#detailQtyVal');
  const addCartBtn = detailModalBody.querySelector('#detailAddCartBtn');
  const waBtn = detailModalBody.querySelector('#detailWaBtn');

  function refreshQtyLabel() {
    addCartBtn.textContent = qty > 1 ? `🛒 Add ${qty} to Cart` : '🛒 Add to Cart';
  }

  detailModalBody.querySelectorAll('.detail-qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.dataset.dqty === 'inc') {
        if (qty < 99) qty++;
      } else if (qty > 1) {
        qty--;
      }
      qtyVal.textContent = qty;
      refreshQtyLabel();
      playCrackerSound(0.6);
    });
  });

  // WhatsApp order link
  const targetPhone = activeContactPhone || '9640499753';
  const waLine = `Hello! I would like to order: ${product.name} (₹${product.price} x ${qty} = ₹${product.price * qty})`;
  waBtn.href = `https://wa.me/91${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waLine).replace(/%20/g, '+')}`;
  waBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerFireworksBurst(window.innerWidth - 80, window.innerHeight - 80);
  });

  addCartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addToCart(product, qty);
    closeProductDetail();
  });

  // Reveal
  detailModal.classList.add('active');
  detailModalOverlay.classList.add('active');
  detailModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (detailModalCloseBtn) detailModalCloseBtn.focus();
}

function closeProductDetail() {
  detailModal.classList.remove('active');
  detailModalOverlay.classList.remove('active');
  detailModal.setAttribute('aria-hidden', 'true');
  if (cartDrawer && cartDrawer.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function bindProductDetailTriggers() {
  document.querySelectorAll('.product-image-box').forEach(box => {
    box.addEventListener('click', (e) => {
      const card = box.closest('.product-card');
      if (!card) return;
      const product = PRODUCTS.find(p => p.id === card.dataset.id);
      if (product) openProductDetail(product);
    });
  });

  document.querySelectorAll('.product-title').forEach(title => {
    title.addEventListener('click', (e) => {
      const card = title.closest('.product-card');
      if (!card) return;
      const product = PRODUCTS.find(p => p.id === card.dataset.id);
      if (product) openProductDetail(product);
    });
  });
}

if (detailModalCloseBtn) detailModalCloseBtn.addEventListener('click', closeProductDetail);
if (detailModalOverlay) detailModalOverlay.addEventListener('click', closeProductDetail);
if (detailModal) detailModal.addEventListener('click', (e) => e.stopPropagation());

// ==========================================================================
// Initialization on DOM Ready
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  animateFireworks();
  renderCategoryPills();
  initContactSelector();
  filterAndRenderProducts();
  updateCartUI();
  initHeroSlider();
  updateSoundButton();
  syncHeaderHeightVar();

  // Mobile Navigation Handler
  if (navToggleBtn) {
    navToggleBtn.addEventListener('click', toggleMobileNav);
  }
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });
  document.addEventListener('click', (e) => {
    if (mobileNavPanel && mobileNavPanel.classList.contains('open')) {
      const clickedToggle = navToggleBtn && navToggleBtn.contains(e.target);
      const clickedInside = mobileNavPanel.contains(e.target);
      if (!clickedToggle && !clickedInside) {
        closeMobileNav();
      }
    }
  });

  // Close overlays with the Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (detailModal && detailModal.classList.contains('active')) {
        closeProductDetail();
      } else if (billModal && billModal.classList.contains('active')) {
        closeBillModal();
      } else if (cartDrawer && cartDrawer.classList.contains('active')) {
        closeCart();
      } else if (mobileNavPanel && mobileNavPanel.classList.contains('open')) {
        closeMobileNav();
      }
    }
  });

  // Search Input Handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.style.display = searchQuery ? 'block' : 'none';
      }
      filterAndRenderProducts();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchClearBtn.style.display = 'none';
      filterAndRenderProducts();
    });
  }

  // Sort Select Handler
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      filterAndRenderProducts();
    });
  }

  // Cart open/close triggers
  document.querySelectorAll('[data-action="open-cart"]').forEach(el => {
    el.addEventListener('click', openCart);
  });

  const cartCloseBtn = document.getElementById('cartCloseBtn');
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  if (btnCartCheckout) {
    btnCartCheckout.addEventListener('click', checkoutCartWhatsApp);
  }

  // Bill Modal Event Listeners
  if (billModalCloseBtn) {
    billModalCloseBtn.addEventListener('click', closeBillModal);
  }
  if (billModalOverlay) {
    billModalOverlay.addEventListener('click', closeBillModal);
  }
  if (btnSendWhatsAppWithBill) {
    btnSendWhatsAppWithBill.addEventListener('click', sendWhatsAppBillOrder);
  }

  // Sound Toggle Handler
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      try {
        localStorage.setItem('ayyappa_sound', soundEnabled);
      } catch (err) {}
      updateSoundButton();
      if (soundEnabled) {
        playCrackerSound(1.5);
        showToast('Festive Sound Effects Activated! 🔊');
      } else {
        showToast('Sound Effects Muted 🔇');
      }
    });
  }
});
