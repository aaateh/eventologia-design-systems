# Дизайн-система eventologia.ru

> Источник: локальный бэкап WordPress-темы `smm` | Дата: 10/11/2026 | Уровень: Completo (локальные файлы, без браузера) | Страницы: шаблоны главной, карточек, услуг, курсов, форм, попапов, cookie-баннера

## 0. Общий стиль и визуальное направление

Сдержанный деловой стиль: белые поверхности на светло-сером фоне, тонкие серые линии, крупная геометрическая типографика Futura и единственный яркий акцент — оранжевый. Иерархия строится на размере шрифта, сетке и воздухе, а не на декоре: градиентов, тяжёлых теней и иллюстраций нет. Фотографии — реальные события, 16:9, без фильтров.

- **Один акцент** — `#F74200` только для действий: кнопки, ссылки, даты, активные состояния. Не использовать для больших фонов.
- **Типографика вместо декора** — Futura Demi/Medium в заголовках, Open Sans в тексте, uppercase в навигации.
- **Воздух и линии** — контейнер 1180px, отступы 20–80px, рамки 1px, тени только у попапов и выпадающих меню.
- **Документальная фотография** — реальные события, пропорция 56% (`padding-top`), `object-fit: cover`.

Живой визуальный гайд: [`index.html`](index.html) — палитра, шрифты, шапка и меню, кнопки, формы, карточки, футер, тёмная тема.

## 1. Палитра

| Роль | HEX | Где используется |
|---|---|---|
| Основной акцент | `#F74200` | кнопки, ссылки, ховеры навигации, даты событий, суммы, иконки |
| Акцент попапов | `#EC462E` | кнопка в попапах v1–v4 (отличается от основного акцента) |
| Оранжевый старых попапов | `#FF6600` | submit в `.popup_type1`, выделения в подзаголовках |
| Оранжевый услуг | `#FF4400` | рамка/фон `.event_support_btn`, кнопки курсов |
| Подсветка текста | `#FF7330` | `.text_orangesel` в контенте |
| Тёмный фон / текст | `#000000` | текст, тёмная тема `.black` |
| Белый | `#FFFFFF` | шапка, навигация, карточки, текст на акценте |
| Фон страницы | `#F2F2F2` | `body` |
| Футер | `#ECECEC` | `footer`, `.copyright_block`, нижние блоки баннеров |
| Текст футера | `#3D3D3D` | футер, копирайт |
| Вторичный текст | `#7B7B7B` | слоган, «Подробнее», ссылки-подписи |
| Дата поста | `#99A0A4` | `.post_date` |
| Текст карточек курсов | `#212121` | описания и отзывы на страницах курсов |
| Иконки служебные | `#9D9E9E` | Search_Icon, More_Info_Icon |
| Дисклеймер попапа | `#AEAEAE` | `.popup-disclaimer`, иконка подписки |
| Границы навигации | `#D9D9D9` | рамки блока меню |
| Границы карточек/баннера | `#BFBFBF`, `#B9B9B9` | карточки, `.main_banner` |
| Границы полей | `#EAEAEA` | `.contacts_form` |
| Границы полей попапа | `#D0D0D0` | `.popup-form input` |
| Границы карточек курсов | `#D5D5D5` | `.video_course_post`, `.video_course_block` |
| Серый фон кнопки | `#E5E5E5` | `.more_info` |
| Активный фильтр | `#E2E2E2` | `.filter_box a`, категории курсов |
| Тег категории | `#EEEFF0` | фон `.category_name` |
| Блок подписки | `#6B7275` | `.feedback_block` |
| Хинты | `#606060`, `#727272` | подсказки, дисклеймеры |
| Тёмная навигация | `#151515` | рамка `.black .navigation_block` |
| Cookie-баннер | `#F01A24` | ссылки и кнопка `#cookie_alert__ok` |
| Кнопка покупки курса | `#4285F4` | `.buy_videocourse` |
| Синяя ссылка в «О нас» | `#2356FF` | `.about__item_description p a` |

Частота в `main.css`: `#FFF` — 67, `#F74200` — 56, `#000` — 20, `#969696` — 7, `#FF4400` — 6, `#FF6600` — 5.

