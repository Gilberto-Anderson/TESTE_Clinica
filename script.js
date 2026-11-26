let currentUser = null;
localStorage.removeItem('vet_current_user');

let animalsData = JSON.parse(localStorage.getItem('vet_animals')) || [
    {
        id: 1,
        name: 'Thor',
        species: 'Canino',
        breed: 'Golden Retriever',
        blood: 'DEA 1.1 Positivo',
        age: '4 anos',
        weight: '30 kg',
        owner: 'Mariana Costa',
        photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80',
        notes: 'Doador apto - Vacinas em dia.',
        anamnesisPdf: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
        lastCollectionDate: '2026-02-15',
        donatedAmount: '450 ml'
    },
    {
        id: 2,
        name: 'Luna',
        species: 'Felino',
        breed: 'Siamês',
        blood: 'Tipo A',
        age: '2 anos',
        weight: '4.2 kg',
        owner: 'Lucas Almeida',
        photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
        notes: 'Castrada. Histórico clínico regular.',
        anamnesisPdf: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
        lastCollectionDate: '2026-01-10',
        donatedAmount: '50 ml'
    },
    {
        id: 3,
        name: 'Bob',
        species: 'Canino',
        breed: 'Bulldog Francês',
        blood: 'DEA 4 Negativo',
        age: '3 anos',
        weight: '12 kg',
        owner: 'Juliana Ribeiro',
        photo: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80',
        notes: 'Acompanhamento preventivo e elegibilidade ativa.',
        anamnesisPdf: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
        lastCollectionDate: '2025-11-20',
        donatedAmount: '350 ml'
    }
];

let appointmentsData = JSON.parse(localStorage.getItem('vet_appointments')) || [
    { id: 1, animal: 'Thor', owner: 'Mariana Costa', service: 'Consulta de Rotina / Doação', date: '2026-03-25T09:30', status: 'Confirmado' }
];

let clinicsData = JSON.parse(localStorage.getItem('vet_clinics')) || [
    { id: 1, name: 'Hospital Veterinário Uninassau', crmv: 'CRMV-PB 001', email: 'hospital@uninassau.edu.br', phone: '(83) 3322-1000', address: 'Av. Mal. Floriano Peixoto, 1234 - Centro', status: 'Ativo' },
    { id: 2, name: 'Clínica Veterinária PetLife CG', crmv: 'CRMV-PB 458', email: 'contato@petlifecg.com', phone: '(83) 3333-4455', address: 'R. Aprígio Veloso, 882 - Bodocongó', status: 'Parceiro Credenciado' }
];

let clinicContacts = JSON.parse(localStorage.getItem('vet_clinic_contacts')) || [];
let tutorNotifications = JSON.parse(localStorage.getItem('vet_tutor_notifications')) || [];

const modalInstances = {};
const MIN_APPOINTMENT_GAP_MINUTES = 15;

function initPlaceholdersHideOnFocus() {
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
        if (!el.dataset.originalPlaceholder) {
            el.dataset.originalPlaceholder = el.getAttribute('placeholder');
        }
        el.addEventListener('focus', () => {
            el.setAttribute('placeholder', '');
        });
        el.addEventListener('blur', () => {
            if (!el.value) {
                el.setAttribute('placeholder', el.dataset.originalPlaceholder || '');
            }
        });
    });
}

function getAnimalAgeAndWeight(animal) {
    let age = animal.age || '';
    let weight = animal.weight || '';

    if (!weight && age.includes('·')) {
        const parts = age.split('·').map(p => p.trim());
        age = parts[0] || '';
        weight = parts[1] || '';
    }

    return { age, weight };
}

function formatAnimalVitals(animal) {
    const { age, weight } = getAnimalAgeAndWeight(animal);
    const items = [];
    if (age) items.push(`Idade: ${age}`);
    if (weight) items.push(`Peso: ${weight}`);
    return items.join(' · ');
}

function saveData() {
    localStorage.setItem('vet_animals', JSON.stringify(animalsData));
    localStorage.setItem('vet_appointments', JSON.stringify(appointmentsData));
    localStorage.setItem('vet_clinics', JSON.stringify(clinicsData));
    localStorage.setItem('vet_clinic_contacts', JSON.stringify(clinicContacts));
    localStorage.setItem('vet_tutor_notifications', JSON.stringify(tutorNotifications));
}

function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    if (!modalInstances[modalId]) {
        modalInstances[modalId] = new bootstrap.Modal(el);
    }
    modalInstances[modalId].show();
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    const instance = bootstrap.Modal.getInstance(el) || modalInstances[modalId];
    if (instance) instance.hide();
}

