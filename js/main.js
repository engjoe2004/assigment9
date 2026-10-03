/* ContactHub – logic (uses Bootstrap 5 modals) */
const $ = (sel) => document.querySelector(sel);

const formModal    = new bootstrap.Modal('#formModal');
const successModal = new bootstrap.Modal('#successModal');
const deleteModal  = new bootstrap.Modal('#deleteModal');

let contacts = [];
let editingId = null;
let deletingId = null;
let photoData = '';

try { contacts = JSON.parse(localStorage.getItem('contacthub') || '[]'); } catch (e) { contacts = []; }
const persist = () => { try { localStorage.setItem('contacthub', JSON.stringify(contacts)); } catch (e) {} };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = (c) => esc((c.name || '?').trim().charAt(0).toUpperCase());
const avatarAttr = (c) => (c.photo ? ` style="background-image:url('${c.photo}')"` : '');

// Egyptian mobile numbers: 010 / 011 / 012 / 015 + 8 digits (optionally +20 / 20 prefix)
const isValidPhone = (v) => /^(\+?20|0)?1[0125]\d{8}$/.test(v.replace(/[\s-]/g, ''));
const isValidEmail = (v) => !v || /^\S+@\S+\.\S+$/.test(v);

// Turn +20 / 0020 / 20 / bare 1xxxxxxxxx into the local 01xxxxxxxxx form so duplicates can be compared
function normalizeEgyptianPhone(phone) {
  phone = String(phone || '').replace(/\D/g, '');
  if (phone.startsWith('0020')) phone = '0' + phone.slice(4);
  else if (phone.startsWith('20')) phone = '0' + phone.slice(2);
  else if (phone.startsWith('1')) phone = '0' + phone;
  return phone;
}

// ignoreId = id of the contact being edited (so it doesn't clash with itself)
function isPhoneDuplicate(phone, ignoreId = null) {
  const input = normalizeEgyptianPhone(phone);
  return contacts.some((c) => c.id !== ignoreId && normalizeEgyptianPhone(c.phone) === input);
}

const PHONE_INVALID_MSG = 'Please enter a valid Egyptian phone number';
const PHONE_DUPLICATE_MSG = 'This phone number already exists in your contacts';
function setPhoneError(msg) {
  const el = $('#phone');
  el.classList.toggle('is-invalid', !!msg);
  if (msg) el.nextElementSibling.textContent = msg;
}

/* ---------- Rendering ---------- */
function render() {
  const q = $('#search').value.trim().toLowerCase();
  const list = contacts.filter((c) => [c.name, c.phone, c.email].some((v) => (v || '').toLowerCase().includes(q)));
  const favs = contacts.filter((c) => c.fav);
  const ems  = contacts.filter((c) => c.em);

  $('#sTotal').textContent = contacts.length;
  $('#sFav').textContent = favs.length;
  $('#sEm').textContent = ems.length;
  $('#countText').textContent = `Manage and organize your ${contacts.length} contacts`;

  $('#contactGrid').innerHTML = list.length
    ? list.map(cardHTML).join('')
    : `<div class="col-12 text-center text-body-secondary py-5">
         <div class="empty-icon"><i class="bi bi-person-lines-fill"></i></div>
         <div class="fw-semibold text-body">No contacts found</div>
         <small>Click "Add Contact" to get started</small>
       </div>`;

  $('#favList').innerHTML = favs.length ? favs.map((c) => sideRow(c, 'success')).join('') : '<p class="text-center text-body-secondary small my-4">No favorites yet</p>';
  $('#emList').innerHTML  = ems.length  ? ems.map((c) => sideRow(c, 'danger')).join('')  : '<p class="text-center text-body-secondary small my-4">No emergency contacts</p>';
}

function cardHTML(c) {
  const badge = c.fav ? '<span class="badge-dot" style="background:#f59e0b">★</span>'
              : c.em  ? '<span class="badge-dot" style="background:#e11d48">♥</span>' : '';
  const meta = [c.group, c.email].filter(Boolean).join(' • ');
  return `
  <div class="col-md-6">
    <article class="card contact-card border-0 shadow-sm h-100">
      <div class="card-body">
        <div class="d-flex align-items-center gap-3">
          <div class="avatar"${avatarAttr(c)}>${c.photo ? '' : initial(c)}${badge}</div>
          <div class="min-w-0">
            <div class="fw-semibold text-break">${esc(c.name)}</div>
            <div class="small text-body-secondary d-flex align-items-center gap-2 mt-1">
              <span class="phone-chip"><i class="bi bi-telephone-fill"></i></span>${esc(c.phone)}
            </div>
          </div>
        </div>
        ${c.em ? '<span class="badge rounded-pill text-bg-danger-subtle text-danger-emphasis mt-3"><i class="bi bi-heart-pulse-fill"></i> Emergency</span>' : ''}
        ${meta ? `<div class="small text-body-secondary mt-2 text-break">${esc(meta)}</div>` : ''}
        <div class="card-actions d-flex align-items-center gap-1 border-top mt-3 pt-3">
          <a class="btn call" href="tel:${esc(c.phone)}" aria-label="Call ${esc(c.name)}"><i class="bi bi-telephone-fill"></i></a>
          <span class="flex-grow-1"></span>
          <button class="btn ${c.fav ? 'on-star' : ''}" data-act="fav" data-id="${c.id}" aria-label="Favorite"><i class="bi bi-star${c.fav ? '-fill' : ''}"></i></button>
          <button class="btn ${c.em ? 'on-heart' : ''}" data-act="em" data-id="${c.id}" aria-label="Emergency"><i class="bi bi-heart${c.em ? '-fill' : ''}"></i></button>
          <button class="btn" data-act="edit" data-id="${c.id}" aria-label="Edit"><i class="bi bi-pencil-fill"></i></button>
          <button class="btn del" data-act="del" data-id="${c.id}" aria-label="Delete"><i class="bi bi-trash3-fill"></i></button>
        </div>
      </div>
    </article>
  </div>`;
}