## 2. Типографика

**Шрифты (все локальные, `@font-face` в шапке):**

| Семейство | Роль | Насыщенность |
|---|---|---|
| `FuturaDemiC` | заголовки, кнопки, навигация, цены | 700 (файл Demi) |
| `FuturaMediumC` | заголовки карточек, подзаголовки, кнопка попапа | 500 |
| `FuturaBookC` | кнопки, UI-текст, футер, даты | 400 |
| `FuturaLightC` | лиды, описания, поля ввода | 300 |
| `OpenSansRegular` | базовый и контентный текст | 400 |
| `OpenSansBold` | акценты в тексте | 700 |
| `PTSerif` | слоган в шапке, фильтры-чипы | 400 |

**Шкала:**

| Элемент | Размер / интерлиньяж | Шрифт |
|---|---|---|
| H1 страницы | 55/1.1 | FuturaDemiC |
| `.title` (крупный заголовок) | 50/1.2 | FuturaDemiC |
| H1 контента | 36/1.2–1.4 | FuturaDemiC |
| H2 | 30/1.4 | FuturaDemiC |
| H3 | 24–26/1.2 | FuturaDemiC |
| H4 секции | 30/1.1 | FuturaDemiC |
| H5 | 26–28/1.1 | FuturaDemiC |
| H6 / цена | 20–30/1.2 | FuturaMediumC / FuturaLightC |
| Заголовок карточки | 24/1.1 | FuturaMediumC |
| Малый заголовок карточки | 18/1.1 | FuturaDemiC |
| Основной текст | 14 (база), 16/1.8 (контент) | OpenSansRegular |
| Лид / описание | 20–24/1.3 | FuturaLightC |
| Навигация | 15 uppercase | FuturaDemiC |
| Кнопка | 18/1 | FuturaBookC (иногда Demi) |
| Кнопка попапа | 28/1 uppercase | FuturaMediumC |
| Заголовок попапа | 36/1.1 | FuturaDemiC |
| Тег категории | 13/15 | OpenSansRegular |
| Дата поста | 13/1.4 | FuturaBookC |

Особенности: навигация и служебные кнопки — `text-transform: uppercase`; в формах `letter-spacing: 1px`; слоган в шапке — 18/1.2 PTSerif, цвет `#7B7B7B`, по центру. Старые попапы: заголовок 33px, подзаголовок 20px, поля 26px, кнопка 22px с `letter-spacing: 3px`.

## 3. Кнопки

| Класс | Фон | Текст | Размер | Радиус | Особенности |
|---|---|---|---|---|---|
| `.button` / `.button_orange` | `#F74200` | `#FFF`, 18px FuturaBookC | h 40px, padding 0 20px 1px | 6px | базовая, transition .2s |
| `.main_form_btn` | `#F74200` | 18px FuturaBookC | — | 5px | letter-spacing 1px |
| `.service_btn` | `#F74200` | 18/20 uppercase FuturaDemiC | padding 18px 20px 14px | **0** | прямоугольная |
| `.event_support_btn` | `#FF4400` | 16/20 uppercase FuturaDemiC | padding 18px 20px 14px | 0 | рамка 2px `#FF4400` |
| `.more_info` | `#E5E5E5` | 18 uppercase FuturaDemiC | padding 15px 30px 12px | 5px | hover → `#F74200` + белый текст |
| `.button_es` | `#F74200` | 18/1 FuturaBookC | h 40px, padding 0 30px | 5px | широкая |
| `.banner_button` | `#F74200` | 18px FuturaMediumC | h 58px, w 300px | **10px** | баннеры, hover scale 1.1 |
| `.more_posts_link` | `#EFEFEF` | 15/20 OpenSans | padding 14px 0 | 2px | «Показать ещё» |
| `.question_form button` | `#F74200` | 18/1 FuturaBookC | h 40px, 100% | 5px | форма вопроса |
| `.popup--custom .button` | `#EC462E` | 28/1 uppercase FuturaMediumC | padding 20px 25px | 10px | попапы v1–v4, ширина 100% |
| `.popup_type1` submit | `#FF6600` | 22px uppercase FuturaDemiC | h 60–70px | 0 | letter-spacing 3px |
| `#cookie_alert__ok` | `#F01A24` | 16px, `#FFF` | h 40px, w 100px | 4px | cookie-баннер |
| `.buy_videocourse` | `#4285F4` | 18px FuturaMediumC | 256×50 | 100px | покупка курса |
| `.program_button` | `#E8E8E8` | 18px, `#FF4400` | 256×50 | 100px | программа курса |
| кнопка карточки курса | `#E6E6E6` | 20px, `#FF4400` | 224×50 | 100px | внизу карточки |
| `.footer_prediction` | `#F74200` | 18px FuturaBookC | padding 10px | 6px | сезонная кнопка в футере |

