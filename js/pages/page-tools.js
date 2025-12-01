// /js/pages/page-phanmem.js (hoặc page-tools.js)

// --- IMPORTS ---
import { db } from '../firebase.js';
// Import các hàm tiền tệ mới
import {
    showToast, openModal, closeModal,
    openGuideModal, escapeHtml,
    formatCurrency, unformatCurrency
} from '../utils.js';
import { openWingetModal } from '../components/winget.js';

// --- MODULE-LEVEL VARIABLES ---
let allSoftware = [];
let allCategories = [];
let sortState = { col: 'ten_phan_mem', dir: 'asc' };


// --- INIT FUNCTION (Called by app.js) ---
export function initPhanMemPage(user) { // Nhận user
    console.log("DEBUG: Đang ở trang phần mềm, CHUẨN BỊ TẢI BẢNG");
    loadSoftwareAndCategories();
    setupPhanMemListeners();
}

// --- DATA LOADING ---
async function loadSoftwareAndCategories() {
    console.log("DEBUG: Bắt đầu loadSoftwareAndCategories()");
    const tableBody = document.getElementById('software-table-body');
    if (!tableBody) return;

    // [THAY ĐỔI] Dùng token 'text-secondary'
    tableBody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-secondary">Đang tải dữ liệu...</td></tr>`;

    try {
        const [swSnapshot, catSnapshot] = await Promise.all([
            db.collection('software').get(),
            db.collection('categories').orderBy('name').get()
        ]);

        allSoftware = swSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        handleSort(sortState.col, true); // Sắp xếp và vẽ bảng

    } catch (error) {
        console.error("DEBUG: LỖI TRONG loadSoftwareAndCategories:", error);
        // [THAY ĐỔI] Dùng token 'text-danger'
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-danger">Lỗi tải dữ liệu.</td></tr>`;
        showToast("Lỗi tải dữ liệu: " + error.message, "error");
    }
}

// --- TABLE RENDERING, SORTING, FILTERING ---

function renderSoftwareTable(softwareList) {
    const tableBody = document.getElementById('software-table-body');
    if (!tableBody) return;
    if (!Array.isArray(softwareList)) softwareList = [];

    if (softwareList.length === 0) {
        // [THAY ĐỔI] Dùng token 'text-secondary'
        tableBody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-secondary">Không tìm thấy phần mềm nào khớp.</td></tr>`;
        return;
    }

    // (Giữ nguyên getBadge - đây là component class, không phải utility class)
    const getBadge = (type) => {
        const safeType = type || '';
        if (safeType === 'windows') return `<span class="badge badge-windows">Windows</span>`;
        if (safeType === 'macos') return `<span class="badge badge-macos">macOS</span>`;
        if (safeType === 'winget') return `<span class="badge badge-winget">Winget</span>`;
        return escapeHtml(safeType);
    };

    try {
        tableBody.innerHTML = softwareList.map((item, index) => {
            if (typeof item !== 'object' || item === null) return '';

            const itemId = item.id || '';
            const itemTen = item.ten_phan_mem || '';
            const itemLoai = item.loai_phan_mem || '';
            const itemDanhMuc = item.danh_muc || '';
            const itemDonGia = typeof item.don_gia === 'number' ? formatCurrency(item.don_gia) : 'N/A';
            const itemLink = item.link_tai_lenh || '';
            const itemHuongDan = item.huong_dan || '';
            const itemThongDung = item.phan_mem_thong_dung === true;

            const actionButtonsHtml = `
                <button class="icon-btn icon-btn-gray view-guide-btn" data-id="${itemId}" title="Xem Hướng Dẫn">...</button>
                <button class="icon-btn icon-btn-blue edit-software-btn" data-id="${itemId}" title="Sửa">...</button>
                <button class="icon-btn icon-btn-red delete-software-btn" data-id="${itemId}" title="Xóa">...</button>
            `; // (Rút gọn SVG cho dễ đọc)

            // [THAY ĐỔI] Áp dụng token font (font-thin, font-medium) và màu (text-primary, text-brand)
            return `
            <tr class="border-b" data-id="${itemId}">
                <td class="p-3 font-thin text-primary">${index + 1}</td>
                <td class="p-3 text-center"> <input type="checkbox" class="styled-checkbox software-checkbox" data-id="${itemId}" data-type="${itemLoai}" data-link="${escapeHtml(itemLink)}"> </td>
                <td class="p-3 font-medium text-primary">${escapeHtml(itemTen)} ${itemThongDung ? '⭐' : ''}</td>
                <td class="p-3 font-thin text-primary">${getBadge(itemLoai)}</td>
                <td class="p-3 font-thin text-primary">${escapeHtml(itemDanhMuc)}</td>
                <td class="p-3 font-thin text-primary truncate max-w-xs">${escapeHtml(itemLink)}</td>
                <td class="p-3 font-thin text-primary truncate max-w-xs">${escapeHtml(itemHuongDan)}</td>
                <td class="p-3 font-medium text-brand">${itemDonGia}</td> 
                <td class="p-3">${actionButtonsHtml}</td>
            </tr>
        `;
        }).join('');
    } catch (renderError) {
        console.error("DEBUG: Lỗi nghiêm trọng khi đang vẽ bảng HTML:", renderError);
        // [THAY ĐỔI] Dùng token 'text-danger'
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-danger">Lỗi hiển thị dữ liệu.</td></tr>`;
    }
}

