import { initSettingsUI } from './admin-settings-ui.js';
import { initSettingsSystem } from './admin-settings-system.js';
import { initSettingsBackup } from './admin-settings-backup.js';
import { initSettingsTools } from './admin-settings-tools.js';

// --- BIẾN (Để trống ở đây, sẽ tìm trong hàm init) ---
// const subContentEl = document.getElementById('settings-content'); // <-- LỖI LÀ Ở ĐÂY
// const tabContainer = document.getElementById('tab-container'); // <-- LỖI LÀ Ở ĐÂY

/**
 * Khởi chạy module Cài đặt (ENTRY POINT)
 */
export function initSettingsModule(user) {
    console.log("DEBUG: initSettingsModule() đã chạy (Bản sửa lỗi).");

    // --- SỬA LỖI: Di chuyển việc tìm kiếm ID vào BÊN TRONG hàm init ---
    const tabContainer = document.getElementById('tab-container');
    const subContentEl = document.getElementById('settings-content');

    if (!tabContainer || !subContentEl) {
        console.error("Lỗi nghiêm trọng: Không tìm thấy #tab-container hoặc #settings-content.");
        console.log("Hãy kiểm tra file _settings.html xem có 2 ID đó không.");
        return;
    }

    // Gán sự kiện và tải tab mặc định
    setupSettingsTabs(tabContainer, subContentEl);
    loadSettingsSubPage('ui', subContentEl);
}

/**
 * Gán sự kiện click cho các tab
 * (Truyền subContentEl vào làm tham số)
 */
function setupSettingsTabs(tabContainer, subContentEl) {
    const tabs = tabContainer.querySelectorAll('.setting-tab');

    tabs.forEach(tab => {
        if (tab.dataset.listenerAttached === 'true') return;
        tab.dataset.listenerAttached = 'true';

        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab; // vd: 'ui', 'system'

            // Cập nhật giao diện (styling) cho tab
            tabs.forEach(t => {
                // [THAY ĐỔI] Dùng 'text-brand'
                t.classList.remove('border-purple-500', 'text-brand');
                // [THAY ĐỔI] Dùng 'text-secondary' và 'hover:text-primary'
                t.classList.add('border-transparent', 'text-secondary', 'hover:text-primary', 'hover:border-gray-300');
            });
            // [THAY ĐỔI] Dùng 'text-brand'
            tab.classList.add('border-purple-500', 'text-brand');
            // [THAY ĐỔI] Xóa 'text-secondary'
            tab.classList.remove('border-transparent', 'text-secondary');

            // Tải nội dung của tab con
            loadSettingsSubPage(tabName, subContentEl);
        });
    });
}

/**
 * Tải file HTML và gọi hàm init của tab con
 * (Truyền subContentEl vào làm tham số)
 */
async function loadSettingsSubPage(tabName, subContentEl) {
    if (!subContentEl) return;

    // [THAY ĐỔI] Dùng 'font-thin text-secondary'
    subContentEl.innerHTML = `<p class="font-thin text-secondary">Đang tải module ${tabName}...</p>`;

    try {
        const cacheBuster = `?v=${new Date().getTime()}`;
        const htmlPath = `/admin/settings/${tabName}.html${cacheBuster}`;

        console.log(`DEBUG: Đang fetch tab con: ${htmlPath}`);

        const response = await fetch(htmlPath);

        if (!response.ok) {
            throw new Error(`Không thể tải ${htmlPath} (Lỗi ${response.status})`);
        }

        const html = await response.text();
        subContentEl.innerHTML = html;

        // Chờ DOM cập nhật xong
        setTimeout(() => {
            console.log(`DEBUG: Đã tải HTML, bắt đầu gọi init cho [${tabName}]`);

            // Gọi hàm init tương ứng
            switch (tabName) {
                case 'ui':
                    initSettingsUI();
                    break;
                case 'system':
                    initSettingsSystem();
                    break;
                case 'backup':
                    initSettingsBackup();
                    break;
                case 'tools':
                    initSettingsTools();
                    break;
                case 'version':
                    console.log("DEBUG: Tab Version đã tải (không có JS).");
                    break;
                default:
                    console.warn(`Không có hàm init cho tab: ${tabName}`);
            }
        }, 0);

    } catch (error) {
        console.error("Lỗi khi tải tab con:", error);
        // [THAY ĐỔI] Dùng 'font-thin text-danger'
        subContentEl.innerHTML = `<p class="font-thin text-danger">Lỗi tải module: ${error.message}</p>`;
    }
}