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
    const navList = document.getElementById('nav-list');
    
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', () => {
            navList.classList.toggle('active');
            menuToggle.innerHTML = navList.classList.contains('active') ? '✕' : '☰';
        });

        // Fermer le menu si on clique sur un lien
        navList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navList.classList.remove('active');
                menuToggle.innerHTML = '☰';
            });
        });
    }

    // --- 3. GESTION INTELLIGENTE DE LA NAVBAR (AUTH) ---
    const authNavItem = document.getElementById('auth-nav-item');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token && role && authNavItem) {
        // L'utilisateur est connecté ! On redirige selon le rôle
        const espaceUrl = (role === 'kine' || role === 'admin') ? '/dashboard.html' : '/espace-patient.html';
        
        authNavItem.innerHTML = `
            <a href="${espaceUrl}" class="nav-btn-gold">Mon Espace</a>
            <a href="#" id="logout-btn" class="nav-link-logout">Déconnexion</a>
        `;

        // Action du bouton Déconnexion
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            // Nettoyage
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch(err) { console.log("Erreur deconnexion API:", err); }
            
            window.location.href = '/login.html';
        });
    }

    // --- 4. ANIMATIONS AU DÉFILEMENT ---
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // --- 5. FORMULAIRE DE RENDEZ-VOUS ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            
            formData.append('nom', document.getElementById('nom').value);
            formData.append('prenom', document.getElementById('prenom').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('telephone', document.getElementById('telephone').value);
            formData.append('motif', document.getElementById('motif').value);
            formData.append('diagnostic', document.getElementById('diagnostic').value);
            
            if(document.getElementById('dateRdv')) formData.append('dateRdv', document.getElementById('dateRdv').value);
            if(document.getElementById('heureRdv')) formData.append('heureRdv', document.getElementById('heureRdv').value);
            
            const fileInput = document.getElementById('documents');
            if (fileInput && fileInput.files.length > 0) {
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('documents', fileInput.files[i]);
                }
            }

            try {
                const response = await fetch('/api/appointments', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                
                if (response.ok) {
                    alert("Rendez-vous enregistré avec succès !");
                    contactForm.reset();
                } else {
                    const errorData = await response.json();
                    alert("Erreur : " + (errorData.msg || "enregistrement impossible"));
                }
            } catch (error) {
                console.error("Erreur serveur:", error);
                alert("Impossible de contacter le serveur de santé.");
            }
        });
    }

    // --- 6. GESTION DES AVIS ---
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
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
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

    // --- 8. BARRE DE RECHERCHE (ADMIN) ---
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

    // --- INITIALISATION DES PAGES SPÉCIFIQUES ---
    if (document.getElementById('appointments-table-body')) {
        loadAppointments();
        loadAdminArticles(); 
    }
    if (document.getElementById('articles-grid')) {
        loadArticles();
    }

    // --- GESTION DU FORMULAIRE DE BLOG ---
    const blogForm = document.getElementById('blog-form');
    if (blogForm) {
        const submitBtn = document.getElementById('submit-article-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        const idInput = document.getElementById('article-id');

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
            const formData = new FormData();
            formData.append('title', document.getElementById('article-title').value);
            formData.append('content', document.getElementById('article-content').value);
            
            const imageFile = document.getElementById('article-image').files[0];
            if (imageFile) formData.append('image', imageFile);

            const articleId = idInput.value;
            const method = articleId ? 'PUT' : 'POST';
            const url = articleId ? `/api/articles/${articleId}` : '/api/articles';

            try {
                const res = await fetch(url, {
                    method: method,
                    body: formData,
                    credentials: 'include'
                });

                if (res.ok) {
                    alert(articleId ? 'Article modifié !' : 'Article publié !');
                    blogForm.reset();
                    idInput.value = '';
                    if(submitBtn) submitBtn.textContent = "Publier l'article";
                    if(cancelBtn) cancelBtn.style.display = 'none';
                    loadAdminArticles();
                } else {
                    alert("Erreur lors de l'opération");
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
}); // FIN DU DOMContentLoaded

// --- 7. SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('PWA Allo-Kiné Prête !'))
            .catch(err => console.error('Erreur PWA:', err));
    });
}

// ==========================================
// FONCTIONS GLOBALES (Accessibles partout)
// ==========================================

let allAppointmentsData = [];

// Fonction de Connexion
async function handleLogin(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role); 
            
            // REDIRECTION INTELLIGENTE
            if (data.role === 'kine' || data.role === 'admin') {
                window.location.href = '/dashboard.html'; 
            } else {
                window.location.href = '/espace-patient.html'; 
            }
        } else {
            alert("Erreur de connexion : " + (data.message || "Identifiants incorrects"));
        }
    } catch (error) {
        console.error("Erreur serveur:", error);
        alert("Une erreur est survenue lors de la connexion.");
    }
}