function switchTab(tabId) {
    const restrictedTabs = ['animals', 'tutor-area', 'appointments'];
    if (restrictedTabs.includes(tabId) && !currentUser) {
        openModal('login-select-modal');
        showToast('Acesso restrito. Faça login para navegar nas áreas protegidas.');
        return;
    }

    if (tabId === 'animals' && currentUser && currentUser.role === 'tutor') {
        showToast('Utilize seu painel "Minha Conta (Tutor)".');
        switchTab('tutor-area');
        return;
    }

    if (tabId === 'clinics' && currentUser && currentUser.role === 'tutor') {
        showToast('Acesso negado: Tutores não acessam a aba de Clínicas Parceiras.');
        switchTab('tutor-area');
        return;
    }

    if (tabId === 'appointments' && currentUser && currentUser.role === 'clinic') {
        showToast('Acesso negado: Clínicas parceiras não acessam a aba de Consultas.');
        switchTab('animals');
        return;
    }

    if (tabId === 'tutor-area' && (!currentUser || currentUser.role !== 'tutor')) {
        openModal('login-select-modal');
        showToast('Área exclusiva para tutores logados.');
        return;
    }

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'fw-semibold'));

    const selectedTab = document.getElementById(`tab-${tabId}`);
    if (selectedTab) selectedTab.classList.remove('d-none');

    const selectedNav = document.getElementById(`nav-${tabId}`);
    if (selectedNav) selectedNav.classList.add('active', 'fw-semibold');

    const navCollapse = document.getElementById('mainNavbar');
    if (navCollapse && navCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse) bsCollapse.hide();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tabId === 'clinics') renderClinics();
    if (tabId === 'tutor-area') renderTutorArea();
    if (tabId === 'animals') renderAnimals();
    if (tabId === 'appointments') renderAppointments();
}

function openLoginModalForRole(role) {
    document.getElementById('login-target-role').value = role;
    const titleEl = document.getElementById('login-modal-title');
    if (role === 'tutor') titleEl.innerText = 'Entrar como Tutor';
    if (role === 'admin') titleEl.innerText = 'Entrar como Coordenação / Veterinário';
    if (role === 'clinic') titleEl.innerText = 'Entrar como Clínica Parceira';
    openModal('login-modal');
}

function handleLogin(e) {
    e.preventDefault();
    const role = document.getElementById('login-target-role').value;
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;

    if (role === 'admin') {
        if (email === 'admin@uninassau.edu.br' && pass === 'admin123') {
            currentUser = { name: 'Coordenador / Médico Veterinário Admin', email: email, role: 'admin' };
            updateAuthUI();
            closeModal('login-modal');
            showToast('Login realizado como Coordenação / Administrador!');
            switchTab('animals');
            return;
        } else {
            alert('Credenciais inválidas!');
            return;
        }
    }

    if (role === 'clinic') {
        if (email.endsWith('@uninassau.edu.br')) {
            let testClinic = clinicsData.find(c => c.email.toLowerCase() === email.toLowerCase());
            if (!testClinic) {
                testClinic = {
                    id: clinicsData.length > 0 ? Math.max(...clinicsData.map(c => c.id)) + 1 : 1,
                    name: 'Clínica Escola Teste (' + email.split('@')[0] + ')',
                    crmv: 'CRMV-PB TEST',
                    email: email,
                    phone: '(83) 99999-9999',
                    address: 'Campina Grande - PB (Institucional)',
                    status: 'Parceiro Credenciado'
                };
                clinicsData.push(testClinic);
                saveData();
            }
            currentUser = { name: testClinic.name, email: email, role: 'clinic', clinicId: testClinic.id };
            updateAuthUI();
            closeModal('login-modal');
            showToast(`Acesso liberado para ${testClinic.name}!`);
            switchTab('animals');
            return;
        }

        const foundClinic = clinicsData.find(c => c.email.toLowerCase() === email.toLowerCase());
        if (foundClinic) {
            currentUser = { name: foundClinic.name, email: email, role: 'clinic', clinicId: foundClinic.id };
            updateAuthUI();
            closeModal('login-modal');
            showToast(`Bem-vindo(a), ${foundClinic.name}!`);
            switchTab('animals');
            return;
        } else {
            alert('Clínica não encontrada com este e-mail cadastrado.');
            return;
        }
    }

    if (role === 'tutor') {
        currentUser = { name: email.split('@')[0], email: email, role: 'tutor' };
        updateAuthUI();
        closeModal('login-modal');
        showToast('Login realizado como Tutor!');
        switchTab('tutor-area');
    }
}

function registerTutorDirect(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
    }

    currentUser = { name, email, role: 'tutor' };
    updateAuthUI();
    closeModal('signup-modal');
    document.getElementById('signup-form-step1').reset();
    showToast('Cadastro de tutor concluído!');
    switchTab('tutor-area');
}

function registerAdminDirect(e) {
    e.preventDefault();
    const name = document.getElementById('admin-signup-name').value.trim();
    const email = document.getElementById('admin-signup-email').value.trim();

    if (!email.toLowerCase().endsWith('@sempreuninassau.com.br')) {
        alert('Informe um e-mail institucional válido para concluir o cadastro.');
        return;
    }

    currentUser = { name, email, role: 'admin' };
    updateAuthUI();
    closeModal('admin-signup-modal');
    document.getElementById('admin-signup-form-step1').reset();
    showToast('Cadastro institucional concluído!');
    switchTab('animals');
}

function registerClinicDirect(e) {
    e.preventDefault();
    const name = document.getElementById('cs-name').value.trim();
    const cnpj = document.getElementById('cs-cnpj').value.trim();
    const crmv = document.getElementById('cs-crmv').value.trim();
    const email = document.getElementById('cs-email').value.trim();
    const phone = document.getElementById('cs-phone').value.trim();
    const address = document.getElementById('cs-address').value.trim();

    const newClinic = {
        id: clinicsData.length > 0 ? Math.max(...clinicsData.map(c => c.id)) + 1 : 1,
        name,
        cnpj,
        crmv,
        email,
        phone,
        address,
        status: 'Parceiro Credenciado'
    };
    clinicsData.push(newClinic);
    saveData();
    currentUser = { name: newClinic.name, email: newClinic.email, role: 'clinic', clinicId: newClinic.id };
    updateAuthUI();
    closeModal('clinic-signup-modal');
    document.getElementById('clinic-signup-form-step1').reset();
    showToast('Clínica cadastrada com sucesso!');
    switchTab('animals');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('vet_current_user');
    updateAuthUI();
    showToast('Sessão encerrada.');
    switchTab('home');
    renderAnimals();
    renderClinics();
}

