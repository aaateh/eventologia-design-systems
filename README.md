# Дизайн-системы Ивентологии

Две визуальные дизайн-системы, собранные из локальных бэкапов.

| Система | Описание | Онлайн |
|---|---|---|
| **Eventologia.ru** | Основной сайт: палитра, типографика, шапка и меню, кнопки, формы, карточки, футер, тёмная тема, токены. | [Открыть](https://aaateh.github.io/eventologia-design-systems/eventologia-ru/) |
| **Event-профи** | Страница курса event-manager1.eventologia.ru: Montserrat, тёмный hero, CTA, тарифы, формы, классы `.em-*` и токены `--em-*`. | [Открыть](https://aaateh.github.io/eventologia-design-systems/event-manager1/) |

**Галерея:** https://aaateh.github.io/eventologia-design-systems/

## Структура

```
docs/
  index.html                  — галерея
  eventologia-ru/             — первая система
  event-manager1/             — вторая система
```

## Что внутри каждой папки

- `index.html` — визуальный гайд (открывается без сборки).
- CSS/JS и `assets/` — стили, компоненты, шрифты, логотипы, фотографии.
- `design*.md` — текстовая версия дизайн-системы.
- `tokens` / `design-tokens.css` — готовые переменные.

## Обновление

1. Измените файлы в `docs/<система>/`.
2. `git add . && git commit -m "Update <система>" && git push`.
3. GitHub Pages пересоберёт сайт автоматически.

## Источники

- eventologia.ru — локальный бэкап WordPress-темы `smm`.
- event-manager1.eventologia.ru — архивная копия страницы курса «Event-профи».
- Собрано: 10/11/2026.