Ховеры: навигация и ссылки — `#F74200`; `.read_more` — `#7B7B7B → #000`; карточка — заголовок становится `#F74200`; cookie-кнопка — scale 1.1.

## 4. Формы и поля ввода

- **`.question_form`** (основная): поля 100%, h 40px, рамка `2px solid #ccc`, радиус 5px, текст 16/1 FuturaLightC, `letter-spacing: 1px`; textarea 90px; кнопка на всю ширину.
- **`.contacts_form`**: поля h 44px, рамка `1px solid #EAEAEA`, padding 3px 15px, отступ 26px; textarea min-height 120px.
- **`.feedback_form`** (тёмный блок): прозрачные поля с рамкой `2px solid #FFF`, радиус 5px, белый текст и placeholder; submit — оранжевый.
- **Попапы v1–v4**: поля h auto, padding 17px, радиус 10px, рамка `1px solid #D0D0D0`, отступ 15px; дисклеймер 15/1.3 `#AEAEAE`; кнопка в футере формы (`.popup-button`: padding-top 20, margin-top 40, border-top 1px `#AEAEAE`).
- **Старые попапы `.popup_type1`**: поля без рамки, только `border-bottom: 2px solid #969696`, 26px FuturaDemiC; placeholder `#969696`.
- **Чекбокс согласия**: квадрат 20×20, рамка 1px (`#000` или `#EAEAEA`), галочка SVG, подпись 13–15px.
- **Cookie-баннер**: белая карточка 750×70, радиус 4px, тень `0 0 20px 1px rgba(0,0,0,.1)`, текст 14px/130%, ссылки `#F01A24` с подчёркиванием.
- Ошибка e-mail: красный текст 15px, выводится псевдоэлементом.
- Фокус: глобально `outline: none` — **проблема доступности**, нужно добавить видимый focus-ring.

## 5. Вход / Регистрация

**Не проверено:** в бэкапе нет шаблонов `login`, `register`, `signin`, `signup`, нет ссылок на вход или личный кабинет в шапке. Социальный OAuth отсутствует. Все формы на сайте — подписка, вопрос команде, заявка из попапа, cookie-согласие. Страница `page-personal.php` — политика обработки персональных данных, не авторизация.

## 6. Навигация (шапка и футер)

**Шапка** — белая, padding 20px 0, три зоны:
- логотип `.logo` (SVG, высота 54px; белая версия для тёмной страницы);
- слоган `.motto h1` — 18/1.2 PTSerif, `#7B7B7B`, по центру; скрывается на мобиле;
- контакты `.h_address`: телефон 19px FuturaDemiC, e-mail 16px FuturaBookC `#F74200`.

**Меню** `.navigation_block`:
- белая полоса с рамками `1px #D9D9D9`, ссылки 15px FuturaDemiC uppercase, padding 15px 0 12px, ховер `#F74200`;
- справа — поиск `.search_link` (иконка 23×23) и соцсети: VK, YouTube, подкаст, Telegram (иконки 21–28px);
- мобильное меню: гамбургер `.nav_icon` 30×18 (полоски 2px), выезжающая панель `nav` шириной 320px справа, оверлей `.navigation_block_close`.

**Футер**:
- блок подписки `.feedback_block` — фон `#6B7275`, padding 25px, белый текст, форма в 3 колонки;
- оранжевая полоса `.question_bottom` `#F74200` с формой вопроса (контейнер 1140px);
- основной футер `#ECECEC`, высота 140px, текст `#3D3D3D`: логотип, телефон, e-mail, копирайт, ссылки на политику и согласие, разработчики;
- поиск в попапе `.search_popup`: заголовок 30px, поле 30px FuturaDemiC с белым подчёркиванием 2px.

