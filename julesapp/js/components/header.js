// header.js — FULL, ready-to-run (Glass Airy Jules 2025)
// Assumes ../firebase.js exports { db, auth }

import { db, auth } from '../firebase.js';

/* ---------------------------
   Utilities
   --------------------------- */
function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

function safeGet(obj, key, fallback = '') {
    return (obj && obj[key] !== undefined) ? obj[key] : fallback;
}

/* ---------------------------
   Module state
   --------------------------- */
let headerSettings = {};

/* ---------------------------
   Load header (main)
   - fetch settings from Firestore /settings/header
   - fetch template /_header.html
   - render
   --------------------------- */
export async function loadHeader(user = null) {
    try {
        console.log('DEBUG: loadHeader() — fetching header settings...');
        const doc = await db.collection('settings').doc('header').get();
        headerSettings = doc.exists ? doc.data() : {};
        console.log('DEBUG: headerSettings', headerSettings);

        // favicon
        if (headerSettings.faviconUrl) {
            const link = document.getElementById('favicon-link');
            if (link) link.href = headerSettings.faviconUrl;
        }

        // fetch template
        const resp = await fetch('/_header.html');
        if (!resp.ok) throw new Error(`Unable to fetch _header.html (${resp.status})`);
        let html = await resp.text();

        // substitute tokens (use escapeHtml)
        html = html
            .replace('{{LOGO_URL}}', escapeHtml(safeGet(headerSettings, 'logoUrl', '/assets/images/logo.png')))
            .replace('{{LOGO_ALT_TEXT}}', escapeHtml(safeGet(headerSettings, 'logoAltText', 'Logo')))
            .replace('{{STUDIO_NAME_MAIN}}', escapeHtml(safeGet(headerSettings, 'studioNameMain', 'Jules Studio')))
            .replace('{{STUDIO_SLOGAN}}', escapeHtml(safeGet(headerSettings, 'studioSlogan', '')))
            .replace('{{ICON_SEARCH_URL}}', escapeHtml(safeGet(headerSettings, 'iconSearchUrl', '/assets/icons/header/search.svg')))
            .replace('{{ICON_CART_URL}}', escapeHtml(safeGet(headerSettings, 'iconCartUrl', '/assets/icons/header/cart.svg')))
            .replace('{{ICON_BELL_URL}}', escapeHtml(safeGet(headerSettings, 'iconBellUrl', '/assets/icons/header/bell.svg')))
            .replace('{{ICON_BELL_EMPTY_URL}}', escapeHtml(safeGet(headerSettings, 'iconBellEmptyUrl', '/assets/icons/header/bell-empty.svg')))
            .replace('{{UNREAD_COUNT}}', '0'); // unread count placeholder

        // render into placeholder
        const placeholder = document.getElementById('header-placeholder');
        if (!placeholder) {
            console.warn('DEBUG: #header-placeholder not found in page.');
            return;
        }

        placeholder.innerHTML = html;

        // apply logo size if provided
        const logoImg = placeholder.querySelector('.header-logo-img');
        const logoSize = safeGet(headerSettings, 'logoSize', 32);
        if (logoImg) {
            logoImg.style.width = `${logoSize}px`;
            logoImg.style.height = 'auto';
        }

        // set visibility if was hidden by css
        placeholder.style.visibility = 'visible';
        placeholder.style.opacity = 1;

        // run init steps (UI wiring)
        setActiveLink();
        setupHeaderInteractions();
        setupScrollListener();
        setupGlobalClickAwayListeners();
        initAuthArea(user);

        // optionally show unread badge based on headerSettings or external source
        updateUnreadBadge(0);

    } catch (err) {
        console.error('ERROR loadHeader:', err);
    }
}

/* ---------------------------
   update unread badge utility
   --------------------------- */