function handleSort(columnName, keepDirection = false) {
    if (!keepDirection) {
        if (sortState.col === columnName) {
            sortState.dir = (sortState.dir === 'asc') ? 'desc' : 'asc';
        } else {
            sortState.col = columnName;
            sortState.dir = 'asc';
        }
    }

    allSoftware.sort((a, b) => {
        let valA = a[columnName];
        let valB = b[columnName];
        if (columnName === 'don_gia') {
            valA = typeof valA === 'number' ? valA : -Infinity;
            valB = typeof valB === 'number' ? valB : -Infinity;
        } else {
            valA = valA ? String(valA).toLowerCase() : '';
            valB = valB ? String(valB).toLowerCase() : '';
        }
        let comparison = 0;
        if (valA > valB) comparison = 1;
        else if (valA < valB) comparison = -1;
        return (sortState.dir === 'desc') ? (comparison * -1) : comparison;
    });

    document.querySelectorAll('#software-table th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === sortState.col) {
            th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });

    handleFilter(null);
}

function handleFilter(btn = null) {
    const searchInput = document.getElementById('search-input');
    const searchTerms = searchInput ? searchInput.value.toLowerCase().split(',')
        .map(term => term.trim()).filter(term => term) : [];

    if (btn) btn.classList.toggle('active');

    const activeFilters = [];
    document.querySelectorAll('.filter-btn.active').forEach(b => {
        activeFilters.push(b.dataset.filter);
    });

    const filteredSoftware = allSoftware.filter(s => {
        if (typeof s !== 'object' || s === null) return false;
        let typeMatch = (activeFilters.length === 0) || activeFilters.some(filter => {
            if (filter === 'common') return s.phan_mem_thong_dung === true;
            return s.loai_phan_mem === filter;
        });
        let searchMatch = (searchTerms.length === 0) || searchTerms.some(term =>
            s.ten_phan_mem && s.ten_phan_mem.toLowerCase().includes(term)
        );
        return typeMatch && searchMatch;
    });

    renderSoftwareTable(filteredSoftware);
}

// --- SOFTWARE CRUD & MODAL (ĐÃ CẬP NHẬT TIỀN TỆ) ---

