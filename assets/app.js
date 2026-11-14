(()=>{
const API='https://vuqbbwdojwmtehgsyfaq.supabase.co/functions/v1/aevnetwork-api',KEY='aevnetwork_auth_session';
let session=null,adminUsers=[],isNetworkAdmin=false;
const diagnosticEvents={errors:[],rejections:[],resourceFailures:[]};
window.addEventListener('error',e=>{diagnosticEvents.errors.push({message:String(e.message||'Script error'),file:e.filename?String(e.filename).split('/').pop():'',line:Number(e.lineno)||0,column:Number(e.colno)||0,time:new Date().toISOString()});if(diagnosticEvents.errors.length>100)diagnosticEvents.errors.shift();},true);
window.addEventListener('unhandledrejection',e=>{diagnosticEvents.rejections.push({reason:String(e.reason?.message||e.reason||'Unhandled rejection').slice(0,300),time:new Date().toISOString()});if(diagnosticEvents.rejections.length>100)diagnosticEvents.rejections.shift();});
window.addEventListener('error',e=>{if(e.target&&e.target!==window&&e.target.src)diagnosticEvents.resourceFailures.push({resource:String(e.target.src).split('/').pop(),type:e.target.tagName||'resource',time:new Date().toISOString()});},true);

const $=id=>document.getElementById(id),sidebar=$('sidebar'),overlay=$('overlay'),hamb=$('hamb');
function menu(open){sidebar?.classList.toggle('open',open);overlay?.classList.toggle('show',open);document.body.style.overflow=open?'hidden':'';hamb?.setAttribute('aria-expanded',String(open));}
hamb?.addEventListener('click',()=>menu(!sidebar.classList.contains('open')));
overlay?.addEventListener('click',()=>menu(false));
document.querySelectorAll('.navbtn').forEach(a=>{if(a.dataset.page===document.documentElement.dataset.page){a.classList.add('active');const g=a.closest('.navgroup');if(g)g.open=true;}a.addEventListener('click',()=>menu(false));});
if($('year'))$('year').textContent=new Date().getFullYear();
async function call(action,extra={}){const headers={'Content-Type':'application/json'};if(session?.access_token)headers.Authorization='Bearer '+session.access_token;const res=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...extra})});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'API通信エラー');return data;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function date(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ja-JP');}
async function refreshAdmin(){const group=$('adminNavGroup'),denied=$('adminOnly'),content=$('adminContent');if(!session){isNetworkAdmin=false;if(group)group.hidden=true;if(denied)denied.hidden=false;if(content)content.hidden=true;return false;}try{const r=await call('is_admin'),yes=r.is_admin===true;isNetworkAdmin=yes;if(group)group.hidden=!yes;if(document.documentElement.dataset.page==='admin'){if(denied)denied.hidden=yes;if(content)content.hidden=!yes;}return yes;}catch(e){isNetworkAdmin=false;if(group)group.hidden=true;if(document.documentElement.dataset.page==='admin'){if(denied){denied.hidden=false;denied.querySelector('p').textContent='管理者確認に失敗しました。通信状態を確認してください。';}if(content)content.hidden=true;}return false;}}
function applyNetworkProfile(d={}){
 const accent=d.accent_color||'#8b7cff';
 document.documentElement.style.setProperty('--blue',accent);
 document.documentElement.style.setProperty('--purple',accent);
 document.documentElement.style.setProperty('--profile-name-color',d.name_color||'#ffffff');
 document.documentElement.dataset.profileTheme=d.theme||'midnight';
 document.documentElement.dataset.profileFont=d.font_style||'default';
 const name=$('accountEmailLabel');
 if(name&&d.name_color)name.style.color=d.name_color;
}
function setNetworkNicknameLock(changedAt){
 const input=$('profileNickname'),status=$('profileStatus');if(!input)return;
 const changed=changedAt?new Date(changedAt):null,unlock=changed?changed.getTime()+14*24*60*60*1000:0;
 const update=()=>{
  const locked=!!changed&&Date.now()<unlock;
  input.disabled=locked;
  input.title=locked?'ニックネーム変更可能期間まで編集できません。':'';
  if(locked&&status)status.textContent='ニックネーム変更は14日ごとです。次回変更可能：'+new Date(unlock).toLocaleString('ja-JP');
  else if(status&&status.textContent.startsWith('ニックネーム変更は14日ごとです。'))status.textContent='ニックネームを変更できます。';
  if(locked)setTimeout(update,Math.min(unlock-Date.now()+50,2147483000));
 };
 update();
}
async function loadSharedProfile(){
 const panel=$('networkProfilePanel');if(!panel||!session)return;
 try{
  const r=await call('profile_get'),p=r.profile||{},d=p.profile||{};
  applyNetworkProfile(d);panel.hidden=false;
  $('profileNickname').value=p.nickname||'';
  setNetworkNicknameLock(p.nickname_changed_at);
  $('profileBio').value=d.bio||'';
  $('profileGame').value=d.favorite_game||'';
  $('profileStyle').value=d.play_style||'';
  $('profileAvatar').value=d.avatar_url||'';
  $('profileBanner').value=d.banner_url||'';
  $('profileAccent').value=d.accent_color||'#8b7cff';
  $('profileNameColor').value=d.name_color||'#ffffff';
  $('profileTheme').value=d.theme||'midnight';
  $('profileNameEffect').value=d.name_effect||'glow';
  $('profileFont').value=d.font_style||'default';
 }catch(e){panel.hidden=false;$('profileStatus').textContent='プロフィールを読み込めませんでした：'+e.message;}
}
$('saveNetworkNickname')?.addEventListener('click',async()=>{const b=$('saveNetworkNickname'),status=$('profileStatus');b.disabled=true;status.textContent='ニックネームを保存しています…';try{await call('profile_save',{nickname:$('profileNickname').value.trim(),profile:{bio:$('profileBio').value,favorite_game:$('profileGame').value,play_style:$('profileStyle').value,avatar_url:$('profileAvatar').value.trim(),banner_url:$('profileBanner').value.trim(),accent_color:$('profileAccent').value,theme:$('profileTheme').value,name_color:$('profileNameColor').value,name_effect:$('profileNameEffect').value,font_style:$('profileFont').value}});await loadSharedProfile();status.textContent='ニックネームを保存しました。AevToolsにも反映されます。';}catch(e){const map={nickname_taken:'このネームは既に使用されています。',nickname_reserved:'このネームは使用できません。',nickname_cooldown:'ネーム変更は14日ごとです。',nickname_length_invalid:'ネームは1〜20文字で入力してください。'};status.textContent=map[e.message]||'保存できませんでした：'+e.message;}finally{b.disabled=false;}});
$('editNetworkProfile')?.addEventListener('click',()=>{const box=$('networkProfileEditor'),save=$('saveSharedProfile'),b=$('editNetworkProfile');const open=box.hidden;box.hidden=!open;save.hidden=!open;b.textContent=open?'プロフィール設定を閉じる':'プロフィール設定を編集';b.setAttribute('aria-expanded',String(open));});
$('saveSharedProfile')?.addEventListener('click',async()=>{
 const b=$('saveSharedProfile'),status=$('profileStatus');
 const profile={bio:$('profileBio').value,favorite_game:$('profileGame').value,play_style:$('profileStyle').value,avatar_url:$('profileAvatar').value.trim(),banner_url:$('profileBanner').value.trim(),accent_color:$('profileAccent').value,theme:$('profileTheme').value,name_color:$('profileNameColor').value,name_effect:$('profileNameEffect').value,font_style:$('profileFont').value};
 b.disabled=true;status.textContent='保存しています…';
 try{await call('profile_save',{nickname:$('profileNickname').value.trim(),profile});await loadSharedProfile();status.textContent='保存しました。AevToolsにも反映されます。';$('accountEmailLabel').textContent=session?.user?.email||'';}
 catch(e){const map={nickname_taken:'このネームは既に使用されています。',nickname_reserved:'このネームは使用できません。',nickname_cooldown:'ネーム変更は14日ごとです。',nickname_length_invalid:'ネームは1〜20文字で入力してください。',invalid_avatar_url:'アイコンURLはHTTPSで入力してください。',invalid_banner_url:'バナーURLはHTTPSで入力してください。'};status.textContent=map[e.message]||'保存できませんでした：'+e.message;}
 finally{b.disabled=false;}
});
function showAccount(){const out=$('accountLoggedOut'),inside=$('accountLoggedIn');if(out)out.hidden=!!session;if(inside)inside.hidden=!session;if($('accountEmailLabel'))$('accountEmailLabel').textContent=session?.user?.email||'';const headerAccount=$('headerAccountLink');if(headerAccount){headerAccount.textContent=session?'アカウント':'ログイン';headerAccount.setAttribute('aria-label',session?'アカウント設定を開く':'ログインページを開く');}if(status)status.textContent=session?'ログイン中です。':'ログインしていません。';}
const status=$('accountStatus');
$('accountLogin')?.addEventListener('click',async()=>{const email=$('accountEmail')?.value.trim(),password=$('accountPassword')?.value;if(!email||!password){if(status)status.textContent='メールアドレスとパスワードを入力してください。';return;}const b=$('accountLogin');b.disabled=true;try{const r=await call('login',{email,password});session=r.session;localStorage.setItem(KEY,JSON.stringify(session));showAccount();await loadSharedProfile();const yes=await refreshAdmin();if(yes&&document.documentElement.dataset.page==='admin')await loadAdmin();const page=document.documentElement.dataset.page;if(page==='index')await loadPublicFeed('announcements','publicAnnouncements');if(page==='news')await loadPublicFeed('news','publicNews');if(page==='updates')await loadPublicFeed('updates','publicUpdates');if(page==='community')await loadCommunity();if(status)status.textContent='ログインしました。';$('accountPassword').value='';}catch(e){if(status)status.textContent='ログインできませんでした：'+e.message;}finally{b.disabled=false;}});
$('accountLogout')?.addEventListener('click',()=>{localStorage.removeItem(KEY);session=null;showAccount();const pp=$('networkProfilePanel');if(pp)pp.hidden=true;refreshAdmin();if(status)status.textContent='ログアウトしました。';});
async function loadPublicFeed(kind,target){const el=$(target);if(!el)return;try{const r=await call('public_list_content',{kind}),items=r.items||[];el.innerHTML=items.length?items.map(x=>'<article class="feed-item"><h3>'+esc(x.title)+'</h3>'+(kind==='news'&&x.category?'<p class="feed-meta">'+esc(x.category)+'</p>':'')+'<p>'+esc(x.body)+'</p>'+(x.link_url?'<p><a class="primary" href="'+esc(x.link_url)+'" target="_blank" rel="noopener noreferrer">関連リンク ↗</a></p>':'')+'<div class="feed-meta">'+esc(date(x.created_at))+'</div></article>').join(''):'<p class="muted">現在、掲載されている情報はありません。</p>';}catch(e){el.textContent='情報を読み込めませんでした。';}}
async function loadMetrics(){const r=await call('admin_dashboard');const m=r.metrics||{};$('adminMetrics').innerHTML=[['登録ユーザー',m.users],['お知らせ',m.announcements],['AevNews',m.news],['アップデート',m.updates],['制限中ユーザー',m.blacklist]].map(([k,v])=>'<div class="card"><p>'+esc(k)+'</p><h2>'+esc(v??'—')+'</h2></div>').join('');}
async function loadContent(){const kind=$('adminKind').value,r=await call('admin_list_content',{kind});const items=r.items||[];$('categoryWrap').hidden=kind!=='news';$('linkWrap').hidden=kind==='updates';$('publishWrap').hidden=kind==='announcements';$('adminContentList').innerHTML=items.length?items.map(x=>'<article class="card admin-item"><h3>'+esc(x.title)+'</h3><p>'+esc((x.body||'').slice(0,220))+'</p><p class="muted">'+esc(date(x.created_at))+(x.published===false?' · 非公開':' · 公開')+'</p><div class="actions"><button class="secondary" data-edit="'+esc(x.id)+'">編集</button><button class="secondary" data-delete="'+esc(x.id)+'">削除</button></div></article>').join(''):'<p class="muted">まだ登録されていません。</p>'; $('adminContentList').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const x=items.find(i=>i.id===b.dataset.edit);if(!x)return;$('contentId').value=x.id;$('contentTitle').value=x.title||'';$('contentBody').value=x.body||'';$('contentCategory').value=x.category||'GAMING';$('contentLink').value=x.link_url||'';$('contentPublished').checked=x.published!==false;$('contentStatus').textContent='編集モードです。';$('adminContentForm').scrollIntoView({behavior:'smooth',block:'center'});}));$('adminContentList').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('このコンテンツを削除しますか？'))return;try{await call('admin_delete_content',{kind,id:b.dataset.delete});await loadContent();$('contentStatus').textContent='削除しました。';}catch(e){$('contentStatus').textContent='削除失敗：'+e.message;}}));}
function clearContentForm(){$('contentId').value='';$('contentTitle').value='';$('contentBody').value='';$('contentCategory').value='GAMING';$('contentLink').value='';$('contentPublished').checked=true;}
$('contentCancel')?.addEventListener('click',clearContentForm);
$('adminKind')?.addEventListener('change',()=>{clearContentForm();loadContent().catch(e=>$('contentStatus').textContent=e.message);});
$('adminContentForm')?.addEventListener('submit',async e=>{e.preventDefault();const kind=$('adminKind').value,item={id:$('contentId').value||undefined,title:$('contentTitle').value,body:$('contentBody').value,category:$('contentCategory').value,link_url:$('contentLink').value,published:$('contentPublished').checked};const b=e.submitter;b.disabled=true;try{await call('admin_save_content',{kind,item});clearContentForm();$('contentStatus').textContent='保存しました。';await loadContent();await loadMetrics();}catch(err){$('contentStatus').textContent='保存できませんでした：'+err.message;}finally{b.disabled=false;}});
async function loadUsers(){const r=await call('admin_list_users',{page:1});adminUsers=r.users||[];$('adminUsers').innerHTML=adminUsers.length?'<div class="admin-user-list">'+adminUsers.map(u=>'<div class="card"><strong>'+esc(u.email||'(メール未登録)')+'</strong><p class="muted">登録：'+esc(date(u.created_at))+'<br>最終ログイン：'+esc(date(u.last_sign_in_at))+'</p></div>').join('')+'</div>':'<p class="muted">ユーザーはいません。</p>';$('blacklistUser').innerHTML='<option value="">ユーザーを選択</option>'+adminUsers.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.email||u.id)+'</option>').join('');}
$('reloadUsers')?.addEventListener('click',()=>loadUsers().catch(e=>$('adminUsers').textContent=e.message));
async function loadBlacklist(){const r=await call('admin_list_blacklist'),items=r.items||[];$('adminBlacklist').innerHTML=items.length?items.map(x=>'<div class="card"><strong>'+esc(x.email||x.user_id)+'</strong><p>'+esc(x.reason)+'</p><p class="muted">登録：'+esc(date(x.created_at))+'</p><button class="secondary" data-unblock="'+esc(x.user_id)+'">制限を解除</button></div>').join(''):'<p class="muted">ブラックリスト登録はありません。</p>';$('adminBlacklist').querySelectorAll('[data-unblock]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('このユーザーのAevNetwork利用制限を解除しますか？'))return;try{await call('admin_remove_blacklist',{user_id:b.dataset.unblock});await loadBlacklist();await loadMetrics();$('blacklistStatus').textContent='制限を解除しました。';}catch(e){$('blacklistStatus').textContent='解除できませんでした：'+e.message;}}));}
$('addBlacklist')?.addEventListener('click',async()=>{const user_id=$('blacklistUser').value,reason=$('blacklistReason').value.trim();if(!user_id||!reason){$('blacklistStatus').textContent='対象ユーザーと理由を入力してください。';return;}try{await call('admin_add_blacklist',{user_id,reason});$('blacklistReason').value='';$('blacklistStatus').textContent='ブラックリストに追加しました。';await loadBlacklist();await loadMetrics();}catch(e){$('blacklistStatus').textContent='追加できませんでした：'+e.message;}});


async function loadCommunity(){
 const list=$('communityPosts'),form=$('communityPostForm'),loginNote=$('communityLoginNote');
 if(!list)return;
 if(form)form.hidden=!session;
 if(loginNote)loginNote.hidden=!!session;
 list.innerHTML='<p class="muted">掲示板を読み込んでいます…</p>';
 try{
  const r=await call('community_list_posts'),items=r.items||[];
  if(!items.length){list.innerHTML='<p class="muted">まだ投稿はありません。最初の投稿を作成できます。</p>';return;}
  list.innerHTML=items.map(p=>'<article class="feed-item community-post"><h3>'+esc(p.title)+'</h3><div class="feed-meta">'+esc(p.author_nickname)+' · '+esc(date(p.created_at))+'</div><p>'+esc(p.body)+'</p>'+(p.image_url&&/^https:\/\//i.test(p.image_url)?'<img class="community-image" src="'+esc(p.image_url)+'" alt="投稿画像" loading="lazy">':'')+'<div class="actions">'+(session&&(p.author_id===session.user?.id||isNetworkAdmin)?'<button class="secondary" data-post-delete="'+esc(p.id)+'">投稿を削除</button>':'')+(session&&p.author_id!==session.user?.id?'<button class="secondary" data-post-report="'+esc(p.id)+'">報告</button>':'')+'</div><div class="community-comments"><h4>コメント ('+(p.comments||[]).length+')</h4>'+((p.comments||[]).map(c=>'<div class="community-comment"><p>'+esc(c.body)+'</p><div class="feed-meta">'+esc(c.author_nickname)+' · '+esc(date(c.created_at))+'</div><div class="actions">'+(session&&(c.author_id===session.user?.id||isNetworkAdmin)?'<button class="secondary" data-comment-delete="'+esc(c.id)+'">削除</button>':'')+(session&&c.author_id!==session.user?.id?'<button class="secondary" data-comment-report="'+esc(c.id)+'">報告</button>':'')+'</div></div>').join('')||'<p class="muted">コメントはまだありません。</p>')+(session?'<form class="community-comment-form" data-comment-form="'+esc(p.id)+'"><label>コメント</label><textarea class="field" name="body" rows="2" maxlength="1500" required placeholder="コメントを入力"></textarea><button class="secondary" type="submit">コメントする</button></form>':'')+'</div></article>').join('');
  list.querySelectorAll('[data-post-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('この投稿を削除しますか？'))return;try{await call('community_delete_post',{id:b.dataset.postDelete});await loadCommunity();}catch(e){alert('削除できませんでした：'+e.message);}}));
  list.querySelectorAll('[data-comment-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('このコメントを削除しますか？'))return;try{await call('community_delete_comment',{id:b.dataset.commentDelete});await loadCommunity();}catch(e){alert('削除できませんでした：'+e.message);}}));
  list.querySelectorAll('[data-post-report],[data-comment-report]').forEach(b=>b.addEventListener('click',async()=>{const isPost=b.hasAttribute('data-post-report'),targetId=b.dataset.postReport||b.dataset.commentReport,reason=prompt('報告理由を入力してください（5〜500文字）');if(reason===null)return;try{await call('community_report',{target_type:isPost?'post':'comment',target_id:targetId,reason});alert('報告を送信しました。管理者が確認します。');}catch(e){alert('報告できませんでした：'+e.message);}}));
  list.querySelectorAll('[data-comment-form]').forEach(f=>f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button[type=submit]');b.disabled=true;try{await call('community_create_comment',{post_id:f.dataset.commentForm,body:f.elements.body.value});await loadCommunity();}catch(err){alert('コメントできませんでした：'+err.message);b.disabled=false;}}));
 }catch(e){list.innerHTML='<p class="muted">掲示板を読み込めませんでした：'+esc(e.message)+'</p>';}
}
$('communityPostForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,b=form.querySelector('button[type=submit]'),status=$('communityPostStatus');
 b.disabled=true;status.textContent='投稿しています…';
 try{await call('community_create_post',{title:form.elements.title.value,body:form.elements.body.value});form.reset();status.textContent='投稿しました。';await loadCommunity();}
 catch(err){status.textContent='投稿できませんでした：'+err.message;}
 finally{b.disabled=false;}
});
async function loadCommunityReports(){
 const el=$('communityReports');if(!el)return;
 try{const r=await call('community_admin_list_reports'),items=r.items||[];
  el.innerHTML=items.length?items.map(x=>'<article class="card"><strong>'+esc(x.target_type==='post'?'投稿への報告':'コメントへの報告')+'</strong><p>'+esc(x.target_preview)+'</p><p class="muted">報告者：'+esc(x.reporter_nickname)+' · '+esc(date(x.created_at))+'</p><p>理由：'+esc(x.reason)+'</p><div class="actions"><button class="primary" data-report-remove="'+esc(x.id)+'">削除して対応</button><button class="secondary" data-report-dismiss="'+esc(x.id)+'">対応不要として閉じる</button></div></article>').join(''):'<p class="muted">未対応の報告はありません。</p>';
  el.querySelectorAll('[data-report-remove]').forEach(b=>b.addEventListener('click',async()=>{const reason=prompt('削除理由を入力してください（3文字以上）');if(reason===null)return;try{await call('community_admin_resolve_report',{report_id:b.dataset.reportRemove,remove:true,reason});await loadCommunityReports();}catch(e){alert('処理できませんでした：'+e.message);}}));
  el.querySelectorAll('[data-report-dismiss]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('この報告を対応不要として閉じますか？'))return;try{await call('community_admin_resolve_report',{report_id:b.dataset.reportDismiss,remove:false});await loadCommunityReports();}catch(e){alert('処理できませんでした：'+e.message);}}));
 }catch(e){el.textContent='報告一覧を読み込めませんでした：'+e.message;}
}

function diagnosticRow(label,value,ok=true){return '<div class="card" style="margin:8px 0"><strong>'+esc(label)+'</strong><p class="muted">'+esc(value)+'</p><span class="feed-meta">'+(ok?'確認':'要確認')+'</span></div>';}
let lastDiagnosticReport=null;
async function runNetworkDiagnostics(){
 const statusEl=$('diagnosticsStatus'),resultEl=$('diagnosticsResults'),download=$('downloadDiagnostics'),button=$('runDiagnostics');
 button.disabled=true;download.disabled=true;statusEl.textContent='診断を実行しています…';resultEl.innerHTML='';
 const checks=[];const add=(name,value,ok=true)=>checks.push({name,value,ok});
 const started=new Date();
 add('ブラウザ接続',navigator.onLine?'オンライン':'オフライン',navigator.onLine);
 add('表示ページ',location.pathname+' / '+(document.documentElement.dataset.page||'unknown'));
 add('画面サイズ',window.innerWidth+' × '+window.innerHeight+' px');
 add('画面密度',String(window.devicePixelRatio||1)+'x');
 add('ブラウザ情報',String(navigator.userAgent).slice(0,220));
 add('JavaScript',typeof Promise==='function'&&typeof fetch==='function'?'基本APIを利用可能':'必要なAPIが不足',typeof Promise==='function'&&typeof fetch==='function');
 let storageOK=false;try{const k='aevnetwork_diag_'+Date.now();localStorage.setItem(k,'1');storageOK=localStorage.getItem(k)==='1';localStorage.removeItem(k);}catch(e){}add('ローカルストレージ',storageOK?'読み書き可能':'利用不可または制限中',storageOK);
 let apiOK=false,adminOK=false,apiMessage='';try{const r=await call('is_admin');apiOK=true;adminOK=r.is_admin===true;apiMessage=adminOK?'管理者API応答あり':'API応答あり（管理者権限を確認できません）';}catch(e){apiMessage=String(e.message||e);}
 add('AevNetwork管理API',apiOK?apiMessage:'API通信失敗：'+apiMessage,apiOK&&adminOK);
 const errors=diagnosticEvents.errors.slice(),rejections=diagnosticEvents.rejections.slice(),resources=diagnosticEvents.resourceFailures.slice();
 add('JavaScriptエラー',errors.length+'件',errors.length===0);
 add('未処理Promiseエラー',rejections.length+'件',rejections.length===0);
 add('読み込み失敗リソース',resources.length+'件',resources.length===0);
 const report={product:'AevNetwork',report_version:1,generated_at:started.toISOString(),page:{path:location.pathname,title:document.title},environment:{online:navigator.onLine,language:navigator.language,platform:navigator.platform,viewport:{width:window.innerWidth,height:window.innerHeight},device_pixel_ratio:window.devicePixelRatio||1,user_agent:navigator.userAgent},checks,events:{javascript_errors:errors,unhandled_rejections:rejections,resource_failures:resources},privacy:{note:'パスワード、アクセストークン、メールアドレス、プロフィール内容、ローカルストレージの値は含みません。'}};
 lastDiagnosticReport=report;download.disabled=false;
 resultEl.innerHTML=checks.map(x=>diagnosticRow(x.name,x.value,x.ok)).join('');
 statusEl.textContent='診断完了：'+checks.filter(x=>!x.ok).length+'項目に確認事項があります。結果をJSONで保存できます。';
 button.disabled=false;
}
$('runDiagnostics')?.addEventListener('click',()=>runNetworkDiagnostics().catch(e=>{$('diagnosticsStatus').textContent='診断に失敗しました：'+e.message;$('runDiagnostics').disabled=false;}));
$('downloadDiagnostics')?.addEventListener('click',()=>{if(!lastDiagnosticReport)return;const blob=new Blob([JSON.stringify(lastDiagnosticReport,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='AevNetwork-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('diagnosticsStatus').textContent='診断レポートをダウンロードしました。';});
$('refreshAllAdmin')?.addEventListener('click',async()=>{const b=$('refreshAllAdmin');b.disabled=true;b.textContent='更新中…';try{await Promise.all([loadMetrics(),loadContent(),loadUsers(),loadBlacklist(),loadCommunityReports()]);$('contentStatus').textContent='全管理データを更新しました。';}catch(e){$('contentStatus').textContent='一部の管理データを更新できませんでした：'+e.message;}finally{b.disabled=false;b.textContent='全管理データを更新';}});

async function loadAdmin(){try{await Promise.all([loadMetrics(),loadContent(),loadUsers(),loadBlacklist(),loadCommunityReports()]);}catch(e){const p=document.createElement('p');p.className='status';p.textContent='管理情報を読み込めませんでした：'+e.message;$('adminContent').prepend(p);}}
let sharedRealtimeClient=null;
function startSharedRealtime(){
 if(!window.supabase||sharedRealtimeClient)return;
 try{
  sharedRealtimeClient=window.supabase.createClient('https://vuqbbwdojwmtehgsyfaq.supabase.co','sb_publishable_BnrPnMn5fCDrXuloVe7XYw_W5R7JH4E',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  sharedRealtimeClient.channel('aev-shared-announcements')
   .on('postgres_changes',{event:'*',schema:'public',table:'aevtools_announcements'},()=>{
    if(document.documentElement.dataset.page==='index')loadPublicFeed('announcements','publicAnnouncements');
    if(document.documentElement.dataset.page==='admin'&&$('adminKind')?.value==='announcements')loadContent();
   }).subscribe();
  if(document.documentElement.dataset.page==='community'){
   sharedRealtimeClient.channel('aev-shared-board')
    .on('postgres_changes',{event:'*',schema:'public',table:'aevnetwork_community_posts'},()=>loadCommunity())
    .on('postgres_changes',{event:'*',schema:'public',table:'aevnetwork_community_comments'},()=>loadCommunity())
    .subscribe();
  }
 }catch(e){console.warn('共有データのリアルタイム接続に失敗しました',e);}
}
(async()=>{try{session=JSON.parse(localStorage.getItem(KEY)||'null');showAccount();await loadSharedProfile();const yes=await refreshAdmin();if(yes&&document.documentElement.dataset.page==='admin')await loadAdmin();if(document.documentElement.dataset.page==='index')await loadPublicFeed('announcements','publicAnnouncements');if(document.documentElement.dataset.page==='community')await loadCommunity();startSharedRealtime();}catch(e){localStorage.removeItem(KEY);session=null;showAccount();}})();
})();