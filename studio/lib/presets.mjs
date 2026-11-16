import {TEMPLATE_META} from './template-meta.mjs';
import {mergeRecipe} from './recipe.mjs';
// Compatibility set entries reuse the original composition functions verbatim.
// Additional actors, props, keys and effects remain independently composable.
export const PRESETS=Object.fromEntries(Object.entries(TEMPLATE_META).filter(([id])=>!id.startsWith('three-')&&id!=='3d-orbit').map(([id,meta])=>[id,{params:meta.params,defaults:{},example:meta.example||{}}]));
export function presetRecipe(id,overrides={},params={}){
  if(!Object.hasOwn(PRESETS,id))throw Error(`Unknown preset "${id}"; did you mean "window-view"?`);
  return mergeRecipe({set:{preset:`preset:${id}`,params},actors:[],props:[],fx:[],cues:[]},overrides);
}
export function recipeShot(shot){
  if(shot.preset&&shot.recipe)throw Error('Choose preset or recipe, not both');
  if(!shot.preset)return shot;
  const {preset,overrides,...rest}=shot;
  return {...rest,template:preset,recipe:presetRecipe(preset,overrides,shot.params)};
}
