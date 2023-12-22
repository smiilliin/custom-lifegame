import * as PIXI from "pixi.js";

const blockSize = 20;

class Vector2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  add(vector: Vector2) {
    return new Vector2(this.x + vector.x, this.y + vector.y);
  }
  substract(vector: Vector2) {
    return new Vector2(this.x - vector.x, this.y - vector.y);
  }
  mul(x: number) {
    return new Vector2(this.x * x, this.y * x);
  }
  div(x: number) {
    return new Vector2(this.x / x, this.y / x);
  }
  clone() {
    return new Vector2(this.x, this.y);
  }
  compare(vector: Vector2) {
    return this.x == vector.x && this.y == vector.y;
  }
  set(vector: Vector2) {
    this.x = vector.x;
    this.y = vector.y;
  }
  floor() {
    return new Vector2(Math.floor(this.x), Math.floor(this.y));
  }
  ceil() {
    return new Vector2(Math.ceil(this.x), Math.ceil(this.y));
  }
  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
const getMapVectorFromScreen = (vector: Vector2, view: PIXI.Container) => {
  return new Vector2(
    (vector.x - view.x) / view.scale.x,
    (vector.y - view.y) / view.scale.y
  );
};
const getScreenVectorFromMap = (vector: Vector2, view: PIXI.Container) => {
  return new Vector2(
    vector.x * view.scale.x + view.x,
    vector.y * view.scale.y + view.y
  );
};

const chunkSize = 64;
class Chunk {
  graphic: PIXI.Graphics;
  vector: Vector2;
  data: boolean[][];

  constructor(vector: Vector2) {
    this.vector = vector.clone();
    this.data = [];
    for (let y = 0; y < chunkSize; y++) {
      this.data.push([]);

      for (let x = 0; x < chunkSize; x++) {
        this.data[y][x] = false;
      }
    }

    this.graphic = new PIXI.Graphics();
    this.graphic.x = vector.x * chunkSize * blockSize;
    this.graphic.y = vector.y * chunkSize * blockSize;
  }
  getBlock(vector: Vector2): boolean {
    return this.data[vector.y][vector.x];
  }
  setBlock(vector: Vector2, on: boolean = true) {
    this.data[vector.y][vector.x] = on;
  }
  update() {
    this.graphic.clear();

    this.graphic.beginFill(0xffffff);

    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        if (this.data[y][x]) {
          const blockVector = new Vector2(x, y).mul(blockSize);

          this.graphic.drawRect(
            blockVector.x,
            blockVector.y,
            blockSize,
            blockSize
          );
        }
      }
    }
    this.graphic.endFill();
  }
}
class World {
  chunks: Chunk[];
  blocksVector: Vector2[];

  constructor() {
    this.chunks = [];
    this.blocksVector = [];
  }
  toChunkVector(vector: Vector2): Vector2 {
    return new Vector2(
      Math.floor(vector.x / chunkSize),
      Math.floor(vector.y / chunkSize)
    );
  }
  getBlock(vector: Vector2): boolean {
    const chunkVector = this.toChunkVector(vector);
    const relativeVector = vector.substract(chunkVector.mul(chunkSize));

    return this.getChunk(chunkVector)?.getBlock(relativeVector) || false;
  }
  setBlock(
    vector: Vector2,
    view: PIXI.Container,
    on: boolean = false,
    update: boolean = true
  ): Chunk {
    const chunkVector = this.toChunkVector(vector);
    const relativeVector = vector.substract(chunkVector.mul(chunkSize));

    let chunk = this.getChunk(chunkVector);
    if (chunk) {
      chunk.setBlock(relativeVector, on);
      if (update) chunk.update();
    } else {
      chunk = new Chunk(chunkVector);
      chunk.setBlock(relativeVector, on);
      this.addChunk(chunk, view);
      if (update) chunk.update();
    }

    if (on) {
      this.blocksVector.push(vector);
    } else {
      this.blocksVector = this.blocksVector.filter((v) => !v.compare(vector));
    }

    return chunk;
  }
  getChunk(vector: Vector2): Chunk | undefined {
    return this.chunks.find((chunk) => chunk.vector.compare(vector));
  }
  getChunkFromBlock(vector: Vector2): Chunk | undefined {
    const chunkVector = vector.div(chunkSize).floor();
    return this.getChunk(chunkVector);
  }
  addChunk(chunk: Chunk, view: PIXI.Container) {
    this.chunks.push(chunk);
    chunk.update();
    view.addChild(chunk.graphic);
  }
}

