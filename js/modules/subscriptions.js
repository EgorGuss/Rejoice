// js/modules/subscriptions.js
import { Data } from './data.js';
import { Auth } from './auth.js';
import { UI } from './ui.js';

export const Subscriptions = (() => {
  // Загрузить типы абонементов
  const loadSubscriptionTypes = async () => {
    const typesContainer = document.getElementById('subscriptionTypes');
    if (!typesContainer) return;

    const types = await Data.getSubscriptionTypes();

    typesContainer.innerHTML = '';

    for (const type of types) {
      const card = document.createElement('div');
      card.className = 'subscription-card';
      card.innerHTML = `
        <h3>${type.name}</h3>
        <p>${type.sessions ? `${type.sessions} занятий` : 'Неограниченно'}</p>
        <p><strong>${type.price} ₽</strong></p>
        <button class="btn-secondary buy-subscription-btn" data-type-id="${type.id}">
          Купить
        </button>
      `;
      typesContainer.appendChild(card);
    }

    // Обработчики покупки
    document.querySelectorAll('.buy-subscription-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const typeId = e.target.dataset.typeId;

        if (!Auth.currentUser) {
          UI.showNotification('Сначала войдите в систему');
          Auth.openLoginModal();
          return;
        }

        if (confirm('Подтвердите покупку абонемента.')) {
          const type = types.find(t => t.id == typeId);
          const newSub = {
            type: type.name,
            sessions_total: type.sessions,
            sessions_left: type.sessions,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +90 дней
            price: type.price,
            id_client: Auth.currentUser.id
          };

          const result = await Data.addSubscription(newSub);

          if (result) {
            UI.showNotification('Абонемент успешно куплен!');
            await loadClientSubscriptions();
          } else {
            UI.showNotification('Ошибка покупки');
          }
        }
      });
    });
  };

  // Загрузить абонементы клиента
  const loadClientSubscriptions = async () => {
    if (!Auth.currentUser) return;

    const subsList = document.getElementById('clientSubscriptionsList');
    if (!subsList) return;

    const subs = await Data.getSubscriptionsByClientId(Auth.currentUser.id);

    if (subs.length === 0) {
      subsList.innerHTML = '<p>У вас нет активных абонементов</p>';
      return;
    }

    subsList.innerHTML = '';

    for (const sub of subs) {
      const totalSessions = sub.sessions_total ?? null;
      const sessionsLeft = sub.sessions_left ?? (totalSessions || 0);
      const usedSessions = totalSessions ? totalSessions - sessionsLeft : 0;
      const progress = totalSessions ? Math.round((usedSessions / totalSessions) * 100) : 100;

      const card = document.createElement('div');
      card.className = 'subscription-item';
      card.innerHTML = `
        <h4>${sub.type}</h4>
        <p>Осталось: ${sessionsLeft} из ${totalSessions || '∞'}</p>
        <div class="progress-bar">
          <div class="progress" style="width:${progress}%"></div>
        </div>
        <p>Действует до: ${sub.end_date}</p>
      `;
      subsList.appendChild(card);
    }
  };

  return { loadSubscriptionTypes, loadClientSubscriptions };
})();