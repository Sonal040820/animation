// Programmatic media quality acceptance and strictly measured facts.json reporting.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {invoke} from './runner.mjs';
import {readJSON,mkdir} from './project.mjs';

function parseFrameRate(rateStr){
  if(!rateStr||typeof rateStr!=='string')return null;
  const parts=rateStr.split('/').map(Number);
  if(parts.length===2&&Number.isFinite(parts[0])&&Number.isFinite(parts[1])&&parts[1]>0){
    return +(parts[0]/parts[1]).toFixed(3);
  }
  const n=Number(rateStr);
  return Number.isFinite(n)?+n.toFixed(3):null;
}

function parseDetections(stderr){
  const black=[];
  const freeze=[];
  const lines=String(stderr||'').split(/\r?\n/);
  let currentFreezeStart=null;
  for(const line of lines){
    const bm=line.match(/black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/);
    if(bm){
      black.push({start:Number(bm[1]),end:Number(bm[2]),duration:Number(bm[3])});
    }
    const fsMatch=line.match(/freeze_start:\s*([0-9.]+)/);
    if(fsMatch)currentFreezeStart=Number(fsMatch[1]);
    const fdMatch=line.match(/freeze_duration:\s*([0-9.]+)/);
    const feMatch=line.match(/freeze_end:\s*([0-9.]+)/);
    if(feMatch&&currentFreezeStart!==null){
      const end=Number(feMatch[1]);
      freeze.push({start:currentFreezeStart,end,duration:+(end-currentFreezeStart).toFixed(3)});
      currentFreezeStart=null;
    }else if(fdMatch&&currentFreezeStart!==null){
      const dur=Number(fdMatch[1]);
      freeze.push({start:currentFreezeStart,end:+(currentFreezeStart+dur).toFixed(3),duration:dur});
      currentFreezeStart=null;
    }
  }
  return {black,freeze};
}

function measureLoudnessFallback(file){
  try{
    const res=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-vn','-f','null','-'],{encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
    const stderr=res.stderr||'';
    const jsonMatch=stderr.match(/\{\s*"input_i"\s*:[\s\S]*?\}/);
    if(jsonMatch){
      const data=JSON.parse(jsonMatch[0]);
      const iLufs=Number(data.input_i);
      const tp=Number(data.input_tp);
      return {
        integrated_lufs:Number.isFinite(iLufs)?iLufs:null,
        true_peak:Number.isFinite(tp)?tp:null
      };
    }
  }catch{}
  return {integrated_lufs:null,true_peak:null};
}

