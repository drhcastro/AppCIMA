// auth.js
document.addEventListener('DOMContentLoaded', () => {
    // --- PASO CRUCIAL: PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE ---
    const firebaseConfig = {
  apiKey: "AIzaSyAp0z_dDGjldIgt-sfTa7dmQdC3OLFOpo0",
  authDomain: "cima-nahui.firebaseapp.com",
  projectId: "cima-nahui",
  storageBucket: "cima-nahui.firebasestorage.app",
  messagingSenderId: "614606087766",
  appId: "1:614606087766:web:cff473aa6d4a3f533efdf7"
};
    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Lógica para el formulario de registro de usuario
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const profile = document.getElementById('profile').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // 1. Crear usuario en Firebase Auth
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    // 2. Guardar el perfil en Firestore
                    return db.collection('users').doc(user.uid).set({
                        fullName: fullName,
                        email: email,
                        profile: profile
                    });
                })
                .then(() => {
                    alert('¡Usuario registrado con éxito! Ahora puedes iniciar sesión.');
                    window.location.href = 'login.html';
                })
                .catch(error => {
                    const responseMsg = document.getElementById('response-message');
                    responseMsg.textContent = `Error: ${error.message}`;
                    responseMsg.className = 'error';
                    responseMsg.style.display = 'block';
                });
        });
    }

    // Lógica para el formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // Login exitoso, redirigir al portal principal
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    const responseMsg = document.getElementById('response-message');
                    responseMsg.textContent = `Error: ${error.message}`;
                    responseMsg.className = 'error';
                    responseMsg.style.display = 'block';
                });
        });
    }
});
