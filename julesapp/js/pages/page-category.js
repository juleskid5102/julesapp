import { db } from '../firebase.js';
import { loadConfig, loadGlobalIcons } from './page-index.js';
import { escapeHtml } from '../utils.js';
import { createProductCard } from '../components/productCard.js';

// --- ENTRY POINT: ROUTER THÔNG MINH ---
export async function initCategoryPage() {
    const gridEl = document.getElementById('category-product-grid');
    const headerEl = document.getElementById('category-header-container');
    const skeletonEl = document.getElementById('skeleton-loader');
    const noProductsEl = document.getElementById('no-products');
    const errorEl = document.getElementById('error-message');

    if (!gridEl) return;

    // 1. Đọc tham số từ URL
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');       // ?slug=...
    const special = params.get('special'); // ?special=...
    const search = params.get('search');   // ?search=...

    try {
        const [config, globalIcons] = await Promise.all([loadConfig(), loadGlobalIcons()]);

        let pageData = null;
        let products = [];

        // 2. ĐIỀU HƯỚNG LOGIC (ROUTING)
        if (search) {
            console.log("Mode: Search ->", search);
            pageData = { name: `Tìm kiếm: "${search}"`, alias: "Kết quả tìm kiếm phù hợp" };
            products = await fetchSearchResults(search);
        }
        else if (special) {
            console.log("Mode: Special ->", special);
            const secInfo = await fetchSpecialInfo(special);
            pageData = { name: secInfo.name, alias: secInfo.alias };
            // Gọi hàm logic đã được update đầy đủ
            products = await fetchProductsByConfig(secInfo);
        }
        else if (slug) {
            console.log("Mode: Category ->", slug);
            const catInfo = await fetchCategoryInfo(slug);
            pageData = { name: catInfo.name, alias: catInfo.alias };
            products = await fetchCategoryProducts(slug);
        }
        else {
            throw new Error("Đường dẫn không hợp lệ. Thiếu tham số định danh.");
        }

        // 3. Render Giao diện
        renderHeader(headerEl, pageData);

        if (products.length === 0) {
            skeletonEl.style.display = 'none';
            noProductsEl.style.display = 'block';
        } else {
            const html = products.map(p => createProductCard(p, globalIcons)).join('');
            gridEl.innerHTML = html;
            skeletonEl.style.display = 'none';
        }

    } catch (error) {
        console.error("Lỗi trang danh sách:", error);
        skeletonEl.style.display = 'none';
        errorEl.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
        errorEl.style.display = 'block';
    }
}

// --- CÁC HÀM FETCH DỮ LIỆU ---

async function fetchCategoryInfo(slug) {
    const doc = await db.collection('categories').doc(slug).get();
    if (!doc.exists) throw new Error("Danh mục không tồn tại");
    return doc.data();
}

async function fetchCategoryProducts(slug) {
    const snap = await db.collection('products')
        .where('status', '==', 'active')
        .where('categoryId', '==', slug)
        .orderBy('soldCount', 'desc')
        .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchSpecialInfo(id) {
    const doc = await db.collection('special_sections').doc(id).get();
    if (!doc.exists) throw new Error("Bộ sưu tập không tồn tại");
    return doc.data();
}

async function fetchSearchResults(keyword) {
    const snap = await db.collection('products')
        .where('status', '==', 'active')
        .get();
    const lowerKey = keyword.toLowerCase();
    const results = [];
    snap.forEach(doc => {
        const p = doc.data();
        const name = p.name.toLowerCase();
        if (name.includes(lowerKey)) {
            results.push({ id: doc.id, ...p });
        }
    });
    return results;
}

// --- [ĐÃ SỬA] LOGIC FETCH CHO SPECIAL SECTIONS ---
// Bổ sung đầy đủ các case để giống hệt trang chủ
async function fetchProductsByConfig(sectionConfig) {
    let q = db.collection('products').where('status', '==', 'active');

    switch (sectionConfig.queryType) {
        case 'createdAt':
            q = q.orderBy('createdAt', 'desc');
            break;
        case 'priceDiff':
            q = q.where('discountPercent', '>', 0).orderBy('discountPercent', 'desc');
            break;
        case 'soldCount':
            q = q.orderBy('soldCount', 'desc');
            break;
        case 'rating':
            q = q.where('rating', '>', sectionConfig.queryMinRating || 4.5).orderBy('rating', 'desc');
            break;

        // BỔ SUNG 2 CASE THIẾU:
        case 'favorite':
            q = q.orderBy('favorite', 'desc');
            break;
        case 'categoryId':
            // Special section nhưng bản chất là query theo 1 danh mục cụ thể
            q = q.where('categoryId', '==', sectionConfig.queryValue).orderBy('soldCount', 'desc');
            break;

        default:
            return [];
    }

    const snap = await q.limit(20).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderHeader(container, data) {
    document.title = `${data.name} - Jules Studio`;
    container.innerHTML = `
        <nav class="font-thin text-secondary text-sm mb-2">
            <a href="/">Home</a> / <span class="text-primary">${escapeHtml(data.name)}</span>
        </nav>
    `;
}

initCategoryPage();