// js/modules/auth.js
import { Data } from './data.js';
import { UI } from './ui.js';

export const Auth = (() => {
  let currentUser = null;
  const refs = {};

  const cacheDom = () => {
    refs.loginBtn = document.getElementById('loginBtn');
    refs.logoutBtn = document.getElementById('logoutBtn');
    refs.profileBtn = document.getElementById('profileBtn');
    refs.adminBtn = document.getElementById('adminBtn');
    refs.loginModal = document.getElementById('loginModal');
    refs.loginForm = document.getElementById('loginForm');
    refs.registerForm = document.getElementById('registerForm');
    refs.showRegisterLink = document.getElementById('showRegisterLink');
    refs.showLoginLink = document.getElementById('showLoginLink');
    refs.modalClose = document.getElementById('modalClose');
  };

  const init = async () => {
    cacheDom();
    bindEvents();

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
    }

    updateUI();
    emitAuthChange();
  };

  const bindEvents = () => {
    refs.loginBtn?.addEventListener('click', openLoginModal);
    refs.logoutBtn?.addEventListener('click', handleLogout);
    refs.showRegisterLink?.addEventListener('click', showRegisterForm);
    refs.showLoginLink?.addEventListener('click', showLoginForm);
    refs.loginForm?.addEventListener('submit', handleLogin);
    refs.registerForm?.addEventListener('submit', handleRegister);
    refs.modalClose?.addEventListener('click', closeLoginModal);
    refs.loginModal?.addEventListener('click', (e) => {
      if (e.target === refs.loginModal) closeLoginModal();
    });
  };

  const setCurrentUser = (user) => {
    currentUser = user;
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
    updateUI();
    emitAuthChange();
  };

  const emitAuthChange = () => {
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: currentUser }));
  };

  const openLoginModal = () => {
    UI.openModal(refs.loginModal);
  };

  const closeLoginModal = () => {
    UI.closeModal(refs.loginModal);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const login = document.getElementById('login')?.value.trim();
    const password = document.getElementById('password')?.value.trim();

    if (!login || !password) {
      UI.showNotification('Заполните все поля');
      return;
    }

    const user = await Data.findUser(login, password);

    if (user) {
      setCurrentUser(user);
      closeLoginModal();
      UI.showNotification('Вход выполнен');
    } else {
      UI.showNotification('Неверный логин или пароль');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName')?.value.trim();
    const login = document.getElementById('regLogin')?.value.trim();
    const password = document.getElementById('regPassword')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();

    if (![name, login, password, phone].every(Boolean)) {
      UI.showNotification('Заполните все поля');
      return;
    }

    if (password.length < 6) {
      UI.showNotification('Пароль должен быть не менее 6 символов');
      return;
    }

    const users = await Data.getUsers();
    const exists = users.some((u) => u.login === login);
    if (exists) {
      UI.showNotification('Пользователь с таким логином уже существует');
      return;
    }

    const newUser = {
      login,
      password,
      role: 'client',
      name,
      email: login,
      phone
    };

    const result = await Data.addUser(newUser);

    if (result) {
      UI.showNotification('Регистрация успешна! Войдите в систему');
      showLoginForm({ preventDefault: () => {} });
    } else {
      UI.showNotification('Ошибка регистрации. Убедитесь, что json-server запущен.');
    }
  };

  const showRegisterForm = (e) => {
    e.preventDefault();
    if (refs.loginForm && refs.registerForm) {
      refs.loginForm.style.display = 'none';
      refs.registerForm.style.display = 'block';
    }
  };

  const showLoginForm = (e) => {
    e.preventDefault();
    if (refs.loginForm && refs.registerForm) {
      refs.registerForm.style.display = 'none';
      refs.loginForm.style.display = 'block';
    }
  };

  const updateUI = () => {
    if (currentUser) {
      if (refs.loginBtn) refs.loginBtn.style.display = 'none';
      if (refs.logoutBtn) refs.logoutBtn.style.display = 'block';
      if (refs.profileBtn) refs.profileBtn.style.display = 'block';
      if (refs.adminBtn) {
        refs.adminBtn.style.display = currentUser.role === 'admin' ? 'block' : 'none';
      }
    } else {
      if (refs.loginBtn) refs.loginBtn.style.display = 'block';
      if (refs.logoutBtn) refs.logoutBtn.style.display = 'none';
      if (refs.profileBtn) refs.profileBtn.style.display = 'none';
      if (refs.adminBtn) refs.adminBtn.style.display = 'none';
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    UI.showNotification('Вы вышли из системы');
  };

  return {
    init,
    openLoginModal,
    closeLoginModal,
    get currentUser() {
      return currentUser;
    },
    set currentUser(user) {
      setCurrentUser(user);
    }
  };
})();