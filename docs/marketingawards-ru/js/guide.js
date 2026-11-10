/* Инициализация витрины: те же эффекты кнопок, что на сайте,
   но без логики шапки, форм и мобильного меню рабочих страниц. */
(function () {
    'use strict';

    if (window.StarBorder) {
        var buttons = document.querySelectorAll('.btn:not(.btn--ghost)');
        for (var i = 0; i < buttons.length; i++) {
            var el = buttons[i];
            var paper = el.closest('.section--soft') && !el.closest('.pv-frame--header');
            el.classList.add('star-border');
            window.StarBorder.init(el, {
                radius: 4,
                thickness: 1,
                duration: 4,
                glow: .6,
                hover: 'lap',
                theme: paper ? 'light' : 'dark'
            });
        }
    }
})();
