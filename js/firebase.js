// /js/firebase.js

// --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAlf7WlSL_rj9yrx4L0M1-ukqerBPjDK0Q",
    authDomain: "quicklinkpro-manager.firebaseapp.com",
    projectId: "quicklinkpro-manager",
    storageBucket: "quicklinkpro-manager.appspot.com",
    messagingSenderId: "188575683069",
    appId: "1:188575683069:web:dd44471517d42243eec994"
};
// -------------------------

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 4. Lấy các dịch vụ và EXPORT chúng
const auth = firebase.auth();
const db = firebase.firestore();

// Các file .js khác (như header.js, page-index.js) sẽ import 2 biến này
export { auth, db };