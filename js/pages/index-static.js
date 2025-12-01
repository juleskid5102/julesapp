import { db } from '../firebase.js'; // Hãy thử sửa thành ./firebase.js nếu lỗi

console.log("DEBUG: index-static.js đã được tải!");

// -------------------------------------
// 1. LOAD SIDEBAR
// -------------------------------------
export async function loadCategories(container) {
    console.log("DEBUG: Bắt đầu loadCategories...");
    if (!container) {
        console.error("LỖI: Không tìm thấy container Sidebar!");
        return;
    }

    try {
        const snapshot = await db.collection('categories')
            .where('status', '==', 'active')
            .orderBy('priority', 'asc')
            .get();

        console.log("DEBUG: Kết nối Firebase thành công. Số danh mục:", snapshot.size);

        if (snapshot.empty) {
            container.innerHTML = `<p class="p-4">Chưa có danh mục.</p>`;
            return;
        }

        let html = `<ul>`;
        snapshot.forEach(doc => {
            const c = doc.data();
            console.log("DEBUG: Tìm thấy danh mục:", c.name);
            const iconSrc = c.iconUrl || '/assets/images/placeholder.svg';
            html += `
                <li>
                    <a href="/category.html?slug=${doc.id}" class="sidebar-link group">
                        <img src="${iconSrc}" class="sidebar-icon" />
                        <span class="sidebar-text">${c.name}</span>
                    </a>
                </li>`;
        });
        html += `</ul>`;
        container.innerHTML = html;
        console.log("DEBUG: Đã vẽ xong Sidebar.");

    } catch (err) {
        console.error("LỖI NGHIÊM TRỌNG khi tải Sidebar:", err);
        container.innerHTML = `<p style="color:red">Lỗi tải: ${err.message}</p>`;
    }
}

// -------------------------------------
// 2. LOAD MAIN BANNER
// -------------------------------------
export async function loadMainBanner() {
    console.log("DEBUG: Bắt đầu loadMainBanner...");
    const wrapper = document.getElementById('main-banner-wrapper');

    if (!wrapper) {
        console.error("LỖI: Không tìm thấy #main-banner-wrapper trong HTML!");
        return;
    }

    try {
        const snapshot = await db.collection('banners')
            .where('type', '==', 'main')
            .where('active', '==', true)
            .orderBy('priority', 'asc')
            .get();

        console.log("DEBUG: Lấy banner xong. Số lượng:", snapshot.size);

        if (snapshot.empty) {
            wrapper.innerHTML = `<div class="swiper-slide">No Banner</div>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const b = doc.data();
            html += `
                <div class="swiper-slide">
                    <a href="${b.linkUrl || '#'}" class="banner-slide-inner">
                        <img src="${b.imageUrl}" class="banner-img" />
                        <div class="banner-glass-layer"></div>
                    </a>
                </div>`;
        });

        wrapper.innerHTML = html;
        console.log("DEBUG: Đã chèn HTML Banner. Đang khởi tạo Swiper...");

        // Gọi hàm khởi tạo slider
        initMainSwiper();

    } catch (err) {
        console.error("LỖI NGHIÊM TRỌNG khi tải Banner:", err);
    }
}

function initMainSwiper() {
    setTimeout(() => {
        const swiperEl = document.querySelector('.main-banner-swiper');
        if (!swiperEl) {
            console.error("LỖI: Không tìm thấy class .main-banner-swiper để chạy Slider!");
            return;
        }

        if (swiperEl.swiper) swiperEl.swiper.destroy(true, true);

        new Swiper('.main-banner-swiper', {
            loop: true,
            speed: 800,
            autoplay: { delay: 4000 },
            effect: 'fade',
            fadeEffect: { crossFade: true },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        });
        console.log("DEBUG: Swiper đã chạy thành công!");
    }, 100);
}