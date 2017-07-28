import { vec3 } from 'gl-matrix';
import rgb from 'hsv-rgb';
import DataSet from './DataSet';
import Renderer from './Renderer';
import Status from './Status';

// This function lets you monkey-patch each mesh based on it's properties
// Useful if you want to highlight different types of data from the same dataset
const preprocess = (mesh, properties) => {
  const albedo = rgb(255 - Math.min(properties.numfloors * 6, 255), 90, 80);
  return {
    ...mesh,
    albedo: vec3.fromValues(albedo[0] / 255, albedo[1] / 255, albedo[2] / 255),
  };
};

const init = ({ meshes, center }) => {
  Renderer.setCenter(center);
  Renderer.addMeshes(meshes, preprocess);
  Status.update('Drag with your mouse to pan. Scroll to zoom in/out.');
  setTimeout(() => Status.update(false), 3000);
};

const username = 'rambo-test';
const query = 'SELECT * FROM mnmappluto ORDER BY numfloors';

// TODO: [Optimization]
// Fetch only the data needed for the current viewport using an envelope
//
// const center = [-73.97660827636719, 40.78352355957031];
// const offset = [.. Get this from the renderer ..];
// const query = 'SELECT * FROM mnmappluto WHERE the_geom &&' +
//               'ST_MakeEnvelope (' +
//                 `${center[0] - offset[0]}, ${center[1] - offset[1]},` +
//                 `${center[0] - offset[0]}, ${center[1] - offset[1]},` +
//                 '4326' +
//               ')';
//

DataSet.fetch({
  username,
  query,
}).then(init);
