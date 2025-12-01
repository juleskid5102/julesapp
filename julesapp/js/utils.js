// utils.js — Jules Studio Glass Airy 2025
// FULL VERSION — đã xóa SEED-DATABASE

/* =======================================================
   TOAST (Success / Error)
   ======================================================= */
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-container');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;

    msgEl.textContent = message;

    // Remove all color flags
    toast.classList.remove('bgDanger', 'bgSuccess');

    // Apply token color
    if (type === 'error') toast.classList.add('bgDanger');
    else toast.classList.add('bgSuccess');

    toast.classList.remove('opacity-0');

    // Auto-hide
    setTimeout(() => {
        toast.classList.add('opacity-0');
    }, 3000);
}

/* =======================================================
   MODAL
   ======================================================= */
export function openModal(htmlContent, modalClass = 'max-w-lg') {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="bgSurface rounded-lg shadowSoft p-6 w-full mx-4 relative ${modalClass}"
             style="max-height: 90vh; overflow-y: auto;">
            
            <button id="modal-cancel-btn-x"
                class="absolute top-3 right-3 textMuted hover:textSecondary text-2xl font-bold">&times;</button>

            ${htmlContent}
        </div>
    `;

    modalContainer.classList.remove('hidden');
    modalContainer.classList.add('flex');
}

export function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.classList.add('hidden');
    modalContainer.classList.remove('flex');
    modalContainer.innerHTML = '';
}

export function openGuideModal(title, htmlMessage) {
    const content = `
        <h3 class="text-xl fontBold textBrand mb-4">${title}</h3>

        <div class="space-y-2 textPrimary">${htmlMessage}</div>

        <div class="mt-6 flex justify-end">
            <button id="modal-cancel-btn" class="btn btn-secondary">Đóng</button>
        </div>
    `;
    openModal(content, 'max-w-lg');
}

/* =======================================================
   ESCAPE HTML (CHỐNG XSS)
   ======================================================= */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

/* =======================================================
   GLOBAL MODAL LISTENER (CLICK-AWAY)
   ======================================================= */
export function setupGlobalModalListeners() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.addEventListener('click', (e) => {
        const id = e.target.id;

        if (
            id === 'modal-container' ||
            id === 'modal-cancel-btn' ||
            id === 'modal-cancel-btn-x'
        ) {
            closeModal();
        }
    });
}

/* =======================================================
   CURRENCY FUNCTIONS
   ======================================================= */

// Format hiển thị tiền khi gõ input
export function formatCurrency(value) {
    if (!value) return '';
    let num = value.toString().replace(/[^\d]/g, "");

    // Xóa zero đầu
    num = num.replace(/^0+/, "");
    if (!num) return "";

    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Convert từ text → number
export function unformatCurrency(value) {
    if (!value) return 0;
    const num = value.toString().replace(/[^\d]/g, "");
    return parseFloat(num) || 0;
}

// Format hiển thị tiền VNĐ
export function formatPrice(price) {
    if (price === 0) return "Miễn phí";
    if (!price) return "Liên hệ";

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(price);
}
