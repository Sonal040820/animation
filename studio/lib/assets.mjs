// Live metadata, never a second hand-maintained asset list.
import './presets.mjs';
import {RECIPE_REGISTRIES,normalizeRecipe} from './recipe.mjs';
import {HUMAN_LOOKS,HUMAN_ACTIONS} from './human.mjs';
import {STYLES} from './styles.mjs';
import {EXPRESSIONS} from './characters.mjs';
import catalog from './registry/catalog.json' with {type:'json'};

export function assetCatalog(query=''){
  const records=[];
  const groups={...RECIPE_REGISTRIES,appearances:HUMAN_LOOKS,actions:HUMAN_ACTIONS,expressions:EXPRESSIONS,styles:STYLES};
  for(const [kind,entries] of Object.entries(groups))for(const [name,value] of Object.entries(entries)){
    const source=kind==='appearances'||kind==='actions'?'human.mjs':kind==='styles'?'styles.mjs':kind==='expressions'||kind==='rigs'?'characters.mjs':name==='three-room'?'three-stage.mjs':name.startsWith('preset:')?'presets.mjs':catalog[kind]?.[name]?'registry/catalog.json':'recipe.mjs';
    records.push({id:`${kind}/${name}`,kind,name,source:`studio/lib/${source}`,pipeline:'A',provenance:'repository-authored procedural asset',renderer:name==='three-room'?'Three.js WebGL2 + Canvas2D':'Canvas2D',params:value.params||{},defaults:value.defaults||{},example:value.example??value,preview:`node studio/cli/studio.mjs asset-preview --id ${kind}/${name}`});
  }
  const needle=query.toLowerCase();
  return records.filter(r=>`${r.id} ${r.source} ${r.renderer}`.toLowerCase().includes(needle));
}
export function inspectAsset(id){
  const item=assetCatalog().find(r=>r.id===id);if(!item)throw Error('Unknown asset '+id+'; use assets --query <term>');return item;
}
export function assetRecipe(id){
  const a=inspectAsset(id),recipe={set:{preset:'three-room',params:{open:0}},actors:[],props:[],fx:[]};
  const actor={id:'preview',rig:'silhouette',pos:{x:.45,depth:.65},appearance:'traveler',scale:1.2};
  if(a.kind==='sets')recipe.set={preset:a.name,params:a.defaults};
  else if(a.kind==='props')recipe.props=[{id:'preview',type:a.name,pos:{x:.5,depth:.6},state:a.defaults}];
  else if(a.kind==='fx')recipe.fx=[{type:a.name,params:a.defaults}];
  else if(a.kind==='rigs'){const {appearance,...base}=actor;recipe.actors=[{...base,rig:a.name}];}
  else if(a.kind==='appearances')recipe.actors=[{...actor,appearance:a.name}];
  else if(a.kind==='actions')recipe.actors=[{...actor,action:a.name}];
  else if(a.kind==='expressions')recipe.actors=[{...actor,expression:a.name}];
  else if(a.kind==='styles')recipe.actors=[actor];
  else throw Error('Easings are timing functions; inspect their metadata instead of rendering a still');
  return normalizeRecipe(recipe);
}
