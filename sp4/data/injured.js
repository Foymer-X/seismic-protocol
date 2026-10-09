// ============================================================
//  HERIDOS DEL MINIJUEGO DEL BOMBERO (de izquierda a derecha)
//  needs: id del objeto (ver data/items.js) que lo atiende correctamente.
//  actor: id del personaje en data/assets.js
// ============================================================

export const INJURED = [
  {
    id: 'herido1', actor: 'injured1',
    condition: 'Sangrado abundante en el brazo que no se detiene',
    needs: 'torniquete', icon: null,
    why: 'Un sangrado abundante que no para con presión se controla con un torniquete por encima de la herida.',
  },
  {
    id: 'herido2', actor: 'injured2',
    condition: 'Raspón en la cabeza expuesto',
    needs: 'vendajes', icon: null,
    why: 'Envolver la herida evita que quede expuesta y se infecte.',
  },
  {
    id: 'herido3', actor: 'injured3',
    condition: 'Rescatista agotado a punto de desmayarse',
    needs: 'agua', icon: null,
    why: 'Hidratarse evita que el cansancio extremo termine en un desmayo.',
  },
  {
    id: 'herido4', actor: 'injured4',
    condition: 'Salió sin ropa y está bajo la lluvia',
    needs: 'cobija', icon: null,
    why: 'Cubrirse del frío y la lluvia previene la hipotermia.',
  },
];

// Objetos que deben estar en la maleta para poder jugar el minijuego.
export const AID_REQUIRED_ITEMS = INJURED.map(i => i.needs);