**Тёмная тема** `.black`: шапка, меню, футер и копирайт — `#000` с белым текстом, рамка меню `#151515`, иконки и логотип — белые.

Живые примеры шапки, меню, мобильной панели и тёмной темы — в визуальном гайде, раздел 04.
Готовый компонент: `design-system/components/navigation.html` (+ `navigation.css`, `navigation.js`).

## 7. Отступы, радиусы и тени

- Контейнер: `max-width: 1180px`, padding `0 20px`, по центру; узкий контейнер блока вопроса — 1140px.
- `body` — `#F2F2F2`; шапка — 20px по вертикали; футер — 140px.
- Главная — flex-сетка `.main_box`: 3 колонки по 31.33%, 2 колонки по 48%, широкая карточка 98%, промежутки `margin: 10px 1%`.
- Карточки списков: картинка 40% / текст 60%; пропорция изображения — `padding-top: 56%`, `object-fit: cover`; карточка курса — 64.32%.
- Секции услуг: padding `80px 0`; блоки «О нас»/кейсы — 40–60px.
- Попапы: v1–v3 — 560px, padding 32–40px; v4 — до 960px; старый попап — 630px; cookie — 750×70.
- Радиусы: 0 (попап, старый попап, `.service_btn`), 2px (теги, «ещё»), 3px (категории), 4px (cookie, чипы курсов), 5px (кнопки/поля), 6px (базовая кнопка), 10px (поля и кнопка попапа, баннерная кнопка), 20px (рамки баннеров 4–6), 100px (круглые кнопки курсов), 50% (аватары).
- Тени: выпадающее меню — `0 2px 16px 0 rgba(0,0,0,.37)`; попап — `0 20px 70px 3px rgba(41,41,41,.1)`; подпись на фото — `0 -15px 20px 10px rgba(0,0,0,.7)`; cookie — `0 0 20px 1px rgba(0,0,0,.1)`.
- Оверлеи: общий — `rgba(0,0,0,.8)`, попап — `rgba(0,0,0,.68)`.
- Градиентов нет. Декор: рамки 1–5px, оранжевые звёздочки-маркеры, подчёркивания 3–5px, галочки в списках.

## 8. Иконография и изображения

- Иконки — SVG, преимущественно заливка `#F74200`: VK, Instagram, Facebook, Telegram, YouTube, Arrow, Price, Teacher, Time, media; логотип старой версии — тоже `#F74200`.
- Служебные иконки: поиск и «подробнее» — `#9D9E9E`; иконка подписки — `#AEAEAE`; белые версии — логотип и поиск.
- PNG-иконки: телефон 27×32, почта 24×20, галочка 30×25, чекбокс 20×20, крестики 26×27 / 30×30 / 42×42, стрелки 16×31 и 12×7, ссылка 25×14, лоадеры 90×120.
- Логотипы: `logo.svg` / `logo_white.svg` (шапка), `f_logo.svg` / `f_logo_white.svg` (футер), полный набор favicon.
- Фотографии: пропорция 56% (`padding-top`), `object-fit: cover`; карточки главной — сетка 3/2/1, две широкие карточки с подписью поверх фото на полупрозрачной подложке.
- Ленивая загрузка: `blank.png` + `data-imgsrc`; адаптивные баннеры — `img.full` / `img.mob`, `video.full` / `video.mob`; в попапе v4 — `<picture>` с двумя `source`.
- YouTube-превью — `hqdefault.jpg`; фоны услуг — `services_img_1..4.jpg` через `background`.
- Лайтбокс галереи (colorbox): затемнение `#000`, стрелки `Arrow.svg` 40×24, подпись 18px белым, лоадер 120×120.
- **Важно:** CSS ссылается на `/images/*` в корне сайта, но в бэкапе этой папки нет; те же иконки лежат в `wp-content/themes/smm/img/`.

## 9. Адаптивность и доступность

