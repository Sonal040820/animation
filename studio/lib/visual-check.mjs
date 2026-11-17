import fs from 'node:fs';
import path from 'node:path';
import {loadProject,STUDIO} from './project.mjs';
import {validateProject} from './validate.mjs';
import {invoke,dimensions} from './runner.mjs';

export function verifyVisual(projectRef,quality='preview'){
  const project=loadProject(projectRef),size=dimensions(quality);
  const out=path.join(STUDIO,'out',path.basename(project.dir)),file=path.join(out,'video_silent.mp4');
  const info=JSON.parse(invoke('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));
  const video=info.streams.find(s=>s.codec_type==='video');
  const [n,d]=(video?.avg_frame_rate||'0/1').split('/').map(Number);
  const checks={manifest:validateProject(projectRef).valid,codec:video?.codec_name==='h264',size:video?.width===size.width&&video?.height===size.height,fps:Math.abs(n/d-size.fps)<.001,duration:Math.abs(Number(info.format.duration)-project.duration)<=1/size.fps+.03};
  // Decode every frame: container metadata alone cannot detect corrupt frame data.
  invoke('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-']);
  checks.decode=true;
  const result={status:Object.values(checks).every(Boolean)?'pass':'fail',file,checks,duration:Number(info.format.duration),visualReview:'Inspect contact sheet and playback for readable emotion, contact and staging. Intentional holds are allowed; no minimum motion score.',audioRequired:false};
  fs.writeFileSync(path.join(out,'visual-check.json'),JSON.stringify(result,null,2)+'\n');
  return result;
}
