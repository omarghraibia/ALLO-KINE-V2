document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GESTION DU MODE SOMBRE ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (themeBtn) {
        if (localStorage.getItem('theme') === 'dark') {
            body.setAttribute('data-theme', 'dark');
            themeBtn.textContent = '☀️';
        }

        themeBtn.addEventListener('click', () => {
            const isDark = body.getAttribute('data-theme') === 'dark';
            body.setAttribute('data-theme', isDark ? 'light' : 'dark');
            themeBtn.textContent = isDark ? '🌙' : '☀️';
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
        });
    }

    // --- 2. MENU MOBILE ---
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        // Initialisation ARIA
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Ouvrir le menu');

        menuToggle.addEventListener('click', () => {
            const isActive = navMenu.classList.toggle('active');
            menuToggle.innerHTML = isActive ? '✖' : '☰';
            menuToggle.setAttribute('aria-expanded', isActive);
            menuToggle.setAttribute('aria-label', isActive ? 'Fermer le menu' : 'Ouvrir le menu');
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuToggle.innerHTML = '☰';
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // --- 3. ANIMATIONS AU DÉFILEMENT ---
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


    // --- 4. FORMULAIRE DE RENDEZ-VOUS (Lien Railway) ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                nom: document.getElementById('nom').value,
                prenom: document.getElementById('prenom').value,
                email: document.getElementById('email').value,
                telephone: document.getElementById('telephone').value,
                motif: document.getElementById('motif').value,
                diagnostic: document.getElementById('diagnostic').value
            };

            try {
                // Utilisation du chemin relatif pour Railway
                const response = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });                if (response.ok) {
                    alert("Rendez-vous enregistré avec succès !");
                    contactForm.reset();
                } else {
                    const errorData = await response.json();
                    alert("Erreur : " + (errorData.msg || "enregistrement impossible"));
                }
            } catch (error) {
                console.error("Erreur connexion Railway:", error);
                alert("Impossible de contacter le serveur de santé.");
            }
        });
    }

    // --- 5. GESTION DES AVIS ---
    const reviewForm = document.getElementById('review-form');
    const reviewsList = document.getElementById('reviews-list');

    if (reviewForm && reviewsList) {
        reviewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('reviewer-name').value;
            const rating = document.getElementById('reviewer-rating').value;
            const text = document.getElementById('reviewer-text').value;
            
            let stars = '★'.repeat(rating);
            
            const newReview = document.createElement('div');
            newReview.className = 'review-card reveal active';
            newReview.style.cssText = 'background: var(--card-bg); padding: 1.5rem; border-left: 4px solid var(--gold-accent); border-radius: 8px; margin-top: 1rem;';
            newReview.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong>${name}</strong>
                    <span style="color: var(--gold-accent);">${stars}</span>
                </div>
                <p style="font-size: 0.95rem; opacity: 0.8;">"${text}"</p>
            `;
            reviewsList.prepend(newReview);
            reviewForm.reset();
            alert("Merci pour votre avis !");
        });
    }
});

// --- 6. SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('PWA Allo-Kiné Prête !'))
            .catch(err => console.error('Erreur PWA:', err));
    });
}

// --- 6.5 BARRE DE RECHERCHE (ADMIN) ---
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('keyup', function(e) {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#appointments-table-body tr');
        
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });
}

// Variable globale pour stocker les RDV et permettre le filtrage
let allAppointmentsData = [];

// --- 7. FONCTIONNALITÉS DASHBOARD (ESPACE DOCTEUR) ---
// Cette fonction est appelée par dashboard.html
async function loadAppointments() {
    const tbody = document.getElementById('appointments-table-body');
    if (!tbody) return; // On n'est pas sur la page dashboard

    try {
        const res = await fetch('/api/appointments', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // Important pour envoyer le cookie de session
        });

        if (res.status === 401) {
            window.location.href = 'login.html'; // Redirection si non connecté
            return;
        }

        const appointments = await res.json();
        tbody.innerHTML = '';

        if (appointments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Aucun rendez-vous pour le moment.</td></tr>';
            return;
        }

        appointments.forEach(app => {
            const date = new Date(app.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            });

            // Création du menu déroulant pour le statut
            const statusOptions = `
                <select onchange="updateStatus(this, '${app._id}')" style="padding: 5px; border-radius: 5px; border: 1px solid var(--gold-accent); background: var(--bg-color); color: var(--text-color); cursor: pointer;">
                    <option value="en_attente" ${app.statut === 'en_attente' ? 'selected' : ''}>En attente</option>
                    <option value="confirme" ${app.statut === 'confirme' ? 'selected' : ''}>✅ Confirmé</option>
                    <option value="termine" ${app.statut === 'termine' ? 'selected' : ''}>🏁 Terminé</option>
                    <option value="annule" ${app.statut === 'annule' ? 'selected' : ''}>❌ Annulé</option>
                </select>
            `;
            
            const row = `
                <tr>
                    <td>${date}</td>
                    <td><strong>${app.nom} ${app.prenom}</strong></td>
                    <td><a href="tel:${app.telephone}" style="color: var(--gold-accent);">${app.telephone}</a></td>
                    <td>${app.motif}</td>
                    <td>${app.diagnostic || '-'}</td>
                    <td>${statusOptions}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) {
        console.error("Erreur chargement RDV:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Erreur de chargement.</td></tr>';
    }
}
*/

