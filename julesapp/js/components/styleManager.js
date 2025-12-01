// js/components/styleManager.js
import { db } from '../firebase.js';

export async function initCardStyleSystem() {
    // 1. Load style từ bộ nhớ đệm (Local Storage) trước cho nhanh
    // Nếu chưa có thì mặc định là 'classic'
    let currentStyle = localStorage.getItem('productCardStyle') || 'classic';
    loadCssFile(currentStyle);

    try {
        // 2. Lấy config mới nhất từ Firebase (site_config/main)
        const doc = await db.collection('site_config').doc('main').get();
        if (doc.exists) {
            const config = doc.data();
            // Lấy field 'productCardStyle', nếu không có thì fallback về classic
            const serverStyle = config.productCardStyle || 'classic';

            // 3. Nếu config trên server khác với cache thì đổi style ngay lập tức
            if (serverStyle !== currentStyle) {
                console.log(`[JulesUI] Updating card style: ${currentStyle} -> ${serverStyle}`);
                loadCssFile(serverStyle);
                localStorage.setItem('productCardStyle', serverStyle);
            }
        }
    } catch (error) {
        console.error("Error checking card style config:", error);
    }
}

// Hàm phụ trợ: Tạo hoặc cập nhật thẻ <link> CSS
function loadCssFile(styleName) {
    const linkId = 'dynamic-card-style';
    let linkElement = document.getElementById(linkId);

    // Đường dẫn trỏ tới folder chứa 2 file css vừa tạo
    const cssPath = `/css/components/product-cards/${styleName}.css`;

    if (!linkElement) {
        // Nếu chưa có thẻ link thì tạo mới
        linkElement = document.createElement('link');
        linkElement.id = linkId;
        linkElement.rel = 'stylesheet';
        linkElement.href = cssPath;
        document.head.appendChild(linkElement);
    } else {
        // Nếu có rồi thì chỉ thay đường dẫn href (trình duyệt tự đổi giao diện)
        linkElement.href = cssPath;
    }
}