interface IUpdate {
  on: boolean;
  vector: Vector2;
}
const toUniqueVectorArray = (array: Vector2[]): void => {
  for (let i = 0; i < array.length; i++) {
    for (let j = i + 1; j < array.length; j++) {
      if (array[i].compare(array[j])) {
        array.splice(j, 1);
        j--;
      }
    }
  }
};
class Game {
  view: PIXI.Container;
  world: World;
  started: boolean;
  lastTick: number;
  tickInterval: number = 100;
  live = [2, 3];
  death = [3];

  constructor(view: PIXI.Container) {
    this.view = view;
    this.lastTick = Date.now();
    this.started = false;

    const chunkVectors = [
      new Vector2(0, 0),
      new Vector2(1, 0),
      new Vector2(1, 1),
      new Vector2(0, 1),
    ];
    this.world = new World();
    chunkVectors.forEach((vector) => {
      const chunk = new Chunk(vector);
      view.addChild(chunk.graphic);

      this.world.addChunk(chunk, view);
    });
  }
  start() {
    this.started = true;
  }
  stop() {
    this.started = false;
  }
  isStarted() {
    return this.started;
  }

  private ticker() {
    if (this.started) {
      const nowMS = Date.now();
      if (nowMS - this.lastTick >= this.tickInterval) {
        this.lastTick = nowMS;

        const toCheckVectors: Vector2[] = [];
        const roundVectors = [
          new Vector2(-1, -1),
          new Vector2(0, -1),
          new Vector2(1, -1),
          new Vector2(-1, 0),
          new Vector2(1, 0),
          new Vector2(-1, 1),
          new Vector2(0, 1),
          new Vector2(1, 1),
        ];

        this.world.blocksVector.forEach((blockVector) => {
          toCheckVectors.push(blockVector);
          roundVectors.forEach((roundVector) => {
            toCheckVectors.push(blockVector.add(roundVector));
          });
        });

        toUniqueVectorArray(toCheckVectors);

        const toUpdateChunks: Chunk[] = [];
        const toUpdateBlocks: IUpdate[] = [];

        toCheckVectors.forEach((blockVector) => {
          let count = 0;
          roundVectors.forEach((roundVector) => {
            if (this.world.getBlock(blockVector.add(roundVector))) {
              count++;
            }
          });

          let chunk: Chunk | undefined;
          if (this.world.getBlock(blockVector)) {
            // if (!(count == 2 || count == 3)) {
            if (this.live.indexOf(count) == -1) {
              chunk = this.world.getChunkFromBlock(blockVector);
              toUpdateBlocks.push({ on: false, vector: blockVector });
            }

            if (!chunk) return;
          } else {
            // if (count == 3) {
            if (this.death.indexOf(count) != -1) {
              chunk = this.world.getChunkFromBlock(blockVector);
              toUpdateBlocks.push({ on: true, vector: blockVector });
            } else {
              chunk = this.world.getChunkFromBlock(blockVector);
              toUpdateBlocks.push({ on: false, vector: blockVector });
            }
          }

          if (!chunk) return;
          if (
            toUpdateChunks.findIndex((c) => c.vector.compare(chunk!.vector)) ==
            -1
          ) {
            toUpdateChunks.push(chunk);
          }
        });

        toUpdateBlocks.forEach((block) =>
          this.world.setBlock(block.vector, this.view, block.on, false)
        );
        toUpdateChunks.forEach((chunk) => chunk.update());
      }
    }
  }
  getTicker() {
    return this.ticker.bind(this);
  }
}

export {
  Game,
  getMapVectorFromScreen,
  getScreenVectorFromMap,
  Vector2,
  blockSize,
  chunkSize,
  Chunk,
};
