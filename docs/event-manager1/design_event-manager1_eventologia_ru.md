# Дизайн — event-manager1.eventologia.ru (https://event-manager1.eventologia.ru/)
> Источник: https://event-manager1.eventologia.ru/ | Дата: 2026-11-10 | Уровень: Completo + браузер (Playwright/Chromium) | Страницы: `/` (архивный снимок 2026-07-10)

> Живой сервер недоступен (443/80 закрыты, внешние прокси — 522). Страница восстановлена из Wayback Machine, стили и вычисленные значения сняты с локальной копии (`source/`). Остальные маршруты (`/program`, `/privacy`, `/how-to-buy`, `/SPfrankel` и др.) проверить не удалось — они ведут на тот же недоступный хост.

## 1. Палитра

| Роль | HEX | Использование | Доказательство |
|---|---|---|---|
| Основной акцент | `#ff5900` | ссылки, суммы, маркеры списков | `.got_list_dot`, `.teachers_item_link`, `.price_item a` в `main.css` |
| Ховер / акцент-2 | `#ff5f01` | меню, ссылки, соцсети, `::selection` | `.header_nav_item:hover`, `.footer_privacy`, `::selection` |
| Градиент CTA — старт | `#ff7900` | кнопки, бейдж | `.button_gradient { background: linear-gradient(90deg, #ff7900, #ff0e00) }` |
| Градиент CTA — финиш | `#ff0e00` | кнопки, бейдж | там же |
| Градиент FAQ | `#ff8400 → #ff6400 → #ff0e00` | активный вопрос | `.faq_item.active .faq_question` |
| Чёрный | `#000000` | текст, тёмные кнопки, затемнение hero | `body`, `.button_transparent`, `.top_container:before` |
| Тёмный фон | `#0d0d0d` | секции, формы, футер, хедер при скролле | `.why_container`, `.form_container`, `.price_container`, `.header_container.scroll` |
| Белый | `#ffffff` | фон, текст на тёмном, рамки тарифов | `body`, `.price_item` |
| Основной текст | `#3d3d54` | абзацы на светлом | `.what_content`, `.gain_text`, `.got_list_item` |
| Серый | `#646464` | копирайт, юридические подписи | `.footer_left` |
| Серый-2 | `#808080` | описания-подписи | `.learn_description` |
| Серый-3 | `#969696` | плейсхолдеры, линии на светлом | `.form_container.form3 .form_field` |
| Линия аккордеона | `#d0d0d0` | границы FAQ | `.faq_item` |
| Линия «+» | `#bdbdbd` | иконка аккордеона | `.faq_icon_line` |
| Подчёркивание ссылок | `#afafaf` | ссылки в тарифах | `.price_item a` |
| Светлый фон | `#f2f5fd` | секции результата, лицензии, финальной формы | `.got_container`, `.cert_container`, `.form_container.form3` |
| Серо-зелёная полоса | `#6b7275` | блок фактов под hero | `.where_container` |
| Синяя карточка | `#0099ff` | карточка «65 000 ₽» | `.what_container .what_right` |
| Срез угла | `#c9d7ff` | треугольник в углу синей карточки | `.what_right:before` |
| hh.ru | `#e60000` | логотип в карточке | `hh.svg` (изображение) |
| Ошибка | `#ff0000` | граница поля с ошибкой | `.form_field.error` |

Состояния: ховер ссылок и меню — `#ff5f01`; активный FAQ — градиент; ошибка поля — нижняя граница `#ff0000`; `::selection` — `#ff5f01` на белом.

## 2. Типографика

- Семейство: **Montserrat**, фолбэк `Tahoma, Arial, sans-serif`. Подключение — Google Fonts, веса 300/400/600/700/800 (`<link>` в `index.html`). Локальных `@font-face` нет.
- База: `body { font-size: 15px; line-height: 1; color: #000 }` (`main.css`).
- Заголовки — только 800, без letter-spacing:
  - H1 hero — 45 / 1.1 (`.top_title`), мобильный 34 (`.adaptive.css`);
  - H2 — 36–50 / 1.1–1.2 (`.what_title` 36, `.gain_title` 40, `.benefits_title` 50, `.price_title` 44, `.faq_title` 36); мобильный 28;
  - H3 карточек — 20–26 / 1.1–1.3 (`.learn_item_title`, `.price_item_title` 26 uppercase);
  - крупная цифра — 48 / 1 (`.what_right_sum`); цена — 34 / 1 (`.prices_details_price`).
