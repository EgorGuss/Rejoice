// js/modules/schedule.js
import { Data } from './data.js';
import { Auth } from './auth.js';
import { UI } from './ui.js';

export const Schedule = (() => {
  let schedules = [];
  let trainers = [];
  let bookings = [];
  let filteredSchedules = [];
  let currentPage = 1;
  const perPage = 6;

  const init = async () => {
    await refreshData();
    populateTrainerFilter();
    setupFilters();
    renderSchedule();
  };

  const refreshData = async () => {
    const [scheduleData, trainerData, bookingData] = await Promise.all([
      Data.getSchedules(),
      Data.getTrainers(),
      Data.getBookings()
    ]);

    schedules = (scheduleData || []).sort(
      (a, b) => new Date(a.date_time) - new Date(b.date_time)
    );
    trainers = trainerData || [];
    bookings = bookingData || [];
    applyFilters();
  };

  const populateTrainerFilter = () => {
    const select = document.getElementById('trainerFilter');
    if (!select || !trainers.length) return;

    const existedOptions = Array.from(select.options).map((opt) => opt.value);
    trainers.forEach((trainer) => {
      if (!existedOptions.includes(String(trainer.id))) {
        const option = document.createElement('option');
        option.value = trainer.id;
        option.textContent = trainer.name || `Тренер #${trainer.id}`;
        select.appendChild(option);
      }
    });
  };

  const setupFilters = () => {
    const dateFilter = document.getElementById('dateFilter');
    const levelFilter = document.getElementById('levelFilter');
    const trainerFilter = document.getElementById('trainerFilter');
    const searchInput = document.getElementById('searchInput');
    const resetBtn = document.getElementById('resetFilters');

    const handleFilterChange = () => {
      currentPage = 1;
      applyFilters();
      renderSchedule();
    };

    dateFilter?.addEventListener('change', handleFilterChange);
    levelFilter?.addEventListener('change', handleFilterChange);
    trainerFilter?.addEventListener('change', handleFilterChange);
    searchInput?.addEventListener('input', handleFilterChange);
    resetBtn?.addEventListener('click', () => {
      if (dateFilter) dateFilter.value = '';
      if (levelFilter) levelFilter.value = '';
      if (trainerFilter) trainerFilter.value = '';
      if (searchInput) searchInput.value = '';
      handleFilterChange();
    });
  };

  const applyFilters = () => {
    const dateFilter = document.getElementById('dateFilter')?.value;
    const levelFilter = document.getElementById('levelFilter')?.value;
    const trainerFilter = document.getElementById('trainerFilter')?.value;
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';

    filteredSchedules = schedules.filter((schedule) => {
      const sameDay =
        !dateFilter ||
        new Date(schedule.date_time).toDateString() === new Date(dateFilter).toDateString();
      const levelMatches = !levelFilter || schedule.level === levelFilter;
      const trainerMatches = !trainerFilter || String(schedule.id_trainer) === trainerFilter;
      const trainerName =
        trainers.find((trainer) => String(trainer.id) === String(schedule.id_trainer))?.name || '';
      const searchMatches =
        !searchQuery ||
        schedule.title.toLowerCase().includes(searchQuery) ||
        trainerName.toLowerCase().includes(searchQuery);

      return sameDay && levelMatches && trainerMatches && searchMatches;
    });
  };

  const renderSchedule = () => {
    const list = document.getElementById('scheduleList');
    const pagination = document.getElementById('pagination');
    if (!list) return;

    list.innerHTML = '';

    if (!filteredSchedules.length) {
      list.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;">По выбранным фильтрам занятий нет</p>';
      if (pagination) pagination.style.display = 'none';
      return;
    }

    const start = (currentPage - 1) * perPage;
    const pageItems = filteredSchedules.slice(start, start + perPage);

    pageItems.forEach((schedule) => {
      const trainer = trainers.find((t) => String(t.id) === String(schedule.id_trainer));
      const bookedCount = getBookedCount(schedule.id);
      const date = new Date(schedule.date_time);
      const readableDate = date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long'
      });
      const readableTime = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const buttonConfig = getButtonConfig(schedule, bookedCount);

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:15px;">
          <div>
            <h3 style="margin:0;">${schedule.title}</h3>
            <p style="margin:5px 0;color:#666;">${readableDate} · ${readableTime}</p>
            <p style="margin:5px 0;"><strong>Тренер:</strong> <a href="trainer-profile.html?id=${schedule.id_trainer}" style="color:var(--accent);text-decoration:none;">${trainer?.name || 'Без тренера'}</a></p>
            <p style="margin:5px 0;"><strong>Уровень:</strong> ${schedule.level}</p>
            <p style="margin:5px 0;"><strong>Мест:</strong> ${schedule.max_participants - bookedCount}/${schedule.max_participants}</p>
          </div>
          <span class="status status-${schedule.status?.toLowerCase() || 'open'}">${schedule.status || 'Open'}</span>
        </div>
        <button
          class="${buttonConfig.className}"
          data-action="${buttonConfig.action}"
          data-schedule-id="${schedule.id}"
          ${buttonConfig.disabled ? 'disabled' : ''}
          style="width:100%;margin-top:15px;"
        >
          ${buttonConfig.label}
        </button>
      `;

      list.appendChild(card);
    });

    attachButtonHandlers();
    renderPagination();
  };

  const getBookedCount = (scheduleId) =>
    bookings.filter(
      (booking) =>
        String(booking.id_schedule) === String(scheduleId) &&
        booking.status !== 'Cancelled'
    ).length;

  const getClientBooking = (scheduleId) => {
    if (!Auth.currentUser) return null;
    return bookings.find(
      (booking) =>
        String(booking.id_schedule) === String(scheduleId) &&
        String(booking.id_client) === String(Auth.currentUser.id)
    );
  };

  const getButtonConfig = (schedule, bookedCount) => {
    const isOpen = schedule.status === 'Open';
    const isFull = bookedCount >= schedule.max_participants;
    const clientBooking = getClientBooking(schedule.id);

    if (!Auth.currentUser) {
      return {
        label: 'Войти, чтобы записаться',
        action: 'login',
        disabled: false,
        className: 'btn-secondary'
      };
    }

    if (Auth.currentUser.role !== 'client') {
      return {
        label: 'Доступно только клиентам',
        action: 'none',
        disabled: true,
        className: 'btn-secondary'
      };
    }

    if (!isOpen) {
      return {
        label: 'Запись недоступна',
        action: 'none',
        disabled: true,
        className: 'btn-secondary'
      };
    }

    if (clientBooking) {
      return {
        label: 'Отменить запись',
        action: 'cancel',
        disabled: false,
        className: 'btn-secondary'
      };
    }

    if (isFull) {
      return {
        label: 'Нет мест',
        action: 'none',
        disabled: true,
        className: 'btn-secondary'
      };
    }

    return {
      label: 'Записаться',
      action: 'book',
      disabled: false,
      className: 'btn'
    };
  };

  const attachButtonHandlers = () => {
    const list = document.getElementById('scheduleList');
    if (!list) return;

    list.querySelectorAll('[data-action="book"]').forEach((btn) => {
      btn.addEventListener('click', () => handleBooking(Number(btn.dataset.scheduleId)));
    });

    list.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener('click', () => handleCancel(Number(btn.dataset.scheduleId)));
    });

    list.querySelectorAll('[data-action="login"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        UI.showNotification('Войдите, чтобы записаться');
        Auth.openLoginModal();
      });
    });
  };

  const handleBooking = async (scheduleId) => {
    if (!Auth.currentUser || Auth.currentUser.role !== 'client') {
      UI.showNotification('Запись доступна только клиентам');
      return;
    }

    const schedule = schedules.find((s) => Number(s.id) === Number(scheduleId));
    if (!schedule) return;

    const bookedCount = getBookedCount(scheduleId);
    if (bookedCount >= schedule.max_participants) {
      UI.showNotification('Свободных мест нет');
      return;
    }

    let activeSubscription = await getActiveSubscription();
    
    // Если нет активного абонемента, создаём подарковый
    if (!activeSubscription) {
      UI.showNotification('Поздравляем! Мы дарим вам абонемент на 10 занятий! 🎁');
      
      const giftSubscription = {
        type: 'Подарочный (10 занятий)',
        sessions_total: 10,
        sessions_left: 10,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +90 дней
        price: 0,
        id_client: Auth.currentUser.id
      };
      
      const newSubscription = await Data.addSubscription(giftSubscription);
      if (newSubscription) {
        activeSubscription = newSubscription;
      } else {
        UI.showNotification('Ошибка создания абонемента. Попробуйте позже.');
        return;
      }
    }

    const alreadyBooked = await Data.getBookingByScheduleAndClient(
      scheduleId,
      Auth.currentUser.id
    );
    if (alreadyBooked) {
      UI.showNotification('Вы уже записаны на это занятие');
      return;
    }

    const bookingPayload = {
      id_client: Auth.currentUser.id,
      id_schedule: scheduleId,
      id_subscription: activeSubscription.id || null,
      status: 'Confirmed',
      booking_date: new Date().toISOString()
    };

    const result = await Data.addBooking(bookingPayload);
    if (result) {
      if (activeSubscription.sessions_total) {
        await Data.updateSubscription(activeSubscription.id, {
          ...activeSubscription,
          sessions_left: Math.max(0, (activeSubscription.sessions_left || 0) - 1)
        });
      }
      UI.showNotification('Запись создана!');
      await refreshData();
      renderSchedule();
    } else {
      UI.showNotification('Не удалось записаться. Попробуйте позже.');
    }
  };

  const handleCancel = async (scheduleId) => {
    if (!Auth.currentUser) return;
    const booking = getClientBooking(scheduleId);
    if (!booking) return;

    if (!confirm('Отменить запись на занятие?')) {
      return;
    }

    const success = await Data.deleteBooking(booking.id);
    if (success) {
      if (booking.id_subscription) {
        const subscription = await Data.getSubscriptionById(booking.id_subscription);
        if (subscription?.sessions_total) {
          await Data.updateSubscription(subscription.id, {
            ...subscription,
            sessions_left: (subscription.sessions_left || 0) + 1
          });
        }
      }
      UI.showNotification('Запись отменена');
      await refreshData();
      renderSchedule();
    } else {
      UI.showNotification('Не удалось отменить запись');
    }
  };

  const getActiveSubscription = async () => {
    if (!Auth.currentUser) return null;
    
    const subscriptions = await Data.getSubscriptionsByClientId(Auth.currentUser.id);
    if (!subscriptions || subscriptions.length === 0) return null;
    
    const now = new Date();

    return (
      subscriptions.find((sub) => {
        const hasSessions =
          sub.sessions_total == null || (sub.sessions_left || 0) > 0;
        const inPeriod = !sub.end_date || new Date(sub.end_date) >= now;
        return hasSessions && inPeriod;
      }) || null
    );
  };

  const renderPagination = () => {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(filteredSchedules.length / perPage);
    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';
    pagination.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderSchedule();
      }
    });

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderSchedule();
      }
    });

    pagination.appendChild(prevBtn);
    const indicator = document.createElement('span');
    indicator.style.padding = '0 10px';
    indicator.textContent = `${currentPage} / ${totalPages}`;
    pagination.appendChild(indicator);
    pagination.appendChild(nextBtn);
  };

  return { init, refreshData };
})();

