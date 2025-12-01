// --- BIẾN TOÀN CỤC ---
const db = window.firebase.firestore();
const showToast = window.showToast;

// !!! THAY THẾ URL NÀY bằng URL Worker của bạn
const WORKER_UPLOAD_URL = "https://jules-upload-gateway.your-name.workers.dev";

/**
 * Hàm chính
 */
export function initSettingsUI() {
    console.log("DEBUG: Logic cho Tab Giao Diện (UI) đã chạy.");
    // Tải dữ liệu
    loadHeaderSettings();
    loadThemeSettings();
    loadIconSettings();
    loadLayoutIconSettings(); // THÊM MỚI

    // Gán sự kiện
    setupEventListeners();
}

/**
 * Gán sự kiện
 */
function setupEventListeners() {
    // --- NÚT LƯU ---
    document.getElementById('save-header-btn')?.addEventListener('click', saveHeaderSettings);
    document.getElementById('save-theme-btn')?.addEventListener('click', saveThemeSettings);
    document.getElementById('save-icons-btn')?.addEventListener('click', saveIconSettings);
    document.getElementById('save-layout-icons-btn')?.addEventListener('click', saveLayoutIconSettings); // THÊM MỚI

    // --- NÚT TẢI LÊN (HEADER) ---
    setupUploadButton('logo-upload-btn', 'logo-upload-input', 'logo-url', 'logo-preview');
    setupUploadButton('favicon-upload-btn', 'favicon-upload-input', 'favicon-url', 'favicon-preview');
    setupUploadButton('search-icon-upload-btn', 'search-icon-upload-input', 'search-icon-url', 'search-icon-preview');
    setupUploadButton('cart-icon-upload-btn', 'cart-icon-upload-input', 'cart-icon-url', 'cart-icon-preview');
    setupUploadButton('login-icon-upload-btn', 'login-icon-upload-input', 'login-icon-url', 'login-icon-preview');
    setupUploadButton('notification-icon-upload-btn', 'notification-icon-upload-input', 'notification-icon-url', 'notification-icon-preview');

    // --- NÚT TẢI LÊN (LAYOUT - THÊM MỚI) ---
    setupUploadButton('google-icon-upload-btn', 'google-icon-upload-input', 'google-icon-url', 'google-icon-preview');
    setupUploadButton('facebook-icon-upload-btn', 'facebook-icon-upload-input', 'facebook-icon-url', 'facebook-icon-preview');
    setupUploadButton('eye-icon-upload-btn', 'eye-icon-upload-input', 'eye-icon-url', 'eye-icon-preview');
    setupUploadButton('eye-closed-icon-upload-btn', 'eye-closed-icon-upload-input', 'eye-closed-icon-url', 'eye-closed-icon-preview');

    // --- INPUT MÀU ---
    const colorPicker = document.getElementById('primary-color');
    const colorHex = document.getElementById('primary-color-hex');
    colorPicker?.addEventListener('input', (e) => colorHex.value = e.target.value);
    colorHex?.addEventListener('input', (e) => colorPicker.value = e.target.value);
}

/**
 * Hàm trợ giúp gán sự kiện cho nút tải lên
 */
function setupUploadButton(btnId, inputId, urlFieldId, previewId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);

    if (!btn || !input) return;

    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleR2Upload(file, btn, urlFieldId, previewId);
        }
    });
}

/**
 * HÀM TẢI DỮ LIỆU
 */
async function loadHeaderSettings() {
    try {
        const docRef = db.collection('settings').doc('header');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            document.getElementById('logo-url').value = data.logoUrl || '';
            document.getElementById('favicon-url').value = data.faviconUrl || '';
            document.getElementById('studioNameMain').value = data.studioNameMain || '';
            document.getElementById('studioName').value = data.studioName || '';
            document.getElementById('studioSlogan').value = data.studioSlogan || '';
            document.getElementById('phone-number').value = data.phone || '';
            updatePreview('logo-preview', data.logoUrl);
            updatePreview('favicon-preview', data.faviconUrl);
        }
    } catch (error) { console.error("Lỗi tải cài đặt header:", error); }
}

async function loadThemeSettings() {
    try {
        const docRef = db.collection('settings').doc('theme');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            // SỬA: Loại bỏ tất cả fallback giá trị cứng (Rule 1 & 2)
            document.getElementById('primary-color').value = data.primaryColor || '';
            document.getElementById('primary-color-hex').value = data.primaryColor || '';
            document.getElementById('font-family').value = data.fontFamily || '';
            document.getElementById('theme-mode').value = data.themeMode || 'light'; // 'light' là giá trị logic, OK
            document.getElementById('border-radius').value = data.borderRadius || '';
        }
    } catch (error) { console.error("Lỗi tải cài đặt theme:", error); }
}

async function loadIconSettings() {
    try {
        const docRef = db.collection('settings').doc('icons');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            document.getElementById('search-icon-url').value = data.searchIconUrl || '';
            document.getElementById('cart-icon-url').value = data.cartIconUrl || '';
            document.getElementById('login-icon-url').value = data.loginIconUrl || '';
            document.getElementById('notification-icon-url').value = data.notificationIconUrl || '';
            updatePreview('search-icon-preview', data.searchIconUrl);
            updatePreview('cart-icon-preview', data.cartIconUrl);
            updatePreview('login-icon-preview', data.loginIconUrl);
            updatePreview('notification-icon-preview', data.notificationIconUrl);
        }
    } catch (error) { console.error("Lỗi tải cài đặt icons:", error); }
}