- Текст: 16 / 1.4–1.65 (`.why_container p`, `.benefits_item_text`), 18 / 1.3–1.5 (`.what_content`, `.gain_text`), 15 / 1.6 (футер).
- Лид: 20 / 1.4 / 300 (`.top_subtitle`); 18 / 1.5 / 400 (`.price_description`).
- Навигация: 14 / 1 / 600 (`.header_nav .header_nav_item`); кнопки: 14–15 / 1 / 600–700 (`.button`).
- Бейдж: 18 / 1 / 600, uppercase (`.first-block__date`).
- Дисклеймер: 13 / 1.3 / 300 (`form .form_agreement`).
- Uppercase: бейдж, меню, названия тарифов. Letter-spacing = 0.

## 3. Кнопки

| Вариант | Стиль | Размер | Доказательство |
|---|---|---|---|
| Основная (`button_gradient`) | градиент `#ff7900 → #ff0e00`, белый текст | высота 60, ширина по контексту 164–276, 14–15 / 600–700 | `.button`, `.button_gradient` |
| Прозрачная светлая | рамка 3 px `#fff`, белый текст; ховер — белый фон / чёрный текст | 60 | `.button_transparent` |
| Прозрачная тёмная | рамка 3 px `#000`; ховер — чёрный фон / белый текст | 60 | `.button_black` |
| Служебная | фон `#dadfec`, радиус 60, текст `#090942` | 14 | `.button_lilac` |

Радиус 0 у всех основных кнопок. Тень отсутствует. Переход `0.2s`. Ховер градиентной кнопки в исходнике пустой (`.button_gradient:hover {}`). Фокус не оформлен: глобально `outline: none !important` (`button, textarea, select, input`).

## 4. Формы и поля

- Тёмная форма: фон `#0d0d0d`, поле `.form_field` — `border: 0; border-bottom: 1px solid #fff; padding: 0 32px 18px; margin-bottom: 32px; font-size: 20px; background: transparent; color: #fff`. Плейсхолдеры белые.
- Светлая форма (`.form_container.form3`): фон `#f2f5fd`, линия `#969696`, плейсхолдеры `#969696`, заголовок 28 px чёрный.
- Ошибка: `.form_field.error { border-bottom: 1px solid red }`.
- Чекбокс: 24 × 24, рамка 1 px, галочка — SVG `check_black.svg` / `check_white.svg` во `:before`; текст согласия 13 / 300.
- Кнопки форм: 200 px (форма 1), 276 px (формы 2 и 3).
- Автозаполнение/валидация — jQuery Validate + маска телефона (`scripts.js`, `jquery.validate.min.js`).

## 5. Логин / регистрация

На странице нет авторизации. Все формы — лид-формы (заявка, презентация, консультация): имя + телефон + два согласия. Соцвхода, «запомнить меня» и восстановления пароля нет. Запись идёт в обработчик nethouse (`events.nethouse.ru/assets/js/popup-form.js`, удалён при локальном рендере).

## 6. Навигация (хедер/футер)

- Хедер фиксированный, высота 116 px, прозрачный над hero; при скролле — `#000` (`.header_container.scroll`). Логотип 268 px, две версии — белая и чёрная (`logo.svg`, `logo-black.svg`).
- Меню: «О КУРСЕ» (скролл к `#about`), «ПРОГРАММА» (`/program`), «ЭКСПЕРТЫ» (`#teachers`), CTA «ОСТАВИТЬ ЗАЯВКУ» (открывает попап). Пункты 14 / 600, отступ 43 px.
- Справа: телефон 20 / 800, e-mail 16 / 400.
- Под логотипом — иконка поиска 35 px (`.search-block`, форма скрыта).
- Мобильный: бургер из трёх оранжевых линий (`.mob_menu_in`), отдельная панель `.mob_menu`.
- Футер: тёмный верх 1140 px (логотип 265 px, телефон 20 / 800, e-mail 16 / 400, оранжевые соцсети VK/IG/FB/TG, списки курсов и ссылок), белый низ 1080 px с копирайтом 15 / 1.6 `#646464` и ссылкой «Политика конфиденциальности» `#ff5f01`.

## 7. Отступы, радиусы и тени

- Контейнеры: 1200 (хедер), 1140 (hero, полоса фактов, футер), 1080 (базовый), 970 (FAQ, финальная форма), 1070 (тарифы), 1180 (преимущества), 1300 (автор).
- Секции: `padding: 90–100px 0`; мобильные — 50–60 px. Внутри карточек 20–35 px. Сетки — gap 25–30 px.
- Радиусы: `0` по умолчанию; `60px` — `.button_lilac`; `50%` — аватары и фото экспертов.
- Рамки: 4 px white — тарифная карточка, 5 px white — шапка тарифа, 3 px — прозрачные кнопки, 1 px — поля и чекбоксы.
- Тени: только `box-shadow: 5px 4px 18px 1px rgba(0,0,0,.25)` у фото сертификата (`.cert_img`) и `0 0 60px 1px rgba(0,0,0,.3)` у попапа. Больше нигде.

