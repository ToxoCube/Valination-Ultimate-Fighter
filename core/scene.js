const Scene = (() => {
  const scenes = {};
  let current = null;
  let currentName = null;

  function register(name, scene) {
    scenes[name] = scene;
  }

  function set(name, params) {
    const next = scenes[name];
    if (!next) throw new Error(`Scene not registered: ${name}`);

    if (current && typeof current.onExit === "function") current.onExit();
    current = next;
    currentName = name;
    if (typeof current.onEnter === "function") current.onEnter(params);
  }

  function update() {
    if (current && typeof current.update === "function") current.update();
  }

  function draw() {
    if (current && typeof current.draw === "function") current.draw();
  }

  function getCurrentName() {
    return currentName;
  }

  return { register, set, update, draw, getCurrentName };
})();

