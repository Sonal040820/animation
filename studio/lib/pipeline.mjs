export const PIPELINES={A:'Three.js stage + Canvas2D actors and finishing',B:'HyperFrames',C:'Blender'};
export function assertPipeline(config){
  const id=config.pipeline??'A';
  if(id!=='A')throw Error(`This CLI runs Path A; requested ${id}. See studio/START_HERE.md for routing.`);
  return id;
}
