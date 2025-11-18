// Модуль валидации форм
export const Forms = (() => {
    const validateField = (input, validator) => {
        input.addEventListener('blur', () => {
            if (!validator(input.value)) {
                input.style.borderColor = 'red';
            } else {
                input.style.borderColor = '';
            }
        });

        input.addEventListener('focus', () => {
            input.style.borderColor = '';
        });
    };

    // Инициализация валидации
    const initValidation = () => {
        const emailInput = document.getElementById('login');
        const passwordInput = document.getElementById('password');

        if (emailInput) {
            validateField(emailInput, value => /\S+@\S+\.\S+/.test(value));
        }

        if (passwordInput) {
            validateField(passwordInput, value => value.length >= 6);
        }
    };

    return { initValidation };
})();