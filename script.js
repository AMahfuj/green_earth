const API_BASE = 'https://openapi.programming-hero.com/api';
const LOCAL_CART_KEY = 'green_cart_v1_v2';


const categoryList = document.getElementById('category-list');
const treeList = document.getElementById('tree-list');
const cartList = document.getElementById('cart-list');
const cartTotalEl = document.getElementById('cart-total');
const spinner = document.getElementById('loading-spinner');
const modal = document.getElementById('plant-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');


let currentPlants = new Map(); 
let cart = loadCartFromStorage();


function showSpinner() { spinner && spinner.classList.remove('hidden'); }
function hideSpinner() { spinner && spinner.classList.add('hidden'); }

function formatCurrency(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function randomPrice() {
  return Number((Math.random() * 45 + 5).toFixed(2)); 
}
function uid() { return Math.random().toString(36).slice(2, 9); }


function extractArray(apiResponse) {
  if (!apiResponse) return [];
  if (Array.isArray(apiResponse)) return apiResponse;

  
  const keys = ['data', 'plants', 'categories', 'results', 'items'];
  for (const k of keys) {
    if (Array.isArray(apiResponse[k])) return apiResponse[k];
    
    if (apiResponse.data && Array.isArray(apiResponse.data[k])) return apiResponse.data[k];
  }

  
  if (Array.isArray(apiResponse.data)) return apiResponse.data;

  return [];
}


function normalizeCategory(c) {
  return {
    id: c?.id ?? c?.category_id ?? c?._id ?? c?.cid ?? String(c?.id ?? c?.category_id ?? c?._id ?? uid()),
    title: c?.category ?? c?.name ?? c?.category_name ?? c?.title ?? 'Category'
  };
}


function normalizePlant(p) {
  const id = p?.id ?? p?.plant_id ?? p?._id ?? p?.slug ?? uid();
  const name = p?.name ?? p?.plant_name ?? p?.title ?? p?.plant ?? 'Unknown Plant';
  const description = p?.description ?? p?.short_description ?? p?.details ?? p?.about ?? '';
  const image = p?.image ?? p?.thumbnail ?? (p?.images && p.images[0]) ?? 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=600&q=60';
  let price = parseFloat(p?.price);
  if (!isFinite(price) || price <= 0) price = randomPrice();
  const category = (p?.category ?? p?.category_name ?? (p?.categories && p.categories[0]) ?? 'General');

  return { id: String(id), name: String(name), description: String(description), image: String(image), price: Number(price), category: String(category) };
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('fetchJSON failed for', url, err);
    throw err;
  }
}


async function loadCategories() {
  try {
    const data = await fetchJSON(`${API_BASE}/categories`);
    const rawArr = extractArray(data) || [];
    const categories = rawArr.map(normalizeCategory);
    renderCategories(categories);
  } catch (err) {
    categoryList.innerHTML = '<li class="text-red-600">Failed to load categories</li>';
  }
}

function renderCategories(categories = []) {
  categoryList.innerHTML = '';

  
  const liAll = document.createElement('li');
  const btnAll = document.createElement('button');
  btnAll.type = 'button';
  btnAll.className = 'w-full text-left px-3 py-2 rounded bg-green-200 font-medium';
  btnAll.textContent = 'All Trees';
  btnAll.dataset.catId = '';
  btnAll.addEventListener('click', () => {
    setActiveCategoryButton(btnAll);
    loadAllPlants();
  });
  liAll.appendChild(btnAll);
  categoryList.appendChild(liAll);

  categories.forEach(cat => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'w-full text-left px-3 py-2 rounded hover:bg-green-100';
    btn.textContent = cat.title;
    btn.dataset.catId = String(cat.id);
    btn.addEventListener('click', () => {
      setActiveCategoryButton(btn);
      loadPlantsByCategory(cat.id);
    });
    li.appendChild(btn);
    categoryList.appendChild(li);
  });
}

function setActiveCategoryButton(activeBtn) {
  document.querySelectorAll('#category-list button').forEach(b => {
    b.classList.remove('bg-green-200');
  });
  if (activeBtn) activeBtn.classList.add('bg-green-200');
}


async function loadAllPlants() {
  showSpinner();
  try {
    const data = await fetchJSON(`${API_BASE}/plants`);
    
    const arr = extractArray(data);
    renderPlants(arr.map(normalizePlant));
  } catch (err) {
    console.error('loadAllPlants error', err);
    treeList.innerHTML = `<div class="text-red-600">Failed to load plants.</div>`;
  } finally {
    hideSpinner();
  }
}

