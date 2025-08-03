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

// Inicializar Firebase (solo si no se ha inicializado antes)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Poner las herramientas de Firebase a disposición global para que otros scripts las usen
const auth = firebase.auth();
const db = firebase.firestore(); // <-- La conexión a la base de datos

auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userProfile = doc.data();
                    sessionStorage.setItem('currentUser', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        fullName: userProfile.fullName,
                        profile: userProfile.profile
                    }));
                } else {
                    console.error("Error: No se encontró el perfil del usuario.");
                    auth.signOut();
                }
            });
    } else {
        const publicPages = ['login.html', 'registro-usuario.html', 'graficas.html'];
        const isCurrentPagePublic = publicPages.some(page => window.location.pathname.endsWith(page));
        if (!isCurrentPagePublic) {
            alert("Acceso denegado. Por favor, inicie sesión.");
            window.location.href = 'login.html';
        }
    }
});
