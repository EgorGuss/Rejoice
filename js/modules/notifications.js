// js/modules/notifications.js
import { Data } from './data.js';
import { Auth } from './auth.js';

export const Notifications = (() => {
  let notifications = [];

  const init = async () => {
    if (!Auth.currentUser) return;
    await fetchNotifications();
    renderIcon();
  };

  const fetchNotifications = async () => {
    if (!Auth.currentUser) return;
    notifications = (await Data.getNotificationsByUserId(Auth.currentUser.id)) || [];
  };

  const renderIcon = () => {
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu) return;

    let icon = document.getElementById('notificationIcon');
    if (!icon) {
      icon = document.createElement('div');
      icon.id = 'notificationIcon';
      icon.style.cssText = 'position:relative;cursor:pointer;font-size:22px;display:flex;align-items:center;';
      icon.textContent = '🔔';
      userMenu.insertBefore(icon, userMenu.firstChild);
    }

    updateBadge();

    icon.onclick = (e) => {
      e.stopPropagation();
      toggleDropdown();
    };

    document.addEventListener('click', (e) => {
      if (!icon.contains(e.target)) {
        closeDropdown();
      }
    });
  };

  const updateBadge = () => {
    const icon = document.getElementById('notificationIcon');
    if (!icon) return;

    icon.querySelector('.notification-badge')?.remove();

    const unread = notifications.filter((n) => !n.read).length;
    if (unread > 0) {
      const badge = document.createElement('span');
      badge.className = 'notification-badge';
      badge.style.cssText =
        'position:absolute;top:-6px;right:-6px;background:var(--accent-dark);color:#fff;border-radius:50%;width:20px;height:20px;font-size:12px;display:flex;align-items:center;justify-content:center;font-weight:bold;';
      badge.textContent = unread > 9 ? '9+' : unread;
      icon.appendChild(badge);
    }
  };

  const toggleDropdown = () => {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    } else {
      createDropdown();
    }
  };

  const createDropdown = () => {
    const icon = document.getElementById('notificationIcon');
    if (!icon) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'notificationDropdown';
    dropdown.style.cssText =
      'position:absolute;top:130%;right:0;width:320px;background:#fff;border:1px solid var(--gray);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.15);z-index:1000;max-height:400px;overflow:auto;';
    dropdown.innerHTML = renderDropdownItems();
    icon.appendChild(dropdown);
  };

  const renderDropdownItems = () => {
    if (!notifications.length) {
      return '<div style="padding:20px;text-align:center;color:#666;">Нет уведомлений</div>';
    }

    return (
      notifications
        .slice(0, 5)
        .map((notification) => {
          const date = new Date(notification.date_sent || notification.date || Date.now()).toLocaleString('ru-RU');
          return `
            <div class="notification-item" data-id="${notification.id}" style="padding:15px;border-bottom:1px solid #f0f0f0;${notification.read ? '' : 'background:#f9fbff;'};cursor:pointer;">
              <div style="font-weight:600;margin-bottom:5px;">${notification.title || 'Уведомление'}</div>
              <div style="font-size:14px;color:#555;">${notification.message}</div>
              <div style="font-size:12px;color:#999;margin-top:8px;">${date}</div>
            </div>
          `;
        })
        .join('') +
      '<div style="padding:10px;text-align:center;"><a href="profile.html#notifications" style="color:var(--accent);text-decoration:none;">Все уведомления</a></div>'
    );
  };

  const closeDropdown = () => {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  };

  const markAsRead = async (notificationId) => {
    await Data.markNotificationAsRead(notificationId, true);
    notifications = notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
    updateBadge();
  };

  const addNotification = async (title, message, recipientId) => {
    if (!recipientId) return null;

    const payload = {
      recipient_id: recipientId,
      title,
      message,
      date_sent: new Date().toISOString(),
      read: false
    };

    const result = await Data.addNotification(payload);
    if (result && Auth.currentUser && Number(result.recipient_id) === Number(Auth.currentUser.id)) {
      notifications.unshift(result);
      updateBadge();
    }

    return result;
  };

  const getAllNotifications = () => notifications;

  document.addEventListener('click', (e) => {
    const item = e.target.closest?.('.notification-item');
    if (!item) return;
    const id = Number(item.dataset.id);
    markAsRead(id);
    item.style.background = '#fff';
  });

  return { init, addNotification, getAllNotifications };
})();

