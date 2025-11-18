// js/modules/admin.js
import { Data } from './data.js';
import { UI } from './ui.js';
import { Auth } from './auth.js';

export const Admin = (() => {
  let trainers = [];
  let clients = [];
  let editingScheduleId = null;
  let editingSubscriptionTypeId = null;

  const init = async () => {
    if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
      alert('Доступ разрешён только администраторам');
      window.location.href = 'index.html';
      return;
    }

    [trainers, clients] = await Promise.all([Data.getTrainers(), Data.getClients()]);
    setupTabs();
    setupScheduleModal();
    setupSubscriptionTypeModal();
    setupNotificationForm();

    await Promise.all([
      loadSchedule(),
      loadSubscriptionTypes(),
      loadReports(),
      loadFeedbacks(),
      loadNotificationsHistory()
    ]);
  };

  const setupTabs = () => {
    const tabButtons = document.querySelectorAll('[data-tab]');
    const sections = document.querySelectorAll('.admin-section');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach((item) => item.classList.remove('btn'));
        tabButtons.forEach((item) => item.classList.add('btn-secondary'));
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn');

        sections.forEach((section) => {
          section.style.display = section.id === `${btn.dataset.tab}Section` ? 'block' : 'none';
        });
      });
    });
  };

  const setupScheduleModal = () => {
    const openBtn = document.getElementById('addScheduleBtn');
    const modal = document.getElementById('scheduleModal');
    const closeBtn = document.getElementById('scheduleModalClose');
    const cancelBtn = document.getElementById('cancelScheduleBtn');
    const form = document.getElementById('scheduleForm');

    openBtn?.addEventListener('click', () => {
      editingScheduleId = null;
      form?.reset();
      fillTrainerSelect();
      document.getElementById('scheduleModalTitle').textContent = 'Добавить занятие';
      UI.openModal(modal);
    });

    const closeModal = () => UI.closeModal(modal);

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = collectScheduleForm();
      const handler = editingScheduleId
        ? Data.updateSchedule(editingScheduleId, payload)
        : Data.addSchedule(payload);

      const result = await handler;
      if (result) {
        UI.showNotification(editingScheduleId ? 'Занятие обновлено' : 'Занятие добавлено');
        closeModal();
        await loadSchedule();
      } else {
        UI.showNotification('Ошибка сохранения занятия');
      }
    });
  };

  const collectScheduleForm = () => {
    return {
      title: document.getElementById('scheduleTitle').value.trim(),
      date_time: document.getElementById('scheduleDateTime').value,
      duration: Number(document.getElementById('scheduleDuration').value),
      level: document.getElementById('scheduleLevel').value,
      max_participants: Number(document.getElementById('scheduleMaxParticipants').value),
      id_trainer: Number(document.getElementById('scheduleTrainer').value),
      status: document.getElementById('scheduleStatus').value
    };
  };

  const fillTrainerSelect = () => {
    const select = document.getElementById('scheduleTrainer');
    if (!select) return;
    select.innerHTML = '';
    trainers.forEach((trainer) => {
      const option = document.createElement('option');
      option.value = trainer.id;
      option.textContent = trainer.name || `Тренер #${trainer.id}`;
      select.appendChild(option);
    });
  };

  const loadSchedule = async () => {
    const container = document.getElementById('adminScheduleList') || document.getElementById('scheduleList');
    if (!container) return;

    const schedules = await Data.getSchedules();
    if (!schedules.length) {
      container.innerHTML = '<p>Занятий пока нет</p>';
      return;
    }

    const rows = schedules
      .map((schedule) => {
        const trainer = trainers.find((t) => Number(t.id) === Number(schedule.id_trainer));
        return `
          <tr>
            <td>${new Date(schedule.date_time).toLocaleString('ru-RU')}</td>
            <td>${schedule.title}</td>
            <td>${trainer?.name || '—'}</td>
            <td>${schedule.level}</td>
            <td>${schedule.status}</td>
            <td>
              <button class="btn-secondary" data-action="edit" data-id="${schedule.id}">Редактировать</button>
              <button class="btn-danger" data-action="delete" data-id="${schedule.id}">Удалить</button>
            </td>
          </tr>
        `;
      })
      .join('');

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Дата и время</th>
            <th>Название</th>
            <th>Тренер</th>
            <th>Уровень</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    container.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => openScheduleForEdit(btn.dataset.id, schedules));
    });

    container.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', () => deleteSchedule(btn.dataset.id));
    });
  };

  const openScheduleForEdit = (id, schedules) => {
    const schedule = schedules.find((item) => String(item.id) === String(id));
    if (!schedule) return;

    editingScheduleId = schedule.id;
    fillTrainerSelect();

    document.getElementById('scheduleTitle').value = schedule.title;
    document.getElementById('scheduleDateTime').value = schedule.date_time.slice(0, 16);
    document.getElementById('scheduleDuration').value = schedule.duration;
    document.getElementById('scheduleLevel').value = schedule.level;
    document.getElementById('scheduleMaxParticipants').value = schedule.max_participants;
    document.getElementById('scheduleTrainer').value = schedule.id_trainer;
    document.getElementById('scheduleStatus').value = schedule.status;
    document.getElementById('scheduleModalTitle').textContent = 'Редактировать занятие';

    UI.openModal('scheduleModal');
  };

  const deleteSchedule = async (id) => {
    if (!confirm('Удалить занятие?')) return;
    const success = await Data.deleteSchedule(id);
    if (success) {
      UI.showNotification('Занятие удалено');
      await loadSchedule();
    } else {
      UI.showNotification('Не удалось удалить занятие');
    }
  };

  const setupSubscriptionTypeModal = () => {
    const openBtn = document.getElementById('addSubscriptionTypeBtn');
    const modal = document.getElementById('subscriptionTypeModal');
    const closeBtn = document.getElementById('subscriptionTypeModalClose');
    const cancelBtn = document.getElementById('cancelSubscriptionTypeBtn');
    const form = document.getElementById('subscriptionTypeForm');

    openBtn?.addEventListener('click', () => {
      editingSubscriptionTypeId = null;
      form?.reset();
      UI.openModal(modal);
    });

    const closeModal = () => UI.closeModal(modal);

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('subscriptionTypeName').value.trim(),
        sessions: document.getElementById('subscriptionTypeSessions').value
          ? Number(document.getElementById('subscriptionTypeSessions').value)
          : null,
        price: Number(document.getElementById('subscriptionTypePrice').value)
      };

      const handler = editingSubscriptionTypeId
        ? Data.updateSubscriptionType(editingSubscriptionTypeId, payload)
        : Data.addSubscriptionType(payload);

      const result = await handler;
      if (result) {
        UI.showNotification(editingSubscriptionTypeId ? 'Тип обновлён' : 'Тип абонемента добавлен');
        closeModal();
        await loadSubscriptionTypes();
      } else {
        UI.showNotification('Не удалось сохранить тип абонемента');
      }
    });
  };

  const loadSubscriptionTypes = async () => {
    const container = document.getElementById('subscriptionTypesList') || document.getElementById('adminSubscriptionTypesList');
    if (!container) return;

    const types = await Data.getSubscriptionTypes();
    if (!types.length) {
      container.innerHTML = '<p>Типы абонементов не заданы</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Кол-во занятий</th>
            <th>Цена</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          ${types
            .map(
              (type) => `
              <tr>
                <td>${type.name}</td>
                <td>${type.sessions ?? '∞'}</td>
                <td>${type.price} ₽</td>
                <td>
                  <button class="btn-secondary" data-type-action="edit" data-id="${type.id}">Редактировать</button>
                  <button class="btn-danger" data-type-action="delete" data-id="${type.id}">Удалить</button>
                </td>
              </tr>
            `
            )
            .join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('[data-type-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => openSubscriptionTypeForEdit(btn.dataset.id, types));
    });

    container.querySelectorAll('[data-type-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', () => deleteSubscriptionType(btn.dataset.id));
    });
  };

  const openSubscriptionTypeForEdit = (id, types) => {
    const modal = document.getElementById('subscriptionTypeModal');
    const type = types.find((item) => String(item.id) === String(id));
    if (!type) return;

    editingSubscriptionTypeId = type.id;
    document.getElementById('subscriptionTypeName').value = type.name;
    document.getElementById('subscriptionTypeSessions').value = type.sessions ?? '';
    document.getElementById('subscriptionTypePrice').value = type.price;

    UI.openModal(modal);
  };

  const deleteSubscriptionType = async (id) => {
    if (!confirm('Удалить тип абонемента?')) return;
    const success = await Data.deleteSubscriptionType(id);
    if (success) {
      UI.showNotification('Тип абонемента удалён');
      await loadSubscriptionTypes();
    } else {
      UI.showNotification('Не удалось удалить тип абонемента');
    }
  };

  const loadReports = async () => {
    const container = document.getElementById('reportsContent') || document.getElementById('adminReportsList');
    if (!container) return;

    const [allBookings, allSchedules, subscriptions] = await Promise.all([
      Data.getBookings(),
      Data.getSchedules(),
      Data.getSubscriptions()
    ]);

    const attendance = calculateAttendance(allBookings, allSchedules);
    const revenue = calculateRevenue(subscriptions);
    const popularTrainers = calculatePopularTrainers(allBookings, allSchedules);

    container.innerHTML = `
      <div class="report-card">
        <h4>Посещаемость (по дням)</h4>
        ${renderKeyValue(attendance)}
      </div>
      <div class="report-card">
        <h4>Выручка по абонементам</h4>
        ${renderKeyValue(revenue, '₽')}
      </div>
      <div class="report-card">
        <h4>Популярные тренеры</h4>
        ${renderKeyValue(popularTrainers)}
      </div>
    `;
  };

  const calculateAttendance = (bookings, schedules) => {
    const map = {};
    bookings.forEach((booking) => {
      const schedule = schedules.find((s) => Number(s.id) === Number(booking.id_schedule));
      if (!schedule) return;
      const key = new Date(schedule.date_time).toLocaleDateString('ru-RU');
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  };

  const calculateRevenue = (subs) => {
    const map = {};
    subs.forEach((sub) => {
      const key = sub.type || sub.name || 'Без названия';
      map[key] = (map[key] || 0) + (sub.price || 0);
    });
    return map;
  };

  const calculatePopularTrainers = (bookings, schedules) => {
    const map = {};
    bookings.forEach((booking) => {
      const schedule = schedules.find((s) => Number(s.id) === Number(booking.id_schedule));
      if (!schedule) return;
      const trainer = trainers.find((t) => Number(t.id) === Number(schedule.id_trainer));
      const key = trainer?.name || `Тренер #${schedule.id_trainer}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  };

  const renderKeyValue = (data, suffix = '') => {
    if (!Object.keys(data).length) {
      return '<p>Недостаточно данных</p>';
    }
    return `
      <ul class="report-list">
        ${Object.entries(data)
          .map(([key, value]) => `<li><strong>${key}:</strong> ${value} ${suffix}</li>`)
          .join('')}
      </ul>
    `;
  };

  const loadFeedbacks = async () => {
    const container = document.getElementById('feedbackList') || document.getElementById('adminFeedbackList');
    if (!container) return;

    const feedbacks = await Data.getFeedbacks();
    if (!feedbacks.length) {
      container.innerHTML = '<p>Заявок нет</p>';
      return;
    }

    const rows = feedbacks
      .map((feedback) => {
        const client = clients.find((c) => Number(c.id) === Number(feedback.id_client));
        return `
          <tr>
            <td>${client?.name || 'Неизвестный клиент'}</td>
            <td>${feedback.subject}</td>
            <td>${feedback.message}</td>
            <td>${new Date(feedback.date_sent).toLocaleString('ru-RU')}</td>
            <td>${feedback.status}</td>
          </tr>
        `;
      })
      .join('');

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Клиент</th>
            <th>Тема</th>
            <th>Сообщение</th>
            <th>Дата</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  };

  const setupNotificationForm = () => {
    const form = document.getElementById('notificationForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('notificationTitle').value.trim();
      const message = document.getElementById('notificationMessage').value.trim();
      const audience = document.getElementById('notificationAudience').value;

      if (!title || !message) {
        UI.showNotification('Заполните заголовок и текст уведомления');
        return;
      }

      let recipients = [];
      if (audience === 'clients') {
        recipients = clients;
      } else if (audience === 'trainers') {
        recipients = trainers;
      } else {
        const users = await Data.getUsers();
        recipients = users.filter((user) => user.role !== 'admin');
      }

      await Promise.all(
        recipients.map((recipient) =>
          Data.addNotification({
            recipient_id: recipient.id,
            title,
            message,
            date_sent: new Date().toISOString(),
            read: false
          })
        )
      );

      UI.showNotification('Уведомление отправлено');
      form.reset();
      await loadNotificationsHistory();
    });
  };

  const loadNotificationsHistory = async () => {
    const container = document.getElementById('notificationsHistory');
    if (!container) return;

    const notifications = await Data.getNotifications();
    if (!notifications.length) {
      container.innerHTML = '<p>Уведомлений пока нет</p>';
      return;
    }

    const lastNotifications = notifications
      .sort((a, b) => new Date(b.date_sent) - new Date(a.date_sent))
      .slice(0, 10)
      .map((item) => {
        const recipient =
          [...clients, ...trainers].find((user) => Number(user.id) === Number(item.recipient_id)) ||
          null;
        return `
          <div class="notification-history-item">
            <p><strong>${item.title || 'Без названия'}</strong> — ${item.message}</p>
            <p style="font-size:13px;color:#666;">Получатель: ${recipient?.name || 'Пользователь #' + item.recipient_id}</p>
            <p style="font-size:12px;color:#999;">${new Date(item.date_sent).toLocaleString('ru-RU')}</p>
          </div>
        `;
      })
      .join('');

    container.innerHTML = lastNotifications;
  };

  return {
    init,
    loadSchedule,
    loadSubscriptionTypes,
    loadReports,
    loadFeedbacks
  };
})();