// /js/components/footer.js

/**
 * Tải nội dung từ /_footer.html và chèn vào #footer-placeholder
 */
export async function loadFooter() {
    console.log("DEBUG: Bắt đầu loadFooter()");
    try {
        // 1. Tìm placeholder
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (!footerPlaceholder) {
            // Không phải trang nào cũng cần footer, nên đây không phải là lỗi
            console.log("DEBUG: Không tìm thấy #footer-placeholder, bỏ qua tải footer.");
            return;
        }

        // 2. Tải file _footer.html
        const response = await fetch('/_footer.html');
        if (!response.ok) {
            throw new Error(`Không thể tải _footer.html (${response.status})`);
        }
        
        const html = await response.text();
        
        // 3. Chèn HTML vào placeholder
        footerPlaceholder.innerHTML = html;
        console.log("DEBUG: Đã chèn footer vào HTML");

    } catch (error) {
        console.error('DEBUG: LỖI TRONG loadFooter:', error);
    }
}