document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GESTION DU MENU MOBILE ---
    const menuToggle = document.getElementById('mobile-menu');
    const navList = document.getElementById('nav-list');
    const body = document.body;

    if (menuToggle && navList) {
        const toggleMenu = (forceClose = false) => {
            const isActive = forceClose ? false : navList.classList.toggle('active');
            if (forceClose) navList.classList.remove('active');
            
            menuToggle.innerHTML = navList.classList.contains('active') ? '✕' : '☰';
            body.style.overflow = navList.classList.contains('active') ? 'hidden' : '';
        };

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        // Fermer en cliquant à côté
        document.addEventListener('click', (e) => {
            if (navList.classList.contains('active') && !navList.contains(e.target)) {
                toggleMenu(true);
            }
        });

        // Fermer après un clic sur un lien
        navList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => toggleMenu(true));
        });
    }

    // --- 2. GESTION DU MODE SOMBRE ---
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeBtn.textContent = '☀️';
        }
        themeBtn.addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
            themeBtn.textContent = isDark ? '🌙' : '☀️';
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
        });
    }

   // --- 3. NAVBAR DYNAMIQUE (AUTH) ---
    const authNavItem = document.getElementById('auth-nav-item');
    // CORRECTION : On vérifie 'isLoggedIn' au lieu de 'token'
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('role');

    if (isLoggedIn && role && authNavItem) {
        const url = (role === 'kine' || role === 'admin') ? '/dashboard.html' : '/espace-patient.html';
        authNavItem.innerHTML = `
            <a href="${url}" class="nav-btn-gold">Mon Espace</a>
            <a href="#" id="logout-btn" class="nav-link-logout">Déconnexion</a>
        `;
        
        // Appel au backend pour tuer le cookie
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (err) {
                console.error("Erreur lors de la déconnexion serveur", err);
            }
            // On nettoie le navigateur et on redirige
            localStorage.clear();
            window.location.href = '/login.html';
        });
    }
}); // <-- CORRECTION : La fermeture manquante était ici !

// --- FONCTIONS GLOBALES (Login / Articles) ---
async function handleLogin(email, password) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            // On ne stocke PLUS le token ! On stocke juste un marqueur et le rôle
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('role', data.role);
            window.location.href = (data.role === 'kine' || data.role === 'admin') ? '/dashboard.html' : '/espace-patient.html';
        } else {
            // Utilisation de data.msg (car le backend renvoie "msg" et non "message")
            alert(data.msg || "Erreur de connexion");
        }
    } catch (err) { 
        console.error(err); 
    }
}
