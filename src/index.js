import DataSet from './DataSet';
import Renderer from './Renderer';
import Status from './Status';

const username = 'rambo-test';
const query = 'SELECT * FROM public.mnmappluto';

// TODO: [Optimization]
// Fetch only the data needed for the current viewport using an envelope.
// This should then be refactored into the renderer, so it can fetch
// the missing data on demand (when the user pans the map around).
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
}).then(({ center, meshes }) => {
  Renderer.setCenter(center);
  Renderer.addMeshes(meshes);
  Status.update('Drag with your mouse to pan. Scroll to zoom in/out.');
  setTimeout(() => Status.update(false), 3000);
});
