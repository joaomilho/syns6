import { Mesh, Material, Color } from 'three';

export class MarchingCubes extends Mesh {
  constructor(
    resolution: number,
    material: Material,
    enableUvs?: boolean,
    enableColors?: boolean,
    maxPolyCount?: number
  );

  isMarchingCubes: boolean;
  enableUvs: boolean;
  enableColors: boolean;
  isolation: number;
  resolution: number;

  init(resolution: number): void;
  addBall(
    ballx: number,
    bally: number,
    ballz: number,
    strength: number,
    subtract: number,
    colors?: Color
  ): void;
  addPlaneX(strength: number, subtract: number): void;
  addPlaneY(strength: number, subtract: number): void;
  addPlaneZ(strength: number, subtract: number): void;
  reset(): void;
  update(): void;
}

