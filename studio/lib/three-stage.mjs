// Path A's shared WebGL stage. Time comes only from the frame caller.
import * as THREE from 'three';

const stages=new WeakMap();
export function initializeThreeStage(canvas){
  if(stages.has(canvas))return stages.get(canvas);
  const renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,.1,100);
  const materials=[];
  function box(w,h,d,color,x,y,z,parent=scene){
    const material=new THREE.MeshLambertMaterial({color});materials.push(material);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  const wall=box(12,7,.15,'#334558',0,1,-3);
  const floor=box(12,.15,12,'#657385',0,-1.5,0);
  box(.18,3.8,.35,'#bac8ce',1.7,.4,-2.7);
  box(.18,3.8,.35,'#bac8ce',3.7,.4,-2.7);
  box(2.18,.18,.35,'#bac8ce',2.7,2.3,-2.7);
  box(1.85,3.6,.08,'#081321',2.7,.4,-2.58);
  const hinge=new THREE.Group();hinge.position.set(1.78,-1.4,-2.48);scene.add(hinge);
  const door=box(1.82,3.6,.12,'#e5b76c',.91,1.8,0,hinge);
  box(.12,.12,.15,'#fff1bc',1.58,1.65,.13,hinge);
  box(2.2,.2,1.2,'#acb3b4',-2,-.35,-1.8);
  box(.15,1.1,.15,'#475566',-2.8,-.95,-1.6);
  box(.15,1.1,.15,'#475566',-1.2,-.95,-1.6);
  const ambient=new THREE.HemisphereLight('#e6f3ff','#435168',2.1);scene.add(ambient);
  const light=new THREE.DirectionalLight('#fff1cc',2);light.position.set(-3,6,5);scene.add(light);
  const stage={renderer,scene,camera,hinge,wall,floor,door,light,materials};
  stages.set(canvas,stage);return stage;
}

export function drawThreeRoom(ctx,w,h,style,t,p={}){
  const a=initializeThreeStage(ctx.canvas);
  a.renderer.setSize(w,h,false);
  a.scene.background=new THREE.Color(p.background||'#26394b');
  a.wall.material.color.set(p.wall||'#334558');
  a.floor.material.color.set(p.floor||'#657385');
  a.door.material.color.set(p.door||'#e5b76c');
  a.light.intensity=p.light??2;
  const u=THREE.MathUtils.clamp((t-(p.openStart??1))/(p.openDuration??1.2),0,1);
  a.hinge.rotation.y=-(p.open??1)*u*u*(3-2*u)*Math.PI*.65;
  a.camera.aspect=w/h;
  a.camera.position.set(p.cameraX??0,1.8,11-(p.push??.4)*Math.min(t/Math.max(p.duration||4,.01),1));
  a.camera.lookAt(.6,.3,-1);a.camera.updateProjectionMatrix();
  a.renderer.render(a.scene,a.camera);
  ctx.drawImage(a.renderer.domElement,0,0,w,h);
}

export function disposeThreeStage(canvas){
  const a=stages.get(canvas);if(!a)return;
  a.scene.traverse(o=>o.geometry?.dispose());
  a.materials.forEach(m=>m.dispose());a.renderer.dispose();stages.delete(canvas);
}
