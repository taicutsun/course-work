#include "minis3/ui.hpp"

namespace minis3 {

namespace {

const char* kIndexHtml = R"HTML(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MiniS3</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f1117;color:#e2e8f0;height:100vh;display:flex;flex-direction:column}
header{background:#1a1d27;border-bottom:1px solid #2d3044;padding:12px 24px;display:flex;align-items:center;gap:12px}
header h1{font-size:18px;font-weight:700;color:#fff}
.badge{background:#3b82f6;color:#fff;font-size:11px;padding:2px 8px;border-radius:12px}
.status{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:13px;color:#94a3b8}
.dot{width:8px;height:8px;border-radius:50%;background:#22c55e}
.container{display:flex;flex:1;overflow:hidden}
.sidebar{width:260px;background:#13161f;border-right:1px solid #2d3044;display:flex;flex-direction:column}
.sidebar-header{padding:16px;border-bottom:1px solid #2d3044;display:flex;align-items:center;justify-content:space-between}
.sidebar-header span{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
.btn-icon{background:#1e2235;border:1px solid #2d3044;color:#94a3b8;width:28px;height:28px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;transition:all .15s;line-height:1}
.btn-icon:hover{background:#3b82f6;border-color:#3b82f6;color:#fff}
.bucket-list{flex:1;overflow-y:auto;padding:8px}
.bucket-item{padding:10px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .1s;margin-bottom:2px}
.bucket-item:hover{background:#1e2235}
.bucket-item.active{background:#1d3461}
.bucket-item .ico{font-size:16px}
.bucket-item .name{font-size:14px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bucket-item .del{opacity:0;cursor:pointer;color:#ef4444;font-size:13px;padding:2px 5px;border-radius:4px}
.bucket-item:hover .del{opacity:1}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.toolbar{padding:12px 24px;border-bottom:1px solid #2d3044;display:flex;align-items:center;gap:12px}
.breadcrumb{font-size:14px;color:#94a3b8;display:flex;align-items:center;gap:6px}
.breadcrumb .sep{color:#2d3044}
.breadcrumb .cur{color:#e2e8f0;font-weight:500}
.btn{padding:7px 14px;border-radius:6px;border:1px solid #2d3044;background:#1e2235;color:#e2e8f0;cursor:pointer;font-size:13px;transition:all .15s;display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.btn:hover{border-color:#3b82f6;color:#3b82f6}
.btn-primary{background:#3b82f6;border-color:#3b82f6;color:#fff}
.btn-primary:hover{background:#2563eb;border-color:#2563eb;color:#fff}
.spacer{flex:1}
.content{flex:1;overflow-y:auto;padding:24px}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#475569;gap:12px}
.empty .ico{font-size:48px}
.empty p{font-size:14px}
table{width:100%;border-collapse:collapse}
thead th{text-align:left;padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#475569;border-bottom:1px solid #2d3044}
tbody tr{border-bottom:1px solid #1e2235;transition:background .1s}
tbody tr:hover{background:#13161f}
tbody td{padding:12px 16px;font-size:14px}
.td-name{display:flex;align-items:center;gap:10px}
.td-name .ico{font-size:14px;color:#94a3b8}
.td-sz{color:#64748b;font-size:13px}
.td-act{display:flex;gap:6px;justify-content:flex-end}
.bsm{padding:4px 10px;font-size:12px;border-radius:4px;border:1px solid #2d3044;background:#1a1d27;color:#94a3b8;cursor:pointer;transition:all .15s}
.bsm:hover{color:#e2e8f0;border-color:#475569}
.bsm.danger:hover{color:#ef4444;border-color:#ef4444}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}
.overlay.show{display:flex}
.modal{background:#1a1d27;border:1px solid #2d3044;border-radius:12px;padding:24px;width:380px}
.modal h3{font-size:16px;margin-bottom:16px}
.modal input{width:100%;padding:8px 12px;background:#0f1117;border:1px solid #2d3044;border-radius:6px;color:#e2e8f0;font-size:14px;margin-bottom:16px}
.modal input:focus{outline:none;border-color:#3b82f6}
.modal-act{display:flex;gap:8px;justify-content:flex-end}
.toast{position:fixed;bottom:24px;right:24px;background:#1a1d27;border:1px solid #2d3044;border-radius:8px;padding:12px 16px;font-size:13px;z-index:200;animation:si .2s ease}
.toast.ok{border-color:#22c55e;color:#22c55e}
.toast.err{border-color:#ef4444;color:#ef4444}
@keyframes si{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
</style>
</head>
<body>
<header>
  <h1>MiniS3</h1>
  <span class="badge">S3-Compatible</span>
  <div class="status"><div class="dot" id="dot"></div><span id="statusTxt">Connecting...</span></div>
</header>
<div class="container">
  <div class="sidebar">
    <div class="sidebar-header">
      <span>Buckets</span>
      <button class="btn-icon" title="New bucket" onclick="showModal()">+</button>
    </div>
    <div class="bucket-list" id="bucketList"></div>
  </div>
  <div class="main">
    <div class="toolbar">
      <div class="breadcrumb" id="crumb"><span>All Buckets</span></div>
      <div class="spacer"></div>
      <label class="btn" id="upBtn" style="display:none">&#8593; Upload<input type="file" id="fileIn" style="display:none" multiple onchange="uploadFiles(this.files)"></label>
      <button class="btn btn-primary" id="newBktBtn" onclick="showModal()">+ New Bucket</button>
    </div>
    <div class="content" id="content">
      <div class="empty"><div class="ico">&#128059;</div><p>Select a bucket to view its contents</p><p>or create a new one to get started</p></div>
    </div>
  </div>
</div>
<div class="overlay" id="overlay">
  <div class="modal">
    <h3>Create New Bucket</h3>
    <input type="text" id="bktInput" placeholder="my-bucket" onkeydown="if(event.key==='Enter')createBucket()">
    <div class="modal-act">
      <button class="btn" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createBucket()">Create</button>
    </div>
  </div>
</div>
<script>
var cur=null;
function toast(m,t){var e=document.createElement('div');e.className='toast '+(t||'ok');e.textContent=m;document.body.appendChild(e);setTimeout(function(){e.remove()},3000)}
function fmtSz(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';if(b<1073741824)return(b/1048576).toFixed(1)+' MB';return(b/1073741824).toFixed(2)+' GB'}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function setStatus(ok){document.getElementById('dot').style.background=ok?'#22c55e':'#ef4444';document.getElementById('statusTxt').textContent=ok?'Connected':'Offline'}
async function loadBuckets(){
  try{
    var r=await fetch('/');var t=await r.text();
    var doc=new DOMParser().parseFromString(t,'text/xml');
    var names=[...doc.querySelectorAll('Bucket Name')].map(function(n){return n.textContent});
    var el=document.getElementById('bucketList');
    if(!names.length){el.innerHTML='<div style="padding:16px;color:#475569;font-size:13px;text-align:center">No buckets yet</div>';return}
    el.innerHTML=names.map(function(n){return '<div class="bucket-item'+(cur===n?' active':'')+'" onclick="selBucket(\''+esc(n)+'\')"><span class="ico">&#128059;</span><span class="name">'+esc(n)+'</span><span class="del" onclick="event.stopPropagation();delBucket(\''+esc(n)+'\')" title="Delete">&#10005;</span></div>'}).join('');
    setStatus(true);
  }catch(e){setStatus(false)}
}

async function selBucket(n){
  cur=n;
  document.getElementById('upBtn').style.display='';
  document.getElementById('newBktBtn').style.display='none';
  document.getElementById('crumb').innerHTML='<span style="cursor:pointer;color:#94a3b8" onclick="goHome()">All Buckets</span><span class="sep"> / </span><span class="cur">'+esc(n)+'</span>';
  loadBuckets();
  await loadObjects(n);
}
function goHome(){
  cur=null;
  document.getElementById('upBtn').style.display='none';
  document.getElementById('newBktBtn').style.display='';
  document.getElementById('crumb').innerHTML='<span>All Buckets</span>';
  document.getElementById('content').innerHTML='<div class="empty"><div class="ico">&#128059;</div><p>Select a bucket to view its contents</p><p>or create a new one to get started</p></div>';
  loadBuckets();
}
async function loadObjects(n){
  var c=document.getElementById('content');
  c.innerHTML='<div style="padding:24px;color:#475569">Loading...</div>';
  try{
    var r=await fetch('/'+encodeURIComponent(n));var t=await r.text();
    var doc=new DOMParser().parseFromString(t,'text/xml');
    var keys=[...doc.querySelectorAll('Key')].map(function(k){return k.textContent});
    var sizes=[...doc.querySelectorAll('Size')].map(function(s){return parseInt(s.textContent)});
    if(!keys.length){c.innerHTML='<div class="empty"><div class="ico">&#128194;</div><p>This bucket is empty</p><p>Drop files here or click Upload</p></div>';return}
    c.innerHTML='<table><thead><tr><th>Name</th><th>Size</th><th></th></tr></thead><tbody>'+keys.map(function(k,i){return '<tr><td><div class="td-name"><span class="ico">&#128196;</span>'+esc(k)+'</div></td><td class="td-sz">'+fmtSz(sizes[i]||0)+'</td><td class="td-act"><button class="bsm" onclick="dlObj(\''+esc(n)+'\',\''+esc(k)+'\')">&#8595; Download</button><button class="bsm danger" onclick="delObj(\''+esc(n)+'\',\''+esc(k)+'\')">Delete</button></td></tr>'}).join('')+'</tbody></table>';
  }catch(e){c.innerHTML='<div style="padding:24px;color:#ef4444">Failed to load objects</div>'}
}
async function uploadFiles(files){
  if(!cur||!files.length)return;
  for(var i=0;i<files.length;i++){
    var f=files[i];
    try{
      var r=await fetch('/'+encodeURIComponent(cur)+'/'+encodeURIComponent(f.name),{method:'PUT',headers:{'Content-Length':f.size},body:f});
      if(r.ok)toast('Uploaded '+f.name);else toast('Failed: '+f.name,'err');
    }catch(e){toast('Error: '+f.name,'err')}
  }
  document.getElementById('fileIn').value='';
  loadObjects(cur);
}
function dlObj(b,k){window.open('/'+encodeURIComponent(b)+'/'+encodeURIComponent(k),'_blank')}
async function delObj(b,k){
  if(!confirm('Delete "'+k+'"?'))return;
  try{await fetch('/'+encodeURIComponent(b)+'/'+encodeURIComponent(k),{method:'DELETE'});toast('Deleted '+k);loadObjects(b)}
  catch(e){toast('Delete failed','err')}
}
async function delBucket(n){
  if(!confirm('Delete bucket "'+n+'" and all its contents?'))return;
  try{await fetch('/'+encodeURIComponent(n),{method:'DELETE'});toast('Deleted bucket '+n);if(cur===n)goHome();else loadBuckets()}
  catch(e){toast('Delete failed','err')}
}
function showModal(){document.getElementById('overlay').classList.add('show');document.getElementById('bktInput').value='';setTimeout(function(){document.getElementById('bktInput').focus()},50)}
function hideModal(){document.getElementById('overlay').classList.remove('show')}
async function createBucket(){
  var n=document.getElementById('bktInput').value.trim();
  if(!n)return;
  try{
    var r=await fetch('/'+encodeURIComponent(n),{method:'PUT'});
    if(r.ok){toast('Created bucket '+n);hideModal();loadBuckets()}else toast('Failed to create bucket','err');
  }catch(e){toast('Error creating bucket','err')}
}
document.getElementById('content').addEventListener('dragover',function(e){e.preventDefault()});
document.getElementById('content').addEventListener('drop',function(e){e.preventDefault();if(cur&&e.dataTransfer.files.length)uploadFiles(e.dataTransfer.files)});
document.getElementById('overlay').addEventListener('click',function(e){if(e.target===document.getElementById('overlay'))hideModal()});
loadBuckets();
</script>
</body>
</html>)HTML";

}

HttpResponse serve_ui() {
    auto resp = HttpParser::make_response(200, "OK");
    resp.body = kIndexHtml;
    resp.headers["content-type"] = "text/html; charset=utf-8";
    resp.has_body = true;
    return resp;
}

}
