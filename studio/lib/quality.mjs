// Programmatic media quality acceptance; warnings rather than invented perfection claims.
import fs from 'node:fs';
import path from 'node:path';
import {invoke} from './runner.mjs';
import {spawnSync} from 'node:child_process';
import {readJSON} from './project.mjs';
export function verifyFilm(projectRef,project,quality){
  const file=path.join(project.out,'final.mp4');
  if(!fs.existsSync(file))throw new Error('Missing final.mp4');
  const raw=invoke('ffprobe',['-v','error','-show_entries','stream=codec_name,width,height,avg_frame_rate:format=duration,size','-of','json',file]);
  const probe=JSON.parse(raw),video=probe.streams.find(s=>s.codec_name==='h264'),audio=probe.streams.find(s=>s.codec_name==='aac');
  if(!video||!audio)throw new Error('MP4 missing H.264 video or AAC audio');
  if(video.width!==quality.width||video.height!==quality.height)throw new Error('Resolution mismatch');
  if(Math.abs(Number(probe.format.duration)-project.duration)>.3)throw new Error('Duration mismatch');
  const wordfile=path.join(project.dir,'timeline','words.json');
  if(fs.existsSync(wordfile)){
    const words=readJSON(wordfile).words||[];
    if(words.some(w=>w.start<0||w.end>project.duration+.12||w.start>=w.end))
      throw new Error('Caption words out of media timeline');
    if(words.some(w=>w.text.split(/\s+/).length>2))
      throw new Error('Caption more than 2 words');
  }
  const warnings=[];
  try{
    const analysis=spawnSync('ffmpeg',['-hide_banner','-i',file,
      '-vf','blackdetect=d=0.85:pix_th=0.10,freezedetect=n=-50dB:d=1.6',
      '-an','-f','null','-'],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
    const diagnosis=analysis.stderr||'';
    if(/black_start:/.test(diagnosis))warnings.push('Long black section detected');
    if(/freeze_start:/.test(diagnosis))warnings.push('Long repeated frame detected');
    if(analysis.status!==0)warnings.push('Frame analysis unavailable; ffmpeg exit '+analysis.status);
  }catch{warnings.push('Frame analysis unavailable')}
  const report={status:'pass',file,duration:probe.format.duration,resolution:video.width+'x'+video.height,
    audio:true,warnings};
  fs.writeFileSync(path.join(project.out,'verification.json'),JSON.stringify(report,null,2));
  return report;
}
