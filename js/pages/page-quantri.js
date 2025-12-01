// /js/pages/page-quantri.js (PHIÊN BẢN DEBUG)

// --- IMPORTS ---
import { initSettingsModule } from './admin/admin-settings.js';
import { initProductsModule } from './admin/admin-products.js';
import { initCategoriesModule } from './admin/admin-categories.js';
import { initBannersModule } from './admin/admin-banners.js';
import { initUsersModule } from './admin/admin-users.js';
import { initDashboardModule } from './admin/admin-dashboard.js';

// --- BIẾN TOÀN CỤC ---
let currentUser = null;
const contentEl = document.getElementById('admin-content');
const adminTabs = document.querySelectorAll('.admin-tab');

// --- INIT FUNCTION (Entry Point) ---
export function initQuanTriPage(user) {
    if (!user || !contentEl) return;
    currentUser = user;

    setupAdminRouting();

    // LOAD module dashboard
    loadAdminSection('dashboard');

    // KÍCH hoạt tab dashboard
    const firstTab = document.querySelector('[data-section="dashboard"]');
    if (firstTab) firstTab.click();
}


// --- ADMIN ROUTER (Bộ điều tuyến) ---
function setupAdminRouting() {
    adminTabs.forEach(tab => {
        // --- THÊM DÒNG KIỂM TRA NÀY ---
        // Nếu đã gán listener rồi thì bỏ qua
        if (tab.dataset.listenerAttached === 'true') {
            return;
        }

        // --- THÊM DÒNG ĐÁNH DẤU NÀY ---
        // Đánh dấu là đã gán listener
        tab.dataset.listenerAttached = 'true';

        tab.addEventListener('click', () => {
            // (Code debug của chúng ta vẫn giữ)
            console.log("--- BẮT ĐẦU DEBUG CLICK ---");
            const section = tab.dataset.section;
            console.log(`CHECKPOINT 1: Đã click tab. Section là: [${section}]`);

            if (section) {

                // --- BẮT ĐẦU CHUẨN HÓA ---

                // 1. Xóa trạng thái active khỏi TẤT CẢ các tab
                adminTabs.forEach(t => {
                    t.classList.remove('active-tab');
                    // SỬA: Xóa class token "active"
                    t.classList.remove('bg-brand-primary', 'text-on-brand');

                    // SỬA: Thêm class token "inactive" (text-brand cho link/tab)
                    t.classList.add('text-brand', 'hover:bg-background');
                });

                // 2. Thêm trạng thái active cho tab VỪA CLICK
                tab.classList.add('active-tab');
                // SỬA: Thêm class token "active"
                tab.classList.add('bg-brand-primary', 'text-on-brand');

                // SỬA: Xóa class token "inactive"
                tab.classList.remove('text-brand', 'hover:bg-background');

                // --- KẾT THÚC CHUẨN HÓA ---

                loadAdminSection(section);
            } else {
                console.error("LỖI: Nút tab này không có 'data-section'.");
            }
        });
    });
}

/**
 * Hàm "Router" chính
 */
// /js/pages/page-quantri.js
// THAY THẾ HÀM CŨ BẰNG HÀM NÀY (Bản Phá Cache)

async function loadAdminSection(sectionName) {
    console.log(`CHECKPOINT 2: Bắt đầu loadAdminSection cho [${sectionName}]`);

    // Đảm bảo contentEl đã được tìm thấy ở initQuanTriPage
    const contentEl = document.getElementById('admin-content');
    if (!contentEl) {
        console.error("LỖI: Không tìm thấy #admin-content để bơm HTML.");
        return;
    }

    // [CHUẨN] Dùng token 'font-thin text-secondary' cho nội dung tải
    contentEl.innerHTML = `<p class="font-thin text-secondary">Đang tải module ${sectionName}...</p>`;

    try {
        // --- SỬA LỖI CACHE ---
        // Thêm một query string ngẫu nhiên (dựa trên thời gian) để "phá" cache của file HTML
        const cacheBuster = `?v=${new Date().getTime()}`;
        const htmlPath = `/admin/_${sectionName}.html${cacheBuster}`;
        // --- KẾT THÚC SỬA LỖI CACHE ---

        console.log(`CHECKPOINT 3: Đang fetch() file HTML từ (ĐÃ PHÁ CACHE): ${htmlPath}`);

        const response = await fetch(htmlPath);

        if (!response.ok) {
            console.error(`LỖI FETCH: Không tìm thấy file ${htmlPath} (Lỗi ${response.status})`);
            throw new Error(`Không thể tải ${htmlPath}`);
        }

        const html = await response.text();
        console.log(`CHECKPOINT 4: Đã fetch HTML thành công. Bơm HTML vào trang.`);

        // 2. "Bơm" HTML
        contentEl.innerHTML = html;

        // --- SỬA LỖI TIMING (RACE CONDITION) ---
        // Dùng setTimeout 0ms để trì hoãn việc gọi hàm init cho đến khi DOM được cập nhật
        console.log(`CHECKPOINT 5: Yêu cầu DOM cập nhật. Đặt hẹn 0ms để gọi init.`);

        // Giả định currentUser đã được lưu ở cấp độ module (let currentUser = null;)
        const currentUser = window.firebase.auth().currentUser;

        setTimeout(() => {
            console.log(`CHECKPOINT 5.5: Đã hết 0ms. Bắt đầu gọi hàm init cho [${sectionName}]`);
            switch (sectionName) {
                case 'dashboard':
                    initDashboardModule(currentUser);
                    break;
                case 'products':
                    initProductsModule(currentUser);
                    break;
                case 'categories':
                    initCategoriesModule(currentUser);
                    break;
                case 'banners':
                    initBannersModule(currentUser);
                    break;
                case 'users':
                    initUsersModule(currentUser);
                    break;
                case 'settings':
                    initSettingsModule(currentUser);
                    break;
                default:
                    console.warn(`Không có hàm init cho module: ${sectionName}`);
            }
            console.log(`CHECKPOINT 6: Đã gọi xong hàm init của [${sectionName}].`);
        }, 0);

    } catch (error) {
        console.error("LỖI NGHIÊM TRỌNG TRONG loadAdminSection:", error);

        // [CHUẨN] Dùng token 'text-danger' cho báo lỗi
        contentEl.innerHTML = `<p class="text-danger">Lỗi tải module: ${error.message}</p>`;
    }
}