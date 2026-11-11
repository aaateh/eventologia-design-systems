# Каталог дизайн-систем

Семь визуальных дизайн-систем, собранных из локальных бэкапов и живых сайтов. Один сайт — одна папка в `docs/`.

| Система | Описание | Онлайн |
|---|---|---|
| **Eventologia.ru** | Основной сайт: палитра, типографика, шапка и меню, кнопки, формы, карточки, футер, тёмная тема, токены. | [Открыть](https://aaateh.github.io/eventologia-design-systems/eventologia-ru/) |
| **Event-профи** | Страница курса event-manager1.eventologia.ru: Montserrat, тёмный hero, CTA, тарифы, формы, классы `.em-*` и токены `--em-*`. | [Открыть](https://aaateh.github.io/eventologia-design-systems/event-manager1/) |
| **Smmconfa.ru** | «Суровый Питерский Форум»: красный акцент, Liberation Sans, капс-заголовки, кнопки 88px на рамке 2px, 12 разделов и токены `.btn`, `.accordion`. | [Открыть](https://aaateh.github.io/eventologia-design-systems/smmconfa-ru/) |
| **«Суровая премия»** | marketingawards.ru: почти чёрная сцена и живой огонь, Dela Award / Involve / Golos Award, четыре роли кнопок с бегущей рамкой и пламенем, прожиг секций, 9 разделов и живой стайлгайд. | [Открыть](https://aaateh.github.io/eventologia-design-systems/marketingawards-ru/) |
| **«Белая конфа»** | whiteconf.ru: синий #0026FC, CA Saygon и Montserrat, заголовки без капса, кнопки с рамкой 4px, 12 разделов — сетка, спикеры, тарифы, корзина, токены `--wc-*`. | [Открыть](https://aaateh.github.io/eventologia-design-systems/whiteconf-ru/) |
| **«Питерский промпт»** | spbprompt.ru: тёмная сцена #0A0A0A, неон #1AFE4C, пиксельные курсоры, EdMoscow и EdJura, 13 разделов — шапка-пилюля, герой, консоль программы, билеты, токены `--ed-*`. | [Открыть](https://aaateh.github.io/eventologia-design-systems/spbprompt-ru/) |
| **SOLD OUT** | soldoutconf.ru: тёмная афишная сцена #090316, оранжевый #F74200, Alumni Sans и Montserrat, крупные тарифы и карточки спикеров, 14 разделов, паттерны, попапы, приложение с остальными блоками, токены `--color-*` и `tokens.css`, проверка доступности. | [Открыть](https://aaateh.github.io/eventologia-design-systems/soldoutconf-ru/) |

**Каталог:** https://aaateh.github.io/eventologia-design-systems/

## Навигация

На каждой странице гайда сверху общая полоса: ссылка «← Все дизайн-системы» возвращает в каталог. Разметка и геометрия полосы одинаковые на всех страницах, цвета берутся из переменных `--dsbar-*` (тёмные страницы — «Суровая премия», «Питерский промпт» и SOLD OUT — переопределяют их на тёмные).

## Структура

```
docs/
  index.html                  — каталог (галерея карточек)
  assets/dsbar.css            — общая верхняя полоса навигации
  eventologia-ru/             — система 1
  event-manager1/             — система 2
  smmconfa-ru/                — система 3
  marketingawards-ru/         — система 4
  whiteconf-ru/               — система 5
  spbprompt-ru/               — система 6
  soldoutconf-ru/             — система 7
```

## Что внутри каждой папки

- `index.html` — визуальный гайд (открывается без сборки).
- `styleguide.html` — живой стайлгайд в оформлении сайта (у «Суровой премии»).
- `tokens.css` — готовые переменные и базовые компоненты.
- `*.md` — текстовая версия дизайн-системы (полный гайд с селекторами).
- `preview.png` — превью для карточки каталога, `og.png` — обложка для соцсетей.
- CSS/JS и `assets/` — стили, компоненты, шрифты, логотипы, фотографии.

## Обновление

1. Измените файлы в `docs/<система>/`.
2. `git add . && git commit -m "Update <система>" && git push`.
3. GitHub Pages пересоберёт сайт автоматически (источник — ветка `main`, папка `/docs`).

## Источники

- eventologia.ru — локальный бэкап WordPress-темы `smm`.
- event-manager1.eventologia.ru — архивная копия страницы курса «Event-профи».
- smmconfa.ru — CSS темы `smmconfa24`, снято с прода 30/10/2026 (`DESIGN.md` в проекте админки конф).
- marketingawards.ru — текущая версия проекта `site/`: CSS, JS, шрифты и медиа, проверено в браузере 11/11/2026; стайлгайд собран из тех же файлов.
- whiteconf.ru — локальные CSS сайта (байт-в-байт с продом) + проверка computed-стилей, снято 10/11/2026.
- spbprompt.ru — Next.js-билд: computed-стили в браузере + исходные CSS-чанки, снято 10/11/2026.
- soldoutconf.ru — локальный бэкап темы WordPress `site-static/`: `style.css` (1823 строки), `program.css`, шрифты, логотипы, фото; разметка проверена по `index.php`, `partials/header.php`, `footer.php`, `modals.php`.
- Собрано: 12/11/2026.
