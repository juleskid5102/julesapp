import { db } from '../../firebase.js';
import { showToast } from '../../utils.js';

// --- BIẾN TOÀN CỤC ---
// Chỉ giữ lại những gì thực sự "toàn cục" cho module
let productsCollection;
// XÓA TẤT CẢ CÁC BIẾN (const modal, const productForm...) KHỎI ĐÂY

// --- HÀM EXPORT (Dùng bởi page-quantri.js) ---

export function initProductsModule(user) {
    console.log("DEBUG: Khởi tạo initProductsModule()");
    productsCollection = db.collection('products');

    // --- LẤY DOM ELEMENTS (CHỈ SAU KHI HTML ĐÃ TẢI) ---
    // Bây giờ mới là lúc an toàn để query DOM
    const modal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const productsTableBody = document.getElementById('products-table-body');
    const addProductBtn = document.getElementById('add-product-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // Kiểm tra an toàn
    if (!modal || !productForm || !productsTableBody || !addProductBtn) {
        console.error("DEBUG: Không tìm thấy các thành phần DOM quan trọng của module Product!");
        return;
    }

    // Gán listener cho các nút chính
    addProductBtn.addEventListener('click', () => openProductModal(null));
    closeModalBtn.addEventListener('click', () => closeProductModal());
    cancelBtn.addEventListener('click', () => closeProductModal());

    // Gán listener cho Form
    productForm.addEventListener('submit', (e) => handleSaveProduct(e));

    // Gán listener cho các nút Sửa/Xóa (dùng kỹ thuật Event Delegation)
    productsTableBody.addEventListener('click', (e) => handleTableActions(e));

    // Tải dữ liệu lần đầu
    loadProductsTable();
}

// --- CÁC HÀM XỬ LÝ LOGIC ---

/**
 * Tải dữ liệu từ Firestore và render ra bảng
 */
async function loadProductsTable() {
    // Phải tìm lại element vì hàm này có thể được gọi độc lập
    const productsTableBody = document.getElementById('products-table-body');
    if (!productsTableBody) return;

    // [THAY ĐỔI] Dùng token font-thin text-secondary
    productsTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center font-thin text-secondary">Đang tải dữ liệu...</td></tr>`;

    try {
        const snapshot = await productsCollection.orderBy('name').get();
        if (snapshot.empty) {
            // [THAY ĐỔI] Dùng token font-thin text-secondary
            productsTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center font-thin text-secondary">Chưa có sản phẩm nào.</td></tr>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            const id = doc.id;

            // [THAY ĐỔI] Áp dụng token font/theme
            html += `
                <tr data-id="${id}">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-medium text-primary">${product.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-medium text-brand">${product.price ? product.price.toLocaleString('vi-VN') : 0} ₫</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap font-thin text-muted">
                        ${(product.tags || []).map(tag => `<span class="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">${tag}</span>`).join(' ')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${product.published
                    ? '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Đang hiển thị</span>'
                    : '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Đang ẩn</span>'
                }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button data-action="edit" data-id="${id}" class="text-brand">Sửa</button>
                        <button data-action="delete" data-id="${id}" class="text-danger">Xóa</button>
                    </td>
                </tr>
            `;
        });
        productsTableBody.innerHTML = html;

    } catch (error) {
        console.error("Lỗi tải sản phẩm: ", error);
        // [THAY ĐỔI] Dùng token font-thin text-danger
        productsTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center font-thin text-danger">Lỗi tải dữ liệu.</td></tr>`;
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
        openProductModal(id); // Mở modal để sửa
    }

    if (action === 'delete') {
        handleDeleteProduct(id); // Xóa sản phẩm
    }
}

/**
 * Mở modal (cho Thêm mới hoặc Chỉnh sửa)
 */
async function openProductModal(docId = null) {
    // Lấy DOM elements CẦN THIẾT cho hàm này
    const modal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const modalTitle = document.getElementById('modal-title');
    const hiddenProductId = document.getElementById('product-id');
    if (!modal || !productForm || !modalTitle || !hiddenProductId) return console.error("Không tìm thấy DOM của modal");

    productForm.reset();

    if (docId) {
        // --- Chế độ SỬA ---
        modalTitle.textContent = 'Chỉnh sửa sản phẩm';
        hiddenProductId.value = docId;

        try {
            const doc = await productsCollection.doc(docId).get();
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('product-name').value = data.name || '';
                document.getElementById('product-price').value = data.price || 0;
                document.getElementById('product-image').value = data.image || '';
                document.getElementById('product-description').value = data.description || '';
                document.getElementById('product-published').checked = data.published || false;
                document.getElementById('product-tags').value = (data.tags || []).join(', ');
            } else {
                showToast("Không tìm thấy sản phẩm này!", "error");
                return;
            }
        } catch (error) {
            console.error("Lỗi lấy thông tin sản phẩm:", error);
            showToast("Lỗi: " + error.message, "error");
            return;
        }

    } else {
        // --- Chế độ THÊM MỚI ---
        modalTitle.textContent = 'Thêm sản phẩm mới';
        hiddenProductId.value = '';
    }

    modal.showModal();
}

/**
 * Đóng modal
 */
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const hiddenProductId = document.getElementById('product-id');
    if (!modal || !productForm || !hiddenProductId) return;

    productForm.reset();
    hiddenProductId.value = '';
    modal.close();
}

/**
 * Lưu (Thêm mới hoặc Cập nhật) sản phẩm
 */
async function handleSaveProduct(e) {
    e.preventDefault();

    const hiddenProductId = document.getElementById('product-id');
    const saveButton = document.getElementById('save-product-btn');
    if (!hiddenProductId || !saveButton) return;

    const editId = hiddenProductId.value;

    // 1. Lấy dữ liệu từ form
    const tagsInput = document.getElementById('product-tags').value;
    const productData = {
        name: document.getElementById('product-name').value,
        price: parseFloat(document.getElementById('product-price').value) || 0,
        image: document.getElementById('product-image').value,
        description: document.getElementById('product-description').value,
        published: document.getElementById('product-published').checked,
        tags: tagsInput.split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
    };

    try {
        saveButton.disabled = true;
        saveButton.textContent = 'Đang lưu...';

        if (editId) {
            await productsCollection.doc(editId).update(productData);
            showToast("Cập nhật sản phẩm thành công!");
        } else {
            await productsCollection.add(productData);
            showToast("Thêm sản phẩm mới thành công!");
        }

        closeProductModal();
        loadProductsTable();

    } catch (error) {
        console.error("Lỗi lưu sản phẩm:", error);
        showToast("Lỗi: " + error.message, "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Lưu sản phẩm';
    }
}

/**
 * Xóa sản phẩm
 */
async function handleDeleteProduct(docId) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này vĩnh viễn?")) {
        return;
    }

    try {
        await productsCollection.doc(docId).delete();
        showToast("Đã xóa sản phẩm.");
        loadProductsTable();
    } catch (error) {
        console.error("Lỗi xóa sản phẩm:", error);
        showToast("Lỗi: " + error.message, "error");
    }
}