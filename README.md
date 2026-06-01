# StudyGrove 🌿

App de seguimiento de estudio con ranking, amigos, desafíos y chat en tiempo real.

## ⚡ Configuración Firebase (OBLIGATORIO)

En tu consola de Firebase → Realtime Database → **Reglas**, pegar esto y publicar:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 🚀 Subir a GitHub Pages

1. Subir todos los archivos al repo
2. Settings → Pages → Branch: main → / (root) → Save
3. Abrir: `https://tuusuario.github.io/nombre-repo/`

## 📁 Archivos

| Archivo | Descripción |
|---|---|
| `index.html` | Interfaz principal |
| `app.js` | Lógica principal + Firebase |
| `style.css` | Estilos principales |
| `firebase-multiplayer.js` | Módulo multijugador |
| `multijugador.css` | Estilos multijugador |
