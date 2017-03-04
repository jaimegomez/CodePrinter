import Layer from 'Layer';

function checkLayer(layer) {
  if (!(layer instanceof Layer)) {
    throw new TypeError('Given layer is not an instance of Layer!');
  }
}

export function addLayer(parent, layers, layer) {
  checkLayer(layer);
  layers.add(layer);
  layer.parent = parent;
  parent.dom && mountLayer(parent.dom.screen, layer);
  layer.emit('added', parent);
  return parent;
}

export function createLayer(parent, args) {
  const layer = new Layer(...args);
  parent.addLayer(layer);
  return layer;
}

export function mountLayer(screen, layer) {
  screen.appendChild(layer.node);
  layer.emit('mounted');
}

export function mountLayers(parent, layers) {
  const { screen } = parent.dom;
  for (const layer of layers) {
    mountLayer(screen, layer);
  }
}

export function removeLayer(parent, layers, layer) {
  checkLayer(layer);
  layers.delete(layer);
  parent.dom && unmountLayer(parent.dom.screen, layer);
  layer.emit('removed', parent);
  return parent;
}

export function unmountLayer(screen, layer) {
  if (screen && layer.node.parentNode === screen) {
    screen.removeChild(layer.node);
    layer.emit('unmounted');
  }
}

export function unmountLayers(parent, layers) {
  const { screen } = parent.dom;
  for (const layer of layers) {
    unmountLayer(screen, layer);
  }
}
