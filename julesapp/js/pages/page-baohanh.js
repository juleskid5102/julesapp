// /js/pages/page-baohanh.js

// --- IMPORTS ---
import { db } from '../firebase.js';
// SỬA: Import thêm formatCurrency, unformatCurrency (file này đang dùng)
import { showToast, openModal, closeModal, escapeHtml, formatCurrency, unformatCurrency } from '../utils.js';

// --- MODULE-LEVEL VARIABLES ---
let allCustomers = [];
let selectedCustomerId = null;
const ACTIVE_CLASS = 'bg-brand-accent-light'; // SỬA: Dùng token

// --- INIT FUNCTION (Called by app.js) ---
export function initBaoHanhPage(user) { // Nhận user (sẽ dùng ở GĐ2)
    console.log("DEBUG: Khởi tạo trang Bảo Hành");

    // (Logic GĐ2 giữ nguyên)

    // Tạm thời, chúng ta giữ logic admin cũ:
    loadCustomers();
    setupBaoHanhListeners();
}

// --- DATA LOADING ---
async function loadCustomers() {
    console.log("DEBUG: Bắt đầu loadCustomers()");
    const customerListDiv = document.getElementById('customer-list-container');
    try {
        const snapshot = await db.collection('khach_hang').orderBy('ho_ten').get();
        allCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`DEBUG: Đã tải ${allCustomers.length} khách hàng`);
        renderCustomerList(allCustomers);
    } catch (error) {
        console.error("DEBUG: Lỗi tải khách hàng:", error);
        // SỬA: Dùng class text-danger
        if (customerListDiv) customerListDiv.innerHTML = `<p class="text-danger text-center">Lỗi tải danh sách.</p>`;
    }
}

function renderCustomerList(customerList) {
    const customerListDiv = document.getElementById('customer-list-container');
    if (!customerListDiv) return;
    if (!Array.isArray(customerList)) customerList = [];

    if (customerList.length === 0) {
        // SỬA: Dùng class text-secondary
        customerListDiv.innerHTML = `<p class="text-center text-secondary">Chưa có khách hàng nào.</p>`;
        return;
    }

    customerListDiv.innerHTML = customerList.map(cust => {
        if (typeof cust !== 'object' || cust === null) return '';
        const custId = cust.id || '';
        const custTen = cust.ho_ten || '';
        const custSdt = cust.sdt || '';

        const activeClass = (custId === selectedCustomerId) ? ACTIVE_CLASS : '';

        // SỬA: Dùng class text-secondary
        return `
             <div class="p-3 rounded-lg cursor-pointer customer-item ${activeClass}" data-id="${custId}">
                 <p class="font-semibold">${escapeHtml(custTen)}</p>
                 <p class="text-sm text-secondary">${escapeHtml(custSdt)}</p>
             </div>
         `;
    }).join('');
}

