// js/modules/trainers.js
import { Data } from './data.js';
import { Auth } from './auth.js';

export const Trainers = (() => {
  // Загрузить всех тренеров
  const loadTrainers = async () => {
    const trainersList = document.getElementById('trainersList');
    if (!trainersList) return;

    try {
      const trainers = await Data.getTrainers();

      if (trainers.length === 0) {
        trainersList.innerHTML = '<p>Нет тренеров</p>';
        return;
      }

      let html = '';
      for (const trainer of trainers) {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'background:white;padding:30px;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,0.1);';

        // Получаем инициалы для аватара
        const initials = trainer.name ? trainer.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'TR';

        card.innerHTML = `
          <div style="display:flex;align-items:center;margin-bottom:20px;">
            <div style="width:100px;height:100px;background:#f5f5f5;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;color:#888;flex-shrink:0;">${initials}</div>
            <div style="margin-left:20px;flex:1;">
              <h3 style="margin:0 0 10px 0;"><a href="trainer-profile.html?id=${trainer.id}" style="color:var(--black);text-decoration:none;">${trainer.name || 'Тренер'}</a></h3>
              ${trainer.specialization ? `<p style="margin:5px 0;"><strong>Специализация:</strong> ${trainer.specialization}</p>` : ''}
              ${trainer.experience ? `<p style="margin:5px 0;"><strong>Опыт:</strong> ${trainer.experience} ${trainer.experience === 1 ? 'год' : trainer.experience < 5 ? 'года' : 'лет'}</p>` : ''}
              ${trainer.rating ? `<p style="margin:5px 0;"><strong>Рейтинг:</strong> ${'★'.repeat(Math.floor(trainer.rating))}${trainer.rating % 1 >= 0.5 ? '½' : ''}${'☆'.repeat(5 - Math.ceil(trainer.rating))} (${trainer.rating})</p>` : ''}
            </div>
          </div>
          ${trainer.email ? `<p style="margin:10px 0;"><strong>Email:</strong> ${trainer.email}</p>` : ''}
          ${trainer.phone ? `<p style="margin:10px 0;"><strong>Телефон:</strong> ${trainer.phone}</p>` : ''}
          <div style="margin-top:15px;">
            <a href="trainer-profile.html?id=${trainer.id}" class="btn" style="display:inline-block;text-decoration:none;">Посмотреть профиль</a>
          </div>
        `;

        trainersList.appendChild(card);
      }
    } catch (error) {
      console.error('Ошибка загрузки тренеров:', error);
      trainersList.innerHTML = '<p>Ошибка загрузки тренеров. Убедитесь, что json-server запущен.</p>';
    }
  };

  return { loadTrainers };
})();