export function verifyFilm(projectRef,project,quality,opts={}){
  const file=path.join(project.out,'final.mp4');
  if(!fs.existsSync(file))throw new Error('Missing final.mp4');
  const raw=invoke('ffprobe',['-v','error','-show_entries','stream=index,codec_name,codec_type,width,height,avg_frame_rate,r_frame_rate,sample_rate,channels:format=duration,size','-of','json',file]);
  const probe=JSON.parse(raw);
  const streams=Array.isArray(probe.streams)?probe.streams:[];
  const video=streams.find(s=>s.codec_name==='h264');
  const audio=streams.find(s=>s.codec_name==='aac');
  if(!video||!audio)throw new Error('MP4 missing H.264 video or AAC audio');
  if(video.width!==quality.width||video.height!==quality.height)throw new Error('Resolution mismatch');
  const measuredDuration=Number(probe.format.duration);
  if(Math.abs(measuredDuration-project.duration)>.35)throw new Error('Duration mismatch');

  // Check voice presence and requirement
  const dialogueFile=path.join(project.dir,'dialogue.json');
  const scriptFile=path.join(project.dir,'script.txt');
  const hasDialogue=fs.existsSync(dialogueFile)||fs.existsSync(scriptFile)||Boolean(project.config?.voice_required)||Boolean(project.config?.dialogue_required);
  const voiceWav=path.join(project.dir,'timeline','voice.wav');
  const linesFile=path.join(project.dir,'timeline','lines.json');
  const voiceReportFile=path.join(project.dir,'timeline','voice-report.json');
  const linesJson=fs.existsSync(linesFile)?readJSON(linesFile):null;
  const voiceReport=fs.existsSync(voiceReportFile)?readJSON(voiceReportFile):null;
  const voiceWavExists=fs.existsSync(voiceWav)&&fs.statSync(voiceWav).size>1000;
  const voicePresent=voiceWavExists&&(linesJson?linesJson.voice_present!==false:true);
  const allowSilent=Boolean(opts.allowSilent||opts['allow-silent']);

  if(hasDialogue&&!voicePresent&&!allowSilent){
    throw new Error('Voice required: timeline/voice.wav is missing or voice_present is false (pass --allow-silent to override)');
  }

  // Check captions and caption-vs-voice alignment
  const wordfile=path.join(project.dir,'timeline','words.json');
  let captionVsVoice={checked:false,total_captions:0,inside_measured_lines:0,outside_count:0,pass:true};
  if(fs.existsSync(wordfile)){
    const words=readJSON(wordfile).words||[];
    if(words.some(w=>w.start<0||w.end>project.duration+.25||w.start>=w.end))
      throw new Error('Caption words out of media timeline');
    if(words.some(w=>String(w.text||'').trim().split(/\s+/).filter(Boolean).length>2))
      throw new Error('Caption more than 2 words');

    const refLines=(linesJson&&Array.isArray(linesJson.lines)&&linesJson.lines.length)
      ?linesJson.lines
      :(fs.existsSync(dialogueFile)?(()=>{
        const dlg=readJSON(dialogueFile);
        const dl=Array.isArray(dlg.lines)?dlg.lines:[];
        if(dl.length&&Number.isFinite(Number(dl[0].at))&&Number.isFinite(Number(dl[0].duration))){
          return dl.map((l,idx)=>({id:l.id||('l'+(idx+1)),start:Number(l.at),end:Number(l.at)+Number(l.duration)}));
        }
        return [];
      })():[]);

    if(refLines.length){
      const outside=[];
      for(const w of words){
        const matched=w.line_id
          ?refLines.find(l=>l.id===w.line_id)
          :refLines.find(l=>w.start>=Number(l.start)-0.06&&w.end<=Number(l.end)+0.06);
        if(!matched||w.start<Number(matched.start)-0.06||w.end>Number(matched.end)+0.06){
          outside.push(w);
        }
      }
      captionVsVoice={
        checked:true,
        total_captions:words.length,
        inside_measured_lines:words.length-outside.length,
        outside_count:outside.length,
        pass:outside.length===0
      };
      if(outside.length>0){
        throw new Error('Caption words lie outside measured voice line spans: '+outside.map(w=>w.text).join(', '));
      }
    }
  }

  // Read audio-report.json or measure loudness
  const audioReportFile=path.join(project.out,'audio-report.json');
  let integratedLufs=null;
  let truePeak=null;
  if(fs.existsSync(audioReportFile)){
    try{
      const ar=readJSON(audioReportFile);
      if(Number.isFinite(Number(ar.integrated_lufs)))integratedLufs=Number(ar.integrated_lufs);
      if(Number.isFinite(Number(ar.true_peak)))truePeak=Number(ar.true_peak);
    }catch{}
  }
  if(integratedLufs===null){
    const measuredLoudness=measureLoudnessFallback(file);
    integratedLufs=measuredLoudness.integrated_lufs;
    if(truePeak===null)truePeak=measuredLoudness.true_peak;
  }

  const warnings=[];
  let blackDetections=[];
  let freezeDetections=[];
  try{
    const analysis=spawnSync('ffmpeg',['-hide_banner','-i',file,
      '-vf','blackdetect=d=0.85:pix_th=0.10,freezedetect=n=-50dB:d=1.6',
      '-an','-f','null','-'],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
    const diagnosis=analysis.stderr||'';
    const parsed=parseDetections(diagnosis);
    blackDetections=parsed.black;
    freezeDetections=parsed.freeze;
    if(blackDetections.length)warnings.push('Long black section detected');
    if(freezeDetections.length)warnings.push('Long repeated frame detected');
    if(analysis.status!==0)warnings.push('Frame analysis unavailable; ffmpeg exit '+analysis.status);
  }catch{warnings.push('Frame analysis unavailable')}

  const fps=parseFrameRate(video.avg_frame_rate)||parseFrameRate(video.r_frame_rate);
  const facts={
    schema_version:1,
    slug:path.basename(project.dir),
    file,
    file_size_bytes:Number(probe.format.size),
    resolution:video.width+'x'+video.height,
    width:video.width,
    height:video.height,
    fps,
    duration:measuredDuration,
    expected_duration:project.duration,
    streams:streams.map(s=>({
      index:s.index,
      codec_name:s.codec_name,
      codec_type:s.codec_type,
      width:s.width,
      height:s.height,
      avg_frame_rate:s.avg_frame_rate,
      sample_rate:s.sample_rate?Number(s.sample_rate):undefined,
      channels:s.channels
    })),
    voice_present:voicePresent,
    voice_provider:linesJson?.provider||voiceReport?.provider||null,
    integrated_lufs:integratedLufs,
    true_peak:truePeak,
    black_detections:blackDetections,
    freeze_detections:freezeDetections,
    caption_vs_voice:captionVsVoice,
    measured_at:new Date().toISOString()
  };

  mkdir(project.out);
  const factsFile=path.join(project.out,'facts.json');
  fs.writeFileSync(factsFile,JSON.stringify(facts,null,2)+'\n');

  const report={
    status:'pass',
    file,
    facts_file:factsFile,
    duration:probe.format.duration,
    resolution:video.width+'x'+video.height,
    fps,
    audio:true,
    voice_present:voicePresent,
    integrated_lufs:integratedLufs,
    caption_vs_voice:captionVsVoice,
    warnings
  };
  fs.writeFileSync(path.join(project.out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
