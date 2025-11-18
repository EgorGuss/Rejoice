// js/modules/profile.js
import { Data } from './data.js';
import { Auth } from './auth.js';

export const Profile = (() => {
  let historyPage = 1;
  const historyItemsPerPage = 10;

  const loadProfile = async () => {
    if (!Auth.currentUser) {
      window.location.href = 'index.html';
      return;
    }

    // Загружаем актуальные данные пользователя из БД
    const users = await Data.getUsers();
    const currentUser = users.find(u => String(u.id) === String(Auth.currentUser.id));
    
    if (!currentUser) {
      showNotification('Пользователь не найден');
      return;
    }

    // Обновляем данные пользователя
    document.getElementById('userName').textContent = currentUser.name || '-';
    document.getElementById('userEmail').textContent = currentUser.email || currentUser.login || '-';
    document.getElementById('userPhone').textContent = currentUser.phone || '-';
    
    // Отображаем роль
    const roleNames = {
      'client': 'Клиент',
      'trainer': 'Тренер',
      'admin': 'Администратор'
    };
    document.getElementById('userRole').textContent = roleNames[currentUser.role] || currentUser.role || '-';

    // Заполняем форму редактирования
    document.getElementById('editUserName').value = currentUser.name || '';
    document.getElementById('editUserEmail').value = currentUser.email || currentUser.login || '';
    document.getElementById('editUserPhone').value = currentUser.phone || '';

    await loadMyBookings();
    await loadSubscriptions();
    await loadHistory();
    await loadFeedback();
    setupFeedbackForm();
    setupProfileEdit();
    setupLogout();
  };

  // Настройка редактирования профиля
  const setupProfileEdit = () => {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const profileView = document.getElementById('profileView');
    const profileEdit = document.getElementById('profileEdit');
    const editForm = document.getElementById('profileEditForm');

    editBtn?.addEventListener('click', () => {
      profileView.style.display = 'none';
      profileEdit.style.display = 'block';
    });

    cancelBtn?.addEventListener('click', () => {
      profileView.style.display = 'block';
      profileEdit.style.display = 'none';
    });

    editForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('editUserName').value.trim();
      const email = document.getElementById('editUserEmail').value.trim();
      const phone = document.getElementById('editUserPhone').value.trim();

      // Валидация
      if (!name || !email || !phone) {
        showNotification('Заполните все поля');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotification('Неверный формат email');
        return;
      }

      if (!/^\d{11}$/.test(phone.replace(/\D/g, ''))) {
        showNotification('Телефон должен содержать 11 цифр');
        return;
      }

      // Обновляем пользователя
      const updatedUser = {
        ...Auth.currentUser,
        name,
        email,
        phone
      };

      const result = await Data.updateUser(Auth.currentUser.id, updatedUser);

      if (result) {
        // Обновляем в localStorage
        localStorage.setItem('currentUser', JSON.stringify(result));
        Auth.currentUser = result;
        
        showNotification('Профиль успешно обновлён');
        profileView.style.display = 'block';
        profileEdit.style.display = 'none';
        await loadProfile();
      } else {
        showNotification('Не удалось обновить профиль');
      }
    });
  };

  // Настройка выхода
  const setupLogout = () => {
    const logoutBtn = document.getElementById('logoutBtnProfile');
    logoutBtn?.addEventListener('click', () => {
      localStorage.removeItem('currentUser');
      window.location.href = 'index.html';
    });
  };

  // Загрузить мои записи (будущие записи)
  const loadMyBookings = async () => {
    if (!Auth.currentUser) return;

    const bookingsList = document.getElementById('myBookingsList');
    if (!bookingsList) return;

    try {
      const bookings = await Data.getBookingsByClientId(Number(Auth.currentUser.id));
      const schedules = await Data.getSchedules();
      const trainers = await Data.getTrainers();

      // Фильтруем только будущие записи
      const now = new Date();
      const futureBookings = bookings.filter(b => {
        const schedule = schedules.find(s => String(s.id) === String(b.id_schedule));
        if (!schedule) return false;
        const scheduleDate = new Date(schedule.date_time);
        return scheduleDate >= now && b.status === 'Confirmed';
      });

      if (futureBookings.length === 0) {
        bookingsList.innerHTML = '<p>У вас нет записей на будущие занятия</p>';
        return;
      }

      bookingsList.innerHTML = '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:var(--bg-light);"><th style="padding:10px;border-bottom:1px solid var(--gray);">Дата и время</th><th style="padding:10px;border-bottom:1px solid var(--gray);">Название</th><th style="padding:10px;border-bottom:1px solid var(--gray);">Тренер</th><th style="padding:10px;border-bottom:1px solid var(--gray);">Действия</th></tr></thead><tbody>';

      for (const booking of futureBookings) {
        const schedule = schedules.find(s => String(s.id) === String(booking.id_schedule));
        if (!schedule) continue;

        const trainer = trainers.find(t => String(t.id) === String(schedule.id_trainer));
        const trainerName = trainer ? trainer.name : 'Неизвестный тренер';

        const scheduleDate = new Date(schedule.date_time);
        const dateStr = scheduleDate.toLocaleDateString('ru-RU');
        const timeStr = scheduleDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        bookingsList.innerHTML += `
          <tr>
            <td style="padding:10px;border-bottom:1px solid var(--gray);">${dateStr} ${timeStr}</td>
            <td style="padding:10px;border-bottom:1px solid var(--gray);">${schedule.title}</td>
            <td style="padding:10px;border-bottom:1px solid var(--gray);">${trainerName}</td>
            <td style="padding:10px;border-bottom:1px solid var(--gray);">
              <button onclick="cancelMyBooking(${booking.id})" class="btn-secondary" style="padding:5px 10px;font-size:14px;">Отменить</button>
            </td>
          </tr>
        `;
      }

      bookingsList.innerHTML += '</tbody></table>';
    } catch (error) {
      console.error('Ошибка загрузки записей:', error);
      bookingsList.innerHTML = '<p>Ошибка загрузки записей</p>';
    }
  };

  // Загрузить абонементы
  const loadSubscriptions = async () => {
    if (!Auth.currentUser) return;

    const subsList = document.getElementById('subscriptionsList');
    if (!subsList) return;

    try {
      const subs = await Data.getSubscriptionsByClientId(Number(Auth.currentUser.id));

      if (subs.length === 0) {
        subsList.innerHTML = '<tr><td colspan="5" style="padding:10px;text-align:center;">У вас нет активных абонементов</td></tr>';
        return;
      }

      subsList.innerHTML = '';

      for (const sub of subs) {
        const startDate = new Date(sub.start_date);
        const endDate = new Date(sub.end_date);
        const startDateStr = isNaN(startDate) ? '-' : startDate.toLocaleDateString('ru-RU');
        const endDateStr = isNaN(endDate) ? '-' : endDate.toLocaleDateString('ru-RU');
        const totalSessions = sub.sessions_total ?? null;
        const sessionsLeft = sub.sessions_left ?? 0;
        const usedSessions = totalSessions ? totalSessions - sessionsLeft : 0;
        const percentage = totalSessions
          ? Math.min(100, Math.round((usedSessions / totalSessions) * 100))
          : 100;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="padding:10px;border-bottom:1px solid var(--gray);">${sub.type || 'Абонемент'}</td>
          <td style="padding:10px;border-bottom:1px solid var(--gray);">${startDateStr}</td>
          <td style="padding:10px;border-bottom:1px solid var(--gray);">${endDateStr}</td>
          <td style="padding:10px;border-bottom:1px solid var(--gray);">${sessionsLeft} из ${totalSessions ?? '∞'}</td>
          <td style="padding:10px;border-bottom:1px solid var(--gray);">
            <div style="height:20px;background:var(--gray);border-radius:10px;overflow:hidden;position:relative;">
              <div style="height:100%;background:var(--accent);width:${percentage}%;transition:width 0.3s;"></div>
              <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:12px;font-weight:bold;color:var(--black);">${Math.round(percentage)}%</span>
            </div>
          </td>
        `;
        subsList.appendChild(row);
      }
    } catch (error) {
      console.error('Ошибка загрузки абонементов:', error);
      subsList.innerHTML = '<tr><td colspan="5" style="padding:10px;text-align:center;">Ошибка загрузки абонементов</td></tr>';
    }
  };

  // Загрузить историю посещений
  const loadHistory = async () => {
    if (!Auth.currentUser) return;

    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    try {
      const bookings = await Data.getBookingsByClientId(Number(Auth.currentUser.id));
      const schedules = await Data.getSchedules();
      const trainers = await Data.getTrainers();

      // Фильтруем только прошедшие записи
      const now = new Date();
      const pastBookings = bookings.filter(b => {
        const schedule = schedules.find(s => String(s.id) === String(b.id_schedule));
        if (!schedule) return false;
        const scheduleDate = new Date(schedule.date_time);
        return scheduleDate < now;
      });

      if (pastBookings.length === 0) {
        historyList.innerHTML = '<tr><td colspan="5" style="padding:10px;text-align:center;">Вы ещё не посещали занятия</td></tr>';
        displayHistoryPagination(0);
        return;
      }

      // Сортировка по дате (новые первыми)
      pastBookings.sort((a, b) => {
        const scheduleA = schedules.find(s => s.id === a.id_schedule);
        const scheduleB = schedules.find(s => s.id === b.id_schedule);
        if (!scheduleA || !scheduleB) return 0;
        return new Date(scheduleB.date_time) - new Date(scheduleA.date_time);
      });

      // Пагинация
      const totalPages = Math.ceil(pastBookings.length / historyItemsPerPage);
      const startIndex = (historyPage - 1) * historyItemsPerPage;
      const endIndex = startIndex + historyItemsPerPage;
      const paginatedBookings = pastBookings.slice(startIndex, endIndex);

      historyList.innerHTML = '';

      for (const booking of paginatedBookings) {
        const schedule = schedules.find(s => String(s.id) === String(booking.id_schedule));
        if (!schedule) continue;

        const trainer = trainers.find(t => String(t.id) === String(schedule.id_trainer));
        const trainerName = trainer ? trainer.name : 'Неизвестный тренер';

        const scheduleDate = new Date(schedule.date_time);
        const dateStr = scheduleDate.toLocaleDateString('ru-RU');
        const timeStr = scheduleDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        const statusText = booking.status === 'Confirmed' ? 'Посещено' : 
                          booking.status === 'Cancelled' ? 'Отменено' : booking.status;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="padding:10px;border-bottom:1px solid var(--gray);">${dateStr} ${timeStr}</td>
          <td style="padding:10px;border-bottom:1px solid var(--gray);">${schedule.title}</td>
          <td style="padding:10px;border-bottom:1px solid var(--gray);">${schedule.level || 'Beginner'}</td>
          <td style="padding:10px;border-bottom:1px solid var(--gray);">${trainerName}</td>
          <td style="padding:10px;border-bottom:1px solid var(--gray);">
            <span class="status status-${booking.status === 'Confirmed' ? 'approved' : 'rejected'}">${statusText}</span>
          </td>
        `;
        historyList.appendChild(row);
      }

      displayHistoryPagination(totalPages);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      historyList.innerHTML = '<tr><td colspan="5" style="padding:10px;text-align:center;">Ошибка загрузки истории</td></tr>';
    }
  };

  // Отобразить пагинацию истории
  const displayHistoryPagination = (totalPages) => {
    const pagination = document.getElementById('historyPagination');
    if (!pagination) return;

    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';
    pagination.innerHTML = '';

    // Кнопка "Назад"
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Назад';
    prevBtn.disabled = historyPage === 1;
    prevBtn.addEventListener('click', () => {
      if (historyPage > 1) {
        historyPage--;
        loadHistory();
      }
    });
    pagination.appendChild(prevBtn);

    // Номера страниц
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= historyPage - 1 && i <= historyPage + 1)) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = historyPage === i ? 'active' : '';
        pageBtn.addEventListener('click', () => {
          historyPage = i;
          loadHistory();
        });
        pagination.appendChild(pageBtn);
      } else if (i === historyPage - 2 || i === historyPage + 2) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.style.padding = '8px';
        pagination.appendChild(ellipsis);
      }
    }

    // Кнопка "Вперёд"
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Вперёд';
    nextBtn.disabled = historyPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (historyPage < totalPages) {
        historyPage++;
        loadHistory();
      }
    });
    pagination.appendChild(nextBtn);
  };

  // Отменить запись
  window.cancelMyBooking = async (bookingId) => {
    if (!Auth.currentUser) {
      showNotification('Сначала войдите в систему');
      return;
    }

    if (!confirm('Вы уверены, что хотите отменить запись?')) {
      return;
    }

    const success = await Data.deleteBooking(bookingId);

    if (success) {
      showNotification('Запись отменена');
      await loadMyBookings();
    } else {
      showNotification('Не удалось отменить запись');
    }
  };

  // Загрузить обратную связь
  const loadFeedback = async () => {
    if (!Auth.currentUser) return;

    const feedbackList = document.getElementById('feedbackList');
    if (!feedbackList) return;

    try {
      const feedbacks = await Data.getFeedbacksByClientId(Number(Auth.currentUser.id));

      if (feedbacks.length === 0) {
        feedbackList.innerHTML = '<p>У вас нет отправленных сообщений</p>';
        return;
      }

      // Сортировка по дате (новые первыми)
      feedbacks.sort((a, b) => new Date(b.date_sent) - new Date(a.date_sent));

      feedbackList.innerHTML = '<h4 style="margin-bottom:15px;">История сообщений</h4>';

      feedbacks.forEach(f => {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.cssText = 'margin-bottom:15px;padding:15px;';

        const statusClass = f.status === 'В обработке' ? 'status-pending' : 
                           f.status === 'Ответ получен' ? 'status-approved' : 'status-pending';

        item.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
            <p><strong>Тема:</strong> ${f.subject}</p>
            <span class="status ${statusClass}">${f.status}</span>
          </div>
          <p style="margin:10px 0;"><strong>Сообщение:</strong> ${f.message}</p>
          <p style="margin:10px 0;color:#666;font-size:14px;"><strong>Дата:</strong> ${new Date(f.date_sent).toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          ${f.response ? `
            <div style="margin-top:15px;padding:15px;background:#f5f5f5;border-radius:5px;border-left:3px solid var(--accent-dark);">
              <p style="font-weight:bold;margin-bottom:5px;">Ответ администратора:</p>
              <p>${f.response}</p>
            </div>
          ` : ''}
        `;
        feedbackList.appendChild(item);
      });
    } catch (error) {
      console.error('Ошибка загрузки обратной связи:', error);
      feedbackList.innerHTML = '<p>Ошибка загрузки обратной связи</p>';
    }
  };

  // Отправить обратную связь
  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!Auth.currentUser) {
      showNotification('Сначала войдите в систему');
      return;
    }

    const subject = document.getElementById('feedbackSubject').value;
    const message = document.getElementById('feedbackMessage').value;

    if (!subject || !message) {
      showNotification('Заполните все поля');
      return;
    }

    if (message.length < 10 || message.length > 500) {
      showNotification('Сообщение должно быть от 10 до 500 символов');
      return;
    }

    const feedbackData = {
      id_client: Number(Auth.currentUser.id),
      subject,
      message,
      date_sent: new Date().toISOString(),
      status: 'В обработке'
    };

    const result = await Data.addFeedback(feedbackData);

    if (result) {
      showNotification('Сообщение отправлено');
      document.getElementById('feedbackForm').reset();
      await loadFeedback();
    } else {
      showNotification('Не удалось отправить сообщение');
    }
  };

  // Настройка формы обратной связи
  const setupFeedbackForm = () => {
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', submitFeedback);
    }
  };

  const showNotification = (message) => {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
  };

  return { loadProfile };
})();