// Exposer la fonction globalement pour qu'elle soit accessible via onclick dans le HTML
window.loadAppointments = loadAppointments;

// Fonction pour mettre à jour le statut (appelée par le select)
async function updateStatus(selectElement, id) {
    const newStatus = selectElement.value;
    const originalColor = selectElement.style.borderColor;

    try {
        const res = await fetch(`/api/appointments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut: newStatus }),
            credentials: 'include'
        });
        
        if (res.ok) {
            // Feedback visuel : bordure verte temporaire
            selectElement.style.borderColor = '#2ecc71';
            setTimeout(() => selectElement.style.borderColor = originalColor, 1500);
        } else {
            alert('Erreur lors de la mise à jour du statut');
        }
    } catch (err) {
        console.error(err);
        alert('Erreur serveur');
    }
}
window.updateStatus = updateStatus;

// Charger automatiquement si on est sur la page dashboard
if (document.getElementById('appointments-table-body')) {
    document.addEventListener('DOMContentLoaded', loadAppointments);
    document.addEventListener('DOMContentLoaded', loadAdminArticles); // Charger aussi les articles en mode admin
}

// --- 8. GESTION DU BLOG (PUBLIC & ADMIN) ---

// Charger les articles sur la page blog.html
async function loadArticles() {
    const grid = document.getElementById('articles-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/articles');
        const articles = await res.json();
        
        grid.innerHTML = '';
        if (articles.length === 0) {
            grid.innerHTML = '<p>Aucun article pour le moment.</p>';
            return;
        }

        articles.forEach(art => {
            const date = new Date(art.createdAt).toLocaleDateString('fr-FR');
            const card = `
                <div class="article-card">
                    <img src="${art.image || 'logo.png'}" alt="${art.title}" class="article-img">
                    <div class="article-content">
                        <span class="article-date">${date}</span>
                        <h3 class="article-title">${art.title}</h3>
                        <p class="article-excerpt">${art.content.substring(0, 100)}...</p>
                    </div>
                </div>
            `;
            grid.innerHTML += card;
        });
    } catch (err) {
        console.error(err);
    }
}

// Publier un article (Dashboard)
const blogForm = document.getElementById('blog-form');
if (blogForm) {
    const submitBtn = document.getElementById('submit-article-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const idInput = document.getElementById('article-id');

    // Gestion du bouton Annuler
    if(cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            blogForm.reset();
            idInput.value = '';
            submitBtn.textContent = "Publier l'article";
            cancelBtn.style.display = 'none';
        });
    }

    blogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Utilisation de FormData pour l'upload de fichier
        const formData = new FormData();
        formData.append('title', document.getElementById('article-title').value);
        formData.append('content', document.getElementById('article-content').value);
        
        const imageFile = document.getElementById('article-image').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const articleId = idInput.value;
        const method = articleId ? 'PUT' : 'POST';
        const url = articleId ? `/api/articles/${articleId}` : '/api/articles';

        try {
            const res = await fetch(url, {
                method: method,
                // Ne PAS définir 'Content-Type': 'application/json' avec FormData
                body: formData,
                credentials: 'include'
            });

            if (res.ok) {
                alert(articleId ? 'Article modifié !' : 'Article publié !');
                blogForm.reset();
                idInput.value = '';
                if(submitBtn) submitBtn.textContent = "Publier l'article";
                if(cancelBtn) cancelBtn.style.display = 'none';
                loadAdminArticles(); // Rafraîchir la liste
            } else {
                alert('Erreur lors de l\'opération');
            }
        } catch (err) {
            console.error(err);
        }
    });
}

// Fonction pour charger la liste des articles dans l'admin avec option de suppression
async function loadAdminArticles() {
    const list = document.getElementById('admin-articles-list');
    if (!list) return;

    try {
        const res = await fetch('/api/articles');
        const articles = await res.json();

        list.innerHTML = '';
        if (articles.length === 0) {
            list.innerHTML = '<p style="text-align:center; opacity:0.7;">Aucun article publié pour le moment.</p>';
            return;
        }

        articles.forEach(art => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-color); background: var(--bg-color); margin-bottom: 0.5rem; border-radius: 8px;';
            
            const date = new Date(art.createdAt).toLocaleDateString('fr-FR');

            item.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${art.image || 'logo.png'}" style="width:50px; height:50px; object-fit:cover; border-radius:5px; border:1px solid var(--border-color);">
                    <div>
                        <strong style="font-size:1.1rem; color:var(--nav-bg);">${art.title}</strong>
                        <div style="font-size:0.85rem; opacity:0.7;">Publié le ${date}</div>
                    </div>
                </div>
                <div>
                    <button class="edit-btn" data-id="${art._id}" style="background: var(--gold-accent); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 5px; cursor: pointer; font-weight:bold; transition:0.3s; margin-right: 5px;">Éditer</button>
                    <button class="delete-btn" data-id="${art._id}" style="background: #ff4757; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 5px; cursor: pointer; font-weight:bold; transition:0.3s;">Supprimer</button>
                </div>
            `;
            list.appendChild(item);
        });

        // Écouteurs pour le bouton ÉDITER
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                // On retrouve l'article dans la liste chargée précédemment
                const article = articles.find(a => a._id === id);
                if(!article) return;

                // Remplir le formulaire
                document.getElementById('article-id').value = article._id;
                document.getElementById('article-title').value = article.title;
                document.getElementById('article-content').value = article.content;
                
                // Changer l'interface
                const submitBtn = document.getElementById('submit-article-btn');
                const cancelBtn = document.getElementById('cancel-edit-btn');
                
                if(submitBtn) submitBtn.textContent = "Mettre à jour";
                if(cancelBtn) cancelBtn.style.display = 'inline-block';

                // Scroll vers le formulaire
                document.getElementById('blog-form').scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Ajout des écouteurs d'événements pour les boutons supprimer
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm('Êtes-vous sûr de vouloir supprimer cet article définitivement ?')) return;
                
                const id = e.target.getAttribute('data-id');
                try {
                    const res = await fetch(`/api/articles/${id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    
                    if (res.ok) {
                        loadAdminArticles(); // Rafraîchir la liste
                    } else {
                        alert('Erreur lors de la suppression');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Erreur serveur');
                }
            });
        });

    } catch (err) {
        console.error("Erreur chargement admin articles:", err);
    }
}
