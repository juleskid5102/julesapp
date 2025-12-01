import { escapeHtml, formatPrice } from '../utils.js';

const placeholderImg = '/assets/images/placeholder.svg';

export function createProductCard(product, icons = {}) {
    if (!product) return '';

    // --- 1. XỬ LÝ DỮ LIỆU TỪ FIREBASE PRODUCTS ---
    const displayImage = product.thumbnail || placeholderImg;
    const description = product.description || '';

    // Giá
    const finalPrice = formatPrice(product.finalPrice);
    const originalPrice = (product.price > product.finalPrice) ? formatPrice(product.price) : '';

    // Loại sản phẩm (Giữ nguyên case từ Firebase, ví dụ: "macos")
    // Nếu muốn viết hoa chữ đầu: "Macos", dùng CSS: text-transform: capitalize
    const productType = product.type || 'software';

    const productName = escapeHtml(product.name || 'Sản phẩm');

    // Link sản phẩm (Firebase field: link) - Nếu không có thì fallback
    const productLink = product.link ? escapeHtml(product.link) : '#';

    const productId = escapeHtml(product.id || '');

    // Rating & Favorite (Xử lý số liệu an toàn)
    const ratingVal = product.rating !== undefined ? Number(product.rating) : 0; // Đảm bảo là số
    const favoriteCount = product.favorite !== undefined ? Number(product.favorite) : 0;

    // --- 2. XỬ LÝ ICONS TỪ FIREBASE SETTINGS ---
    const iconFavUrl = icons?.iconFavoriteUrl || '/assets/icons/default-heart.svg';
    const iconCartUrl = icons?.iconCartUrl || '/assets/icons/default-cart.svg';
    const iconRatingUrl = icons?.iconRatingUrl || '/assets/icons/default-star.svg';

    // --- 3. HTML COMPONENTS ---

    // Badge Loại (Dùng CSS để capitalize nếu cần)
    const typeBadge = `<div class="badge-type">${escapeHtml(productType)}</div>`;

    // Badge Discount
    const discountBadge = (product.discountPercent > 0)
        ? `<span class="badge-discount">-${product.discountPercent}%</span>`
        : '';

    // Meta Rating & Like (Góc dưới phải ảnh)
    const metaHtml = `
        <div class="image-meta-badge">
            <div class="meta-item">
                <img src="${iconRatingUrl}" class="icon-xxs filter-icon" alt="star">
                <span>${ratingVal.toFixed(1)}</span>
            </div>
            <div class="meta-divider">|</div>
            <div class="meta-item">
                <img src="${iconFavUrl}" class="icon-xxs filter-icon" alt="heart">
                <span>${favoriteCount}</span>
            </div>
        </div>
    `;

    // --- 4. RENDER FINAL HTML ---
    return `
    <div class="jules-product-card group" onclick="window.location.href='${productLink}'">
        
        <div class="jules-card-image-area">
            <img src="${displayImage}" alt="${productName}" class="jules-card-poster" onerror="this.src='${placeholderImg}'">
            
            ${typeBadge}
            ${metaHtml}
        </div>

        <div class="jules-card-content">
            
            <h3 class="card-title" title="${productName}">${productName}</h3>
            <p class="card-desc-short">${escapeHtml(description)}</p>

            <div class="content-price-row">
                <span class="price-final">${finalPrice}</span>
                ${originalPrice ? `<span class="price-original">${originalPrice}</span>` : ''}
                ${discountBadge}
            </div>

            <div class="content-actions">
                <button class="btn-action-primary" data-product-id="${productId}" onclick="event.stopPropagation();">
                    MUA NGAY
                </button>
                
                <button class="btn-action-icon" data-product-id="${productId}" onclick="event.stopPropagation();">
                    <img src="${iconCartUrl}" class="filter-icon"> 
                </button>
                
                <button class="btn-action-icon" data-product-id="${productId}" onclick="event.stopPropagation();">
                    <img src="${iconFavUrl}" class="filter-icon">
                </button>
            </div>

        </div>
    </div>
    `;
}