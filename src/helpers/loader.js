import Deferred from 'Deferred';
import defaults from 'data/defaults';
import { load } from 'helpers/index';

function identity(a) {
  return a;
}

export function defineModule(map, requirer, moduleResolve, args) {
  const [modName, requires, resolver] = args.length === 2 ? [args[0], [], args[1]] : args;
  const name = modName.toLowerCase();

  return Promise.all(requires.map(requirer))
    .then(deps => resolver.apply(CodePrinter, deps))
    .then(moduleResolve || identity)
    .then(mod => {
      const deferr = map.get(name);
      deferr && deferr.resolve(mod);
      map.set(name, mod);
      return mod;
    })
    .catch(error => console.error(error));
}

export function requireModule(name, map, path) {
  const mod = map.get(name);

  if (mod) {
    return Promise.resolve(mod);
  }
  const deferr = new Deferred();
  map.set(name, deferr);
  (defaults.require || load)(path);

  return Promise.resolve(deferr);
}
