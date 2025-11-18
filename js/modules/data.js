// js/modules/data.js

const API_BASE = 'http://localhost:3000';

const request = async (path, options = {}, fallback = null) => {
  try {
    const response = await fetch(`${API_BASE}${path}`, options);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type') || '';

    if (response.status === 204 || contentLength === '0') {
      return true;
    }

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return true;
  } catch (error) {
    console.error(`Ошибка запроса ${path}:`, error);
    return fallback;
  }
};

const getJson = (path, fallback = []) => request(path, {}, fallback);
const sendJson = (path, method, data, fallback = null) =>
  request(
    path,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    },
    fallback
  );

export const Data = {
  // Пользователи
  getUsers: () => getJson('/users', []),
  getClients: () => getJson('/users?role=client', []),
  getTrainers: () => getJson('/users?role=trainer', []),
  findUser: async (login, password) => {
    const users = await getJson(`/users?login=${encodeURIComponent(login)}&password=${encodeURIComponent(password)}`, []);
    return users?.[0] || null;
  },
  addUser: (userData) => sendJson('/users', 'POST', userData, null),
  updateUser: (id, userData) => sendJson(`/users/${id}`, 'PATCH', userData, null),
  getTrainerById: (id) => request(`/users/${id}`, {}, null),

  // Расписание
  getSchedules: () => getJson('/schedules', []),
  getScheduleById: (id) => request(`/schedules/${id}`, {}, null),
  getSchedulesByTrainerId: (trainerId) => getJson(`/schedules?id_trainer=${trainerId}`, []),
  addSchedule: (scheduleData) => sendJson('/schedules', 'POST', scheduleData, null),
  updateSchedule: (id, scheduleData) => sendJson(`/schedules/${id}`, 'PATCH', scheduleData, null),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: 'DELETE' }, false),

  // Абонементы
  getSubscriptions: () => getJson('/subscriptions', []),
  getSubscriptionsByClientId: (clientId) => getJson(`/subscriptions?id_client=${clientId}`, []),
  getSubscriptionById: (id) => request(`/subscriptions/${id}`, {}, null),
  addSubscription: (subscriptionData) => sendJson('/subscriptions', 'POST', subscriptionData, null),
  updateSubscription: (id, data) => sendJson(`/subscriptions/${id}`, 'PATCH', data, null),

  // Типы абонементов
  getSubscriptionTypes: () => getJson('/subscription_types', []),
  addSubscriptionType: (data) => sendJson('/subscription_types', 'POST', data, null),
  updateSubscriptionType: (id, data) => sendJson(`/subscription_types/${id}`, 'PATCH', data, null),
  deleteSubscriptionType: (id) => request(`/subscription_types/${id}`, { method: 'DELETE' }, false),

  // Записи
  getBookings: () => getJson('/bookings', []),
  getBookingsByClientId: (clientId) => getJson(`/bookings?id_client=${clientId}`, []),
  getBookingsByScheduleId: (scheduleId) => getJson(`/bookings?id_schedule=${scheduleId}`, []),
  getBookingById: (id) => request(`/bookings/${id}`, {}, null),
  getBookingByScheduleAndClient: async (scheduleId, clientId) => {
    const bookings = await getJson(`/bookings?id_schedule=${scheduleId}&id_client=${clientId}`, []);
    return bookings?.[0] || null;
  },
  addBooking: (bookingData) => sendJson('/bookings', 'POST', bookingData, null),
  updateBooking: (id, bookingData) => sendJson(`/bookings/${id}`, 'PATCH', bookingData, null),
  deleteBooking: (id) => request(`/bookings/${id}`, { method: 'DELETE' }, false),

  // Обратная связь
  getFeedbacks: () => getJson('/feedbacks', []),
  getFeedbacksByClientId: (clientId) => getJson(`/feedbacks?id_client=${clientId}`, []),
  addFeedback: (feedbackData) => sendJson('/feedbacks', 'POST', feedbackData, null),

  // Уведомления
  getNotifications: () => getJson('/notifications', []),
  getNotificationsByUserId: (userId) => getJson(`/notifications?recipient_id=${userId}&_sort=date_sent&_order=desc`, []),
  addNotification: (notificationData) => sendJson('/notifications', 'POST', notificationData, null),
  markNotificationAsRead: (id, read = true) => sendJson(`/notifications/${id}`, 'PATCH', { read }, null),

  // Отчёты (сырые данные)
  getReports: () => getJson('/reports', []),

  // Утилиты
  getResource: (path) => request(path, {}, null)
};