// THÊM MỚI: Hàm tải layout icons
async function loadLayoutIconSettings() {
    try {
        const docRef = db.collection('settings').doc('layoutIcons'); // Document mới
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            document.getElementById('google-icon-url').value = data.googleIconUrl || '';
            document.getElementById('facebook-icon-url').value = data.facebookIconUrl || '';
            document.getElementById('eye-icon-url').value = data.eyeIconUrl || '';
            document.getElementById('eye-closed-icon-url').value = data.eyeClosedIconUrl || '';

            updatePreview('google-icon-preview', data.googleIconUrl);
            updatePreview('facebook-icon-preview', data.facebookIconUrl);
            updatePreview('eye-icon-preview', data.eyeIconUrl);
            updatePreview('eye-closed-icon-preview', data.eyeClosedIconUrl);
        }
    } catch (error) { console.error("Lỗi tải cài đặt layout icons:", error); }
}


/**
 * HÀM LƯU DỮ LIỆU
 */
async function saveHeaderSettings() {
    const data = {
        logoUrl: document.getElementById('logo-url').value,
        faviconUrl: document.getElementById('favicon-url').value,
        studioNameMain: document.getElementById('studioNameMain').value,
        studioName: document.getElementById('studioName').value,
        studioSlogan: document.getElementById('studioSlogan').value,
        phone: document.getElementById('phone-number').value,
    };
    try {
        await db.collection('settings').doc('header').set(data, { merge: true });
        showToast('Đã lưu cài đặt header!', 'success');
    } catch (error) {
        console.error("Lỗi lưu header:", error);
        showToast('Lỗi khi lưu header!', 'error');
    }
}

async function saveThemeSettings() {
    const data = {
        primaryColor: document.getElementById('primary-color-hex').value,
        fontFamily: document.getElementById('font-family').value,
        themeMode: document.getElementById('theme-mode').value,
        borderRadius: document.getElementById('border-radius').value,
    };
    try {
        await db.collection('settings').doc('theme').set(data, { merge: true });
        showToast('Đã lưu cài đặt giao diện!', 'success');
    } catch (error) {
        console.error("Lỗi lưu theme:", error);
        showToast('Lỗi khi lưu giao diện!', 'error');
    }
}

async function saveIconSettings() {
    const data = {
        searchIconUrl: document.getElementById('search-icon-url').value,
        cartIconUrl: document.getElementById('cart-icon-url').value,
        loginIconUrl: document.getElementById('login-icon-url').value,
        notificationIconUrl: document.getElementById('notification-icon-url').value,
    };
    try {
        await db.collection('settings').doc('icons').set(data, { merge: true });
        showToast('Đã lưu cài đặt icons!', 'success');
    } catch (error) {
        console.error("Lỗi lưu icons:", error);
        showToast('Lỗi khi lưu icons!', 'error');
    }
}

// THÊM MỚI: Hàm lưu layout icons
async function saveLayoutIconSettings() {
    const data = {
        googleIconUrl: document.getElementById('google-icon-url').value,
        facebookIconUrl: document.getElementById('facebook-icon-url').value,
        eyeIconUrl: document.getElementById('eye-icon-url').value,
        eyeClosedIconUrl: document.getElementById('eye-closed-icon-url').value,
    };
    try {
        await db.collection('settings').doc('layoutIcons').set(data, { merge: true });
        showToast('Đã lưu layout icons!', 'success');
    } catch (error) {
        console.error("Lỗi lưu layout icons:", error);
        showToast('Lỗi khi lưu layout icons!', 'error');
    }
}

/**
 * HÀM TẢI FILE LÊN (Dùng R2)
 */
async function handleR2Upload(file, buttonEl, urlFieldId, previewId) {
    const originalText = buttonEl.textContent;
    buttonEl.textContent = 'Đang tải...';
    buttonEl.disabled = true;

    try {
        const response = await fetch(WORKER_UPLOAD_URL, {
            method: 'POST',
            headers: { 'X-Custom-Filename': file.name },
            body: file
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Lỗi Worker: ${errorText}`);
        }

        const result = await response.json();
        const downloadURL = result.downloadURL;

        document.getElementById(urlFieldId).value = downloadURL;
        updatePreview(previewId, downloadURL);

        showToast('Tải lên thành công! Nhớ bấm LƯU.', 'info');

    } catch (error) {
        console.error("Lỗi tải file lên R2:", error);
        showToast(`Tải file thất bại: ${error.message}`, 'error');
    } finally {
        buttonEl.textContent = originalText;
        buttonEl.disabled = false;
    }
}

/**
 * Hàm trợ giúp cập nhật ảnh xem trước
 */
function updatePreview(previewId, url) {
    const previewEl = document.getElementById(previewId);
    if (url) {
        previewEl.src = url;
        previewEl.classList.remove('hidden');
    } else {
        previewEl.classList.add('hidden');
    }
}