function openAddSoftwareModal(softwareToEdit = null) {
    const isEdit = softwareToEdit !== null;
    const title = isEdit ? 'Chỉnh Sửa Phần Mềm' : 'Thêm Phần Mềm Mới';
    const categoryOptions = allCategories.map(cat =>
        `<option value="${escapeHtml(cat.name || '')}" ${isEdit && softwareToEdit.danh_muc === cat.name ? 'selected' : ''}>${escapeHtml(cat.name || '')}</option>`
    ).join('');

    const formattedDonGia = isEdit && typeof softwareToEdit.don_gia === 'number'
        ? formatCurrency(softwareToEdit.don_gia.toString())
        : '';

    // [THAY ĐỔI] Dùng 'font-bold' và 'text-brand' cho tiêu đề
    const modalContent = `
        <h3 class="font-bold text-brand mb-4">${title}</h3>
        <form id="software-form" data-id="${isEdit ? (softwareToEdit.id || '') : ''}">
            <div class="mb-3"> <label for="sw-ten">Tên Phần Mềm</label> <input type="text" id="sw-ten" class="mt-1 w-full" value="${isEdit ? escapeHtml(softwareToEdit.ten_phan_mem || '') : ''}"> </div>
            <div class="mb-3"> <label for="sw-loai">Loại</label> <select id="sw-loai" class="mt-1 w-full"> <option value="windows" ${isEdit && softwareToEdit.loai_phan_mem === 'windows' ? 'selected' : ''}>Windows</option> <option value="macos" ${isEdit && softwareToEdit.loai_phan_mem === 'macos' ? 'selected' : ''}>macOS</option> <option value="winget" ${isEdit && softwareToEdit.loai_phan_mem === 'winget' ? 'selected' : ''}>Winget</option> </select> </div>
            <div class="mb-3"> <label for="sw-danh-muc">Danh Mục</label> <div class="flex items-center gap-1 mt-1"> <select id="sw-danh-muc" class="flex-1 w-full">${categoryOptions}</select> <button type="button" id="add-category-btn" class="icon-btn icon-btn-green" title="Thêm">...</button> <button type="button" id="edit-category-btn" class="icon-btn icon-btn-blue" title="Sửa">...</button> <button type="button" id="delete-category-btn" class="icon-btn icon-btn-red" title="Xóa">...</button> </div> </div>
            <div class="mb-3"> 
                <label for="sw-don-gia">Đơn Giá (VNĐ)</label> 
                <input type="text" id="sw-don-gia" inputmode="numeric" class="mt-1 w-full" value="${formattedDonGia}"> 
            </div>
            <div class="mb-3"> <label for="sw-link">Link Tải / Lệnh Winget</label> <input type="text" id="sw-link" class="mt-1 w-full" value="${isEdit ? escapeHtml(softwareToEdit.link_tai_lenh || '') : ''}"> </div>
            <div class="mb-3"> <label for="sw-huong-dan">Hướng Dẫn Nhanh</label> <textarea id="sw-huong-dan" rows="3" class="mt-1 w-full">${isEdit ? escapeHtml(softwareToEdit.huong_dan || '') : ''}</textarea> </div>
            <div class="mb-3 flex items-center"> <input type="checkbox" id="sw-thong-dung" class="styled-checkbox" ${isEdit && softwareToEdit.phan_mem_thong_dung ? 'checked' : ''}> <label for="sw-thong-dung" class="ml-2">Thông dụng</label> </div>
            <div class="mt-6 flex justify-end space-x-3"> <button type="button" id="modal-cancel-btn" class="btn btn-secondary">Hủy</button> <button type="button" id="modal-save-software-btn" class="btn btn-green">${isEdit ? 'Lưu Thay Đổi' : 'Lưu Mới'}</button> </div>
        </form>
    `;
    openModal(modalContent, 'max-w-lg');

    const donGiaInput = document.getElementById('sw-don-gia');
    if (donGiaInput) {
        donGiaInput.addEventListener('input', (e) => {
            const target = e.target;
            const cursorPosition = target.selectionStart;
            const originalLength = target.value.length;

            const formattedValue = formatCurrency(target.value);
            target.value = formattedValue;

            const newLength = formattedValue.length;

            if (cursorPosition !== null) {
                const newCursorPosition = cursorPosition + (newLength - originalLength);
                target.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        });
    }

    document.getElementById('modal-save-software-btn')?.addEventListener('click', saveSoftware);
    document.getElementById('add-category-btn')?.addEventListener('click', handleAddCategory);
    document.getElementById('edit-category-btn')?.addEventListener('click', handleEditCategory);
    document.getElementById('delete-category-btn')?.addEventListener('click', handleDeleteCategory);
}

async function saveSoftware() {
    const form = document.getElementById('software-form');
    if (!form) return;
    const id = form.dataset.id;
    const isEdit = !!id;

    const donGiaInput = document.getElementById('sw-don-gia');
    const donGiaValue = donGiaInput ? unformatCurrency(donGiaInput.value) : 0;
    const don_gia = !isNaN(donGiaValue) && donGiaValue >= 0 ? donGiaValue : 0;

    const data = {
        ten_phan_mem: document.getElementById('sw-ten')?.value || '',
        loai_phan_mem: document.getElementById('sw-loai')?.value || '',
        danh_muc: document.getElementById('sw-danh-muc')?.value || '',
        link_tai_lenh: document.getElementById('sw-link')?.value || '',
        huong_dan: document.getElementById('sw-huong-dan')?.value || '',
        phan_mem_thong_dung: document.getElementById('sw-thong-dung')?.checked || false,
        don_gia: don_gia
    };

    if (!data.ten_phan_mem || !data.link_tai_lenh) {
        return showToast("Tên và Link/Lệnh không được để trống.", "error");
    }

    try {
        if (isEdit && id) {
            await db.collection('software').doc(id).update(data);
            const index = allSoftware.findIndex(s => s.id === id);
            if (index > -1) allSoftware[index] = { ...allSoftware[index], ...data };
            showToast("Cập nhật phần mềm thành công!");
        } else {
            const docRef = await db.collection('software').add(data);
            allSoftware.push({ id: docRef.id, ...data });
            showToast("Thêm phần mềm mới thành công!");
        }
        closeModal();
        handleSort(sortState.col, true);
    } catch (error) {
        console.error("Lỗi lưu Firebase:", error);
        showToast("Có lỗi xảy ra, vui lòng thử lại.", "error");
    }
}

async function deleteSoftwareItem(id) {
    if (!id) return;
    const software = allSoftware.find(s => s.id === id);
    if (!software) return;
    if (!confirm(`Bạn có chắc muốn xóa phần mềm "${software.ten_phan_mem}"?`)) return;

    try {
        await db.collection('software').doc(id).delete();
        allSoftware = allSoftware.filter(s => s.id !== id);
        handleFilter(null);
        showToast(`Đã xóa ${software.ten_phan_mem}.`);
    } catch (error) {
        console.error("Lỗi xóa:", error);
        showToast("Lỗi khi xóa, vui lòng thử lại.", "error");
    }
}

// --- CATEGORY MANAGEMENT ---
// (Các hàm này không chứa class UI, giữ nguyên)
async function handleAddCategory() { /* ... */ }
async function handleEditCategory() { /* ... */ }
async function handleDeleteCategory() { /* ... */ }
function updateCategoryDropdown(selectedValue = null) { /* ... */ }

// --- QUOTE MODAL ---
// (Giữ nguyên)
function openQuoteModal() { /* ... */ }


// --- PAGE LISTENERS (Static buttons) ---

async function handleDeleteSelected() {
    const selectedCheckboxes = document.querySelectorAll('.software-checkbox:checked');
    if (selectedCheckboxes.length === 0) return showToast("Chưa chọn phần mềm nào để xóa.", "error");
    if (!confirm(`Bạn có chắc muốn xóa ${selectedCheckboxes.length} phần mềm đã chọn?`)) return;

    const batch = db.batch();
    const idsToDelete = [];
    selectedCheckboxes.forEach(cb => {
        const id = cb.dataset.id;
        if (id) {
            idsToDelete.push(id);
            batch.delete(db.collection('software').doc(id));
        }
    });

    if (idsToDelete.length === 0) return;
    try {
        await batch.commit();
        allSoftware = allSoftware.filter(s => !idsToDelete.includes(s.id));
        handleFilter(null);
        showToast(`Đã xóa ${idsToDelete.length} phần mềm.`);
    } catch (error) {
        console.error("Lỗi xóa:", error);
        showToast("Lỗi khi xóa, vui lòng thử lại.", "error");
    }
}

function handleOpenLink() {
    const selectedCheckboxes = document.querySelectorAll('.software-checkbox:checked');
    let openedCount = 0;
    selectedCheckboxes.forEach(cb => {
        const type = cb.dataset.type;
        const link = cb.dataset.link;
        if (type !== 'winget' && link) {
            window.open(link, '_blank');
            openedCount++;
        }
    });
    if (openedCount === 0) {
        showToast("Chưa chọn link nào (hoặc chỉ chọn Winget).", "error");
    }
}

function handleWingetClick() {
    const selected = [...document.querySelectorAll('.software-checkbox:checked')]
        .map(cb => ({ id: cb.dataset.id, link: cb.dataset.link, type: cb.dataset.type }))
        .filter(s => s && s.link && s.type === 'winget');

    openWingetModal(selected);
}

function setupPhanMemListeners() {
    document.querySelectorAll('#software-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (sortKey) handleSort(sortKey);
        });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn));
    });

    document.getElementById('search-btn')?.addEventListener('click', () => handleFilter(null));
    document.getElementById('search-input')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFilter(null);
        }
    });

    document.getElementById('add-software-btn')?.addEventListener('click', () => openAddSoftwareModal());
    document.getElementById('open-link-btn')?.addEventListener('click', handleOpenLink);
    document.getElementById('winget-btn')?.addEventListener('click', handleWingetClick);
    document.getElementById('delete-selected-btn')?.addEventListener('click', handleDeleteSelected);
    document.getElementById('quote-btn')?.addEventListener('click', openQuoteModal);
    document.getElementById('select-all-checkbox')?.addEventListener('change', (e) => {
        document.querySelectorAll('.software-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('software-table-body')?.addEventListener('click', (e) => {
        const target = e.target;

        const editBtn = target.closest('.edit-software-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const softwareToEdit = allSoftware.find(s => s.id === id);
            if (softwareToEdit) openAddSoftwareModal(softwareToEdit);
            return;
        }

        const deleteBtn = target.closest('.delete-software-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (id) deleteSoftwareItem(id);
            return;
        }

        const guideBtn = target.closest('.view-guide-btn');
        if (guideBtn) {
            const id = guideBtn.dataset.id;
            const software = allSoftware.find(s => s.id === id);
            if (software) {
                // [THAY ĐỔI] Thêm class 'font-thin text-primary' cho nội dung hướng dẫn
                openGuideModal('Xem Hướng Dẫn', `<p class="whitespace-pre-wrap font-thin text-primary">${escapeHtml(software.huong_dan)}</p>`);
            }
            return;
        }
    });
}