function updateAuthUI() {
    const authArea = document.getElementById('auth-nav-area');
    const tutorNotice = document.getElementById('tutor-notice-banner');
    const tutorRestrictedBanner = document.getElementById('tutor-restricted-banner');
    const clinicFiltersPanel = document.getElementById('clinic-filters-panel');
    const clinicPortalBox = document.getElementById('clinic-portal-box');
    const navTutorBtn = document.getElementById('nav-tutor-area');
    const navAnimals = document.getElementById('nav-animals');
    const navAppointments = document.getElementById('nav-appointments');
    const navClinics = document.getElementById('nav-clinics');
    const btnNewAppointment = document.getElementById('btn-new-appointment');
    const btnNewClinic = document.getElementById('btn-new-clinic');

    if (currentUser) {
        let badge = 'Tutor';
        if (currentUser.role === 'admin') badge = 'Coordenação / Admin';
        if (currentUser.role === 'clinic') badge = 'Clínica Parceira';

        authArea.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <div class="text-end d-none d-lg-block lh-sm">
                    <span class="small fw-bold d-block">${currentUser.name}</span>
                    <small class="text-muted" style="font-size: 0.7rem;">${badge}</small>
                </div>
                <button type="button" onclick="logout()" class="btn btn-sm btn-outline-secondary rounded-pill">Sair</button>
            </div>
        `;

        if (currentUser.role === 'tutor') {
            navTutorBtn.classList.remove('d-none');
            navAnimals.classList.add('d-none');
            navAppointments.classList.remove('d-none');
            navClinics.classList.add('d-none');

            tutorRestrictedBanner.classList.remove('d-none');
            tutorNotice.classList.add('d-none');
            clinicFiltersPanel.classList.add('d-none');
            if (btnNewAppointment) btnNewAppointment.classList.remove('d-none');
            if (btnNewClinic) btnNewClinic.classList.add('d-none');
        } else if (currentUser.role === 'clinic') {
            navTutorBtn.classList.add('d-none');
            navAnimals.classList.remove('d-none');
            navAppointments.classList.add('d-none');
            navClinics.classList.remove('d-none');

            tutorRestrictedBanner.classList.add('d-none');
            tutorNotice.classList.add('d-none');
            clinicFiltersPanel.classList.remove('d-none');
            if (btnNewAppointment) btnNewAppointment.classList.add('d-none');
            if (btnNewClinic) btnNewClinic.classList.remove('d-none');
        } else {
            navTutorBtn.classList.add('d-none');
            navAnimals.classList.remove('d-none');
            navAppointments.classList.remove('d-none');
            navClinics.classList.remove('d-none');

            tutorRestrictedBanner.classList.add('d-none');
            tutorNotice.classList.add('d-none');
            clinicFiltersPanel.classList.add('d-none');
            if (btnNewAppointment) btnNewAppointment.classList.add('d-none');
            if (btnNewClinic) btnNewClinic.classList.add('d-none');
        }

        if (currentUser.role === 'clinic') {
            clinicPortalBox.classList.remove('d-none');
            document.getElementById('logged-clinic-name').innerText = currentUser.name;
            renderClinicContactsList();
        } else {
            clinicPortalBox.classList.add('d-none');
        }
    } else {
        authArea.innerHTML = `
            <button type="button" onclick="openModal('login-select-modal')" class="btn btn-sm btn-outline-secondary rounded-pill">Entrar</button>
            <button type="button" onclick="openModal('signup-select-modal')" class="btn btn-sm btn-accent rounded-pill">Cadastrar</button>
        `;

        navTutorBtn.classList.add('d-none');
        navAnimals.classList.add('d-none');
        navAppointments.classList.add('d-none');
        navClinics.classList.remove('d-none');

        tutorNotice.classList.remove('d-none');
        tutorRestrictedBanner.classList.add('d-none');
        clinicFiltersPanel.classList.add('d-none');
        clinicPortalBox.classList.add('d-none');
        if (btnNewAppointment) btnNewAppointment.classList.remove('d-none');
        if (btnNewClinic) btnNewClinic.classList.add('d-none');
    }

    renderAppointments();
    renderClinics();
}

function clearClinicFilters() {
    document.getElementById('clinic-filter-blood').value = '';
    document.getElementById('clinic-filter-age').value = '';
    document.getElementById('clinic-filter-weight').value = '';
    initPlaceholdersHideOnFocus();
    renderAnimals();
}

function renderAnimals() {
    const grid = document.getElementById('animals-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (currentUser && currentUser.role === 'tutor') {
        grid.innerHTML = `<div class="col-12"><div class="alert alert-warning small mb-0">Acesse <strong>Minha Conta (Tutor)</strong> para gerenciar seus pets.</div></div>`;
        return;
    }

    const query = document.getElementById('animal-search') ? document.getElementById('animal-search').value.toLowerCase() : '';
    const filterBlood = document.getElementById('clinic-filter-blood') ? document.getElementById('clinic-filter-blood').value.toLowerCase() : '';
    const filterAge = document.getElementById('clinic-filter-age') ? document.getElementById('clinic-filter-age').value.toLowerCase() : '';
    const filterWeight = document.getElementById('clinic-filter-weight') ? document.getElementById('clinic-filter-weight').value.toLowerCase() : '';

    const filtered = animalsData.filter(a => {
        const { age, weight } = getAnimalAgeAndWeight(a);
        const matchesQuery = a.name.toLowerCase().includes(query) ||
            a.species.toLowerCase().includes(query) ||
            a.breed.toLowerCase().includes(query) ||
            a.owner.toLowerCase().includes(query);

        if (currentUser && currentUser.role === 'clinic') {
            const matchesBlood = filterBlood === '' || (a.blood && a.blood.toLowerCase().includes(filterBlood));
            const matchesAge = filterAge === '' || age.toLowerCase().includes(filterAge);
            const matchesWeight = filterWeight === '' || weight.toLowerCase().includes(filterWeight);
            return matchesQuery && matchesBlood && matchesAge && matchesWeight;
        }

        return matchesQuery;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-4 small">Nenhum animal encontrado.</div>`;
        return;
    }

    filtered.forEach(animal => {
        const isClinic = currentUser && currentUser.role === 'clinic';
        const isAdmin = currentUser && currentUser.role === 'admin';
        const photoUrl = animal.photo || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80';
        const vitalsText = formatAnimalVitals(animal);

        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card h-100 bg-white">
                <img src="${photoUrl}" alt="${animal.name}" class="card-img-top object-fit-cover" style="height: 180px;">
                <div class="card-body small">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <h5 class="card-title fw-bold mb-0">${animal.name}</h5>
                        <span class="badge text-bg-danger rounded-pill">${animal.blood || 'N/I'}</span>
                    </div>
                    <p class="text-muted mb-2">${animal.species} · ${animal.breed}${vitalsText ? ` · ${vitalsText}` : ''}</p>
                    <p class="mb-1"><strong>Tutor:</strong> ${animal.owner}</p>
                    <p class="mb-1"><strong>Última Coleta:</strong> ${animal.lastCollectionDate || 'N/A'}</p>
                    <p class="mb-1"><strong>Qtd. Doada:</strong> ${animal.donatedAmount || 'N/A'}</p>
                    <p class="text-muted mb-2">${animal.notes || 'Sem observações.'}</p>
                    ${animal.anamnesisPdf ? `
                        <a href="${animal.anamnesisPdf}" target="_blank" class="btn btn-sm btn-outline-danger w-100 rounded-pill">
                            <i class="fa-solid fa-file-pdf me-1"></i> Visualizar Anamnese (PDF)
                        </a>
                    ` : `<span class="text-muted">Sem PDF de anamnese anexado.</span>`}
                </div>
                <div class="card-footer bg-white d-flex justify-content-end gap-2 border-0 pt-0 pb-3 px-3">
                    ${isClinic ? `
                        <button type="button" onclick="openClinicContactModalWithAnimal('${animal.name}')" class="btn btn-sm btn-navy w-100 rounded-pill">
                            Requisitar Doador
                        </button>
                    ` : ''}
                    ${isAdmin ? `
                        <button type="button" onclick="editAnimal(${animal.id})" class="btn btn-sm btn-outline-secondary rounded-pill">Editar</button>
                        <button type="button" onclick="deleteAnimal(${animal.id})" class="btn btn-sm btn-outline-danger rounded-pill">Excluir</button>
                    ` : ''}
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function renderTutorArea() {
    if (!currentUser || currentUser.role !== 'tutor') {
        switchTab('home');
        openModal('login-select-modal');
        return;
    }

    document.getElementById('tutor-profile-name').innerText = currentUser.name;
    document.getElementById('tutor-profile-email').innerText = currentUser.email;

    renderTutorNotifications();

    const grid = document.getElementById('tutor-pets-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const myPets = animalsData.filter(a => a.owner.toLowerCase() === currentUser.name.toLowerCase());
    document.getElementById('tutor-pets-count').innerText = `${myPets.length} ${myPets.length === 1 ? 'pet' : 'pets'}`;

    if (myPets.length === 0) {
        grid.innerHTML = `<div class="col-12"><div class="alert alert-light border text-center small">Você ainda não cadastrou nenhum pet.</div></div>`;
        return;
    }

    myPets.forEach(animal => {
        const photoUrl = animal.photo || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80';
        const vitalsText = formatAnimalVitals(animal);
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card h-100 bg-white">
                <img src="${photoUrl}" alt="${animal.name}" class="card-img-top object-fit-cover" style="height: 180px;">
                <div class="card-body small">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <h5 class="card-title fw-bold mb-0">${animal.name}</h5>
                        <span class="badge text-bg-danger rounded-pill">${animal.blood || 'N/I'}</span>
                    </div>
                    <p class="text-muted mb-2">${animal.species} · ${animal.breed}${vitalsText ? ` · ${vitalsText}` : ''}</p>
                    <p class="mb-1"><strong>Última Coleta:</strong> ${animal.lastCollectionDate || 'Sem registros'}</p>
                    <p class="mb-2"><strong>Sangue Doado:</strong> ${animal.donatedAmount || 'Sem registros'}</p>
                    ${animal.anamnesisPdf ? `
                        <a href="${animal.anamnesisPdf}" target="_blank" class="btn btn-sm btn-outline-danger w-100 rounded-pill">
                            <i class="fa-solid fa-file-pdf me-1"></i> Anamnese Anexada (PDF)
                        </a>
                    ` : `<span class="text-muted">Sem PDF de anamnese anexado.</span>`}
                </div>
                <div class="card-footer bg-white d-flex justify-content-end gap-2 border-0 pt-0 pb-3 px-3">
                    <button type="button" onclick="editAnimal(${animal.id})" class="btn btn-sm btn-outline-secondary rounded-pill">Editar</button>
                    <button type="button" onclick="deleteAnimal(${animal.id})" class="btn btn-sm btn-outline-danger rounded-pill">Excluir</button>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function renderTutorNotifications() {
    const listEl = document.getElementById('tutor-notifications-list');
    if (!listEl || !currentUser) return;

    const mine = tutorNotifications.filter(n => n.tutorName.toLowerCase() === currentUser.name.toLowerCase());
    if (mine.length === 0) {
        listEl.innerHTML = `<div class="list-group-item text-muted">Nenhuma notificação no momento.</div>`;
        return;
    }

    listEl.innerHTML = '';
    mine.slice().reverse().forEach(n => {
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-danger d-flex justify-content-between align-items-start';
        item.innerHTML = `
            <div>
                <strong>Consulta Cancelada (${n.animal})</strong> — ${n.service} em <span>${n.date.replace('T', ' ')}</span>.
                <div class="text-muted" style="font-size: 0.75rem;">Enviado por: ${n.cancelledBy} · ${n.createdAt}</div>
            </div>
        `;
        listEl.appendChild(item);
    });
}

function clearTutorNotifications() {
    if (!currentUser) return;
    tutorNotifications = tutorNotifications.filter(n => n.tutorName.toLowerCase() !== currentUser.name.toLowerCase());
    saveData();
    renderTutorNotifications();
    showToast('Notificações removidas.');
}

function openAnimalModal(animalId = null) {
    if (!currentUser || (currentUser.role !== 'tutor' && currentUser.role !== 'admin')) {
        openModal('login-select-modal');
        return;
    }

    document.getElementById('animal-id').value = '';
    document.getElementById('animal-name').value = '';
    document.getElementById('animal-species').value = 'Canino';
    document.getElementById('animal-breed').value = '';
    document.getElementById('animal-blood').value = '';
    document.getElementById('animal-age').value = '';
    document.getElementById('animal-weight').value = '';
    document.getElementById('animal-last-collection').value = '';
    document.getElementById('animal-donated-amount').value = '';
    document.getElementById('animal-owner').value = currentUser.role === 'tutor' ? currentUser.name : '';

    const pdfInput = document.getElementById('animal-pdf-file');
    const pdfStatus = document.getElementById('current-pdf-status');
    pdfInput.value = '';

    if (currentUser.role === 'admin') {
        document.getElementById('animal-owner').removeAttribute('readonly');
        document.getElementById('animal-owner').classList.remove('bg-light');
    } else {
        document.getElementById('animal-owner').setAttribute('readonly', true);
        document.getElementById('animal-owner').classList.add('bg-light');
    }

    document.getElementById('animal-photo-file').value = '';
    document.getElementById('animal-notes').value = '';
    document.getElementById('animal-modal-title').innerText = 'Cadastrar Novo Animal';
    pdfStatus.innerText = 'Opcional no cadastro do pet.';

    if (animalId) {
        const animal = animalsData.find(a => a.id === animalId);
        if (animal) {
            const { age, weight } = getAnimalAgeAndWeight(animal);
            document.getElementById('animal-id').value = animal.id;
            document.getElementById('animal-name').value = animal.name;
            document.getElementById('animal-species').value = animal.species;
            document.getElementById('animal-breed').value = animal.breed;
            document.getElementById('animal-blood').value = animal.blood || '';
            document.getElementById('animal-age').value = age;
            document.getElementById('animal-weight').value = weight;
            document.getElementById('animal-last-collection').value = animal.lastCollectionDate || '';
            document.getElementById('animal-donated-amount').value = animal.donatedAmount || '';
            document.getElementById('animal-owner').value = animal.owner;
            document.getElementById('animal-notes').value = animal.notes || '';
            if (animal.anamnesisPdf) {
                pdfStatus.innerHTML = `<span class="text-success fw-bold">PDF já anexado.</span>`;
            }
            document.getElementById('animal-modal-title').innerText = 'Editar Informações do Pet';
        }
    }
    openModal('animal-modal');
}

function editAnimal(id) {
    openAnimalModal(id);
}

function deleteAnimal(id) {
    if (confirm('Deseja realmente remover este pet?')) {
        animalsData = animalsData.filter(a => a.id !== id);
        saveData();
        renderAnimals();
        if (currentUser && currentUser.role === 'tutor') renderTutorArea();
        showToast('Pet removido.');
    }
}

function saveAnimal(e) {
    e.preventDefault();
    if (!currentUser) return;

    const id = document.getElementById('animal-id').value;
    const fileInput = document.getElementById('animal-photo-file');
    const pdfFileInput = document.getElementById('animal-pdf-file');

    let photoUrl = '';
    let existingNotes = '';
    let existingPdf = '';
    const existing = animalsData.find(a => a.id == id);
    if (existing) {
        photoUrl = existing.photo;
        existingNotes = existing.notes;
        existingPdf = existing.anamnesisPdf || '';
    }

    const processAnimalData = (imgUrl, pdfUrl) => {
        const ownerVal = currentUser.role === 'tutor' ? currentUser.name : document.getElementById('animal-owner').value;
        const notesVal = document.getElementById('animal-notes').value || existingNotes;
        const finalPdf = pdfUrl || existingPdf;

        const data = {
            name: document.getElementById('animal-name').value,
            species: document.getElementById('animal-species').value,
            breed: document.getElementById('animal-breed').value,
            blood: document.getElementById('animal-blood').value,
            age: document.getElementById('animal-age').value.trim(),
            weight: document.getElementById('animal-weight').value.trim(),
            lastCollectionDate: document.getElementById('animal-last-collection').value,
            donatedAmount: document.getElementById('animal-donated-amount').value,
            owner: ownerVal,
            photo: imgUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
            notes: notesVal,
            anamnesisPdf: finalPdf
        };

        if (id) {
            const index = animalsData.findIndex(a => a.id == id);
            if (index !== -1) {
                animalsData[index] = { id: Number(id), ...data };
                showToast('Pet atualizado!');
            }
        } else {
            const newId = animalsData.length > 0 ? Math.max(...animalsData.map(a => a.id)) + 1 : 1;
            animalsData.push({ id: newId, ...data });
            showToast('Novo pet cadastrado!');
        }

        saveData();
        closeModal('animal-modal');
        renderAnimals();
        if (currentUser && currentUser.role === 'tutor') renderTutorArea();
    };

    const handlePdfAndPhoto = (imgResult) => {
        if (pdfFileInput && pdfFileInput.files && pdfFileInput.files[0]) {
            const pdfReader = new FileReader();
            pdfReader.onload = function(ev) { processAnimalData(imgResult, ev.target.result); };
            pdfReader.readAsDataURL(pdfFileInput.files[0]);
        } else {
            processAnimalData(imgResult, existingPdf);
        }
    };

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { handlePdfAndPhoto(e.target.result); };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        handlePdfAndPhoto(photoUrl);
    }
}

function getConflictingAppointment(dateVal, currentId = null) {
    if (!dateVal) return null;
    const candidateTime = new Date(dateVal).getTime();
    if (Number.isNaN(candidateTime)) return null;

    const minGapMs = MIN_APPOINTMENT_GAP_MINUTES * 60 * 1000;

    return appointmentsData.find(appt => {
        if (currentId && appt.id == currentId) return false;
        const apptTime = new Date(appt.date).getTime();
        if (Number.isNaN(apptTime)) return false;
        return Math.abs(candidateTime - apptTime) < minGapMs;
    }) || null;
}

function checkAppointmentConflict(dateVal, currentId = null) {
    return getConflictingAppointment(dateVal, currentId) !== null;
}

function checkAvailabilityNotice() {
    const inputVal = document.getElementById('appt-date').value;
    const currentApptId = document.getElementById('appt-id').value;
    const noticeEl = document.getElementById('availability-notice');
    if (!inputVal) {
        noticeEl.classList.add('d-none');
        return;
    }

    const selectedDate = new Date(inputVal);
    const dayOfWeek = selectedDate.getDay();
    const hours = selectedDate.getHours();
    const conflict = getConflictingAppointment(inputVal, currentApptId);

    noticeEl.classList.remove('d-none');
    if (conflict) {
        noticeEl.className = 'alert alert-danger py-2 small mb-3';
        noticeEl.innerText = `Conflito de horário: já existe consulta às ${conflict.date.replace('T', ' ')} (exige diferença mínima de ${MIN_APPOINTMENT_GAP_MINUTES} min).`;
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        noticeEl.className = 'alert alert-warning py-2 small mb-3';
        noticeEl.innerText = 'Atendimento apenas de Segunda a Sexta.';
    } else if (hours < 8 || hours >= 17) {
        noticeEl.className = 'alert alert-warning py-2 small mb-3';
        noticeEl.innerText = 'Horário fora do expediente padrão (08h às 17h).';
    } else {
        noticeEl.className = 'alert alert-success py-2 small mb-3';
        noticeEl.innerText = `Horário livre (respeita intervalo mínimo de ${MIN_APPOINTMENT_GAP_MINUTES} min).`;
    }
}

function renderAppointments() {
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let listToRender = appointmentsData;
    if (currentUser && currentUser.role === 'tutor') {
        listToRender = appointmentsData.filter(a => a.owner.toLowerCase() === currentUser.name.toLowerCase());
    }

    if (listToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma consulta encontrada.</td></tr>`;
        return;
    }

    listToRender.forEach(appt => {
        const isAdmin = currentUser && currentUser.role === 'admin';
        const isOwnerTutor = currentUser && currentUser.role === 'tutor' && appt.owner.toLowerCase() === currentUser.name.toLowerCase();

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-semibold">${appt.animal}</td>
            <td>${appt.owner}</td>
            <td>${appt.service}</td>
            <td>${appt.date.replace('T', ' ')}</td>
            <td>
                <span class="badge rounded-pill ${appt.status === 'Confirmado' ? 'text-bg-success' : 'text-bg-warning'}">${appt.status}</span>
            </td>
            <td class="text-end">
                ${isAdmin ? `
                    <button type="button" onclick="toggleApptStatus(${appt.id})" class="btn btn-sm btn-outline-dark rounded-pill me-1">Status</button>
                    <button type="button" onclick="openAppointmentModal(${appt.id})" class="btn btn-sm btn-outline-primary rounded-pill me-1">Reagendar</button>
                    <button type="button" onclick="deleteAppt(${appt.id})" class="btn btn-sm btn-outline-danger rounded-pill">Cancelar</button>
                ` : isOwnerTutor ? `
                    <button type="button" onclick="openAppointmentModal(${appt.id})" class="btn btn-sm btn-outline-primary rounded-pill me-1">Reagendar</button>
                    <button type="button" onclick="deleteAppt(${appt.id})" class="btn btn-sm btn-outline-danger rounded-pill">Cancelar</button>
                ` : `<span class="text-muted">-</span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAppointmentModal(apptId = null) {
    if (!currentUser || (currentUser.role !== 'tutor' && currentUser.role !== 'admin')) {
        openModal('login-select-modal');
        return;
    }

    if (currentUser.role === 'admin' && !apptId) {
        showToast('A Coordenação pode apenas reagendar ou cancelar consultas.');
        return;
    }

    const select = document.getElementById('appt-animal-select');
    select.innerHTML = '';

    document.getElementById('appt-id').value = '';
    document.getElementById('appt-service').value = '';
    document.getElementById('appt-date').value = '';
    document.getElementById('availability-notice').classList.add('d-none');

    if (apptId) {
        const appt = appointmentsData.find(a => a.id === apptId);
        if (!appt) return;

        const poolPets = currentUser.role === 'admin'
            ? animalsData
            : animalsData.filter(a => a.owner.toLowerCase() === currentUser.name.toLowerCase());

        poolPets.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.name;
            opt.innerText = `${a.name} (${a.owner})`;
            select.appendChild(opt);
        });

        if (!Array.from(select.options).some(o => o.value === appt.animal)) {
            const opt = document.createElement('option');
            opt.value = appt.animal;
            opt.innerText = `${appt.animal} (${appt.owner})`;
            select.appendChild(opt);
        }

        document.getElementById('appt-modal-title').innerText = 'Reagendar Consulta';
        document.getElementById('appt-id').value = appt.id;
        select.value = appt.animal;
        document.getElementById('appt-owner').value = appt.owner;
        document.getElementById('appt-service').value = appt.service;
        document.getElementById('appt-date').value = appt.date;
        checkAvailabilityNotice();
        openModal('appointment-modal');
        return;
    }

    const myPets = animalsData.filter(a => a.owner.toLowerCase() === currentUser.name.toLowerCase());
    if (myPets.length === 0) {
        alert('Cadastre um pet antes de agendar uma consulta.');
        switchTab('tutor-area');
        return;
    }

    myPets.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.name;
        opt.innerText = `${a.name} (${a.species})`;
        select.appendChild(opt);
    });

    document.getElementById('appt-modal-title').innerText = 'Agendar Consulta';
    document.getElementById('appt-owner').value = currentUser.name;
    openModal('appointment-modal');
}

function saveAppointment(e) {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'tutor' && currentUser.role !== 'admin')) {
        return;
    }

    const id = document.getElementById('appt-id').value;
    const animalName = document.getElementById('appt-animal-select').value;
    const serviceVal = document.getElementById('appt-service').value;
    const dateVal = document.getElementById('appt-date').value;

    if (currentUser.role === 'admin' && !id) {
        showToast('A Coordenação pode apenas reagendar consultas existentes.');
        return;
    }

    const selectedDate = new Date(dateVal);
    if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) {
        alert('Não há atendimentos aos finais de semana.');
        return;
    }

    const conflict = getConflictingAppointment(dateVal, id);
    if (conflict) {
        alert(`Conflito de horário! Já existe consulta às ${conflict.date.replace('T', ' ')}. Escolha um horário com pelo menos ${MIN_APPOINTMENT_GAP_MINUTES} minutos de diferença.`);
        return;
    }

    if (id) {
        const appt = appointmentsData.find(a => a.id == id);
        if (appt) {
            appt.animal = animalName;
            appt.service = serviceVal;
            appt.date = dateVal;
            appt.status = 'Pendente';
            showToast('Consulta reagendada com sucesso!');
        }
    } else {
        const newAppt = {
            id: appointmentsData.length > 0 ? Math.max(...appointmentsData.map(a => a.id)) + 1 : 1,
            animal: animalName,
            owner: currentUser.name,
            service: serviceVal,
            date: dateVal,
            status: 'Pendente'
        };
        appointmentsData.push(newAppt);
        showToast('Consulta agendada com sucesso!');
    }

    saveData();
    closeModal('appointment-modal');
    renderAppointments();
}

function toggleApptStatus(id) {
    const appt = appointmentsData.find(a => a.id === id);
    if (appt) {
        appt.status = appt.status === 'Confirmado' ? 'Pendente' : 'Confirmado';
        saveData();
        renderAppointments();
    }
}

function deleteAppt(id) {
    const appt = appointmentsData.find(a => a.id === id);
    if (!appt) return;

    const cancelledByAdmin = currentUser && currentUser.role === 'admin';
    tutorNotifications.push({
        id: tutorNotifications.length > 0 ? Math.max(...tutorNotifications.map(n => n.id)) + 1 : 1,
        tutorName: appt.owner,
        animal: appt.animal,
        service: appt.service,
        date: appt.date,
        cancelledBy: cancelledByAdmin ? 'Coordenação / Veterinário' : currentUser ? currentUser.name : 'Sistema',
        createdAt: new Date().toLocaleString('pt-BR')
    });

    appointmentsData = appointmentsData.filter(a => a.id !== id);
    saveData();
    renderAppointments();
    showToast(`Consulta cancelada. Notificação enviada ao tutor ${appt.owner}.`);
}

function renderClinics() {
    const grid = document.getElementById('clinics-grid');
    if (!grid) return;
    grid.innerHTML = '';

    clinicsData.forEach(clinic => {
        const isAdmin = currentUser && currentUser.role === 'admin';
        const col = document.createElement('div');
        col.className = 'col-md-6';
        col.innerHTML = `
            <div class="card h-100 bg-white">
                <div class="card-body small">
                    <h5 class="card-title fw-bold mb-1">${clinic.name}</h5>
                    <p class="${isAdmin ? 'mb-2' : 'mb-0'} text-muted">${clinic.address || 'Campina Grande - PB'}</p>
                    ${isAdmin ? `
                        <p class="mb-1"><strong>Status:</strong> ${clinic.status || 'Ativo'}</p>
                        <p class="mb-1"><strong>CRMV/CNPJ:</strong> ${clinic.crmv || 'CRMV-PB'} · ${clinic.cnpj || 'Cadastrado'}</p>
                        <p class="mb-1"><strong>Telefone:</strong> ${clinic.phone || '(83) 3300-0000'}</p>
                        <p class="mb-0"><strong>E-mail:</strong> ${clinic.email}</p>
                    ` : ''}
                </div>
                ${isAdmin ? `
                    <div class="card-footer bg-white text-end border-0 pt-0 pb-3 px-3">
                        <button type="button" onclick="deleteClinic(${clinic.id})" class="btn btn-sm btn-outline-danger rounded-pill">Excluir</button>
                    </div>
                ` : ''}
            </div>
        `;
        grid.appendChild(col);
    });
}

function deleteClinic(id) {
    if (confirm('Deseja realmente remover esta clínica parceira?')) {
        clinicsData = clinicsData.filter(c => c.id !== id);
        saveData();
        renderClinics();
        showToast('Clínica removida.');
    }
}

function openClinicContactModalWithAnimal(animalName) {
    openClinicContactModal();
    const select = document.getElementById('cc-animal-select');
    if (select) select.value = animalName;
}

function openClinicContactModal() {
    if (!currentUser || currentUser.role !== 'clinic') {
        showToast('Acesso restrito a clínicas parceiras.');
        return;
    }

    const select = document.getElementById('cc-animal-select');
    select.innerHTML = '';

    if (animalsData.length === 0) {
        select.innerHTML = `<option value="">Nenhum animal cadastrado</option>`;
    } else {
        animalsData.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.name;
            opt.innerText = `${a.name} (${a.species} - ${a.blood || 'N/I'})`;
            select.appendChild(opt);
        });
    }

    document.getElementById('cc-subject').value = '';
    document.getElementById('cc-message').value = '';
    openModal('clinic-contact-modal');
}

