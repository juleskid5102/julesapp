// ===============================
//  PAGE INDEX CONTROLLER (FIXED 3-LAYER)
// ===============================

// FIX: Bỏ import loadSideBanners vì đã xóa
import { loadCategories, loadMainBanner } from './index-static.js';
import { loadDynamicSections } from './index-dynamic-carousel.js';
import { db } from '../firebase.js';

// -------------------------------------
// LOAD CONFIG (TOÀN TRANG)
// -------------------------------------
export async function loadConfig() {
    try {
        const doc = await db.collection('site_config').doc('main').get();
        return doc.exists ? doc.data() : {};
    } catch (err) {
        console.error("Lỗi loadConfig:", err);
        return {};
    }
}

// -------------------------------------
// LOAD GLOBAL ICONS (TOÀN TRANG)
// -------------------------------------
export async function loadGlobalIcons() {
    try {
        const doc = await db.collection('settings').doc('global_icons').get();
        return doc.exists ? doc.data() : {};
    } catch (err) {
        console.error("Lỗi loadGlobalIcons:", err);
        return {};
    }
}

// -------------------------------------
// ENTRY POINT
// -------------------------------------
export async function initIndexPage() {
    const sidebar = document.getElementById('sidebar-categories');
    const dynamicSections = document.getElementById('dynamic-product-sections');

    // FIX: Không cần lấy element side-banner nữa
    if (!sidebar || !dynamicSections) return;

    console.log("Init Index Page — 3-Layer Model Ready.");

    try {
        // 1. Tải config & icons dùng chung
        const [config, globalIcons] = await Promise.all([
            loadConfig(),
            loadGlobalIcons()
        ]);

        // 2. Tải UI tĩnh (Chỉ còn Sidebar & Main Banner)
        loadCategories(sidebar);
        loadMainBanner();

        // FIX: Đã xóa dòng loadSideBanners(sideBanner);

        // 3. Tải các dải sản phẩm động (carousel)
        loadDynamicSections(dynamicSections, config, globalIcons);

    } catch (err) {
        console.error("Lỗi initIndexPage:", err);
    }
}