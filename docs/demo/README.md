# Curve Flow Carousel — живое демо

Автономная WebGL-карусель с изгибом ленты: drag, инерция, autoplay, клавиатура,
колесо и доступный HTML-fallback без WebGL.

- Прямая ссылка: https://aaateh.github.io/eventologia-design-systems/demo/
- Оригинал, с которого снято поведение: https://curveflowcarousel.framer.website/

Страница закрыта от индексации (`noindex, nofollow, noarchive, nosnippet,
noimageindex`) и не входит в каталог на главной. Ссылку можно передавать напрямую.

## Состав

```
demo/
  index.html              демо-страница (noindex)
  curveflow-carousel.js   сам компонент, ES-модуль
  curveflow-carousel.css  стили компонента
  assets/
    manifest.json         опись медиа (размеры, sha256, источник)
    slides/               4 фото (png) + 4 видео (mp4)
    posters/              постеры для видео (jpg)
```

Папки `tests/` и `examples/` из исходного проекта сюда намеренно не входят:
на Pages публикуется только runtime демо.

## Медиа

Фото и видео в `assets/` — демонстрационные материалы третьих лиц, взятые
с сайта-оригинала исключительно для показа работы карусели. Права на них
принадлежат их авторам; для продакшена замените файлы в `assets/slides/`
и `assets/posters/` своими и обновите `assets/manifest.json`.
