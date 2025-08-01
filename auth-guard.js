// auth-guard.js

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

auth.onAuthStateChanged(user => {
    if (user) {
        // El usuario tiene una sesión activa.
        // Ahora buscamos su perfil en Firestore para obtener su rol.
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userProfile = doc.data();
                    // Guardamos los datos del usuario actual en la memoria de la sesión
                    // para que otras páginas puedan acceder a ellos fácilmente.
                    sessionStorage.setItem('currentUser', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        fullName: userProfile.fullName,
                        profile: userProfile.profile
                    }));
                } else {
                    // Si el usuario existe en Auth pero no en Firestore, es un error.
                    console.error("Error: No se encontró el perfil del usuario.");
                    auth.signOut(); // Forzar cierre de sesión
                }
            })
            .catch(error => {
                console.error("Error al obtener el perfil del usuario:", error);
                auth.signOut();
            });
    } else {
        // No hay usuario con sesión iniciada.
        // Redirigir a la página de login, a menos que ya estemos ahí.
        if (window.location.pathname.indexOf('login.html') === -1 && window.location.pathname.indexOf('registro-usuario.html') === -1) {
            alert("Acceso denegado. Por favor, inicie sesión.");
            window.location.href = 'login.html';
        }
    }
});
