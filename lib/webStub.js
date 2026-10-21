// What `@expo/ui/swift-ui` (and its `/modifiers`) and the other phone-only
// modules resolve to in the browser — see metro.config.js. Every name it's asked for is a callable that renders
// nothing as a component and returns nothing as a modifier, and reaching into
// it (`shapes.capsule()`) gives the same again, so any import from SwiftUI
// loads on the web without listing them one by one. None of it is ever drawn
// there: the SwiftUI paths all sit behind an iOS check.
function stub() {
  return null;
}

const handler = {
  get(_target, key) {
    if (key === '__esModule') return true;
    if (key === 'default') return proxy;
    if (typeof key === 'symbol') return undefined;
    return proxy;
  },
};

const proxy = new Proxy(stub, handler);

module.exports = proxy;