function submitClinicContact(e) {
    e.preventDefault();
    const animalAssociated = document.getElementById('cc-animal-select').value;
    const subject = document.getElementById('cc-subject').value;
    const message = document.getElementById('cc-message').value;

    clinicContacts.push({
        id: clinicContacts.length > 0 ? Math.max(...clinicContacts.map(c => c.id)) + 1 : 1,
        clinicName: currentUser.name,
        animal: animalAssociated,
        subject,
        message: `Animal: ${animalAssociated} | ${message}`,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: 'Enviada à Coordenação'
    });

    saveData();
    renderClinicContactsList();
    closeModal('clinic-contact-modal');
    showToast('Requisição enviada!');
}

function renderClinicContactsList() {
    const listContainer = document.getElementById('clinic-requests-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const myContacts = clinicContacts.filter(c => currentUser && c.clinicName.toLowerCase() === currentUser.name.toLowerCase());
    if (myContacts.length === 0) {
        listContainer.innerHTML = `<p class="text-muted small mb-0">Nenhuma requisição enviada.</p>`;
        return;
    }

    myContacts.slice(-5).reverse().forEach(item => {
        const div = document.createElement('div');
        div.className = 'border rounded-3 p-3 bg-light small';
        div.innerHTML = `
            <div class="d-flex justify-content-between fw-bold">
                <span>${item.subject}</span>
                <span class="text-success">${item.status}</span>
            </div>
            <div>${item.message}</div>
            <small class="text-muted">${item.date}</small>
        `;
        listContainer.appendChild(div);
    });
}

function showToast(message) {
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast show position-fixed bottom-0 end-0 m-3 text-bg-dark border-0 rounded-4';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 3500);
}

window.onload = function() {
    initPlaceholdersHideOnFocus();
    updateAuthUI();
    renderAnimals();
    renderAppointments();
    renderClinics();
};
