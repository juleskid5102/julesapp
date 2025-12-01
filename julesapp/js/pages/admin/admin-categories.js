
import { db } from '../../firebase.js';
import { showToast } from '../../utils.js';

// --- HÀM TIỆN ÍCH: ĐỢI DOM SẴN LÒNG (DOMReady) ---
function DOMReady(fn) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn);
    } else {
        fn();
    }
}

// --- BIẾN TOÀN CỤC ---
let categoriesCollection;

// --- HÀM EXPORT (Entry Point) ---
export function initCategoriesModule(user) {
    // Gọi logic thực tế sau khi DOM đã sẵn sàng (Giải pháp cho lỗi Race Condition)
    DOMReady(initCategoriesLogic);
}

// --- LOGIC CHÍNH CỦA MODULE ---
function initCategoriesLogic() {
    categoriesCollection = db.collection('categories');

    // --- LẤY DOM ELEMENTS ---
    const modal = document.getElementById('category-modal');
    const categoryForm = document.getElementById('category-form');
    const categoriesTableBody = document.getElementById('categories-table-body');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const closeModalBtn = document.getElementById('close-category-modal-btn');
    const cancelBtn = document.getElementById('cancel-category-btn');

    // Nếu bạn đã sửa file HTML đúng, DÒNG NÀY PHẢI TRẢ VỀ TRUE
    if (!modal || !categoryForm || !categoriesTableBody || !addCategoryBtn || !closeModalBtn || !cancelBtn) {
        // Lỗi này sẽ không xảy ra trên server (Cloudflare Pages) vì Live-Server không can thiệp.
        console.error("Lỗi: Không tìm thấy DOM element. Vui lòng kiểm tra lại ID trong _categories.html");
        return;
    }

    // Gán listener
    addCategoryBtn.addEventListener('click', () => openCategoryModal(null));
    closeModalBtn.addEventListener('click', () => closeCategoryModal());
    cancelBtn.addEventListener('click', () => closeCategoryModal());
    categoryForm.addEventListener('submit', (e) => handleSaveCategory(e));
    categoriesTableBody.addEventListener('click', (e) => handleTableActions(e));

    // Tải dữ liệu lần đầu
    loadCategoriesTable();
}


/**
 * Tải dữ liệu từ Firestore và render ra bảng
 */
async function loadCategoriesTable() {
    const categoriesTableBody = document.getElementById('categories-table-body');
    if (!categoriesTableBody) return;

    // [THAY ĐỔI] Dùng token font-thin text-secondary
    categoriesTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center font-thin text-secondary">Đang tải dữ liệu...</td></tr>`;

    try {
        const snapshot = await categoriesCollection.orderBy('name').get();
        if (snapshot.empty) {
            // [THAY ĐỔI] Dùng token font-thin text-secondary
            categoriesTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center font-thin text-secondary">Chưa có danh mục nào.</td></tr>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const category = doc.data();
            const id = doc.id;

            // [THAY ĐỔI] Áp dụng token font/theme
            html += `
                <tr data-id="${id}">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-medium text-primary">${category.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-thin text-secondary font-mono">${id}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="w-6 h-6 font-thin text-secondary">${category.iconSVG || '(Không có icon)'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right font-medium space-x-2">
                        <button data-action="edit" data-id="${id}" class="text-brand">Sửa</button>
                        <button data-action="delete" data-id="${id}" class="text-danger">Xóa</button>
                    </td>
                </tr>
            `;
        });
        categoriesTableBody.innerHTML = html;
        console.log("DEBUG: Đã tải xong bảng danh mục.");

    } catch (error) {
        // --- LỖI KIỂM TRA QUYỀN FIREBASE ---
        if (error.code === 'permission-denied') {
            // [THAY ĐỔI] Dùng token font-bold text-danger
            categoriesTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center font-bold text-danger">LỖI: THIẾU QUYỀN TRUY CẬP FIRESTORE (security rules).</td></tr>`;
        } else {
            // [THAY ĐỔI] Dùng token font-thin text-danger
            categoriesTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center font-thin text-danger">Lỗi tải dữ liệu. (Check Console F12)</td></tr>`;
        }
        console.error("LỖI NGHIÊM TRỌNG KHI TẢI DANH MỤC:", error);
    }
}

/**
 * Xử lý khi click các nút trên bảng (Sửa/Xóa)
 */
function handleTableActions(e) {
    const action = e.target.dataset.action;
    const id = e.target.dataset.id;

    if (!action || !id) return;

    if (action === 'edit') {
        openCategoryModal(id);
    }

    if (action === 'delete') {
        handleDeleteCategory(id);
    }
}

/**
 * Mở modal (cho Thêm mới hoặc Chỉnh sửa)
 */
