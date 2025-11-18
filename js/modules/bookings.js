// js/modules/bookings.js
import { Data } from './data.js';
import { Auth } from './auth.js';
import { UI } from './ui.js';

export const Bookings = (() => {
  let allSchedules = [];
  let allSubscriptions = [];

  // Инициализация
  const init = async () => {
    allSchedules = await Data.getSchedules();
    allSubscriptions = await Data.getSubscriptionsByClientId(Auth.currentUser.id);
    setupBookingButtons();
  };

  // Настройка кнопок записи
  const setupBookingButtons = () => {
    const buttons = document.querySelectorAll('.book-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const scheduleId = btn.dataset.scheduleId;

        if (!Auth.currentUser) {
          UI.showNotification('Сначала войдите в систему');
          Auth.openLoginModal();
          return;
        }

        // Проверяем, есть ли активный абонемент
        const activeSub = allSubscriptions.find(sub => sub.sessions_left > 0);
        if (!activeSub) {
          UI.showNotification('У вас нет активного абонемента');
          window.location.href = 'profile.html#subscriptions';
          return;
        }

        // Проверяем, записан ли уже
        const existingBooking = await Data.getBookingByScheduleAndClient(scheduleId, Auth.currentUser.id);
        if (existingBooking) {
          UI.showNotification('Вы уже записаны на это занятие');
          return;
        }

        // Проверяем, есть ли места
        const schedule = allSchedules.find(s => String(s.id) === String(scheduleId));
        const bookings = await Data.getBookingsByScheduleId(scheduleId);
        if (bookings.length >= schedule.max_participants) {
          UI.showNotification('Нет свободных мест');
          return;
        }

        // Подтверждение
        if (!confirm('Вы уверены, что хотите записаться на это занятие?')) {
          return;
        }

        // Создаём запись
        const bookingData = {
          id_client: Auth.currentUser.id,
          id_schedule: Number(scheduleId),
          id_subscription: activeSub.id,
          status: 'Confirmed',
          booking_date: new Date().toISOString()
        };

        const result = await Data.addBooking(bookingData);

        if (result) {
          // Обновляем абонемент
          const updatedSub = { ...activeSub, sessions_left: activeSub.sessions_left - 1 };
          await Data.updateSubscription(activeSub.id, updatedSub);

          UI.showNotification('Вы успешно записаны!');
          btn.textContent = 'Отменить запись';
          btn.onclick = () => cancelBooking(scheduleId, result.id);
          updateProfileBookings(); // Обновляем данные в профиле
        } else {
          UI.showNotification('Ошибка записи');
        }
      });
    });
  };

  // Отмена записи
  const cancelBooking = async (scheduleId, bookingId) => {
    if (!confirm('Вы уверены, что хотите отменить запись?')) {
      return;
    }

    const success = await Data.deleteBooking(bookingId);

    if (success) {
      // Возвращаем занятие на абонемент
      const booking = await Data.getBookingById(bookingId);
      if (booking.id_subscription) {
        const sub = await Data.getSubscriptionById(booking.id_subscription);
        const updatedSub = { ...sub, sessions_left: sub.sessions_left + 1 };
        await Data.updateSubscription(sub.id, updatedSub);
      }

      UI.showNotification('Запись отменена');
      location.reload(); // Обновляем страницу
    } else {
      UI.showNotification('Не удалось отменить запись');
    }
  };

  // Обновить отображение записей в профиле
  const updateProfileBookings = async () => {
    const profileBookingsList = document.getElementById('profileBookingsList');
    if (!profileBookingsList) return;

    const bookings = await Data.getBookingsByClientId(Auth.currentUser.id);
    const schedules = await Data.getSchedules();

    let html = '<table><thead><tr><th>Дата</th><th>Занятие</th><th>Тренер</th><th>Статус</th></tr></thead><tbody>';

    for (const booking of bookings) {
      const schedule = schedules.find(s => String(s.id) === String(booking.id_schedule));
      if (!schedule) continue;

      const date = new Date(schedule.date_time).toLocaleString('ru-RU');
      const trainer = await Data.getTrainerById(schedule.id_trainer);

      html += `
        <tr>
          <td>${date}</td>
          <td>${schedule.title}</td>
          <td>${trainer?.name || 'Неизвестный'}</td>
          <td>${booking.status}</td>
        </tr>
      `;
    }

    html += '</tbody></table>';
    profileBookingsList.innerHTML = html;
  };

  return { init, cancelBooking, updateProfileBookings };
})();