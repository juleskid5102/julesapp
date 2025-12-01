// /js/pages/page-dangnhap.js (Nội dung mới)

import { auth, db } from '../firebase.js';
import { showToast } from '../utils.js';

const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

/**
 * Khởi tạo logic cho toàn bộ trang đăng nhập/đăng ký
 */
export function initDangNhapPage() {
    console.log("DEBUG: Chạy initDangNhapPage() phiên bản mới");

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("DEBUG: Đã đăng nhập, kiểm tra và chuyển hướng...");
            window.location.href = '/quantri.html';
        }
    });

    // Gán Listener cho các nút
    document.getElementById('login-submit-btn')?.addEventListener('click', handleLoginEmailPass);
    document.getElementById('register-submit-btn')?.addEventListener('click', handleRegisterEmailPass);
    document.getElementById('google-login-btn')?.addEventListener('click', () => handleSocialLogin(googleProvider));
    document.getElementById('facebook-login-btn')?.addEventListener('click', () => handleSocialLogin(facebookProvider));
    document.getElementById('forgot-password-link')?.addEventListener('click', handleForgotPassword);

    // Gán Listener cho link chuyển đổi 2 form
    setupFormToggle();
    
    // **MỚI: Gán Listener cho icon "mắt"**
    setupPasswordToggle();
}

/**
 * Xử lý logic chuyển đổi (toggle) giữa form Đăng nhập và Đăng ký
 */
function setupFormToggle() {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    const toggleToRegister = document.getElementById('toggle-to-register');
    const toggleToLogin = document.getElementById('toggle-to-login');
    const showRegisterLink = document.getElementById('show-register-form');
    const showLoginLink = document.getElementById('show-login-form');

    if (!loginContainer || !registerContainer || !toggleToLogin || !toggleToRegister || !showRegisterLink || !showLoginLink) {
        console.error("DEBUG: Thiếu các thành phần HTML để toggle form.");
        return;
    }

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        toggleToRegister.classList.add('hidden');
        registerContainer.classList.remove('hidden');
        toggleToLogin.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerContainer.classList.add('hidden');
        toggleToLogin.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        toggleToRegister.classList.remove('hidden');
    });
}

/**
 * **MỚI: Xử lý bật/tắt hiển thị mật khẩu**
 */
function setupPasswordToggle() {
    const toggleIcon = document.getElementById('password-toggle-icon');
    const passwordInput = document.getElementById('login-password');
    const iconEye = document.getElementById('icon-eye');
    const iconEyeOff = document.getElementById('icon-eye-off');

    if (!toggleIcon || !passwordInput || !iconEye || !iconEyeOff) {
        console.warn("DEBUG: Không tìm thấy icon mật khẩu.");
        return;
    }

    toggleIcon.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            // Hiển thị mật khẩu
            passwordInput.type = 'text';
            iconEye.classList.remove('hidden');
            iconEyeOff.classList.add('hidden');
        } else {
            // Ẩn mật khẩu
            passwordInput.type = 'password';
            iconEye.classList.add('hidden');
            iconEyeOff.classList.remove('hidden');
        }
    });
}

/**
 * Xử lý Đăng nhập bằng Email/Password
 */
async function handleLoginEmailPass() {
    const email = document.getElementById('login-email')?.value;
    const pass = document.getElementById('login-password')?.value;
    
    if (!email || !pass) return showToast("Vui lòng nhập email và mật khẩu.", "error");
    
    try {
        await auth.signInWithEmailAndPassword(email, pass);
        showToast("Đăng nhập thành công!");
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        showToast(getFirebaseAuthErrorMessage(error), "error");
    }
}

/**
 * Xử lý Đăng ký Khách hàng mới
 */
async function handleRegisterEmailPass() {
    const email = document.getElementById('register-email')?.value;
    const phone = document.getElementById('register-phone')?.value;
    const pass = document.getElementById('register-password')?.value;

    if (!email || !pass || !phone) {
        return showToast("Vui lòng nhập đủ Email, SĐT và Mật khẩu.", "error");
    }
    if (pass.length < 6) {
        return showToast("Mật khẩu phải có ít nhất 6 ký tự.", "error");
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        const user = userCredential.user;
        await createUserProfile(user.uid, email, phone, user.displayName);
        showToast("Đăng ký thành công! Đang đăng nhập...");
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        showToast(getFirebaseAuthErrorMessage(error), "error");
    }
}

/**
 * Xử lý Đăng nhập/Đăng ký bằng Mạng xã hội
 * @param {firebase.auth.AuthProvider} provider
 */
async function handleSocialLogin(provider) {
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            console.log(`User mới từ ${provider.providerId}:`, user.email);
            await createUserProfile(user.uid, user.email, user.phoneNumber, user.displayName);
            showToast("Đăng ký thành công! Chào mừng bạn!", "success");
        } else {
            showToast("Đăng nhập thành công!", "success");
        }
    } catch (error) {
        console.error("Lỗi đăng nhập Mạng xã hội:", error);
        showToast(getFirebaseAuthErrorMessage(error), "error");
    }
}

/**
 * Gửi email "Quên mật khẩu"
 */
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value;
    if (!email) {
        return showToast("Vui lòng nhập email của bạn vào ô bên trên rồi bấm 'Quên mật khẩu'.", "error");
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        showToast(`Đã gửi email khôi phục tới ${email}. Vui lòng kiểm tra hòm thư.`, "success");
    } catch (error) {
        console.error("Lỗi gửi email reset:", error);
        showToast(getFirebaseAuthErrorMessage(error), "error");
    }
}

/**
 * Lưu thông tin user vào collection 'users'
 */
async function createUserProfile(uid, email, phone, displayName) {
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
        uid: uid,
        email: email || '',
        phone: phone || '',
        displayName: displayName || email.split('@')[0],
        role: 'customer', // Gán vai trò "customer"
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Dịch lỗi Firebase sang tiếng Việt
 */
function getFirebaseAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Địa chỉ email không hợp lệ.';
        case 'auth/user-not-found':
            return 'Không tìm thấy tài khoản với email này.';
        case 'auth/wrong-password':
            return 'Sai mật khẩu. Vui lòng thử lại.';
        case 'auth/email-already-in-use':
            return 'Email này đã được sử dụng. Vui lòng Đăng nhập.';
        case 'auth/popup-closed-by-user':
            return 'Bạn đã đóng cửa sổ đăng nhập.';
        case 'auth/account-exists-with-different-credential':
            return 'Tài khoản đã tồn tại với một phương thức đăng nhập khác.';
        default:
            return 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
}