**Брейкпоинты:** 1270, 1260, 1200, 1150, 1100, 1030, 1000, 960, 930, 768, 750, 640, 576, 555, 499.

- **≤1030**: уменьшаются заголовки карточек и баннера.
- **≤960**: блок подписки в колонку; карточки главной — 70% ширины.
- **≤750**: скрывается слоган; появляется гамбургер; меню — панель 320px справа; формы в одну колонку; попапы на всю ширину, max-height и скролл.
- **≤640**: шапка в колонку; карточки в одну колонку; футер в колонку; `.title` → 34px.
- **≤576**: попапы — заголовок 26px, кнопка 18px, поля и отступы компактнее; cookie-баннер — на всю ширину, кнопка 100%.

**Доступность:**
- глобальный `outline: none` — клавиатурный фокус не виден; нужен кастомный focus-ring;
- контраст `#F74200` на белом ≈ 3.7:1 — только для крупного текста и элементов управления, не для мелкого текста (WCAG AA);
- `#7B7B7B` на белом ≈ 4.2:1 — на границе нормы; `#99A0A4` (даты) ≈ 2.7:1 — ниже нормы;
- H1 на всех страницах — один и тот же слоган, иерархия заголовков нарушена;
- гамбургер и часть кликабельных элементов — `div` без роли и `aria-label`;
- у полей форм нет `<label>`, только placeholder;
- кнопки высотой 40px — минимальный комфортный размер, на мобиле часть ссылок мельче.

## 10. Готовые токены (CSS)

```css
:root {
  /* Цвета */
  --color-primary: #F74200;
  --color-primary-alt: #FF6600;
  --color-primary-border: #FF4400;
  --color-primary-soft: #FF7330;
  --color-popup-accent: #EC462E;
  --color-cookie-accent: #F01A24;
  --color-info: #4285F4;
  --color-link-blue: #2356FF;

  --color-bg: #F2F2F2;
  --color-surface: #FFFFFF;
  --color-surface-muted: #EFEFEF;
  --color-footer: #ECECEC;
  --color-subscribe: #6B7275;
  --color-button-secondary: #E5E5E5;
  --color-filter-active: #E2E2E2;
  --color-tag-bg: #EEEFF0;

  --color-text: #000000;
  --color-text-body: #212121;
  --color-text-muted: #7B7B7B;
  --color-text-footer: #3D3D3D;
  --color-text-date: #99A0A4;
  --color-text-hint: #606060;
  --color-text-disclaimer: #727272;
  --color-text-popup-muted: #AEAEAE;
  --color-icon-muted: #9D9E9E;

  --color-border: #BFBFBF;
  --color-border-banner: #B9B9B9;
  --color-border-nav: #D9D9D9;
  --color-border-light: #EAEAEA;
  --color-border-popup: #D0D0D0;
  --color-border-course: #D5D5D5;
  --color-border-dark: #151515;

  /* Шрифты */
  --font-display: "FuturaDemiC", "Futura", Arial, sans-serif;
  --font-medium: "FuturaMediumC", "Futura", Arial, sans-serif;
  --font-book: "FuturaBookC", "Futura", Arial, sans-serif;
  --font-light: "FuturaLightC", "Futura", Arial, sans-serif;
  --font-body: "OpenSansRegular", "Open Sans", Arial, sans-serif;
  --font-body-bold: "OpenSansBold", "Open Sans", Arial, sans-serif;
  --font-serif: "PTSerif", Georgia, serif;

  /* Размеры текста */
  --text-h1: 55px;
  --text-title: 50px;
  --text-h1-content: 36px;
  --text-h2: 30px;
  --text-h3: 26px;
  --text-h4: 30px;
  --text-h5: 28px;
  --text-h6: 22px;
  --text-card: 24px;
  --text-card-sm: 18px;
  --text-lead: 20px;
  --text-body: 16px;
  --text-base: 14px;
  --text-small: 13px;
  --text-button: 18px;

  --leading-tight: 1.1;
  --leading-snug: 1.2;
  --leading-normal: 1.4;
  --leading-relaxed: 1.8;

  /* Радиусы */
  --radius-xs: 2px;
  --radius-sm: 3px;
  --radius-chip: 4px;
  --radius-md: 5px;
  --radius-btn: 6px;
  --radius-lg: 10px;
  --radius-xl: 20px;
  --radius-pill: 100px;
  --radius-circle: 50%;

  /* Отступы */
  --space-xs: 5px;
  --space-sm: 10px;
  --space-md: 15px;
  --space-lg: 20px;
  --space-xl: 30px;
  --space-2xl: 40px;
  --space-3xl: 60px;
  --space-section: 80px;

  /* Сетка */
  --container: 1180px;
  --container-narrow: 1140px;
  --container-pad: 20px;
  --card-ratio: 56%;
  --course-card-ratio: 64.32%;
  --footer-height: 140px;

  /* Тени */
  --shadow-dropdown: 0 2px 16px 0 rgba(0,0,0,.37);
  --shadow-popup: 0 20px 70px 3px rgba(41,41,41,.1);
  --shadow-photo-caption: 0 -15px 20px 10px rgba(0,0,0,.7);
  --shadow-cookie: 0 0 20px 1px rgba(0,0,0,.1);
  --overlay: rgba(0,0,0,.8);
  --overlay-popup: rgba(0,0,0,.68);

  /* Анимации */
  --transition-fast: .2s;
  --transition-base: .3s;
  --transition-slow: .6s;
}
```