async function loadPlantsByCategory(categoryId) {
  if (!categoryId && categoryId !== 0) return loadAllPlants();
  showSpinner();
  try {
    const data = await fetchJSON(`${API_BASE}/category/${categoryId}`);
    const arr = extractArray(data);
    renderPlants(arr.map(normalizePlant));
  } catch (err) {
    console.error('loadPlantsByCategory error', err);
    treeList.innerHTML = `<div class="text-red-600">Failed to load plants for this category.</div>`;
  } finally {
    hideSpinner();
  }
}

function renderPlants(plantsNormalized) {
  currentPlants.clear();
  treeList.innerHTML = '';

  if (!Array.isArray(plantsNormalized) || plantsNormalized.length === 0) {
    treeList.innerHTML = '<div class="text-gray-600 text-center">No trees to display.</div>';
    return;
  }

  
  plantsNormalized.forEach(p => currentPlants.set(String(p.id), p));

  for (const p of plantsNormalized) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 flex flex-col';

    
    const imgWrap = document.createElement('div');
    imgWrap.className = 'bg-gray-200 h-32 rounded mb-3 flex items-center justify-center overflow-hidden';
    const img = document.createElement('img');
    img.alt = p.name;
    img.src = p.image;
    img.className = 'h-full object-cover';
    imgWrap.appendChild(img);

    
    const titleBtn = document.createElement('button');
    titleBtn.type = 'button';
    titleBtn.className = 'font-semibold text-green-900 cursor-pointer text-left plant-title';
    titleBtn.style.textAlign = 'left';
    titleBtn.textContent = p.name;
    titleBtn.dataset.id = p.id;

    
    const desc = document.createElement('p');
    desc.className = 'text-sm text-gray-600 flex-1 mt-2';
    desc.textContent = truncateText(p.description, 100);

    
    const bottom = document.createElement('div');
    bottom.className = 'mt-3 flex items-center justify-between';

    const priceSpan = document.createElement('div');
    priceSpan.className = 'font-bold text-green-900';
    priceSpan.textContent = formatCurrency(p.price);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-add-cart bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800';
    addBtn.textContent = 'Add to Cart';
    addBtn.dataset.id = p.id;

    bottom.appendChild(priceSpan);
    bottom.appendChild(addBtn);

    
    card.appendChild(imgWrap);
    card.appendChild(titleBtn);
    card.appendChild(desc);
    card.appendChild(bottom);
    treeList.appendChild(card);
  }
}


async function openPlantModal(plantId) {
  if (!plantId) return;
  modalContent.innerHTML = `<div class="text-center py-8"><span class="animate-spin inline-block w-10 h-10 border-t-4 border-green-700 rounded-full"></span></div>`;
  modal.classList.remove('hidden');

  
  let plant = currentPlants.get(String(plantId)) ?? null;

  
  try {
    const data = await fetchJSON(`${API_BASE}/plant/${plantId}`);
   
    const potential = data?.data ?? data?.plant ?? null;
    if (potential) {
      plant = normalizePlant(potential);
    }
  } catch (err) {
    
    console.warn('error fetching plant detail', err);
  }

  if (!plant) {
    modalContent.innerHTML = `<div class="p-6 text-red-600">Failed to load plant details.</div>`;
    return;
  }

  
  modalContent.innerHTML = ''; 
  const img = document.createElement('img');
  img.src = plant.image;
  img.alt = plant.name;
  img.className = 'w-full h-40 object-cover rounded mb-4';

  const h2 = document.createElement('h2');
  h2.className = 'text-xl font-bold text-green-900';
  h2.textContent = plant.name;

  const p = document.createElement('p');
  p.className = 'text-gray-700 mt-2';
  p.textContent = plant.description || 'No additional information available.';

  const metaRow = document.createElement('div');
  metaRow.className = 'mt-4 flex items-center justify-between';
  const priceDiv = document.createElement('div');
  priceDiv.className = 'text-lg font-bold text-green-900';
  priceDiv.textContent = formatCurrency(plant.price);
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'bg-emerald-700 text-white px-4 py-2 rounded';
  addBtn.textContent = 'Add To Cart';
  addBtn.dataset.id = plant.id;

  metaRow.appendChild(priceDiv);
  metaRow.appendChild(addBtn);


  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'ml-3 px-3 py-2 rounded border';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  const footer = document.createElement('div');
  footer.className = 'mt-4 flex justify-end';
  footer.appendChild(closeBtn);

  modalContent.appendChild(img);
  modalContent.appendChild(h2);
  modalContent.appendChild(p);
  modalContent.appendChild(metaRow);
  modalContent.appendChild(footer);
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.warn('Failed to load cart from storage', err);
    return [];
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
  } catch (err) {
    console.warn('Failed to persist cart', err);
  }
}

