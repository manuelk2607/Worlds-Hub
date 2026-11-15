export interface Project { id:'music-worlds'|'sprachwelten'|'it-worlds'|'slop-urself'; name:string; url:string|null; color:'purple'|'orange'|'blue'|'green'; number:string }
export const projects:readonly Project[] = [
  {id:'music-worlds',name:'Music-Worlds',url:'https://music-worlds.maki26.workers.dev/',color:'purple',number:'01'},
  {id:'sprachwelten',name:'Sprachwelten',url:'https://sprachwelten.maki26.workers.dev/',color:'orange',number:'02'},
  {id:'it-worlds',name:'IT-Worlds',url:'https://it-worlds.maki26.workers.dev/',color:'blue',number:'03'},
  {id:'slop-urself',name:'Slop Urself',url:'https://slopurself.maki26.workers.dev/',color:'green',number:'04'},
];
export const escapeHtml = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
