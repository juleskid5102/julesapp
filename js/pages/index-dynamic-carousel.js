// index-dynamic-carousel.js
// FINAL VERSION: Firebase Config Limit + Netflix Style + Optimized Scroll

import { db } from '../firebase.js';
import { createProductCard } from '../components/productCard.js';
import { escapeHtml } from '../utils.js';

const carouselTimers = {};
const sectionConfigs = new Map();

// ============================================================
// 1. SMOOTH SCROLL ENGINE (Bộ máy cuộn mượt - 600ms)
// ============================================================
function smoothScroll(element, change, duration) {
    const start = element.scrollLeft;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease Out Quart (Độ cong mượt mà, phanh êm)
        const ease = 1 - Math.pow(1 - progress, 4);

        element.scrollLeft = start + (change * ease);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    requestAnimationFrame(animate);
}

// ============================================================
// 2. LAYOUT CALCULATION (Netflix Exact Fit)
// ============================================================
function alignCarouselContent(specificPanel = null) {
    // Mobile dùng native scroll, không cần tính toán
    if (window.innerWidth < 768) return;

    const panels = specificPanel ? [specificPanel] : document.querySelectorAll('.film-glass-panel');

    panels.forEach(panel => {
        const wrapper = panel.querySelector('.film-track-wrapper');
        const track = panel.querySelector('.film-strip-track');
        const firstItem = track ? track.querySelector('.film-strip-item') : null;
        const prevBtn = panel.querySelector('.nav-pill-btn.prev');
        const nextBtn = panel.querySelector('.nav-pill-btn.next');

        if (!wrapper || !track || !firstItem) return;

        const panelWidth = panel.clientWidth;

        // Lấy Gap
        let gap = parseFloat(getComputedStyle(track).gap);
        if (isNaN(gap) || gap === 0) gap = window.innerWidth >= 1024 ? 45 : 24;
        const cardWidth = firstItem.offsetWidth;

        // Lấy số lượng thẻ thực tế đang có
        const totalItems = track.children.length;

        // Trừ hao không gian cho mũi tên
        const arrowSpace = 140;
        const availableWidth = panelWidth - arrowSpace;

        // Tính sức chứa (Capacity): Màn hình này nhét được bao nhiêu thẻ?
        let visibleCount = Math.floor((availableWidth + gap) / (cardWidth + gap));
        if (visibleCount < 1) visibleCount = 1;

        // --- LOGIC MỚI: KIỂM TRA ĐỂ ẨN/HIỆN MŨI TÊN ---
        let countForWidth = visibleCount; // Mặc định tính width theo sức chứa

        if (totalItems <= visibleCount) {
            // TRƯỜNG HỢP: Ít thẻ hơn sức chứa (Ví dụ có 3 thẻ mà màn hình chứa được 4)

            // 1. Ẩn mũi tên
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';

            // 2. Co chiều rộng Wrapper lại cho vừa khít số thẻ thực tế
            // Để CSS flex-center căn giữa chúng nó đẹp hơn
            countForWidth = totalItems;

        } else {
            // TRƯỜNG HỢP: Nhiều thẻ hơn sức chứa (Có tràn -> Cần scroll)

            // 1. Hiện mũi tên
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';

            // 2. Width Wrapper tính theo sức chứa tối đa (visibleCount)
            countForWidth = visibleCount;
        }

        // Tính toán chiều rộng cuối cùng
        const contentWidth = (countForWidth * cardWidth) + ((countForWidth - 1) * gap);

        // Áp dụng kích thước
        wrapper.style.width = `${contentWidth + 40}px`; // +40px padding
        wrapper.style.paddingLeft = '20px';
        wrapper.style.paddingRight = '20px';

        // Lưu bước nhảy
        wrapper.dataset.singleStep = cardWidth + gap;
    });
}

const resizeObserver = new ResizeObserver(entries => {
    if (window.resizeTimeout) clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        alignCarouselContent();
    }, 50);
});

// ============================================================
// 3. SCROLL CONTROL (Rewind Mode - 600ms Speed)
// ============================================================
window.scrollStrip = (sectionId, direction, isAuto = false) => {
    const track = document.getElementById(`track-${sectionId}`);
    if (!track) return;
    const wrapper = track.parentElement;

    const step = parseFloat(wrapper.dataset.singleStep) || 200;
    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

    let amount = 0;

    if (direction === 1) {
        // NEXT: Nếu đã ở cuối (sai số 10px) -> Tua về đầu
        if (wrapper.scrollLeft >= maxScroll - 10) {
            amount = -wrapper.scrollLeft;
        } else {
            // Chưa cuối -> Đi tiếp 1 bước nhưng không quá đà
            const remaining = maxScroll - wrapper.scrollLeft;
            amount = Math.min(step, remaining);
        }
    } else {
        // PREV: Nếu ở đầu -> Đứng yên
        if (wrapper.scrollLeft <= 10) {
            amount = 0;
        } else {
            amount = -step;
        }
    }

    if (amount !== 0) {
        // Tốc độ 600ms: Nhanh, mượt, phản hồi tốt
        smoothScroll(wrapper, amount, 600);
    }

    // Reset timer nếu người dùng tự bấm tay
    if (!isAuto && carouselTimers[sectionId]) {
        clearInterval(carouselTimers[sectionId]);
        initAutoScroll(sectionId);
    }
};

function initAutoScroll(sectionId) {
    if (carouselTimers[sectionId]) clearInterval(carouselTimers[sectionId]);

    // 4 giây tự trượt 1 lần
    carouselTimers[sectionId] = setInterval(() => {
        window.scrollStrip(sectionId, 1, true);
    }, 4000);

    // Tính năng thông minh: Pause on Hover
    const section = document.getElementById(`sec-${sectionId}`);
    if (section) {
        section.onmouseenter = () => {
            if (carouselTimers[sectionId]) clearInterval(carouselTimers[sectionId]);
        };
        section.onmouseleave = () => {
            initAutoScroll(sectionId);
        };
    }
}