Этот же набор вынесен в отдельный файл `design-tokens.css` в корне проекта — его можно подключать к страницам напрямую.

Tailwind-фрагмент (в проекте Tailwind не используется, но конфиг переносим):

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#F74200', alt: '#FF6600', border: '#FF4400', soft: '#FF7330', popup: '#EC462E' },
        bg: '#F2F2F2',
        surface: '#FFFFFF',
        footer: '#ECECEC',
        subscribe: '#6B7275',
        ink: { DEFAULT: '#000000', body: '#212121', muted: '#7B7B7B', footer: '#3D3D3D', date: '#99A0A4' },
        line: { DEFAULT: '#BFBFBF', nav: '#D9D9D9', light: '#EAEAEA', popup: '#D0D0D0' }
      },
      fontFamily: {
        display: ['FuturaDemiC', 'Arial', 'sans-serif'],
        medium: ['FuturaMediumC', 'Arial', 'sans-serif'],
        book: ['FuturaBookC', 'Arial', 'sans-serif'],
        light: ['FuturaLightC', 'Arial', 'sans-serif'],
        body: ['OpenSansRegular', 'Arial', 'sans-serif'],
        serif: ['PTSerif', 'Georgia', 'serif']
      },
      borderRadius: { xs: '2px', sm: '3px', md: '5px', btn: '6px', lg: '10px', xl: '20px', pill: '100px' },
      boxShadow: {
        dropdown: '0 2px 16px 0 rgba(0,0,0,.37)',
        popup: '0 20px 70px 3px rgba(41,41,41,.1)',
        cookie: '0 0 20px 1px rgba(0,0,0,.1)'
      },
      maxWidth: { container: '1180px' }
    }
  }
};
```

## Замечания

- Бэкап содержит только тему и CSS: тексты меню, часть контента и настройки лежат в БД, поэтому пункты меню не восстановлены.
- В бэкапе нет отрендеренных страниц и папки `/images` в корне — иконки взяты из `wp-content/themes/smm/img/`.
- H1 на всех страницах — один и тот же слоган из ACF (SEO-особенность сайта).
- Кнопка попапа `#EC462E` отличается от основного акцента `#F74200`; синие `#4285F4` и `#2356FF` — наследие отдельных страниц курсов и «О нас».
- Контраст `#F74200` на белом ≈ 3.7:1: годится для крупного текста и элементов управления, но **не для мелкого текста** (WCAG AA).
- Глобальный `outline: none` и отсутствие `<label>` — обязательно исправить при переносе стиля на новые страницы.
- Проанализированы: `css/main.css` (1388 строк), `css/main_adaptive.css` (236), `popup/style.css` (290), `cookies_styles.css` (29), `fonts/Futura/stylesheet.css` (89), шаблоны `header.php`, `footer.php`, `front-page.php`, `parts/*.php`, `question_form.php`, `popup/v1–v4.php`.
