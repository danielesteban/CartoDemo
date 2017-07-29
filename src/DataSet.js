import earcut from 'earcut';
import { vec2 } from 'gl-matrix';
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
          const polygon = earcut.flatten(coordinates);
          const vertices = offset(polygon.vertices, position);
          const indices = earcut(vertices, polygon.holes, polygon.dimensions);
          vec2.min(min, min, position);
          vec2.max(max, max, position);
          // TODO: [Incomplete] This should be a class?
          meshes.push({
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices),
            bounds,
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
