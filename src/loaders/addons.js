import { defineModule, requireModule } from 'helpers/loader';

const addons = new Map();
// Map { [addonName] => Addon }

export function requireAddon(addonName) {
  const name = addonName.toLowerCase();
  return requireModule(name, addons, `addons/${name}.js`);
}

export function defineAddon(...args) {
  return defineModule(addons, CodePrinter.requireAddon, null, args);
}

// export function getAddon(name) {
//   const addon = addons.get(name);
//   return addon instanceof Addon ? addon : null;
// }

// export function hasAddon(name) {
//   return addons.get(name) instanceof Addon;
// }