async function loadAppointments() {
    const tbody = document.getElementById('appointments-table-body');
    if (!tbody) return; 

    try {
        const res = await fetch('/api/appointments', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' 
        });

        if (res.status === 401) {
            window.location.href = '/login.html'; 
            return;
        }

        allAppointmentsData = await res.json();
        renderAppointmentsTable(allAppointmentsData);
    } catch (err) {
        console.error("Erreur chargement RDV:", err);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Erreur de chargement.</td></tr>';
    }
}

function renderAppointmentsTable(appointments) {
    const tbody = document.getElementById('appointments-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!appointments || appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; opacity: 0.7;">Aucun rendez-vous trouvé.</td></tr>';
        return;
    }

    appointments.forEach(app => {
        const dateDisplay = app.dateRdv 
            ? `<span style="color:var(--gold-accent); font-weight:bold;">${app.dateRdv}</span><br><small>${app.heureRdv || ''}</small>`
            : new Date(app.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

        let cleanPhone = app.telephone ? app.telephone.replace(/\D/g, '') : ''; 
        if (cleanPhone.length === 8) cleanPhone = '216' + cleanPhone;
        const waLink = `https://wa.me/${cleanPhone}`;

        let actionsHtml = '';
        if (app.documents && app.documents.length > 0) {
            actionsHtml += `<a href="${app.documents[0]}" target="_blank" class="action-icon" title="Voir document">📂</a> `;
        }
        if (app.meetingLink) {
            actionsHtml += `<a href="${app.meetingLink}" target="_blank" class="action-icon" title="Lancer Visio" style="color:#3498db;">📹</a>`;
        }
        if (!actionsHtml) actionsHtml = '-';

        const statusOptions = `
            <select onchange="updateStatus(this, '${app._id}')" style="padding: 5px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color); cursor: pointer; font-weight:500;">
                <option value="en_attente" ${app.statut === 'en_attente' ? 'selected' : ''}>⏳ En attente</option>
                <option value="confirme" ${app.statut === 'confirme' ? 'selected' : ''}>✅ Confirmé</option>
                <option value="termine" ${app.statut === 'termine' ? 'selected' : ''}>🏁 Terminé</option>
                <option value="annule" ${app.statut === 'annule' ? 'selected' : ''}>❌ Annulé</option>
            </select>
        `;
        
        const row = `
            <tr style="transition: background 0.2s;">
                <td style="font-size: 0.9rem;">${dateDisplay}</td>
                <td><strong>${app.nom} ${app.prenom}</strong></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <a href="tel:${app.telephone}" style="color: var(--text-color); text-decoration:none;">${app.telephone}</a>
                        <a href="${waLink}" target="_blank" title="WhatsApp" style="color: #25D366; font-size: 1.2rem; text-decoration:none;">💬</a>
                    </div>
                </td>
                <td>${actionsHtml}</td>
                <td>${app.motif}</td>
                <td><span style="font-size:0.9rem; opacity:0.8;">${app.diagnostic || '-'}</span></td>
                <td>${statusOptions}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function exportToCSV() {
    if (allAppointmentsData.length === 0) { alert("Aucune donnée à exporter."); return; }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date RDV,Heure,Nom,Prenom,Telephone,Motif,Statut,Lien Visio\n"; 

    allAppointmentsData.forEach(app => {
        const date = app.dateRdv || new Date(app.createdAt).toLocaleDateString('fr-FR');
        const row = `${date},${app.heureRdv || '-'},${app.nom},${app.prenom},${app.telephone},${app.motif},${app.statut},${app.meetingLink || ''}`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "allo_kine_export_compta.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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
                    <img src="${art.image || '/logo.png'}" alt="Article" style="width:100%; height:200px; object-fit:cover; border-radius: 8px 8px 0 0;">
                    <div style="padding: 1.5rem;">
                        <span style="font-size:0.85rem; color:var(--gold-accent);">${date}</span>
                        <h3 style="margin: 10px 0;">${art.title}</h3>
                        <p style="opacity:0.8;">${art.content.substring(0, 100)}...</p>
                    </div>
                </div>
            `;
            grid.innerHTML += card;
        });
    } catch (err) {
        console.error(err);
    }
}

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
                    <img src="${art.image || '/logo.png'}" style="width:50px; height:50px; object-fit:cover; border-radius:5px; border:1px solid var(--border-color);">
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

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const article = articles.find(a => a._id === id);
                if(!article) return;

                document.getElementById('article-id').value = article._id;
                document.getElementById('article-title').value = article.title;
                document.getElementById('article-content').value = article.content;
                
                const submitBtn = document.getElementById('submit-article-btn');
                const cancelBtn = document.getElementById('cancel-edit-btn');
                
                if(submitBtn) submitBtn.textContent = "Mettre à jour";
                if(cancelBtn) cancelBtn.style.display = 'inline-block';

                document.getElementById('blog-form').scrollIntoView({ behavior: 'smooth' });
            });
        });

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
                        loadAdminArticles(); 
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

// On expose les fonctions globales pour pouvoir les appeler depuis les boutons HTML (onclick="...")
window.loadAppointments = loadAppointments;
window.exportToCSV = exportToCSV;
window.updateStatus = updateStatus;
window.handleLogin = handleLogin;