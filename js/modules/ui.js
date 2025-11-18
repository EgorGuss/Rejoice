// js/modules/ui.js

const resolveModal = (modal) =>
  typeof modal === 'string' ? document.getElementById(modal) : modal;

const transitionDuration = 300;

export const UI = {
  showNotification: (message) => {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
  },

  openModal: (modal) => {
    const overlay = resolveModal(modal);
    if (!overlay) return;
    const content = overlay.querySelector('.modal');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      overlay.classList.add('show');
      content?.classList.remove('closing');
      content?.classList.add('open');
    });
  },

  closeModal: (modal) => {
    const overlay = resolveModal(modal);
    if (!overlay) return;
    const content = overlay.querySelector('.modal');
    content?.classList.remove('open');
    content?.classList.add('closing');
    overlay.classList.remove('show');
    setTimeout(() => {
      content?.classList.remove('closing');
      overlay.style.display = 'none';
    }, transitionDuration);
  }
};