async function openCategoryModal(docId = null) {
    // Lấy DOM elements CẦN THIẾT
    const modal = document.getElementById('category-modal');
    const categoryForm = document.getElementById('category-form');
    const modalTitle = document.getElementById('category-modal-title');
    const categoryIdInput = document.getElementById('category-id');
    const isEditingInput = document.getElementById('category-is-editing');
    if (!modal || !categoryForm || !modalTitle || !categoryIdInput) return;

    categoryForm.reset();

    if (docId) {
        // --- Chế độ SỬA ---
        modalTitle.textContent = 'Chỉnh sửa danh mục';
        isEditingInput.value = 'true'; // Đánh dấu là đang sửa
        categoryIdInput.value = docId;
        categoryIdInput.readOnly = true; // KHÓA, không cho sửa ID
        categoryIdInput.classList.add('bg-gray-100'); // (Giữ nguyên class này, nó là utility)

        try {
            const doc = await categoriesCollection.doc(docId).get();
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('category-name').value = data.name || '';
                document.getElementById('category-icon').value = data.iconSVG || '';
            } else {
                showToast("Không tìm thấy danh mục này!", "error");
                return;
            }
        } catch (error) {
            showToast("Lỗi lấy thông tin: " + error.message, "error");
            return;
        }

    } else {
        // --- Chế độ THÊM MỚI ---
        modalTitle.textContent = 'Thêm danh mục mới';
        isEditingInput.value = 'false'; // Đánh dấu là đang thêm
        categoryIdInput.readOnly = false; // MỞ KHÓA, cho phép nhập ID
        categoryIdInput.classList.remove('bg-gray-100');
    }

    modal.showModal();
}

/**
 * Đóng modal
 */
function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    const categoryForm = document.getElementById('category-form');
    if (!modal || !categoryForm) return;

    categoryForm.reset();
    // Reset trạng thái readonly của ID input
    const categoryIdInput = document.getElementById('category-id');
    if (categoryIdInput) {
        categoryIdInput.readOnly = false;
        categoryIdInput.classList.remove('bg-gray-100');
    }
    modal.close();
}

/**
 * Lưu (Thêm mới hoặc Cập nhật) danh mục
 */
async function handleSaveCategory(e) {
    e.preventDefault();

    const saveButton = document.getElementById('save-category-btn');
    const isEditing = document.getElementById('category-is-editing').value === 'true';
    const docId = document.getElementById('category-id').value.trim();

    if (!docId) {
        return showToast("Vui lòng nhập ID (slug) cho danh mục.", "error");
    }
    // Chuẩn hóa ID: không dấu, không cách, chữ thường
    const standardizedId = docId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (docId !== standardizedId) {
        showToast(`ID không hợp lệ. Gợi ý: ${standardizedId}`, "error");
        document.getElementById('category-id').value = standardizedId;
        return;
    }

    // 1. Lấy dữ liệu từ form
    const categoryData = {
        name: document.getElementById('category-name').value,
        iconSVG: document.getElementById('category-icon').value,
    };

    try {
        saveButton.disabled = true;
        saveButton.textContent = 'Đang lưu...';

        if (isEditing) {
            // --- Cập nhật (Update) ---
            await categoriesCollection.doc(docId).set(categoryData, { merge: true });
            showToast("Cập nhật danh mục thành công!");
        } else {
            // --- Thêm mới (Create) ---
            // Kiểm tra xem ID đã tồn tại chưa
            const existingDoc = await categoriesCollection.doc(docId).get();
            if (existingDoc.exists) {
                showToast(`ID '${docId}' đã tồn tại. Vui lòng chọn ID khác.`, "error");
                saveButton.disabled = false;
                saveButton.textContent = 'Lưu danh mục';
                return;
            }
            await categoriesCollection.doc(docId).set(categoryData);
            showToast("Thêm danh mục mới thành công!");
        }

        closeCategoryModal();
        loadCategoriesTable(); // Tải lại bảng

    } catch (error) {
        console.error("Lỗi lưu danh mục:", error);
        showToast("Lỗi: " + error.message, "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Lưu danh mục';
    }
}

/**
 * Xóa danh mục
 */
async function handleDeleteCategory(docId) {
    if (!confirm(`Bạn có chắc muốn xóa danh mục '${docId}'?\nLưu ý: Sản phẩm có tag này có thể không hiển thị đúng.`)) {
        return;
    }

    try {
        await categoriesCollection.doc(docId).delete();
        showToast("Đã xóa danh mục.");
        loadCategoriesTable(); // Tải lại bảng
    } catch (error) {
        console.error("Lỗi xóa danh mục:", error);
        showToast("Lỗi: " + error.message, "error");
    }
}