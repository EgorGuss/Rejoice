// js/modules/trainer-profile.js
import { Data } from './data.js';
import { Auth } from './auth.js';
import { UI } from './ui.js';

export const TrainerProfile = (() => {
  const loadProfile = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const trainerId = urlParams.get('id');

    if (!trainerId) {
      document.getElementById('trainerProfile').innerHTML = '<p>Тренер не найден</p>';
      return;
    }

    try {
      const trainer = await Data.getTrainerById(trainerId);
      const scheduleList = await Data.getSchedulesByTrainerId(trainerId);

      if (!trainer) {
        document.getElementById('trainerProfile').innerHTML = '<p>Тренер не найден</p>';
        return;
      }

      const profileDiv = document.getElementById('trainerProfile');
      profileDiv.innerHTML = `
        <div class="card" style="padding:30px;">
          <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:start;">
            <div style="flex-shrink:0;">
              <div style="width:200px;height:200px;background:#f5f5f5;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:80px;color:#888;margin-bottom:20px;">
                ${trainer.name ? trainer.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'T'}
              </div>
            </div>
            <div style="flex:1;min-width:300px;">
              <h2 style="margin:0 0 15px 0;">${trainer.name}</h2>
              ${trainer.specialization ? `<p><strong>Специализация:</strong> ${trainer.specialization}</p>` : ''}
              ${trainer.experience ? `<p><strong>Опыт:</strong> ${trainer.experience} лет</p>` : ''}
              ${trainer.rating ? `<p><strong>Рейтинг:</strong> ${'★'.repeat(Math.floor(trainer.rating))}${'☆'.repeat(5 - Math.floor(trainer.rating))} (${trainer.rating})</p>` : ''}
              ${trainer.bio ? `<p><strong>О себе:</strong> ${trainer.bio}</p>` : ''}
            </div>
          </div>
        </div>
      `;

      // Показать блок управления, если это текущий тренер
      if (Auth.currentUser && Auth.currentUser.role === 'trainer' && String(Auth.currentUser.id) === String(trainerId)) {
        document.getElementById('trainerControls').style.display = 'block';
        loadTrainerSchedule(trainerId);
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля тренера:', error);
      document.getElementById('trainerProfile').innerHTML = '<p>Ошибка загрузки профиля тренера</p>';
    }
  };

  // Загрузить расписание тренера
  const loadTrainerSchedule = async (trainerId) => {
    const scheduleList = document.getElementById('trainerScheduleList');
    if (!scheduleList) return;

    try {
      const schedules = await Data.getSchedulesByTrainerId(trainerId);
      const clients = await Data.getClients();

      if (schedules.length === 0) {
        scheduleList.innerHTML = '<p>У вас нет запланированных занятий</p>';
        return;
      }

      let html = '<table style="width:100%;border-collapse:collapse;margin-top:20px;">';
      html += '<thead><tr><th>Дата и время</th><th>Название</th><th>Уровень</th><th>Записано</th><th>Список клиентов</th><th>Действия</th></tr></thead><tbody>';

      for (const s of schedules) {
        const date = new Date(s.date_time).toLocaleString('ru-RU');
        const bookings = await Data.getBookingsByScheduleId(s.id);
        const clientsList = bookings.length
          ? `<ul style="margin:0;padding-left:20px;">${bookings
              .map((booking) => {
                const client = clients.find((c) => Number(c.id) === Number(booking.id_client));
                return `<li>${client?.name || 'Клиент'} (${booking.status})</li>`;
              })
              .join('')}</ul>`
          : '<span style="color:#888;">Пока нет записей</span>';

        html += `
          <tr>
            <td>${date}</td>
            <td>${s.title}</td>
            <td>${s.level}</td>
            <td>${bookings.length}/${s.max_participants}</td>
            <td>${clientsList}</td>
            <td>
              <button class="btn-secondary" onclick="editSchedule(${s.id})">Изменить</button>
              <button class="btn-danger" onclick="deleteSchedule(${s.id})">Удалить</button>
            </td>
          </tr>
        `;
      }

      html += '</tbody></table>';
      scheduleList.innerHTML = html;
    } catch (error) {
      console.error('Ошибка загрузки расписания тренера:', error);
      scheduleList.innerHTML = '<p>Ошибка загрузки расписания</p>';
    }
  };

  // Настроить элементы управления
  const setupControls = () => {
    const addBtn = document.getElementById('addScheduleBtn');
    const modal = document.getElementById('addScheduleModal');
    const closeBtn = document.getElementById('closeAddScheduleModal');
    const form = document.getElementById('addScheduleForm');

    addBtn?.addEventListener('click', () => {
      UI.openModal(modal);
    });

    closeBtn?.addEventListener('click', () => {
      UI.closeModal(modal);
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newSchedule = {
        date_time: document.getElementById('scheduleDateTime').value,
        duration: parseInt(document.getElementById('scheduleDuration').value),
        level: document.getElementById('scheduleLevel').value,
        max_participants: parseInt(document.getElementById('scheduleMaxParticipants').value),
        status: document.getElementById('scheduleStatus').value,
        id_trainer: Auth.currentUser.id,
        title: document.getElementById('scheduleTitle').value
      };

      const result = await Data.addSchedule(newSchedule);

      if (result) {
        UI.showNotification('Занятие добавлено');
        UI.closeModal(modal);
        form.reset();
        if (window.location.pathname.includes('trainer-profile.html')) {
          const urlParams = new URLSearchParams(window.location.search);
          const trainerId = urlParams.get('id');
          loadTrainerSchedule(trainerId);
        }
      } else {
        UI.showNotification('Ошибка добавления занятия');
      }
    });
  };

  // Глобальные функции
  window.editSchedule = (id) => {
    UI.showNotification('Функция редактирования пока не реализована');
  };

  window.deleteSchedule = async (id) => {
    if (!confirm('Удалить занятие?')) return;

    const success = await Data.deleteSchedule(id);

    if (success) {
      UI.showNotification('Занятие удалено');
      if (window.location.pathname.includes('trainer-profile.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const trainerId = urlParams.get('id');
        loadTrainerSchedule(trainerId);
      }
    } else {
      UI.showNotification('Ошибка удаления');
    }
  };

  return { loadProfile, setupControls };
})();