// js/main.js
import { Auth } from './modules/auth.js';
import { Subscriptions } from './modules/subscriptions.js';
import { Schedule } from './modules/schedule.js';
import { Profile } from './modules/profile.js';
import { Trainers } from './modules/trainers.js';
import { TrainerProfile } from './modules/trainer-profile.js';
import { Notifications } from './modules/notifications.js';
import { Admin } from './modules/admin.js';

document.addEventListener('auth:changed', async (event) => {
  if (event.detail) {
    await Notifications.init();
  } else {
    document.getElementById('notificationDropdown')?.remove();
    document.getElementById('notificationIcon')?.remove();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await Auth.init();

  if (Auth.currentUser) {
    await Notifications.init();
  }

  const path = window.location.pathname;

  if (document.getElementById('subscriptionTypes')) {
    Subscriptions.loadSubscriptionTypes();
  }

  if (path.includes('schedule.html')) {
    await Schedule.init();
  }

  if (path.includes('profile.html')) {
    await Profile.loadProfile();
  }

  if (path.includes('trainer.html')) {
    await Trainers.loadTrainers();
  }

  if (path.includes('trainer-profile.html')) {
    await TrainerProfile.loadProfile();
    TrainerProfile.setupControls();
  }

  if (path.includes('admin.html')) {
    await Admin.init();
  }
});