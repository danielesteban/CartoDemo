import DataSet from './DataSet';
import Renderer from './Renderer';
import Status from './Status';

const init = ({ meshes, center }) => {
  Renderer.setCenter(center);
  Renderer.addMeshes(meshes);
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