export function updateUnreadBadge(count = 0) {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = String(count);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

/* ---------------------------
   HTML snippets (login / avatar)
   These return HTML strings that match _header.css classes
   --------------------------- */

function getLoginButtonHtml() {
    const iconUrl = safeGet(headerSettings, 'iconLoginUrl', '/assets/icons/header/user-login.svg');
    return `
    <a href="/dangnhap.html" class="nav-login-icon-btn" title="Đăng nhập">
      <img src="${escapeHtml(iconUrl)}" alt="Đăng nhập" class="header-icon-img">
    </a>
  `;
}

function getAvatarDropdownHtml(user) {
    const email = user.email || 'user@example.com';
    const name = user.displayName || email.split('@')[0];
    const firstLetter = (user.displayName ? user.displayName[0] : email[0]).toUpperCase();

    const avatarContent = user.photoURL
        ? `<img src="${escapeHtml(user.photoURL)}" alt="Avatar" class="avatar-image">`
        : `<span class="avatar-letter">${firstLetter}</span>`;

    return `
    <div class="avatar-dropdown-container">
      <button id="avatar-btn" class="avatar-button" aria-haspopup="true" aria-expanded="false">
        <span class="sr-only">Mở menu người dùng</span>
        ${avatarContent}
      </button>

      <div id="avatar-dropdown-menu" class="avatar-dropdown-menu hidden" role="menu">
        <div class="dropdown-header">
          <p class="fontMedium textBrand truncate">${escapeHtml(name)}</p>
          <p class="fontThin textSecondary truncate">${escapeHtml(user.email)}</p>
        </div>

        <a href="/quantri.html" class="dropdown-item fontThin textPrimary">Trang Quản trị</a>
        <a href="/tools.html" class="dropdown-item fontThin textPrimary">Quản lý Phần mềm</a>
        <a href="/baohanh.html" class="dropdown-item fontThin textPrimary">Lịch sử Bảo hành</a>

        <div class="border-t" style="border-color: var(--borderGlass);">
          <button id="header-logout-btn" class="dropdown-item dropdown-item-danger fontThin" style="width:100%; text-align:left;">
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ---------------------------
   UI wiring: header interactions
   - notification toggle
   - cart toggle (simple)
   - mark all read
   --------------------------- */
function setupHeaderInteractions() {
    // notification toggle
    const notificationBtn = document.getElementById('notification-toggle-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            notificationDropdown.classList.toggle('hidden');

            // close avatar if open
            const avatarDropdown = document.getElementById('avatar-dropdown-menu');
            if (avatarDropdown) avatarDropdown.classList.add('hidden');

            // lazy-check list empty
            const listContainer = document.getElementById('notification-list-items');
            const emptyState = document.getElementById('notification-empty-state');
            if (listContainer) {
                const items = listContainer.querySelectorAll('.notification-item');
                if (items.length === 0 && emptyState) {
                    emptyState.classList.remove('hidden');
                } else if (emptyState) {
                    emptyState.classList.add('hidden');
                }
            }
        });
    }

    // cart toggle (very simple skeleton)
    const cartBtn = document.getElementById('cart-toggle-btn');
    const cartDropdown = document.getElementById('cart-dropdown');
    if (cartBtn && cartDropdown) {
        cartBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            cartDropdown.classList.toggle('hidden');

            // hide others
            const notificationDropdown2 = document.getElementById('notification-dropdown');
            if (notificationDropdown2) notificationDropdown2.classList.add('hidden');
        });
    }

    // mark all read button
    const markAllBtn = document.getElementById('mark-all-read-btn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            // simple local mark: remove unread class
            const unread = document.querySelectorAll('.notification-item.notification-unread');
            unread.forEach(i => i.classList.remove('notification-unread'));
            updateUnreadBadge(0);
            // Additional: you may call backend to mark read
            console.log('DEBUG: mark all read clicked');
        });
    }
}

/* ---------------------------
   Click-away handlers to close dropdowns
   --------------------------- */
function setupGlobalClickAwayListeners() {
    document.addEventListener('click', (ev) => {
        const avatarBtn = document.getElementById('avatar-btn');
        const avatarDropdown = document.getElementById('avatar-dropdown-menu');
        const notificationBtn = document.getElementById('notification-toggle-btn');
        const notificationDropdown = document.getElementById('notification-dropdown');
        const cartBtn = document.getElementById('cart-toggle-btn');
        const cartDropdown = document.getElementById('cart-dropdown');

        if (avatarDropdown && !avatarDropdown.classList.contains('hidden')) {
            if (!avatarBtn.contains(ev.target) && !avatarDropdown.contains(ev.target)) {
                avatarDropdown.classList.add('hidden');
            }
        }

        if (notificationDropdown && !notificationDropdown.classList.contains('hidden')) {
            if (!notificationBtn.contains(ev.target) && !notificationDropdown.contains(ev.target)) {
                notificationDropdown.classList.add('hidden');
            }
        }

        if (cartDropdown && !cartDropdown.classList.contains('hidden')) {
            if (!cartBtn.contains(ev.target) && !cartDropdown.contains(ev.target)) {
                cartDropdown.classList.add('hidden');
            }
        }
    });
}

/* ---------------------------
   Scroll effect: toggle .is-scrolled
   --------------------------- */
function setupScrollListener() {
    const header = document.querySelector('.header-container');
    if (!header) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) header.classList.add('is-scrolled');
        else header.classList.remove('is-scrolled');
    });
}

/* ---------------------------
   Active link (current page)
   --------------------------- */
function setActiveLink() {
    try {
        const current = window.location.pathname;
        const navLinks = document.querySelectorAll('header a');
        navLinks.forEach((a) => {
            a.classList.remove('active');
            try {
                const href = new URL(a.href, window.location.origin).pathname;
                if (href === current) a.classList.add('active');
            } catch (e) { /* ignore */ }
        });
    } catch (e) {
        console.warn('setActiveLink error', e);
    }
}

/* ---------------------------
   Auth init / rendering login or avatar
   --------------------------- */
function initAuthAreaImmediate(user) {
    const placeholder = document.getElementById('user-auth-placeholder');
    if (!placeholder) return;
    if (user) {
        placeholder.innerHTML = getAvatarDropdownHtml(user);
        // wire up dropdown and logout
        setupDropdownListeners(); // this will attach after DOM elements exist
    } else {
        placeholder.innerHTML = getLoginButtonHtml();
    }
}

function initAuthStateListener() {
    // prefer firebase auth listener if available
    if (!auth || !auth.onAuthStateChanged) return;
    auth.onAuthStateChanged((user) => {
        const placeholder = document.getElementById('user-auth-placeholder');
        if (!placeholder) return;
        if (user) {
            placeholder.innerHTML = getAvatarDropdownHtml(user);
            // small timeout to ensure DOM insertion
            setTimeout(() => {
                setupDropdownListeners();
            }, 8);
        } else {
            placeholder.innerHTML = getLoginButtonHtml();
        }
    });
}

function initAuthArea(userProvided = null) {
    if (userProvided) {
        initAuthAreaImmediate(userProvided);
    }
    initAuthStateListener();
}

/* ---------------------------
   Setup dropdown listeners (separate small function reused)
   --------------------------- */
function setupDropdownListeners() {
    const avatarBtn = document.getElementById('avatar-btn');
    const dropdownMenu = document.getElementById('avatar-dropdown-menu');
    const logoutBtn = document.getElementById('header-logout-btn');

    if (avatarBtn && dropdownMenu) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
            const notificationDropdown = document.getElementById('notification-dropdown');
            if (notificationDropdown) notificationDropdown.classList.add('hidden');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await auth.signOut();
                window.location.href = '/index.html';
            } catch (err) {
                console.error('Logout error', err);
            }
        });
    }
}

/* ---------------------------
   Public init (call on DOM ready)
   --------------------------- */
export function initHeaderJS() {
    // note: keep idempotent
    setupScrollListener();
    setupHeaderInteractions();
    setupGlobalClickAwayListeners();
    initAuthStateListener();
    setActiveLink();
}

/* auto-init when script loaded (if you prefer)
   But to keep flexible, you can call initHeaderJS() from app init */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // init small behaviors in-case header already injected
        setupScrollListener();
        setupGlobalClickAwayListeners();
        setActiveLink();
        // auth listener only if auth present
        if (auth && auth.onAuthStateChanged) initAuthStateListener();
    } catch (e) {
        console.warn('Header init error', e);
    }
});