// ============================================================
// 4. FETCH & RENDER
// ============================================================
async function fetchProductsForSection(section, limit) {
    let q = db.collection('products').where('status', '==', 'active');
    try {
        if (section.queryType === 'createdAt') q = q.orderBy('createdAt', 'desc');
        else if (section.queryType === 'priceDiff') q = q.where('discountPercent', '>', 0).orderBy('discountPercent', 'desc');
        else if (section.queryType === 'soldCount') q = q.orderBy('soldCount', 'desc');
        else if (section.queryType === 'categoryId') q = q.where('categoryId', '==', section.queryValue).orderBy('soldCount', 'desc');

        // Limit lấy từ tham số truyền vào (từ config Firebase)
        const snap = await q.limit(limit).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('fetchProductsForSection error', err);
        return [];
    }
}

function generateCarouselHTML(sectionId, name, alias, products, seeAllLink, icons) {
    const itemsHTML = products.map(p => `
        <div class="film-strip-item">
            ${createProductCard(p, icons)}
        </div>
    `).join('');

    return `
    <section id="sec-${sectionId}" class="jules-film-strip fade-in-up">
        <div class="film-strip-header">
            <div>
                <h2 class="film-strip-title">${escapeHtml(name)}</h2>
                ${alias ? `<p class="font-thin text-secondary text-sm mt-1">${escapeHtml(alias)}</p>` : ''}
            </div>
            <a href="${seeAllLink}" class="film-strip-link">Xem tất cả &rarr;</a>
        </div>

        <div class="film-glass-panel">
            <button class="nav-pill-btn prev compact inside-left" onclick="window.scrollStrip('${sectionId}', -1)"></button>
            <div class="film-track-wrapper">
                <div id="track-${sectionId}" class="film-strip-track">
                    ${itemsHTML}
                </div>
            </div>
            <button class="nav-pill-btn next compact inside-right" onclick="window.scrollStrip('${sectionId}', 1)"></button>
        </div>
    </section>
    `;
}

// Lazy Observer
const lazyObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const placeholder = entry.target;
            const sectionId = placeholder.dataset.id;

            // Ngắt quan sát ngay
            observer.unobserve(placeholder);

            // Lấy config và load data thật
            const config = sectionConfigs.get(sectionId);
            if (config) {
                loadRealSectionData(placeholder, config);
            }
        }
    });
}, { rootMargin: '200px 0px', threshold: 0.01 });

async function loadRealSectionData(placeholder, config) {
    const { sectionData, limit, globalIcons, type } = config;

    // Fetch dữ liệu với limit động
    const products = await fetchProductsForSection(sectionData, limit);

    if (products.length > 0) {
        let link = sectionData.link;
        if (!link) link = type === 'special'
            ? `/category.html?special=${sectionData.id}`
            : `/category.html?slug=${sectionData.id}`;

        const html = generateCarouselHTML(sectionData.id, sectionData.name, sectionData.alias, products, link, globalIcons);
        placeholder.outerHTML = html;

        // Khởi tạo các tính năng sau khi HTML thật xuất hiện
        setTimeout(() => {
            const newPanel = document.querySelector(`#sec-${sectionData.id} .film-glass-panel`);
            if (newPanel) {
                resizeObserver.observe(newPanel);
                alignCarouselContent(newPanel);
                initAutoScroll(sectionData.id);
            }
            const section = document.getElementById(`sec-${sectionData.id}`);
            if (section) {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }
        }, 50);
    } else {
        // Không có sản phẩm thì xóa placeholder
        placeholder.remove();
    }
}

// ============================================================
// 5. MAIN INIT FUNCTION (Config from Firebase)
// ============================================================
export async function loadDynamicSections(container, config, globalIcons) {
    container.innerHTML = '';
    sectionConfigs.clear();

    // --- CẬP NHẬT: LẤY LIMIT TỪ CONFIG FIREBASE ---
    // Kiểm tra config.display.limitPerSection, nếu không có thì mặc định 10
    const limit = config?.display?.limitPerSection || 10;

    // Lấy danh sách sections
    const [specialSnap, categoriesSnap] = await Promise.all([
        db.collection('special_sections').where('active', '==', true).orderBy('priority', 'asc').get(),
        db.collection('categories').where('status', '==', 'active').orderBy('priority', 'asc').get()
    ]);

    // Hàm tạo khung xương (Skeleton)
    const createPlaceholder = (id) => {
        const div = document.createElement('div');
        div.className = 'lazy-placeholder';
        div.dataset.id = id;
        return div;
    };

    // Render Special Sections Skeleton
    specialSnap.docs.forEach(doc => {
        // Lưu limit vào config map để dùng sau
        sectionConfigs.set(doc.id, { sectionData: { id: doc.id, ...doc.data() }, limit, globalIcons, type: 'special' });

        const ph = createPlaceholder(doc.id);
        container.appendChild(ph);
        lazyObserver.observe(ph);
    });

    // Render Categories Skeleton
    categoriesSnap.docs.forEach(doc => {
        const categoryData = {
            id: doc.id,
            ...doc.data(),
            queryType: 'categoryId', // Bắt buộc: Bảo code lọc theo ID danh mục
            queryValue: doc.id       // Giá trị lọc chính là ID của document này
        };

        sectionConfigs.set(doc.id, { sectionData: categoryData, limit, globalIcons, type: 'category' });

        const ph = createPlaceholder(doc.id);
        container.appendChild(ph);
        lazyObserver.observe(ph);
    });
}