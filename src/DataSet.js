import earcut from 'earcut';
import { vec2, vec3 } from 'gl-matrix';
import rgb from 'hsv-rgb';
import { Noise } from 'noisejs';
import polylabel from 'polylabel';
import Status from './Status';

class DataSet {
  static fetch({ username, query }) {
    // TODO: [Optimization] Parse the WKB binary instead of requesting GeoJSON
    Status.update('Downloading dataset...');
    return fetch(`https://${username}.carto.com/api/v2/sql?format=GeoJSON&q=${encodeURIComponent(query)}`)
      .then((response) => {
        if (response.status !== 200) throw new Error();
        return response.json();
      })
      .then(DataSet.parse);
  }
  static parse({ features }) {
    const noise = new Noise();
    const RAD2DEG = 180 / Math.PI;
    const PI_4 = Math.PI / 4;
    const project = polygon => polygon.map(coordinates => coordinates.map(position => ([
      position[0],
      Math.log(Math.tan(((position[1] / 90) + 1) * PI_4)) * RAD2DEG,
    ])));
    const aabb = coordinates => coordinates.reduce(({ min, max }, position) => {
      vec2.min(min, min, position);
      vec2.max(max, max, position);
      return { min, max };
    }, {
      min: vec2.fromValues(Number.MAX_VALUE, Number.MAX_VALUE),
      max: vec2.fromValues(-Number.MAX_VALUE, -Number.MAX_VALUE),
    });
    const offset = (vertices, offset) => vertices.map((coord, index) => (
      coord - offset[index % 2]
    ));
    const normal = (v1, v2, v3) => {
      const u = vec3.subtract(vec3.create(), v2, v1);
      const v = vec3.subtract(vec3.create(), v3, v1);
      const n = vec3.cross(vec3.create(), u, v);
      vec3.normalize(n, n);
      return n;
    };

    return new Promise((resolve) => {
      Status.update('Parsing/Meshing dataset...');
      setImmediate(() => {
        // TODO: [Optimization] Do this inside WebWorkers (in parallel?)
        const meshes = [];
        const min = vec2.fromValues(Number.MAX_VALUE, Number.MAX_VALUE);
        const max = vec2.fromValues(-Number.MAX_VALUE, -Number.MAX_VALUE);
        features.forEach(({ geometry, properties }) => {
          // TODO: [Incomplete]
          // Should take all the polygons, but i'm keeping it simple...
          // There's only 64 features with more than one polygon in the demo dataset, though
          const coordinates = project(geometry.coordinates[0]);
          const bounds = aabb(coordinates.reduce((sum, coords) => [...sum, ...coords], []));
          const position = polylabel(coordinates);
          vec2.min(min, min, position);
          vec2.max(max, max, position);
          const polygon = earcut.flatten(coordinates);
          const vertices2D = offset(polygon.vertices, position);
          const indices = earcut(vertices2D, polygon.holes, polygon.dimensions);
          const count2D = indices.length;
          const height = properties.numfloors * 0.00004;
          const vertices = [];
          for (let i = 0; i < vertices2D.length; i += 2) {
            vertices.push(vertices2D[i], vertices2D[i + 1], height, 0, 0, 1);
          }
          if (properties.numfloors) {
            /* Extrude the polygon edges */
            let index = vertices2D.length / 2;
            for (let i = 0; i < vertices2D.length - 2; i += 2, index += 4) {
              const v1 = vec3.fromValues(
                vertices2D[i + 2],
                vertices2D[i + 3],
                0
              );
              const v2 = vec3.fromValues(
                vertices2D[i],
                vertices2D[i + 1],
                0
              );
              const v3 = vec3.fromValues(
                vertices2D[i],
                vertices2D[i + 1],
                height
              );
              const v4 = vec3.fromValues(
                vertices2D[i + 2],
                vertices2D[i + 3],
                height
              );
              const n = normal(v1, v2, v3);
              vertices.push(v1[0], v1[1], v1[2], n[0], n[1], n[2]);
              vertices.push(v2[0], v2[1], v2[2], n[0], n[1], n[2]);
              vertices.push(v3[0], v3[1], v3[2], n[0], n[1], n[2]);
              vertices.push(v4[0], v4[1], v4[2], n[0], n[1], n[2]);
              indices.push(index);
              indices.push(index + 1);
              indices.push(index + 2);
              indices.push(index + 2);
              indices.push(index + 3);
              indices.push(index);
            }
          }
          const noiseFactor = 64;
          const albedo = rgb(
            Math.min(Math.floor(Math.abs(
              noise.perlin2(
                position[0] * noiseFactor,
                position[1] * noiseFactor
              )
            ) * 359), 359),
            70,
            Math.max(Math.min(properties.numfloors * 4, 100), 40),
          );
          // TODO: [Incomplete] This should be a class?
          meshes.push({
            vertices: new Float32Array(vertices),
            indices: new Uint32Array(indices),
            albedo: vec3.fromValues(albedo[0] / 255, albedo[1] / 255, albedo[2] / 255),
            count3D: indices.length,
            bounds,
            count2D,
            position,
            properties,
          });
        });
        const center = vec2.create();
        vec2.add(center, min, max);
        vec2.scale(center, center, 0.5);
        resolve({
          center,
          meshes,
        });
      });
    });
  }
}

export default DataSet;
