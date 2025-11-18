// js/modules/trainer.js
import { Data } from './data.js';
import { Auth } from './auth.js';
import { UI } from './ui.js';

export const Trainer = (() => {
  // Загрузить расписание тренера
  const loadTrainerSchedule = async () => {
    if (!Auth.currentUser || Auth.currentUser.role !== 'trainer') return;

    const scheduleList = document.getElementById('trainerScheduleList');
    if (!scheduleList) return;

    const schedules = await Data.getSchedulesByTrainerId(Auth.currentUser.id);

    scheduleList.innerHTML = '';

    for (const schedule of schedules) {
      const bookings = await Data.getBookingsByScheduleId(schedule.id);
      const bookedCount = bookings.length;

      const card = document.createElement('div');
      card.className = 'schedule-item';
      card.innerHTML = `
        <div>
          <h4>${schedule.title}</h4>
          <p>${new Date(schedule.date_time).toLocaleString('ru-RU')}</p>
          <p>Уровень: ${schedule.level}</p>
          <p>Записано: ${bookedCount}/${schedule.max_participants}</p>
        </div>
        <div>
          <button class="btn-secondary view-bookings-btn" data-schedule-id="${schedule.id}">
            Просмотреть записи
          </button>
          <button class="btn-danger delete-schedule-btn" data-schedule-id="${schedule.id}">
            Удалить
          </button>
        </div>
      `;
      scheduleList.appendChild(card);
    }

    // Обработчики
    document.querySelectorAll('.view-bookings-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scheduleId = e.target.dataset.scheduleId;
        viewBookingsForSchedule(scheduleId);
      });
    });

    document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const scheduleId = e.target.dataset.scheduleId;
        if (confirm('Удалить это занятие?')) {
          const success = await Data.deleteSchedule(scheduleId);
          if (success) {
            UI.showNotification('Занятие удалено');
            loadTrainerSchedule();
          } else {
            UI.showNotification('Ошибка удаления');
          }
        }
      });
    });
  };

  // Просмотр записавшихся
  const viewBookingsForSchedule = async (scheduleId) => {
    const bookings = await Data.getBookingsByScheduleId(scheduleId);
    const clients = await Data.getClients();

    const clientNames = bookings.map(b => {
      const client = clients.find(c => c.id === b.id_client);
      return client ? client.name : 'Неизвестный';
    });

    alert('Записавшиеся клиенты:\n' + clientNames.join('\n'));
  };

  // Добавить занятие
  const addSchedule = async (scheduleData) => {
    if (!Auth.currentUser || Auth.currentUser.role !== 'trainer') return;

    const result = await Data.addSchedule({
      ...scheduleData,
      id_trainer: Auth.currentUser.id
    });

    if (result) {
      UI.showNotification('Занятие добавлено');
      loadTrainerSchedule();
    } else {
      UI.showNotification('Ошибка добавления');
    }
  };

  return { loadTrainerSchedule, addSchedule };
})();