## 8. Иконография и изображения

- Иконки — тонкие линейные SVG `Icon_01…Icon_12.svg` (70 px в сетках, 80 px в преимуществах), единый стиль, чёрно-оранжевые.
- Стрелка ссылки — 27 × 11 px, оранжевая (`arrow.png` → локальная `arrow.svg`).
- Шеврон программы — 20 × 20 (`right-arrow.svg`).
- Кавычки-акцент — 60 × 60 белые (`quotes.svg`) перед заголовками тёмных форм и блока «Почему».
- Закрытие попапа — белый крест на жёлтом круге 56 px (`.btn_close`).
- Фотографии: прямоугольные фото событий, круглые портреты (150 px в сетке, 370 px у автора), скриншот сертификата с тенью.
- Логотипы: белый и чёрный SVG, 265–268 px.

## 9. Адаптивность и доступность

- Брейкпоинты: `1400`, `1270`, `1100`, `1000`, `750` px (`adaptive.css`). Мобильный viewport — фиксированные **360 px** (скрипт в `<head>` подставляет `width=360`), поэтому на 390 px остаются поля.
- Мобильные: hero по центру, H1 34 px, кнопки на всю ширину, бургер-меню, сетки в 1–2 колонки, отступы 20 px.
- Контраст (WCAG 2.2): белый на градиенте CTA 2.63–3.95:1 — ниже AA; `#ff5900` на белом 3.14:1 — только крупный текст; `#3d3d54` на белом 10.53:1 — AAA; `#646464` 5.92:1 — AA; `#808080` 3.95:1 — ниже AA; `#969696` 2.96:1 — ниже AA; белый на `#0d0d0d` 19.44:1 — AAA.
- Фокус: глобальный `outline: none !important` — клавиатурный фокус не виден. Обязательно добавить `:focus-visible`.
- `alt` у части изображений пустой, у портретов и логотипов событий нужен осмысленный.
- Есть отдельная версия для слабовидящих (`bvi.min.css`, `global_bvi.min.js`).
- `lang="ru-RU"`, корректная иерархия H1 → H2 → H3, но `<title>` в разметке закомментирован (пустой title).

## 10. Токены (CSS)

```css
:root {
  --color-primary: #ff5900;
  --color-primary-hover: #ff5f01;
  --color-gradient-start: #ff7900;
  --color-gradient-end: #ff0e00;
  --color-black: #000000;
  --color-ink: #0d0d0d;
  --color-white: #ffffff;
  --color-text: #3d3d54;
  --color-gray: #646464;
  --color-gray-2: #808080;
  --color-gray-3: #969696;
  --color-line: #d0d0d0;
  --color-bg-light: #f2f5fd;
  --color-bg-strip: #6b7275;
  --color-info: #0099ff;
  --color-info-notch: #c9d7ff;

  --font-family: 'Montserrat', Tahoma, Arial, sans-serif;
  --font-light: 300; --font-regular: 400; --font-semibold: 600;
  --font-bold: 700; --font-black: 800;

  --text-h1: 45px; --text-h2: 40px; --text-h2-xl: 50px;
  --text-h3: 20px; --text-body: 16px; --text-small: 15px;

  --container: 1080px; --container-wide: 1140px; --container-narrow: 970px;
  --section-y: 90px;

  --radius: 0px; --radius-pill: 60px; --radius-circle: 50%;
  --transition: 0.2s ease;
  --shadow-photo: 5px 4px 18px 1px rgba(0,0,0,.25);
}
```

## Notas

- Сайт — кастомный статический лендинг, не конструктор. Платформа: собственный HTML + `main.css` / `adaptive.css`, jQuery 3.5, magnific-popup, nethouse-обработчик форм, скрипт версии для слабовидящих.
- Снято только `/`; остальные маршруты (`/program`, `/privacy`, `/how-to-buy`, `/SPfrankel`) недоступны вместе с хостом. `/program` присутствует в меню и упоминается в FAQ, но не проверен.
- В разметке скрыты (`display: none`) секции «Как проходит обучение», «Эксперты», «Сертификат», FAQ и две промежуточные формы — их стили сохранены в CSS и включены в дизайн-систему как резервные компоненты.
- Фоновые фото `back_evm.jpg` / `back_evm_mob.jpg` и мелкая графика в архив не попали — заменены градиентом и SVG в тех же размерах; остальные 45+ изображений оригинальные. Подробности — в `README.md` и `source/NOTE.md`.
- Скриншоты: `screenshots/desktop/` (1440 px) и `screenshots/mobile/` (390 px), плюс снимки самой витрины (`screenshots/styleguide*.png`). Живая витрина токенов — `styleguide.html`; Montserrat продублирован локально в `assets/fonts` (OFL), поэтому витрина работает без интернета.