async function loadCustomerDetails(customerId) {
    console.log("DEBUG: Bắt đầu loadCustomerDetails() cho ID:", customerId);
    if (!customerId) return;

    selectedCustomerId = customerId;

    const detailContainer = document.getElementById('customer-detail-container');
    if (!detailContainer) return;
    // SỬA: Dùng class text-secondary
    detailContainer.innerHTML = `<p class="text-center text-secondary">Đang tải chi tiết...</p>`;

    try {
        const customer = allCustomers.find(c => c.id === customerId);
        if (!customer) throw new Error('Không tìm thấy khách hàng');

        const bhSnapshot = await db.collection('bao_hanh')
            .where('customer_sdt', '==', customer.sdt)
            .orderBy('ngay_bat_dau', 'desc')
            .get();
        const baoHanhList = bhSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let baoHanhHtml = `<p class="text-secondary">Chưa có thông tin bảo hành.</p>`; // SỬA: Dùng class
        if (baoHanhList.length > 0) {
            baoHanhHtml = baoHanhList.map(bh => {
                const tenSerial = bh.ten_phan_mem_serial || '';
                const ngayBD = bh.ngay_bat_dau instanceof firebase.firestore.Timestamp ? bh.ngay_bat_dau.toDate().toLocaleDateString('vi-VN') : 'N/A';
                const thoiGian = bh.thoi_gian_bao_hanh || '';
                const ngayHH = bh.ngay_het_hanh instanceof firebase.firestore.Timestamp ? bh.ngay_het_hanh.toDate().toLocaleDateString('vi-VN') : 'N/A';
                // Dùng hàm formatCurrency
                const giaTien = (typeof bh.gia_tien === 'number') ? formatCurrency(bh.gia_tien) : 'N/A';
                return `
                     <div class="border-t pt-3 mt-3">
                         <p><strong>Phần mềm/Serial:</strong> ${escapeHtml(tenSerial)}</p>
                         <p><strong>Ngày BH:</strong> ${ngayBD}</p>
                         <p><strong>Thời gian BH:</strong> ${escapeHtml(thoiGian)}</p>
                         <p><strong>Ngày hết hạn:</strong> ${ngayHH}</p>
                         <p><strong>Giá:</strong> ${giaTien} VNĐ</p>
                     </div>
                 `;
            }).join('');
        }

        detailContainer.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <!-- SỬA: Thêm class text-brand cho heading -->
                    <h3 class="text-2xl font-bold text-brand">${escapeHtml(customer.ho_ten || '')}</h3>
                    <!-- SỬA: Dùng class text-secondary -->
                    <p class="text-secondary"><strong>SĐT:</strong> ${escapeHtml(customer.sdt || '')}</p>
                    <p class="text-secondary"><strong>Link FB/Mail:</strong> ${customer.facebook ? escapeHtml(customer.facebook) : 'Chưa có'}</p>
                </div>
                <button id="edit-customer-btn" class="icon-btn icon-btn-blue" title="Sửa thông tin khách hàng">...</button>
            </div>
            <hr class="my-4">
            <div class="flex justify-between items-center mb-3">
                <!-- SỬA: Thêm class text-brand cho heading -->
                <h4 class="text-xl font-semibold text-brand">Thông tin Bảo hành</h4>
                <button id="add-baohanh-btn" data-customer-id="${customer.id || ''}" data-customer-sdt="${customer.sdt || ''}" class="btn btn-secondary px-3 py-1 text-sm">
                    + Thêm Bảo Hành
                </button>
            </div>
            <div class="space-y-3">${baoHanhHtml}</div>
        `;

        // Gán listener cho các nút vừa được render
        document.getElementById('edit-customer-btn')?.addEventListener('click', () => {
            showToast("Tính năng 'Sửa khách hàng' đang phát triển.", "error");
        });
        document.getElementById('add-baohanh-btn')?.addEventListener('click', (e) => {
            const customerId = e.currentTarget.dataset.customerId;
            const customerSdt = e.currentTarget.dataset.customerSdt;
            if (customerId && customerSdt) {
                openAddBaoHanhModal(customerId, customerSdt);
            }
        });

    } catch (error) {
        console.error("DEBUG: Lỗi tải chi tiết:", error);
        // SỬA: Dùng class text-danger
        if (detailContainer) detailContainer.innerHTML = `<p class="text-danger text-center">Lỗi tải chi tiết. (Kiểm tra Index trên Firebase).</p>`;
    }
}

// --- CUSTOMER MODAL & ACTIONS ---

function openAddCustomerModal() {
    // SỬA: Thêm class text-brand cho heading
    const modalContent = `
            <h3 class="text-xl font-bold text-brand mb-4">Thêm Khách Hàng Mới</h3>
            <form id="customer-form">
                <div class="mb-3"> <label for="cust-ten">Họ Tên</label> <input type="text" id="cust-ten" class="mt-1 w-full" required> </div>
                <div class="mb-3"> <label for="cust-sdt">Số Điện Thoại (Khóa chính)</label> <input type="tel" id="cust-sdt" class="mt-1 w-full" required> </div>
                <div class="mb-3"> <label for="cust-fb">Link Facebook / Mail</label> <input type="text" id="cust-fb" class="mt-1 w-full"> </div>
                <div class="mt-6 flex justify-end space-x-3"> <button type="button" id="modal-cancel-btn" class="btn btn-secondary">Hủy</button> <button type="button" id="modal-save-customer-btn" class="btn btn-green">Lưu Khách Hàng</button> </div>
            </form>
    `;
    openModal(modalContent, 'max-w-md');

    document.getElementById('modal-save-customer-btn')?.addEventListener('click', saveCustomer);
}

async function saveCustomer() {
    const hoTenInput = document.getElementById('cust-ten');
    const sdtInput = document.getElementById('cust-sdt');
    const fbInput = document.getElementById('cust-fb');
    if (!hoTenInput || !sdtInput) return;

    const ho_ten = hoTenInput.value;
    let sdt = sdtInput.value.trim().replace(/\s+/g, '');
    const facebook = fbInput.value || '';

    if (!ho_ten || !sdt) {
        return showToast("Họ Tên và SĐT là bắt buộc.", "error");
    }
    if (!/^\d{8,13}$/.test(sdt)) {
        return showToast("SĐT phải từ 8-13 số.", "error");
    }
    if (!sdt.startsWith('0')) sdt = '0' + sdt;
    if (allCustomers.some(c => c.sdt === sdt)) {
        return showToast("SĐT này đã tồn tại trong danh sách!", "error");
    }

    try {
        const data = { ho_ten, sdt, facebook };
        const docRef = await db.collection('khach_hang').add(data);
        allCustomers.push({ id: docRef.id, ...data });
        allCustomers.sort((a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''));
        renderCustomerList(allCustomers);
        closeModal();
        showToast("Thêm khách hàng thành công.");
    } catch (error) {
        console.error("Lỗi thêm khách hàng:", error);
        showToast("Lỗi khi lưu, vui lòng thử lại.", "error");
    }
}

// --- WARRANTY MODAL & ACTIONS (Cập nhật tiền tệ) ---

function openAddBaoHanhModal(customerId, customerSdt) {
    // SỬA: Thêm class text-brand cho heading
    const modalContent = `
            <h3 class="text-xl font-bold text-brand mb-4">Thêm Bản Ghi Bảo Hành</h3>
            <form id="baohanh-form" data-customer-sdt="${customerSdt || ''}" data-customer-id="${customerId || ''}">
                <div class="mb-3"> <label for="bh-ten">Tên Phần Mềm / Serial Máy</label> <input type="text" id="bh-ten" class="mt-1 w-full" required> </div>
                <div class="mb-3"> <label for="bh-thoigian">Thời Gian Bảo Hành (vd: 6 tháng)</label> <input type="text" id="bh-thoigian" class="mt-1 w-full" required> </div>
                <div class="mb-3"> <label for="bh-ngay">Ngày Bắt Đầu Bảo Hành</label> <input type="date" id="bh-ngay" class="mt-1 w-full" value="${new Date().toISOString().split('T')[0]}" required> </div>
                <div class="mb-3"> <label for="bh-gia">Giá Tiền (VNĐ)</label> <input type="text" id="bh-gia" inputmode="numeric" class="mt-1 w-full" value="0"> </div>
                <div class="mt-6 flex justify-end space-x-3"> <button type="button" id="modal-cancel-btn" class="btn btn-secondary">Hủy</button> <button type="button" id="modal-save-baohanh-btn" class="btn btn-green">Lưu Bảo Hành</button> </div>
            </form>
    `;
    openModal(modalContent, 'max-w-md');

    // Gán listener cho ô giá tiền
    const giaInput = document.getElementById('bh-gia');
    if (giaInput) {
        giaInput.addEventListener('input', (e) => {
            // SỬA: Kiểm tra e.target trước khi gán
            if (e.target) {
                e.target.value = formatCurrency(e.target.value);
            }
        });
    }

    document.getElementById('modal-save-baohanh-btn')?.addEventListener('click', saveBaoHanh);
}

async function saveBaoHanh() {
    const form = document.getElementById('baohanh-form');
    if (!form) return;

    const customer_sdt = form.dataset.customerSdt;
    const customerId = form.dataset.customerId;

    // Dùng unformatCurrency
    const giaInput = document.getElementById('bh-gia');
    const gia_tien = giaInput ? unformatCurrency(giaInput.value) : 0;

    const ngay_bat_dau_str = document.getElementById('bh-ngay')?.value;
    const thoi_gian_bao_hanh = document.getElementById('bh-thoigian')?.value;
    const ten_phan_mem_serial = document.getElementById('bh-ten')?.value;

    if (!ngay_bat_dau_str || !thoi_gian_bao_hanh || !ten_phan_mem_serial) {
        return showToast("Vui lòng nhập đủ Tên, Ngày và Thời gian BH.", "error");
    }

    const ngay_bat_dau = new Date(ngay_bat_dau_str);
    let ngay_het_hanh = new Date(ngay_bat_dau);

    // Logic tính ngày hết hạn
    try {
        const parts = thoi_gian_bao_hanh.toLowerCase().split(' ');
        const amount = parseInt(parts[0]);
        if (isNaN(amount)) throw new Error("Invalid number");

        if (parts.length === 2 && (parts[1].includes('tháng') || parts[1].includes('month'))) {
            ngay_het_hanh.setMonth(ngay_het_hanh.getMonth() + amount);
        } else if (parts.length === 2 && (parts[1].includes('năm') || parts[1].includes('year'))) {
            ngay_het_hanh.setFullYear(ngay_het_hanh.getFullYear() + amount);
        } else if (parts.length === 2 && (parts[1].includes('ngày') || parts[1].includes('day'))) {
            ngay_het_hanh.setDate(ngay_het_hanh.getDate() + amount);
        } else {
            const days = parseInt(thoi_gian_bao_hanh);
            if (!isNaN(days)) {
                ngay_het_hanh.setDate(ngay_het_hanh.getDate() + days);
            } else {
                throw new Error("Invalid format");
            }
        }
    } catch (e) {
        return showToast("Thời gian bảo hành không hợp lệ (vd: '6 tháng', '1 năm', '30 ngày')", "error");
    }

    const data = {
        customer_sdt: customer_sdt,
        ten_phan_mem_serial: ten_phan_mem_serial,
        thoi_gian_bao_hanh: thoi_gian_bao_hanh,
        gia_tien: gia_tien, // Lưu dạng số
        ngay_bat_dau: firebase.firestore.Timestamp.fromDate(ngay_bat_dau),
        ngay_het_hanh: firebase.firestore.Timestamp.fromDate(ngay_het_hanh),
        // Sẽ thêm public_share_id ở Giai đoạn 2
    };

    try {
        await db.collection('bao_hanh').add(data);
        closeModal();
        showToast("Thêm bảo hành thành công.");
        if (customerId) loadCustomerDetails(customerId); // Tải lại chi tiết
    } catch (error) {
        console.error("Lỗi lưu bảo hành:", error);
        showToast("Lỗi khi lưu, vui lòng thử lại.", "error");
    }
}


// --- PAGE LISTENERS (Static buttons) ---
function setupBaoHanhListeners() {
    document.getElementById('add-customer-btn')?.addEventListener('click', openAddCustomerModal);

    document.getElementById('customer-search-input')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allCustomers.filter(c =>
            (c.ho_ten || '').toLowerCase().includes(searchTerm) || (c.sdt || '').includes(searchTerm)
        );
        renderCustomerList(filtered);
    });

    // Event Delegation cho danh sách
    document.getElementById('customer-list-container')?.addEventListener('click', (e) => {
        const target = e.target;
        const item = target.closest('.customer-item');
        if (item) {
            // SỬA: Dùng token
            document.querySelectorAll('.customer-item').forEach(el => el.classList.remove(ACTIVE_CLASS));
            item.classList.add(ACTIVE_CLASS);
            const customerId = item.dataset.id;
            if (customerId) loadCustomerDetails(customerId);
        }
    });
}