function addToCartById(plantId) {
  const plant = currentPlants.get(String(plantId));
  if (!plant) {
    // If plant not in current cache, try to fetch detail and add using fetched info
    (async () => {
      try {
        const data = await fetchJSON(`${API_BASE}/plant/${plantId}`);
        const detail = data?.data ?? data?.plant ?? null;
        if (detail) {
          const normalized = normalizePlant(detail);
          _addToCartItem(normalized);
        } else {
          console.error('No plant info available to add to cart for id', plantId);
        }
      } catch (err) {
        console.error('Failed to fetch plant before adding to cart', err);
      }
    })();
    return;
  }
  _addToCartItem(plant);
}

function _addToCartItem(plant) {
  const existing = cart.find(it => String(it.id) === String(plant.id));
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ id: String(plant.id), name: plant.name, price: Number(plant.price), qty: 1 });
  }
  saveCartToStorage();
  renderCart();
}

function removeCartItem(id) {
  cart = cart.filter(it => String(it.id) !== String(id));
  saveCartToStorage();
  renderCart();
}
function changeQty(id, delta) {
  const it = cart.find(x => String(x.id) === String(id));
  if (!it) return;
  it.qty = Math.max(1, (it.qty || 1) + delta);
  saveCartToStorage();
  renderCart();
}

function renderCart() {
  cartList.innerHTML = '';
  if (!cart.length) {
    cartList.innerHTML = '<li class="text-gray-400">Cart is empty. Add a tree.</li>';
    cartTotalEl.textContent = formatCurrency(0);
    return;
  }

  let total = 0;
  cart.forEach((item, idx) => {
    total += (item.price * (item.qty || 1));

    const li = document.createElement('li');
    li.className = 'flex items-center justify-between';

    const left = document.createElement('div');
    left.className = 'flex-1';
    const nm = document.createElement('div');
    nm.className = 'font-medium text-green-900';
    nm.textContent = item.name;
    const qtyText = document.createElement('div');
    qtyText.className = 'text-xs text-gray-600';
    qtyText.textContent = `Qty: ${item.qty || 1}`;
    left.appendChild(nm);
    left.appendChild(qtyText);

    const right = document.createElement('div');
    right.className = 'text-right';
    const linePrice = document.createElement('div');
    linePrice.className = 'font-semibold text-green-900';
    linePrice.textContent = formatCurrency(item.price * (item.qty || 1));
    const controls = document.createElement('div');
    controls.className = 'flex items-center gap-2 mt-1 justify-end';

    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.className = 'px-2 py-1 border rounded text-sm';
    decBtn.textContent = '-';
    decBtn.addEventListener('click', () => changeQty(item.id, -1));

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.className = 'px-2 py-1 border rounded text-sm';
    incBtn.textContent = '+';
    incBtn.addEventListener('click', () => changeQty(item.id, +1));

    const remBtn = document.createElement('button');
    remBtn.type = 'button';
    remBtn.className = 'text-red-600 ml-2';
    remBtn.textContent = '❌';
    remBtn.addEventListener('click', () => removeCartItem(item.id));

    controls.appendChild(decBtn);
    controls.appendChild(incBtn);
    controls.appendChild(remBtn);

    right.appendChild(linePrice);
    right.appendChild(controls);

    li.appendChild(left);
    li.appendChild(right);

    cartList.appendChild(li);
  });

  cartTotalEl.textContent = formatCurrency(total);
}


function truncateText(s, n = 100) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}




treeList.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.btn-add-cart');
  if (addBtn) {
    const id = addBtn.dataset.id;
    addToCartById(id);
    return;
  }
  const title = e.target.closest('.plant-title');
  if (title) {
    const id = title.dataset.id;
    openPlantModal(id);
    return;
  }
});


modalClose && modalClose.addEventListener('click', () => modal.classList.add('hidden'));
window.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});




(async function init() {
  renderCart();        // show existing cart
  await loadCategories();
  await loadAllPlants();
})();