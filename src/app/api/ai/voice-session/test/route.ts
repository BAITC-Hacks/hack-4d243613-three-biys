// GET /api/ai/voice-session/test — HACK: minimal HTML harness for the voice interview (A's own test page).
export const dynamic = 'force-dynamic';

const html = `<!doctype html><meta charset="utf-8"><title>Voice interview test</title>
<body style="font-family:system-ui;max-width:720px;margin:2rem auto">
<h2>Voice interview test</h2><p id="s">idle</p>
<button id="start">Start interview</button> <button id="stop">Stop</button>
<pre id="log" style="white-space:pre-wrap;background:#f4f4f4;padding:1rem;min-height:10rem"></pre>
<h3>Answers</h3><pre id="answers"></pre>
<script type="module">
const draftText = 'Our sales team wastes time moving orders from Excel to the CRM. We want to automate it.';
const questions = [
 {id:'q1',field:'data',question:'What data or sample files can you share, e.g. the Excel export?',why:'No data sources are described.',gain:20},
 {id:'q2',field:'successCriteria',question:'How will you measure that the problem is solved?',why:'No measurable criteria given.',gain:15},
 {id:'q3',field:'users',question:'Who will use the solution day to day?',why:'Users are not mentioned.',gain:10}];
const answers = {}; const log = (t) => { document.getElementById('log').textContent += t + '\\n'; };
let pc, dc, mic, active = false, cont = false; const audio = new Audio(); audio.autoplay = true;
const createResponse = () => { if (active) { cont = true; return; } active = true; dc.send(JSON.stringify({type:'response.create'})); };
async function start() {
  const r = await fetch('/api/ai/voice-session', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({draftText,questions})});
  const j = await r.json(); if (!j.ok) { log('session error: ' + j.error.message); return; }
  mic = await navigator.mediaDevices.getUserMedia({audio:true});
  pc = new RTCPeerConnection(); pc.ontrack = e => audio.srcObject = e.streams[0]; mic.getTracks().forEach(t => pc.addTrack(t, mic));
  dc = pc.createDataChannel('oai-events');
  dc.onopen = () => { document.getElementById('s').textContent = 'connected — speak'; createResponse(); };
  dc.onmessage = e => { const ev = JSON.parse(e.data);
    if (ev.type === 'response.created') active = true;
    if (ev.type === 'response.done') { active = false; if (cont) { cont = false; createResponse(); } }
    if (ev.type === 'response.output_audio_transcript.done') log('agent: ' + ev.transcript);
    if (ev.type === 'conversation.item.input_audio_transcription.completed') log('you: ' + ev.transcript);
    if (ev.type === 'error') log('error: ' + JSON.stringify(ev.error));
    if (ev.type === 'response.function_call_arguments.done') { const a = JSON.parse(ev.arguments || '{}');
      if (ev.name === 'submit_answer') { answers[a.field] = a.answer; document.getElementById('answers').textContent = JSON.stringify(answers, null, 1); }
      dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:ev.call_id,output:'{"ok":true}'}}));
      if (ev.name === 'finish_interview') { log('finished'); setTimeout(stop, 5000); } else cont = true; } };
  const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
  const sdp = await fetch('https://api.openai.com/v1/realtime/calls?model=' + j.data.model, {method:'POST',headers:{authorization:'Bearer ' + j.data.clientSecret,'content-type':'application/sdp'},body:offer.sdp});
  if (!sdp.ok) { log('sdp error ' + sdp.status + ' ' + await sdp.text()); return; }
  await pc.setRemoteDescription({type:'answer', sdp: await sdp.text()});
}
function stop(){ dc?.close(); pc?.close(); mic?.getTracks().forEach(t=>t.stop()); document.getElementById('s').textContent='stopped'; }
document.getElementById('start').onclick = start; document.getElementById('stop').onclick = stop;
</script>`;

export async function GET() {
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