function sideRow(c, color) {
  return `
  <div class="side-row">
    <div class="avatar avatar-sm"${avatarAttr(c)}>${c.photo ? '' : initial(c)}</div>
    <div class="flex-grow-1 small fw-semibold text-truncate">${esc(c.name)}<div class="text-body-secondary fw-normal" style="font-size:.72rem">${esc(c.phone)}</div></div>
    <a href="tel:${esc(c.phone)}" class="btn btn-sm btn-${color}-subtle text-${color}" aria-label="Call ${esc(c.name)}"><i class="bi bi-telephone-fill"></i></a>
  </div>`;
}

/* ---------- Form ---------- */
function setPhotoPreview() {
  const p = $('#photoPreview');
  p.style.backgroundImage = photoData ? `url('${photoData}')` : '';
  p.classList.toggle('has-img', !!photoData);
}

function openForm(contact) {
  editingId = contact ? contact.id : null;
  photoData = contact?.photo || '';
  $('#formTitle').textContent = contact ? 'Edit Contact' : 'Add New Contact';
  $('#name').value    = contact?.name || '';
  $('#phone').value   = contact?.phone || '';
  $('#email').value   = contact?.email || '';
  $('#address').value = contact?.addr || '';
  $('#group').value   = contact?.group || '';
  $('#notes').value   = contact?.notes || '';
  $('#isFav').checked = !!contact?.fav;
  $('#isEm').checked  = !!contact?.em;
  document.querySelectorAll('#contactForm .is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  setPhotoPreview();
  formModal.show();
}

function saveContact() {
  const name = $('#name').value.trim();
  const phone = $('#phone').value.trim();
  const email = $('#email').value.trim();

  const okName = !!name, okFormat = isValidPhone(phone), okEmail = isValidEmail(email);
  const isDup = okFormat && isPhoneDuplicate(phone, editingId);
  const okPhone = okFormat && !isDup;
  $('#name').classList.toggle('is-invalid', !okName);
  setPhoneError(okPhone ? '' : isDup ? PHONE_DUPLICATE_MSG : PHONE_INVALID_MSG);
  $('#email').classList.toggle('is-invalid', !okEmail);
  if (!(okName && okPhone && okEmail)) return;

  const data = {
    name, phone, email,
    addr: $('#address').value.trim(),
    group: $('#group').value,
    notes: $('#notes').value.trim(),
    fav: $('#isFav').checked,
    em: $('#isEm').checked,
    photo: photoData,
  };

  const wasEdit = editingId !== null;
  if (wasEdit) contacts = contacts.map((c) => (c.id === editingId ? { ...c, ...data } : c));
  else contacts.unshift({ id: Date.now(), ...data });

  persist();
  render();
  formModal.hide();
  showSuccess(wasEdit ? 'Updated!' : 'Added!', `Contact has been ${wasEdit ? 'updated' : 'added'} successfully.`);
}

function showSuccess(title, text) {
  $('#successTitle').textContent = title;
  $('#successText').textContent = text;
  // wait until the form modal has finished closing before showing the next one
  setTimeout(() => { successModal.show(); setTimeout(() => successModal.hide(), 1500); }, 350);
}

/* ---------- Events ---------- */
$('#openAdd').addEventListener('click', () => openForm());
$('#saveBtn').addEventListener('click', saveContact);
$('#contactForm').addEventListener('submit', (e) => { e.preventDefault(); saveContact(); });
$('#search').addEventListener('input', render);

$('#phone').addEventListener('input', (e) => {
  const v = e.target.value;
  if (!v) return setPhoneError('');
  if (!isValidPhone(v)) return setPhoneError(PHONE_INVALID_MSG);
  setPhoneError(isPhoneDuplicate(v, editingId) ? PHONE_DUPLICATE_MSG : '');
});

$('#photoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { photoData = reader.result; setPhotoPreview(); };
  reader.readAsDataURL(file);
});

$('#contactGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const c = contacts.find((x) => x.id === id);
  if (!c) return;

  switch (btn.dataset.act) {
    case 'fav':  c.fav = !c.fav; persist(); render(); break;
    case 'em':   c.em = !c.em;   persist(); render(); break;
    case 'edit': openForm(c); break;
    case 'del':
      deletingId = id;
      $('#deleteText').textContent = `Are you sure you want to delete ${c.name}? This action cannot be undone.`;
      deleteModal.show();
      break;
  }
});

$('#confirmDelete').addEventListener('click', () => {
  contacts = contacts.filter((c) => c.id !== deletingId);
  persist();
  render();
  deleteModal.hide();
  showSuccess('Deleted!', 'Contact has been deleted successfully.');
});

$('#themeBtn').addEventListener('click', () => {
  const root = document.documentElement;
  root.setAttribute('data-bs-theme', root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
});

render();