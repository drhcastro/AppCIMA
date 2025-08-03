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

// Poner las herramientas de Firebase a disposición global
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
                    // para que los scripts de cada página puedan acceder a ellos.
                    sessionStorage.setItem('currentUser', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        fullName: userProfile.fullName,
                        profile: userProfile.profile
                    }));
                } else {
                    // Si el usuario existe en Auth pero no en Firestore, es un error.
                    console.error("Error: No se encontró el perfil del usuario en la base de datos.");
                    auth.signOut(); // Forzar cierre de sesión para evitar inconsistencias.
                }
            })
            .catch(error => {
                console.error("Error al obtener el perfil del usuario:", error);
                auth.signOut();
            });
    } else {
        // No hay usuario con sesión iniciada.
        
        // Definir las páginas que NO necesitan login
        const publicPages = [
            'login.html',
            'registro-usuario.html',
            'graficas.html' // Permitimos el uso sin registro de las gráficas
        ];

        // Verificar si la página actual está en la lista de páginas públicas
        const isCurrentPagePublic = publicPages.some(page => window.location.pathname.endsWith(page));

        if (!isCurrentPagePublic) {
            // Si la página no es pública y no hay usuario, redirigir al login.
            alert("Acceso denegado. Por favor, inicie sesión.");
            window.location.href = 'login.html';
        }
    }
});
