import earcut from 'earcut';
import { vec2, vec3 } from 'gl-matrix';
import rgb from 'hsv-rgb';
import { Noise } from 'noisejs';
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
    const chunkSize = 1000;
    const chunk = position => [
      Math.floor(position[0] * chunkSize),
      Math.floor(position[1] * chunkSize),
    ];
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
        const chunks = {};
        const meshes = [];
        const min = vec2.fromValues(Number.MAX_VALUE, Number.MAX_VALUE);
        const max = vec2.fromValues(-Number.MAX_VALUE, -Number.MAX_VALUE);
        features.forEach(({ geometry, properties }) => {
          // TODO: [Incomplete]
          // Should take all the polygons, but i'm keeping it simple...
          // There's only 64 features with more than one polygon in the demo dataset, though
          const coordinates = project(geometry.coordinates[0]);
          const bounds = aabb(coordinates.reduce((sum, coords) => [...sum, ...coords], []));
          vec2.min(min, min, bounds.min);
          vec2.max(max, max, bounds.max);
          const centroid = vec2.create();
          vec2.add(centroid, bounds.min, bounds.max);
          vec2.scale(centroid, centroid, 0.5);
          const chunkPos = chunk(centroid);
          const position = vec2.fromValues(chunkPos[0] / chunkSize, chunkPos[1] / chunkSize);
          const minChunk = chunk(bounds.min);
          const maxChunk = chunk(bounds.max);
          let mesh;
          if (minChunk[0] !== maxChunk[0] || minChunk[1] !== maxChunk[1]) {
            /* Geometry is greater than chunkSize, deserves it's own mesh */
            mesh = {
              vertices2D: [],
              indices2D: [],
              vertices3D: [],
              indices3D: [],
              bounds,
              position,
            };
            meshes.push(mesh);
          } else {
            const chunkID = `${chunkPos[0]}_${chunkPos[1]}`;
            if (chunks[chunkID]) {
              /* Add geometry to existing mesh */
              mesh = chunks[chunkID];
              vec2.min(mesh.bounds.min, mesh.bounds.min, bounds.min);
              vec2.max(mesh.bounds.max, mesh.bounds.max, bounds.max);
            } else {
              /* Create a new mesh and assign it to the chunk */
              mesh = {
                vertices2D: [],
                indices2D: [],
                vertices3D: [],
                indices3D: [],
                bounds,
                position,
              };
              chunks[chunkID] = mesh;
              meshes.push(mesh);
            }
          }
          const height = properties.numfloors * 0.00004;
          const noiseFactor = 64;
          const albedo = rgb(
            /* Pick a hue using perlin noise */
            Math.min(Math.floor(Math.abs(
              noise.perlin2(centroid[0] * noiseFactor, centroid[1] * noiseFactor)
            ) * 359), 359),
            70,
            /* Highlight the tall buildings */
            Math.max(Math.min(properties.numfloors * 4, 100), 40),
          );
          const color = vec3.fromValues(albedo[0] / 255, albedo[1] / 255, albedo[2] / 255);
          const polygon = earcut.flatten(coordinates);
          const vertices = offset(polygon.vertices, position);
          const indices = earcut(vertices, polygon.holes, polygon.dimensions);
          const offset2D = mesh.vertices2D.length / 9;
          for (let i = 0; i < vertices.length; i += 2) {
            /* 2D to 3D + normal map + color map */
            mesh.vertices2D.push(
              vertices[i], vertices[i + 1], height,
              0, 0, 1,
              color[0], color[1], color[2]
            );
          }
          indices.forEach(index => mesh.indices2D.push(offset2D + index));
          if (properties.numfloors) {
            /* Extrude the polygon edges */
            let index = mesh.vertices3D.length / 9;
            for (let i = 0; i < vertices.length - 2; i += 2, index += 4) {
              const v1 = vec3.fromValues(
                vertices[i + 2],
                vertices[i + 3],
                0
              );
              const v2 = vec3.fromValues(
                vertices[i],
                vertices[i + 1],
                0
              );
              const v3 = vec3.fromValues(
                vertices[i],
                vertices[i + 1],
                height
              );
              const v4 = vec3.fromValues(
                vertices[i + 2],
                vertices[i + 3],
                height
              );
              const n = normal(v1, v2, v3);
              mesh.vertices3D.push(
                v1[0], v1[1], v1[2], n[0], n[1], n[2], color[0], color[1], color[2],
                v2[0], v2[1], v2[2], n[0], n[1], n[2], color[0], color[1], color[2],
                v3[0], v3[1], v3[2], n[0], n[1], n[2], color[0], color[1], color[2],
                v4[0], v4[1], v4[2], n[0], n[1], n[2], color[0], color[1], color[2]
              );
              mesh.indices3D.push(
                index, index + 1, index + 2,
                index + 2, index + 3, index
              );
            }
          }
        });
        const center = vec2.create();
        vec2.add(center, min, max);
        vec2.scale(center, center, 0.5);
        resolve({
          center,
          meshes: meshes.map(({
            bounds, position, vertices2D, vertices3D, indices2D, indices3D,
          }) => ({
            vertices: new Float32Array([...vertices2D, ...vertices3D]),
            indices: new Uint16Array([
              ...indices2D,
              ...indices3D.map(index => ((vertices2D.length / 9) + index)),
            ]),
            count2D: indices2D.length,
            count3D: indices2D.length + indices3D.length,
            bounds,
            position,
          })),
        });
      });
    });
  }
}

export default DataSet;
