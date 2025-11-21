// js/modules/trainer.js
import { Data } from './data.js';
import { Auth } from './auth.js';
import { UI } from './ui.js';

export const Trainer = (() => {
  let schedules = [];
  let bookings = [];
  let clients = [];

  // Инициализация для тренера
  const init = async () => {
    if (!Auth.currentUser || Auth.currentUser.role !== 'trainer') {
      console.error('Доступ запрещён: только тренер');
      return;
    }

    await refreshData();
    setupTrainerDashboard();
  };

  const refreshData = async () => {
    const [sched, books, cli] = await Promise.all([
      Data.getSchedulesByTrainerId(Auth.currentUser.id),
      Data.getBookings(),
      Data.getClients()
    ]);
    schedules = sched;
    bookings = books;
    clients = cli;
  };

  const setupTrainerDashboard = () => {
    const container = document.getElementById('trainerDashboard'); // Предполагаем, что есть такой div
    if (!container) return;

    container.innerHTML = `
      <h2>Панель тренера</h2>
      <div>
        <button id="addScheduleBtn" class="btn">Добавить занятие</button>
      </div>
      <div id="trainerScheduleList"></div>
    `;

    document.getElementById('addScheduleBtn').addEventListener('click', openAddScheduleModal);

    renderTrainerSchedules();
  };

  const renderTrainerSchedules = async () => {
    const list = document.getElementById('trainerScheduleList');
    if (!list) return;

    await refreshData();

    list.innerHTML = '';

    if (schedules.length === 0) {
      list.innerHTML = '<p>У вас нет запланированных занятий</p>';
      return;
    }

    schedules.forEach(schedule => {
      const bookedCount = bookings.filter(b => b.id_schedule === schedule.id && b.status !== 'Cancelled').length;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${schedule.title}</h3>
        <p>${new Date(schedule.date_time).toLocaleString('ru-RU')}</p>
        <p>Уровень: ${schedule.level}</p>
        <p>Записано: ${bookedCount}/${schedule.max_participants}</p>
        <div>
          <button class="btn-secondary view-bookings-btn" data-id="${schedule.id}">Просмотреть записи</button>
          <button class="btn-secondary edit-schedule-btn" data-id="${schedule.id}">Редактировать</button>
          <button class="btn-danger delete-schedule-btn" data-id="${schedule.id}">Удалить</button>
        </div>
      `;
      list.appendChild(card);
    });

    // Обработчики
    document.querySelectorAll('.view-bookings-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        viewBookingsForSchedule(id);
      });
    });

    document.querySelectorAll('.edit-schedule-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        openEditScheduleModal(id);
      });
    });

    document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('Удалить это занятие?')) {
          const success = await Data.deleteSchedule(id);
          if (success) {
            UI.showNotification('Занятие удалено');
            renderTrainerSchedules();
          } else {
            UI.showNotification('Ошибка удаления');
          }
        }
      });
    });
  };

  const viewBookingsForSchedule = async (scheduleId) => {
    const scheduleBookings = bookings.filter(b => b.id_schedule === Number(scheduleId));
    if (scheduleBookings.length === 0) {
      alert('На это занятие пока никто не записался.');
      return;
    }

    const clientNames = scheduleBookings.map(b => {
      const client = clients.find(c => c.id === b.id_client);
      return client ? `${client.name} (${b.status})` : `ID: ${b.id_client} (${b.status})`;
    }).join('\n');

    const actionsHtml = scheduleBookings.map(b => `
      <div style="margin:10px 0;">
        <span>${getClientName(b.id_client)}</span>
        <select class="attendance-status" data-booking-id="${b.id}">
          <option value="Confirmed" ${b.status === 'Confirmed' ? 'selected' : ''}>Посещено</option>
          <option value="Absent" ${b.status === 'Absent' ? 'selected' : ''}>Не явился</option>
          <option value="Cancelled" ${b.status === 'Cancelled' ? 'selected' : ''}>Отменено</option>
        </select>
        <button class="btn" onclick="saveAttendance(${b.id}, this)">Сохранить</button>
      </div>
    `).join('');

    const popup = document.createElement('div');
    popup.innerHTML = `
      <div style="position:fixed;top:20%;left:20%;right:20%;background:white;padding:20px;z-index:1000;box-shadow:0 0 10px rgba(0,0,0,0.5);border-radius:10px;">
        <h3>Записавшиеся на "${getScheduleTitle(scheduleId)}"</h3>
        <pre>${clientNames}</pre>
        <h4>Отметить посещаемость:</h4>
        <div id="attendanceForm">${actionsHtml}</div>
        <button onclick="this.parentElement.parentElement.removeChild(this.parentElement);">Закрыть</button>
      </div>
    `;
    document.body.appendChild(popup);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : `ID: ${clientId}`;
  };

  const getScheduleTitle = (scheduleId) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    return schedule ? schedule.title : `ID: ${scheduleId}`;
  };

  // Глобальная функция для кнопки "Сохранить" в popup
  window.saveAttendance = async (bookingId, btn) => {
    const select = btn.previousElementSibling;
    const newStatus = select.value;

    const success = await Data.updateBooking(bookingId, { status: newStatus });
    if (success) {
      UI.showNotification('Статус обновлён');
    } else {
      UI.showNotification('Ошибка обновления');
    }
  };

  const openAddScheduleModal = () => {
    const modal = document.getElementById('scheduleModal');
    if (!modal) {
      createScheduleModal(true);
    }

    document.getElementById('scheduleModalTitle').textContent = 'Добавить занятие';
    document.getElementById('scheduleForm').reset();
    document.getElementById('scheduleId').value = ''; // Сброс ID

    // Установить тренера по умолчанию
    const trainerSelect = document.getElementById('scheduleTrainer');
    if (trainerSelect) {
      trainerSelect.value = Auth.currentUser.id;
      trainerSelect.disabled = true; // Заблокировать изменение
    }

    UI.openModal(modal);
  };

  const openEditScheduleModal = async (scheduleId) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const modal = document.getElementById('scheduleModal');
    if (!modal) {
      createScheduleModal(false);
    }

    document.getElementById('scheduleModalTitle').textContent = 'Редактировать занятие';
    document.getElementById('scheduleId').value = schedule.id;
    document.getElementById('scheduleTitle').value = schedule.title;
    document.getElementById('scheduleDateTime').value = new Date(schedule.date_time).toISOString().slice(0, 16);
    document.getElementById('scheduleDuration').value = schedule.duration;
    document.getElementById('scheduleLevel').value = schedule.level;
    document.getElementById('scheduleMaxParticipants').value = schedule.max_participants;
    document.getElementById('scheduleStatus').value = schedule.status;

    // Заполнить тренеров
    const trainerSelect = document.getElementById('scheduleTrainer');
    trainerSelect.innerHTML = '';
    clients.filter(c => c.role === 'trainer').forEach(trainer => {
      const option = document.createElement('option');
      option.value = trainer.id;
      option.textContent = trainer.name;
      if (Number(trainer.id) === Number(schedule.id_trainer)) option.selected = true;
      trainerSelect.appendChild(option);
    });

    UI.openModal(modal);
  };

  const createScheduleModal = (forAdd) => {
    const modalHtml = `
      <div class="modal-overlay" id="scheduleModal" style="display:none;">
        <div class="modal">
          <span class="modal-close" id="scheduleModalClose">&times;</span>
          <h2 id="scheduleModalTitle">${forAdd ? 'Добавить' : 'Редактировать'} занятие</h2>
          <form id="scheduleForm">
            <input type="hidden" id="scheduleId">
            <div class="form-group">
              <label>Название</label>
              <input type="text" id="scheduleTitle" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Дата и время</label>
              <input type="datetime-local" id="scheduleDateTime" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Длительность (мин)</label>
              <input type="number" id="scheduleDuration" class="form-control" required min="30" step="15">
            </div>
            <div class="form-group">
              <label>Уровень</label>
              <select id="scheduleLevel" class="form-control" required>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div class="form-group">
              <label>Макс. участников</label>
              <input type="number" id="scheduleMaxParticipants" class="form-control" required min="1">
            </div>
            <div class="form-group">
              <label>Тренер</label>
              <select id="scheduleTrainer" class="form-control" required>
                <!-- Заполнится через JS -->
              </select>
            </div>
            <div class="form-group">
              <label>Статус</label>
              <select id="scheduleStatus" class="form-control" required>
                <option value="Open">Открыто</option>
                <option value="Closed">Закрыто</option>
                <option value="Cancelled">Отменено</option>
              </select>
            </div>
            <div style="display:flex;gap:10px;margin-top:15px;">
              <button type="submit" class="btn">Сохранить</button>
              <button type="button" id="cancelScheduleBtn" class="btn-secondary">Отмена</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('scheduleModal');
    const form = document.getElementById('scheduleForm');
    const closeBtn = document.getElementById('scheduleModalClose');
    const cancelBtn = document.getElementById('cancelScheduleBtn');

    closeBtn.addEventListener('click', () => UI.closeModal(modal));
    cancelBtn.addEventListener('click', () => UI.closeModal(modal));
    form.addEventListener('submit', handleScheduleFormSubmit);
  };

  const handleScheduleFormSubmit = async (e) => {
    e.preventDefault();

    const id = document.getElementById('scheduleId').value;
    const title = document.getElementById('scheduleTitle').value;
    const date_time = document.getElementById('scheduleDateTime').value;
    const duration = document.getElementById('scheduleDuration').value;
    const level = document.getElementById('scheduleLevel').value;
    const max_participants = document.getElementById('scheduleMaxParticipants').value;
    const id_trainer = document.getElementById('scheduleTrainer').value;
    const status = document.getElementById('scheduleStatus').value;

    const scheduleData = { title, date_time, duration, level, max_participants, id_trainer, status };

    let result;
    if (id) {
      // Редактирование
      result = await Data.updateSchedule(id, scheduleData);
    } else {
      // Добавление
      result = await Data.addSchedule(scheduleData);
    }

    if (result) {
      UI.showNotification(id ? 'Занятие обновлено' : 'Занятие добавлено');
      UI.closeModal(document.getElementById('scheduleModal'));
      renderTrainerSchedules();
    } else {
      UI.showNotification('Ошибка сохранения');
    }
  };

  return { init };
})();
