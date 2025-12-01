// --- 1. IMPORT (Giữ nguyên) ---
import { auth, db } from './firebase.js';
import { setupGlobalModalListeners } from './utils.js';
import { loadHeader } from './components/header.js';
import { loadFooter } from './components/footer.js';
import { initDangNhapPage } from './pages/page-dangnhap.js';
import { initQuanTriPage } from './pages/page-quantri.js';
import { initPhanMemPage } from './pages/page-tools.js';
import { initBaoHanhPage } from './pages/page-baohanh.js';
import { initIndexPage } from './pages/page-index.js';

// --- 2. HÀM CHUYỂN HEX -> RGB (Giữ nguyên) ---
function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        r = parseInt(hex.substring(0, 1).repeat(2), 16);
        g = parseInt(hex.substring(1, 2).repeat(2), 16);
        b = parseInt(hex.substring(2, 3).repeat(2), 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }
    return `${r}, ${g}, ${b}`;
}

// --- 3. APPLY DESIGN TOKENS (Đã cập nhật) ---
async function applyDynamicTokens() {
    const root = document.documentElement;
    console.log('DEBUG: Đang tải Design Tokens từ Firebase...');

    try {
        // ============================
        // 2.1. FONT FAMILY (Giữ nguyên)
        // ============================
        const configSnap = await db.collection('site_config').doc('main').get();
        if (configSnap.exists && configSnap.data()?.fontFamily) {
            root.style.fontFamily = configSnap.data().fontFamily;
        }

        // ============================
        // 2.2. FONT STYLES (Giữ nguyên - Code của bạn đã đúng)
        // ============================
        const stylesSnap = await db.collection('settings').doc('fontStyles').get();
        if (stylesSnap.exists) {
            const styles = stylesSnap.data();
            // Lặp qua tất cả 11+ trường font
            Object.entries(styles).forEach(([tokenName, properties]) => {
                root.style.setProperty(`--${tokenName}-size`, properties.size);
                root.style.setProperty(`--${tokenName}-weight`, properties.weight);
                root.style.setProperty(`--${tokenName}-lineHeight`, properties.lineHeight);
                root.style.setProperty(`--${tokenName}-tracking`, properties.tracking);
            });
        }

        // ============================
        // 2.3. GỘP: THEME COLORS & GLASS TOKENS (Cập nhật theo File 3)
        // ============================

        const colorsSnap = await db.collection('settings').doc('themeColors').get();

        if (colorsSnap.exists) {
            const tokens = colorsSnap.data();

            Object.entries(tokens).forEach(([tokenName, tokenValue]) => {

                // Token là dạng background-gradient trong Firestore → giữ nguyên
                // CSS sẽ dùng --background-gradient
                const cssVarName = `--${tokenName}`;

                root.style.setProperty(cssVarName, tokenValue);

                // Trường hợp đặc biệt: surface → cần rgb
                if (tokenName === 'surface') {
                    root.style.setProperty(`--surface-rgb`, hexToRgb(tokenValue));
                }
            });

            console.log("DEBUG: Loaded ALL themeColors tokens (no rename).");
        } else {
            console.warn("DEBUG: themeColors not found.");
        }


        // ============================
        // 2.4. HEADER SETTINGS (Giữ nguyên)
        // ============================
        const headerSnap = await db.collection('settings').doc('header').get();
        if (headerSnap.exists) {
            const header = headerSnap.data();

            if (header.headerOpacity !== undefined) {
                root.style.setProperty('--header-opacity', header.headerOpacity);
            }
            if (header.headerBlurValue !== undefined) {
                root.style.setProperty('--header-backdrop-blur', header.headerBlurValue + 'px');
            }
        }

    } catch (error) {
        console.error("Lỗi nghiêm trọng khi tải Design Tokens:", error);
    }
}

// --- 4. DYNAMIC FAVICON (Giữ nguyên) ---
async function loadDynamicFavicon() {
    const faviconLink = document.getElementById('favicon-link');
    if (!faviconLink) {
        console.warn('Không tìm thấy #favicon-link để cập nhật.');
        return;
    }
    try {
        const docSnap = await db.collection('settings').doc('header').get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (data.faviconUrl) {
                faviconLink.href = data.faviconUrl;
            }
        }
    } catch (error) {
        console.error("Lỗi khi tải favicon động:", error);
    }
}

// --- 5. KHỞI TẠO APP (Giữ nguyên) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: DOMContentLoaded fired (app.js)");

    auth.onAuthStateChanged(async (user) => {
        console.log("DEBUG: Auth state changed. User:", user ? user.email : 'null');

        // Load tokens TRƯỚC khi render header
        await applyDynamicTokens();
        loadDynamicFavicon();

        loadHeader(user);
        loadFooter();
        initPageRouter(user);
        setupGlobalModalListeners();
    });
});

// --- 6. ROUTER (Giữ nguyên) ---
function initPageRouter(user) {
    console.log("DEBUG: Hàm initPageRouter() ĐÃ CHẠY");
    const path = window.location.pathname;
    console.log("DEBUG: Path:", path);

    if (path === '/' || path === '/index.html') {
        initIndexPage();
        return;
    }

    const pageId = document.body.querySelector('main')?.id;

    switch (pageId) {
        case 'page-phanmem':
        case 'page-quantri':
            if (user) {
                if (pageId === 'page-quantri') initQuanTriPage(user);
                if (pageId === 'page-phanmem') initPhanMemPage(user);
            } else {
                window.location.href = '/dangnhap.html';
            }
            break;

        case 'page-baohanh':
            initBaoHanhPage(user);
            break;

        case 'page-dangnhap':
            initDangNhapPage();
            break;

        default:
            console.log("DEBUG: Trang không xác định hoặc không cần JS riêng.");
    }
}