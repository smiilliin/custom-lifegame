import * as PIXI from "pixi.js";
import {
  Chunk,
  Game,
  Vector2,
  blockSize,
  chunkSize,
  getMapVectorFromScreen,
} from "./game";

const app = new PIXI.Application({
  background: "#000000",
  resizeTo: window,
});

const controlContainer = document.getElementById(
  "control-container"
) as HTMLDivElement;

controlContainer.onmousedown = (event) => {
  event.stopPropagation();
};
controlContainer.onmouseup = (event) => {
  event.stopPropagation();
};

document
  .getElementsByTagName("main")
  ?.item(0)
  ?.insertBefore(app.view as HTMLCanvasElement, controlContainer);

app.stage.eventMode = "static";
app.stage.hitArea = app.screen;

const view = new PIXI.Container();

app.stage.addChild(view);

const game = new Game(view);
app.ticker.add(game.getTicker());

let on: boolean;
window.addEventListener("keydown", (event) => {
  if (event.key == "Enter") {
    if (game.isStarted()) {
      game.stop();
    } else {
      game.start();
    }
  }
});

let mouseHolding = false;
app.stage.on("mousedown", (event) => {
  mouseHolding = true;
  const mouseVector = getMapVectorFromScreen(
    new Vector2(event.x, event.y),
    view
  )
    .div(blockSize)
    .floor();
  on = !game.world.getBlock(mouseVector);
  game.world.setBlock(mouseVector, view, on);
  appliedVectors.push(mouseVector);
});

const appliedVectors: Vector2[] = [];
app.stage.on("mousemove", (event) => {
  if (mouseHolding) {
    const mouseVector = getMapVectorFromScreen(
      new Vector2(event.x, event.y),
      view
    )
      .div(blockSize)
      .floor();

    if (appliedVectors.findIndex((v) => v.compare(mouseVector)) != -1) return;

    game.world.setBlock(mouseVector, view, on);
    appliedVectors.push(mouseVector);

    viewMoved();
  }
});
app.stage.on("mouseup", () => {
  mouseHolding = false;
  appliedVectors.splice(0);
});
const viewMoved = () => {
  const startVector = new Vector2(-view.x, -view.y)
    .div(view.scale.x)
    .div(blockSize)
    .div(chunkSize)
    .floor();
  const endVector = startVector
    .add(
      new Vector2(window.innerWidth, window.innerHeight)
        .div(view.scale.x)
        .div(blockSize)
        .div(chunkSize)
    )
    .ceil();

  for (let y = startVector.y; y <= endVector.y; y++) {
    for (let x = startVector.x; x <= endVector.x; x++) {
      const currentChunkVector = new Vector2(x, y);
      if (!game.world.getChunk(currentChunkVector)) {
        game.world.addChunk(new Chunk(currentChunkVector), view);
      }
    }
  }
};
app.stage.on("wheel", (event) => {
  const oldMouse = getMapVectorFromScreen(new Vector2(event.x, event.y), view);

  view.scale.x *= 1 - event.deltaY / 1000;
  view.scale.y *= 1 - event.deltaY / 1000;

  if (view.scale.x < 0.1) {
    view.scale.x = 0.1;
    view.scale.y = 0.1;
    return;
  }

  const newMouse = getMapVectorFromScreen(new Vector2(event.x, event.y), view);

  const movement = newMouse.substract(oldMouse).mul(view.scale.x);

  view.x += movement.x;
  view.y += movement.y;

  viewMoved();
});

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

for (let i = 1; i <= 8; i++) {
  const live = document.getElementById(`live-${i}`);

  if (!live) continue;
  live.onclick = (event) => {
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (target.className == "enabled") {
      target.className = "disabled";
      game.live.splice(game.live.indexOf(i), 1);
    } else {
      target.className = "enabled";
      game.live.push(i);
    }
    target.blur();
  };
}

for (let i = 1; i <= 8; i++) {
  const live = document.getElementById(`death-${i}`);

  if (!live) continue;
  live.onclick = (event) => {
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (target.className == "enabled") {
      target.className = "disabled";
      game.death.splice(game.death.indexOf(i), 1);
    } else {
      target.className = "enabled";
      game.death.push(i);
    }
    target.blur();
  };
}

const tickSpeedInput = document.getElementById(
  "tickSpeedInput"
) as HTMLInputElement;
const tickSpeed = document.getElementById("tickSpeed") as HTMLInputElement;

const onRangeChanged = () => {
  tickSpeed.textContent = `Tick speed(x1: 100ms): x${Number(
    tickSpeedInput.value
  ).toFixed(2)}`;
  game.tickInterval = 100 / Number(tickSpeedInput.value);
};
tickSpeedInput.oninput = onRangeChanged;
tickSpeedInput.onchange = onRangeChanged;

const hide = document.getElementById("hide") as HTMLParagraphElement;
const show = document.getElementById("show") as HTMLParagraphElement;

hide.onclick = () => {
  controlContainer.style.display = "none";
  show.style.display = "unset";
};
show.onclick = () => {
  controlContainer.style.display = "grid";
  show.style.display = "none";
};
