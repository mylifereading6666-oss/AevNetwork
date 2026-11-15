(()=>{
const API='https://vuqbbwdojwmtehgsyfaq.supabase.co/functions/v1/aevnetwork-api',KEY='aevnetwork_auth_session';
let session=null,adminUsers=[],isNetworkAdmin=false,isNetworkTestHelper=false;
const diagnosticEvents={errors:[],rejections:[],resourceFailures:[]};
window.addEventListener('error',e=>{diagnosticEvents.errors.push({message:String(e.message||'Script error'),file:e.filename?String(e.filename).split('/').pop():'',line:Number(e.lineno)||0,column:Number(e.colno)||0,time:new Date().toISOString()});if(diagnosticEvents.errors.length>100)diagnosticEvents.errors.shift();},true);
window.addEventListener('unhandledrejection',e=>{diagnosticEvents.rejections.push({reason:String(e.reason?.message||e.reason||'Unhandled rejection').slice(0,300),time:new Date().toISOString()});if(diagnosticEvents.rejections.length>100)diagnosticEvents.rejections.shift();});
window.addEventListener('error',e=>{if(e.target&&e.target!==window&&e.target.src)diagnosticEvents.resourceFailures.push({resource:String(e.target.src).split('/').pop(),type:e.target.tagName||'resource',time:new Date().toISOString()});},true);

const $=id=>document.getElementById(id),sidebar=$('sidebar'),overlay=$('overlay'),hamb=$('hamb');
function menu(open){sidebar?.classList.toggle('open',open);overlay?.classList.toggle('show',open);document.body.style.overflow=open?'hidden':'';hamb?.setAttribute('aria-expanded',String(open));}
hamb?.addEventListener('click',()=>menu(!sidebar.classList.contains('open')));
overlay?.addEventListener('click',()=>menu(false));
document.querySelectorAll('.navbtn').forEach(a=>{if(a.dataset.page===document.documentElement.dataset.page){a.classList.add('active');const g=a.closest('.navgroup');if(g)g.open=true;}a.addEventListener('click',()=>menu(false));});
document.getElementById('headerAccountLink')?.addEventListener('click',()=>setTimeout(refreshServiceMaintenance,0));
if($('year'))$('year').textContent=new Date().getFullYear();
async function refreshAuthSession(force=false){
 if(!session?.refresh_token)return false;
 const expiresAt=Number(session.expires_at||0);
 if(!force&&expiresAt&&expiresAt>Date.now()/1000+60)return true;
 try{
  const response=await fetch(PROFILE_STORAGE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json',apikey:PROFILE_STORAGE_KEY},body:JSON.stringify({refresh_token:session.refresh_token})});
  const refreshed=await response.json().catch(()=>({}));
  if(!response.ok||!refreshed.access_token||!refreshed.refresh_token)return false;
  session={...session,...refreshed};
  localStorage.setItem(KEY,JSON.stringify(session));
  return true;
 }catch(e){console.warn('AevNetworkログインセッションの更新に失敗しました',e);return false;}
}
async function call(action,extra={},retried=false){
 if(session?.refresh_token&&session.expires_at&&Number(session.expires_at)<=Date.now()/1000+60)await refreshAuthSession(false);
 const headers={'Content-Type':'application/json'};if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
 const res=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...extra})});
 const data=await res.json().catch(()=>({}));
 if(res.status===401&&!retried&&await refreshAuthSession(true))return call(action,extra,true);
 if(!res.ok)throw Error([data.error||'API通信エラー',data.detail||'',data.code||'',data.hint||''].filter(Boolean).join(' / '));
 return data;
}
const PROFILE_STORAGE_URL='https://vuqbbwdojwmtehgsyfaq.supabase.co';
const PROFILE_STORAGE_KEY='sb_publishable_BnrPnMn5fCDrXuloVe7XYw_W5R7JH4E';
async function uploadNetworkProfileImage(kind){
 const input=$(kind==='avatar'?'profileAvatarFile':'profileBannerFile'),file=input?.files?.[0],status=$('profileStatus');
 if(!file){status.textContent='アップロードする画像を選択してください。';return;}
 const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
 if(!allowed[file.type]||file.size>5*1024*1024){status.textContent='JPEG・PNG・WebP・GIF形式、5MB以下の画像を選択してください。';return;}
 if(!session?.access_token||!session?.user?.id){status.textContent='ログインセッションを確認できません。再ログインしてください。';return;}
 const button=$(kind==='avatar'?'uploadProfileAvatar':'uploadProfileBanner');if(button)button.disabled=true;
 status.textContent='画像をアップロードしています…';
 try{
  const path=session.user.id+'/'+kind+'.'+allowed[file.type];
  const response=await fetch(PROFILE_STORAGE_URL+'/storage/v1/object/aev-profile-images/'+path,{method:'POST',headers:{apikey:PROFILE_STORAGE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':file.type,'x-upsert':'true'},body:file});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.message||result.error||'storage_upload_failed');
  $(kind==='avatar'?'profileAvatar':'profileBanner').value=PROFILE_STORAGE_URL+'/storage/v1/object/public/aev-profile-images/'+path;
  input.value='';
  status.textContent='アップロードしました。プロフィール設定を保存すると両サイトに反映されます。';
 }catch(e){status.textContent='画像をアップロードできませんでした：'+e.message;}
 finally{if(button)button.disabled=false;}
}
$('uploadProfileAvatar')?.addEventListener('click',()=>uploadNetworkProfileImage('avatar'));
$('uploadProfileBanner')?.addEventListener('click',()=>uploadNetworkProfileImage('banner'));
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function date(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ja-JP');}
let serviceMaintenanceEnabled=false;
let snapshotRestoreAttemptedFor='';
async function restoreOwnNetworkSnapshot(){
 if(!session?.access_token||serviceMaintenanceEnabled)return;
 const uid=String(session.user?.id||'');
 if(!uid||snapshotRestoreAttemptedFor===uid)return;
 try{
  const response=await call('user_data_snapshot_restore');
  const result=response.result||{};
  if(result.restored===true){
   snapshotRestoreAttemptedFor=uid;
   // The restore transaction has completed and removed the snapshot.
   // Reload once so every page reads the restored relational records.
   window.location.reload();
   return;
  }
  if(result.reason==='snapshot_not_found')snapshotRestoreAttemptedFor=uid;
 }catch(e){console.warn('AevNetworkバックアップの復元に失敗しました',e);}
}
function maintenanceOverlay(active){
 let el=$('serviceMaintenanceOverlay');
 document.body.classList.toggle('maintenance-lock',active);
 if(!active){el?.remove();return;}
 if(document.documentElement.dataset.page==='account')return;
 if(!el){el=document.createElement('div');el.id='serviceMaintenanceOverlay';el.className='service-maintenance-overlay';el.innerHTML='<div class="service-maintenance-card"><div style="font-size:2rem">🛠️</div><h2>ただいまメンテナンス中です</h2><p>現在、AevTools・AevNetworkの機能を一時停止しています。作業完了までしばらくお待ちください。</p><p class="muted">管理者・テスト補助者はテストのため通常どおり利用できます。</p><a class="primary" href="account.html" style="display:inline-block;margin-top:12px;text-decoration:none">ログイン・アカウント</a></div>';document.body.append(el);}
}
async function refreshServiceMaintenance(){
 try{
  const r=await call('service_get_status');
  const wasMaintenance=serviceMaintenanceEnabled;
  serviceMaintenanceEnabled=r.maintenance_enabled===true;
  if(!wasMaintenance&&serviceMaintenanceEnabled)snapshotRestoreAttemptedFor='';
  if(wasMaintenance&&!serviceMaintenanceEnabled)await restoreOwnNetworkSnapshot();
  isNetworkTestHelper=r.is_test_helper===true;
  maintenanceOverlay(serviceMaintenanceEnabled&&!isNetworkAdmin&&!isNetworkTestHelper);
  const helperBadge=$('testHelperTitleBadge');if(helperBadge)helperBadge.hidden=!isNetworkTestHelper;
  const status=$('maintenanceStatus'),button=$('toggleMaintenance');
  if(status)status.textContent=serviceMaintenanceEnabled?'現在：メンテナンスモード ON（一般ユーザーは利用停止）':'現在：通常稼働中';
  if(button){button.textContent=serviceMaintenanceEnabled?'メンテナンスモードを解除':'メンテナンスモードを有効化';button.classList.toggle('primary',!serviceMaintenanceEnabled);}
 }catch(e){const status=$('maintenanceStatus');if(status)status.textContent='状態を取得できません：'+e.message;}
}
$('toggleMaintenance')?.addEventListener('click',async()=>{
 if(!isNetworkAdmin)return;
 const next=!serviceMaintenanceEnabled,b=$('toggleMaintenance');b.disabled=true;
 try{await call('service_set_maintenance',{enabled:next});serviceMaintenanceEnabled=next;await refreshServiceMaintenance();}
 catch(e){const s=$('maintenanceStatus');if(s)s.textContent='設定を保存できませんでした：'+e.message;}
 finally{b.disabled=false;}
});
function assistDate(value){
 if(!value)return '未設定';
 const d=new Date(value);if(Number.isNaN(d.getTime()))return '未設定';
 return d.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function applyAnnouncementTemplate(kind){
 const start=assistDate($('assistStartAt')?.value),end=assistDate($('assistEndAt')?.value);
 const templates={
 general:['【お知らせ】タイトルを入力してください','いつもAevTools・AevNetworkをご利用いただきありがとうございます。\n\nお知らせ内容：\n・\n\n今後ともよろしくお願いいたします。'],
 maintenance:['【重要】サイト更新・メンテナンスのお知らせ','いつもAevTools・AevNetworkをご利用いただきありがとうございます。\n\nサービスの更新作業のため、下記の時間帯にメンテナンスを実施します。\n\n■実施日・時間\n開始：'+start+'\n終了予定：'+end+'\n※作業状況により終了時刻が前後する場合があります。\n\nメンテナンス中は一部またはすべての機能をご利用いただけません。ご不便をおかけして申し訳ございません。\n\n大切なデータについては、作業前にメールアプリを利用した保存、またはJSONファイルでのエクスポート・保存をおすすめします。\n\nご理解とご協力のほど、よろしくお願いいたします。'],
 outage:['【重要】サービス障害・不具合について','現在、AevTools・AevNetworkにおいて以下の問題を確認しています。\n\n■発生している問題\n・\n■影響する機能\n・\n■現在の対応状況\n調査・復旧対応を進めています。\n\nご不便とご迷惑をおかけしており、誠に申し訳ございません。復旧状況は本お知らせを更新してご案内します。'],
 release:['【アップデート】新機能・改善のお知らせ','AevTools・AevNetworkをアップデートしました。\n\n■主な変更点\n・\n・\n\nぜひ新機能をお試しください。今後ともよろしくお願いいたします。'],
 event:['【開催告知】イベント・大会のお知らせ','イベント・大会を開催します。\n\n■開催日時\n日付・時間：\n■参加方法\n\n■注意事項\n\n皆さまのご参加をお待ちしています。']
 };
 const t=templates[kind];if(!t)return;
 $('contentTitle').value=t[0];$('contentBody').value=t[1];
 $('contentStatus').textContent='下書きを入力しました。日付・時刻・内容を確認して編集してください。';
 $('contentTitle').focus();
}
document.querySelectorAll('[data-announcement-template]').forEach(b=>b.addEventListener('click',()=>applyAnnouncementTemplate(b.dataset.announcementTemplate)));
async function refreshAdmin(){const group=$('adminNavGroup'),denied=$('adminOnly'),content=$('adminContent');if(!session){isNetworkAdmin=false;if(group)group.hidden=true;if(denied)denied.hidden=false;if(content)content.hidden=true;return false;}try{const r=await call('is_admin'),yes=r.is_admin===true;isNetworkAdmin=yes;isNetworkTestHelper=r.is_test_helper===true;if(group)group.hidden=!yes;if(document.documentElement.dataset.page==='admin'){if(denied)denied.hidden=yes;if(content)content.hidden=!yes;}return yes;}catch(e){isNetworkAdmin=false;if(group)group.hidden=true;if(document.documentElement.dataset.page==='admin'){if(denied){denied.hidden=false;denied.querySelector('p').textContent='管理者確認に失敗しました。通信状態を確認してください。';}if(content)content.hidden=true;}return false;}}
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
$('accountLogin')?.addEventListener('click',async()=>{const email=$('accountEmail')?.value.trim(),password=$('accountPassword')?.value;if(!email||!password){if(status)status.textContent='メールアドレスとパスワードを入力してください。';return;}const b=$('accountLogin');b.disabled=true;try{const r=await call('login',{email,password});session=r.session;localStorage.setItem(KEY,JSON.stringify(session));showAccount();startPresenceHeartbeat();await loadSharedProfile();const yes=await refreshAdmin();await refreshServiceMaintenance();await restoreOwnNetworkSnapshot();if(yes&&document.documentElement.dataset.page==='admin')await loadAdmin();const page=document.documentElement.dataset.page;if(page==='index'||page==='announcements')await loadPublicFeed('announcements','publicAnnouncements');if(page==='news')await loadPublicFeed('news','publicNews');if(page==='updates')await loadPublicFeed('updates','publicUpdates');if(page==='community')await loadCommunity();if(page==='friends')await loadFriendsPage();if(page==='profile')await loadPublicProfilePage();if(status)status.textContent='ログインしました。';$('accountPassword').value='';}catch(e){if(status)status.textContent='ログインできませんでした：'+e.message;}finally{b.disabled=false;}});
$('accountLogout')?.addEventListener('click',()=>{localStorage.removeItem(KEY);session=null;showAccount();const pp=$('networkProfilePanel');if(pp)pp.hidden=true;refreshAdmin();refreshServiceMaintenance();if(status)status.textContent='ログアウトしました。';});
function safeFeedUrl(value){try{const u=new URL(value,location.href);return u.protocol==='https:'?u.href:'';}catch(e){return '';}}
function safeFeedEmbed(value){try{const u=new URL(value);return u.protocol==='https:'&&['www.youtube-nocookie.com','youtube-nocookie.com','platform.twitter.com'].includes(u.hostname)?u.href:'';}catch(e){return '';}}
async function loadPublicFeed(kind,target){
 const el=$(target);if(!el)return;
 try{
  const r=await call('public_list_content',{kind}),items=(r.items||[]).slice().sort((a,b)=>{const ta=Date.parse(a.created_at||a.published_at||'')||0,tb=Date.parse(b.created_at||b.published_at||'')||0;return tb-ta;});
  el.innerHTML=items.length?items.map(x=>{
   const image=safeFeedUrl(x.image_url||'');
   const embed=safeFeedEmbed(x.video_embed_url||'');
   const video=safeFeedUrl(x.video_url||'');
   const isDirectVideo=/\\.(mp4|webm|ogg)(?:[?#]|$)/i.test(video);
   const media=(image?'<img class="feed-image" src="'+esc(image)+'" alt="" loading="lazy">':'')+
    (isDirectVideo?'<video class="feed-video" controls preload="none" playsinline src="'+esc(video)+'"></video>':
     (embed?'<div class="feed-video-frame"><iframe src="'+esc(embed)+'" title="動画プレーヤー" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>':''));
   const source=x.source_url?'<p class="feed-source">情報元：'+esc(x.source_name||'公式情報')+' · <a href="'+esc(safeFeedUrl(x.source_url))+'" target="_blank" rel="noopener noreferrer">元の情報を開く ↗</a></p>':'';
   const link=x.link_url||x.source_url||'';
   const related=link?'<p><a class="primary" href="'+esc(safeFeedUrl(link))+'" target="_blank" rel="noopener noreferrer">公式情報を開く ↗</a></p>':'';
   return '<article class="feed-item"><h3>'+esc(x.title)+'</h3>'+(kind==='news'&&x.category?'<p class="feed-meta">'+esc(x.category)+'</p>':'')+media+'<p>'+esc(x.body)+'</p>'+related+source+'<div class="feed-meta">'+(kind==='announcements'?'Aev0rnJP（管理者） · ':'')+esc(date(x.created_at))+'</div></article>';
  }).join(''):'<p class="muted">現在、掲載されている情報はありません。</p>';
 }catch(e){console.error('お知らせ読み込みエラー:',e);el.textContent='情報を読み込めませんでした：'+(e?.message||String(e));}
}
$('announcementsRefresh')?.addEventListener('click',()=>loadPublicFeed('announcements','publicAnnouncements'));
async function loadMetrics(){const r=await call('admin_dashboard');const m=r.metrics||{};$('adminMetrics').innerHTML=[['登録ユーザー',m.users],['お知らせ',m.announcements],['AevNews',m.news],['アップデート',m.updates],['制限中ユーザー',m.blacklist]].map(([k,v])=>'<div class="card"><p>'+esc(k)+'</p><h2>'+esc(v??'—')+'</h2></div>').join('');}
async function loadContent(){
 const kind=$('adminKind').value,r=await call('admin_list_content',{kind}),items=r.items||[];
 $('categoryWrap').hidden=kind!=='news';
 $('announcementAssist').hidden=kind!=='announcements';
 $('linkWrap').hidden=kind==='updates';
 $('videoWrap').hidden=kind!=='announcements';
 $('publishWrap').hidden=kind==='announcements';
 $('contentBody').maxLength=kind==='announcements'?6000:10000;
 $('adminContentList').innerHTML=items.length?items.map(x=>'<article class="card admin-item"><h3>'+esc(x.title)+'</h3><p>'+esc((x.body||'').slice(0,220))+'</p><p class="muted">'+esc(date(x.created_at))+(x.published===false?' · 非公開':' · 公開')+'</p><div class="actions"><button class="secondary" data-edit="'+esc(x.id)+'">編集</button><button class="secondary" data-delete="'+esc(x.id)+'">削除</button></div></article>').join(''):'<p class="muted">まだ登録されていません。</p>';
 $('adminContentList').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const x=items.find(i=>i.id===b.dataset.edit);if(!x)return;$('contentId').value=x.id;$('contentTitle').value=x.title||'';$('contentBody').value=x.body||'';$('contentCategory').value=x.category||'GAMING';$('contentLink').value=x.link_url||'';$('contentVideo').value=x.video_url||'';$('contentPublished').checked=x.published!==false;$('contentStatus').textContent='編集モードです。';$('adminContentForm').scrollIntoView({behavior:'smooth',block:'center'});}));
 $('adminContentList').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('このコンテンツを削除しますか？'))return;try{await call('admin_delete_content',{kind,id:b.dataset.delete});await loadContent();$('contentStatus').textContent='削除しました。';}catch(e){$('contentStatus').textContent='削除失敗：'+e.message;}}));
}
function clearContentForm(){$('contentId').value='';$('contentTitle').value='';$('contentBody').value='';$('contentCategory').value='GAMING';$('contentLink').value='';$('contentVideo').value='';$('contentPublished').checked=true;}
$('contentCancel')?.addEventListener('click',clearContentForm);
$('adminKind')?.addEventListener('change',()=>{clearContentForm();loadContent().catch(e=>$('contentStatus').textContent=e.message);});
$('adminContentForm')?.addEventListener('submit',async e=>{e.preventDefault();const kind=$('adminKind').value,item={id:$('contentId').value||undefined,title:$('contentTitle').value,body:$('contentBody').value,category:$('contentCategory').value,link_url:$('contentLink').value,video_url:$('contentVideo').value,published:$('contentPublished').checked};const b=e.submitter;b.disabled=true;try{await call('admin_save_content',{kind,item});clearContentForm();$('contentStatus').textContent='保存しました。';await loadContent();await loadMetrics();}catch(err){$('contentStatus').textContent='保存できませんでした：'+err.message;}finally{b.disabled=false;}});
async function loadUsers(){const r=await call('admin_list_users',{page:1});adminUsers=r.users||[];$('adminUsers').innerHTML=adminUsers.length?'<div class="admin-user-list">'+adminUsers.map(u=>'<div class="card"><strong>'+esc(u.email||'(メール未登録)')+'</strong><p class="muted">登録：'+esc(date(u.created_at))+'<br>最終ログイン：'+esc(date(u.last_sign_in_at))+'</p></div>').join('')+'</div>':'<p class="muted">ユーザーはいません。</p>';$('blacklistUser').innerHTML='<option value="">ユーザーを選択</option>'+adminUsers.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.email||u.id)+'</option>').join('');const helperSelect=$('testHelperUser');if(helperSelect)helperSelect.innerHTML='<option value="">ユーザーを選択</option>'+adminUsers.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.email||u.id)+'</option>').join('');}
async function loadCommunityReports(){
 const el=$('communityReports');if(!el)return;
 try{const r=await call('community_admin_list_reports'),items=r.items||[];
  el.innerHTML=items.length?items.map(x=>'<article class="card"><strong>'+esc(x.target_type==='post'?'投稿への報告':'コメントへの報告')+'</strong><p>'+esc(x.target_preview)+'</p><p class="muted">報告者：'+esc(x.reporter_nickname)+' · '+esc(date(x.created_at))+'</p><p>理由：'+esc(x.reason)+'</p><div class="actions"><button class="primary" data-report-remove="'+esc(x.id)+'">削除して対応</button><button class="secondary" data-report-dismiss="'+esc(x.id)+'">対応不要として閉じる</button></div></article>').join(''):'<p class="muted">未対応の報告はありません。</p>';
  el.querySelectorAll('[data-report-remove]').forEach(b=>b.addEventListener('click',async()=>{const reason=prompt('削除理由を入力してください（3文字以上）');if(reason===null)return;try{await call('community_admin_resolve_report',{report_id:b.dataset.reportRemove,remove:true,reason});await loadCommunityReports();}catch(e){alert('処理できませんでした：'+e.message);}}));
  el.querySelectorAll('[data-report-dismiss]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('この報告を対応不要として閉じますか？'))return;try{await call('community_admin_resolve_report',{report_id:b.dataset.reportDismiss,remove:false});await loadCommunityReports();}catch(e){alert('処理できませんでした：'+e.message);}}));
 }catch(e){el.textContent='報告一覧を読み込めませんでした：'+e.message;}
}

let activeTeamId=null,teamChatTimer=null,teamRefreshTimer=null,teamInviteTimer=null,teamBadgeTimer=null,lastTeamChatSignature="",teamDirectoryCache=[];
function teamError(e){const m={team_already_created:"作成できるチームは1人につき1つまでです。すでに作成済みのチームがあります。",team_invite_target_not_friend:"招待できるのはフレンドだけです。",team_invite_already_member_or_applied:"このユーザーは既にチーム参加中、または申請中です。",team_invite_not_found:"チーム招待が見つかりません。",team_invite_already_responded:"このチーム招待は既に処理されています。",team_invite_friendship_removed:"招待者とのフレンド関係が解除されているため参加できません。",missing_session:"利用するにはログインしてください。",team_application_exists:"このチームには申請済み、または参加中です。",team_chat_members_only:"チャットは承認済みメンバー限定です。",team_leader_required:"チームリーダーのみ操作できます。",leader_cannot_leave:"リーダーはチームを退出できません。",team_full:"このチームは定員4人に達しています。",team_delete_forbidden:"作成したリーダーまたは管理者のみ削除できます。",already_team_member:"すでにこのチームに参加しています。",cannot_kick_admin:"管理者はキックできません。",cannot_kick_leader:"リーダーはキックできません。",team_member_not_active:"対象メンバーは参加中ではありません。"};return m[e.message]||e.message||"処理に失敗しました。";}
async function loadTeams(){const directory=$("teamDirectory"),mineEl=$("myTeams");if(!directory||!mineEl)return;try{const a=await call("teams_list"),b=session?await call("teams_my"):{items:[]},inv=session?await call("teams_friend_invites_overview"):{incoming:[],outgoing:[]};teamDirectoryCache=a.items||[];renderTeamDirectory();renderMyTeams(b.items||[]);renderTeamInvitations(inv.incoming||[],inv.outgoing||[]);}catch(e){directory.textContent="チームを読み込めませんでした："+teamError(e);mineEl.textContent="ログイン後に申請状況を確認できます。";}}
function renderTeamInvitations(incoming,outgoing){
 const el=$("teamInvitations");if(!el)return;
 if(!session){el.innerHTML='<p class="muted">ログインするとチーム招待を確認できます。</p>';return;}
 const received=incoming.length?incoming.map(x=>'<article class="team-card"><h3>'+esc(x.team?.name||"チーム")+'</h3><p>'+esc(x.inviter_nickname)+' さんからの招待</p><p class="feed-meta">'+esc(x.team?.game||"ゲーム未設定")+' · '+esc(date(x.created_at))+'</p><div class="actions"><button class="primary" data-team-invite-accept="'+esc(x.id)+'">承認して参加</button><button class="secondary" data-team-invite-reject="'+esc(x.id)+'">拒否</button></div></article>').join(""):'<p class="muted">届いているチーム招待はありません。</p>';
 const sent=outgoing.length?'<h3>送信した招待</h3>'+outgoing.map(x=>'<p class="muted">'+esc(x.team?.name||"チーム")+' → '+esc(x.invitee_nickname)+'（承認待ち）</p>').join(""):"";
 el.innerHTML=received+sent;
 el.querySelectorAll("[data-team-invite-accept],[data-team-invite-reject]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;try{const decision=b.hasAttribute("data-team-invite-accept")?"accepted":"rejected";const r=await call("teams_friend_invite_respond",{invitation_id:b.dataset.teamInviteAccept||b.dataset.teamInviteReject,decision});await loadTeams();if(decision==="accepted"&&r.team_id)openTeam(r.team_id);}catch(e){alert("招待を処理できませんでした："+teamError(e));b.disabled=false;}}));
}
function renderTeamDirectory(){const el=$("teamDirectory"),q=($("teamSearch")?.value||"").trim().toLowerCase();const items=teamDirectoryCache.filter(t=>(t.name+" "+(t.game||"")+" "+(t.description||"")).toLowerCase().includes(q));el.innerHTML=items.length?items.map(t=>'<article class="team-card"><div class="team-card-top"><h3>'+esc(t.name)+'</h3><span class="team-count">'+t.member_count+'/4人</span></div><p class="team-game">'+esc(t.game||"ゲーム未設定")+'</p><p>'+esc(t.description||"紹介文はありません。")+'</p><p class="feed-meta">リーダー：'+esc(t.owner_nickname)+' '+roleBadges(t.owner_badges||{is_leader:true})+' · '+esc(date(t.created_at))+'</p><div class="actions">'+(t.my_status==="approved"?'<button class="primary" data-team-open="'+esc(t.id)+'">チームを開く</button>':t.my_status==="pending"?'<button class="secondary" disabled>申請中</button>':t.my_status==="rejected"?'<button class="secondary" disabled>申請却下済み</button>':session?'<button class="primary" data-team-apply="'+esc(t.id)+'" '+(t.member_count>=4?'disabled':'')+'>参加申請</button>':'<a class="secondary" href="account.html">ログインして参加申請</a>')+'</div></article>').join(""):'<p class="muted">該当するチームはありません。</p>';el.querySelectorAll("[data-team-apply]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;try{await call("teams_apply",{team_id:b.dataset.teamApply});await loadTeams();}catch(e){alert("申請できませんでした："+teamError(e));b.disabled=false;}}));el.querySelectorAll("[data-team-open]").forEach(b=>b.addEventListener("click",()=>openTeam(b.dataset.teamOpen)));}
function renderMyTeams(items){const el=$("myTeams");if(!session){el.innerHTML='<p class="muted">チーム作成・参加申請にはログインが必要です。</p>';return;}el.innerHTML=items.length?items.map(x=>'<article class="team-card"><div class="team-card-top"><h3>'+esc(x.team.name)+'</h3><span class="team-status">'+(x.status==="approved"?(x.role==="leader"?"リーダー":"参加中"):x.status==="pending"?"承認待ち":"申請却下")+'</span></div>'+(isNetworkAdmin?'<p>'+roleBadges({is_admin:true})+'</p>':'')+(x.role==="leader"?'<p>'+roleBadges({is_leader:true})+'</p>':'')+'<p>'+esc(x.team.game||"ゲーム未設定")+'</p>'+(x.status==="approved"?'<div class="actions"><button class="primary" data-team-open="'+esc(x.team_id)+'">チームを開く</button>'+(x.role!=="leader"?'<button class="secondary" data-team-leave="'+esc(x.team_id)+'">チームを退出</button>':'')+'</div>':'')+'</article>').join(""):'<p class="muted">まだチームへの参加・申請はありません。</p>';el.querySelectorAll("[data-team-open]").forEach(b=>b.addEventListener("click",()=>openTeam(b.dataset.teamOpen)));el.querySelectorAll("[data-team-leave]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("チームを退出しますか？過去のメッセージは他のメンバー側に残ります。"))return;try{await call("teams_leave",{team_id:b.dataset.teamLeave});closeTeam();await loadTeams();}catch(e){alert(teamError(e));}}));}
$("teamSearch")?.addEventListener("input",renderTeamDirectory);
$("teamCreateForm")?.addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,b=e.submitter,status=$("teamCreateStatus");b.disabled=true;status.textContent="チームを作成しています…";try{await call("teams_create",{name:$("teamName").value,game:$("teamGame").value,description:$("teamDescription").value});form.reset();status.textContent="チームを作成しました。あなたがリーダーです。";await loadTeams();}catch(err){status.textContent="作成できませんでした："+teamError(err);}finally{b.disabled=false;}});
async function openTeam(id){try{
 const r=await call("teams_members",{team_id:id}),items=r.items||[],approvedCount=items.filter(m=>m.status==="approved").length,team=teamDirectoryCache.find(x=>x.id===id),friends=r.is_leader?await call("friends_overview"):{friends:[]},invites=r.is_leader?await call("teams_friend_invites_overview"):{outgoing:[]};
 activeTeamId=id;$("teamManagePanel").hidden=false;$("teamChatPanel").hidden=false;$("teamChatTitle").textContent="💬 "+(team?.name||"チーム")+" のチャット";
 const memberIds=new Set(items.map(m=>m.user_id)),candidates=(friends.friends||[]).filter(x=>!memberIds.has(x.user_id)),sent=(invites.outgoing||[]).filter(x=>x.team_id===id);
 $("teamManageContent").innerHTML='<h3>メンバー・参加申請</h3>'+(items.length?items.map(m=>'<div class="team-member-row" data-member-user-id="'+esc(m.user_id)+'"><div><strong>'+esc(m.nickname)+'</strong>'+roleBadges(m)+'<p class="feed-meta">'+(m.role==="leader"?"リーダー":m.status==="pending"?"参加申請中":m.status==="approved"?"メンバー":"申請却下")+'</p></div>'+(r.is_leader&&m.status==="pending"?'<div class="actions"><button class="primary" data-team-approve="'+esc(m.id)+'">承認</button><button class="secondary" data-team-reject="'+esc(m.id)+'">拒否</button></div>':r.is_leader&&m.status==="approved"&&m.role!=="leader"&&!m.is_admin?'<div class="actions"><button class="danger" data-team-kick="'+esc(m.id)+'">キック</button></div>':m.is_admin?'<p class="feed-meta">管理者アカウント（キック不可）</p>':'')+'</div>').join(""):'<p class="muted">メンバーはいません。</p>')+(r.is_leader?'<div class="panel"><h3>👥 フレンドをチームに招待</h3><p class="muted">フレンド一覧から招待相手を選択します。相手が承認すると、空きがある場合はチームに参加します。現在 '+approvedCount+'/4人。</p><div class="actions"><select class="field" id="teamFriendInviteSelect"><option value="">招待するフレンドを選択</option>'+candidates.map(x=>'<option value="'+esc(x.user_id)+'">'+esc(x.nickname)+'</option>').join("")+'</select><button class="primary" type="button" id="teamFriendInviteSend" '+(approvedCount>=4||!candidates.length?'disabled':'')+'>招待を送る</button></div><p class="status" id="teamFriendInviteStatus" aria-live="polite"></p><div>'+(sent.length?sent.map(x=>'<p class="muted">招待中：'+esc(x.invitee_nickname)+'</p>').join(""):'<p class="muted">送信中の招待はありません。</p>')+'</div></div>':'')+(r.is_owner?'<div class="actions"><button class="danger" id="teamDeleteButton">チームを完全削除</button></div><p class="muted">削除するとチーム・メンバー・全チャット履歴が全員分から完全に削除され、復元できません。</p>':'');
 $("teamFriendInviteSend")?.addEventListener("click",async()=>{const select=$("teamFriendInviteSelect"),status=$("teamFriendInviteStatus"),button=$("teamFriendInviteSend");if(!select?.value){status.textContent="招待するフレンドを選択してください。";return;}button.disabled=true;status.textContent="招待を送信しています…";try{await call("teams_friend_invite_send",{team_id:id,invitee_id:select.value});status.textContent="チーム招待を送信しました。";await openTeam(id);await loadTeams();}catch(e){status.textContent="招待できませんでした："+teamError(e);button.disabled=false;}});
 $("teamManageContent").querySelectorAll("[data-team-kick]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("このメンバーをチームからキックしますか？チャット履歴は保持されます。"))return;b.disabled=true;try{await call("teams_kick",{team_id:id,member_id:b.dataset.teamKick});await openTeam(id);await loadTeams();}catch(e){alert("キックできませんでした："+teamError(e));b.disabled=false;}}));
$("teamManageContent").querySelectorAll("[data-team-approve],[data-team-reject]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;try{await call("teams_review",{member_id:b.dataset.teamApprove||b.dataset.teamReject,decision:b.hasAttribute("data-team-approve")?"approved":"rejected"});await openTeam(id);await loadTeams();}catch(e){alert("処理できませんでした："+teamError(e));b.disabled=false;}}));$("teamDeleteButton")?.addEventListener("click",async()=>{if(!confirm("このチームを完全削除しますか？全員のチャット履歴も完全に消え、復元できません。"))return;if(!confirm("最終確認：本当に削除しますか？"))return;try{await call("teams_delete",{team_id:id});closeTeam();await loadTeams();alert("チームを完全削除しました。");}catch(e){alert("削除できませんでした："+teamError(e));}});lastTeamChatSignature="";await loadTeamChat(true);if(teamChatTimer)clearInterval(teamChatTimer);teamChatTimer=setInterval(()=>{if(activeTeamId===id&&!document.hidden)loadTeamChat(false).catch(()=>{closeTeam();loadTeams();});},5000);if(teamBadgeTimer)clearInterval(teamBadgeTimer);teamBadgeTimer=setInterval(()=>{if(activeTeamId===id&&!document.hidden)refreshActiveTeamBadges(id);},5000);$("teamChatPanel").scrollIntoView({behavior:"smooth",block:"start"});}catch(e){alert("チーム情報を開けませんでした："+teamError(e));}}
async function refreshActiveTeamBadges(id){if(activeTeamId!==id)return;try{const r=await call("teams_members",{team_id:id}),map=new Map((r.items||[]).map(m=>[m.user_id,m]));document.querySelectorAll("[data-member-user-id]").forEach(row=>{const m=map.get(row.dataset.memberUserId);if(!m)return;const old=row.querySelector(".role-badges"),html=roleBadges(m);if(old){if(html)old.outerHTML=html;else old.remove();}else if(html)row.querySelector("strong")?.insertAdjacentHTML("afterend",html);});}catch(e){}}
function closeTeam(){activeTeamId=null;if(teamChatTimer)clearInterval(teamChatTimer);if(teamBadgeTimer)clearInterval(teamBadgeTimer);if(teamInviteTimer)clearInterval(teamInviteTimer);teamBadgeTimer=null;teamInviteTimer=null;teamChatTimer=null;$("teamManagePanel").hidden=true;$("teamChatPanel").hidden=true;}
async function loadTeamChat(forceBottom=false){if(!activeTeamId)return;const el=$("teamChatMessages"),r=await call("teams_chat_list",{team_id:activeTeamId}),items=r.items||[],signature=items.map(x=>x.id+":"+(x.is_admin?"a":"")+(x.is_leader?"l":"")+(x.is_blacklisted?"b":"")).join("|");if(signature===lastTeamChatSignature&&!forceBottom)return;el.innerHTML=items.length?items.map(m=>'<article class="team-chat-message '+(m.mine?"mine":"")+'"><div class="team-chat-meta"><strong>'+esc(m.nickname)+'</strong>'+roleBadges(m)+'<time>'+esc(date(m.created_at))+'</time></div><p>'+esc(m.body)+'</p></article>').join(""):'<p class="muted">まだメッセージはありません。最初のメッセージを送ってみましょう。</p>';lastTeamChatSignature=signature;el.scrollTop=el.scrollHeight;}
$("teamChatForm")?.addEventListener("submit",async e=>{e.preventDefault();const input=$("teamChatInput"),b=e.submitter,status=$("teamChatStatus"),body=input.value.trim();if(!body||!activeTeamId)return;b.disabled=true;try{await call("teams_chat_send",{team_id:activeTeamId,body});input.value="";await loadTeamChat(true);status.textContent="送信しました。";}catch(err){status.textContent="送信できませんでした："+teamError(err);}finally{b.disabled=false;}});
$("teamMediationButton")?.addEventListener("click",async()=>{if(!activeTeamId)return;const message=prompt("管理者に仲介してほしい内容を入力してください（任意・1000文字以内）");if(message===null)return;try{await call("teams_mediation_request",{team_id:activeTeamId,message});$("teamMediationStatus").textContent="管理者へ仲介を依頼しました。確認されるまでお待ちください。";}catch(e){$("teamMediationStatus").textContent="依頼できませんでした："+teamError(e);}});
$("teamHideChatButton")?.addEventListener("click",async()=>{if(!activeTeamId)return;if(!confirm("チームを退出し、このチームチャットを自分の一覧から削除しますか？自分の履歴は復元できません。他のメンバーの履歴には影響しません。"))return;try{await call("teams_chat_hide",{team_id:activeTeamId});closeTeam();await loadTeams();}catch(e){alert("削除できませんでした："+teamError(e));}});
let selectedAdminAddTarget=null;
function renderAdminAddOptions(teams,requests){
 const teamSelect=$("teamAdminAddTeam"),medSelect=$("teamAdminAddMediation"),oldTeam=teamSelect?.value||"",oldMediation=medSelect?.value||"";
 if(teamSelect){teamSelect.innerHTML='<option value="">チームを選択</option>'+(teams.items||[]).map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join("");if(oldTeam)teamSelect.value=oldTeam;}
 if(medSelect){medSelect.innerHTML='<option value="">仲介依頼を選択</option>'+(requests.items||[]).filter(x=>x.status==="approved").map(x=>'<option value="'+esc(x.id)+'" data-team-id="'+esc(x.team_id)+'">'+esc(x.team_name)+' / '+esc(x.requester_nickname)+'（'+esc(x.message||"仲介依頼")+'）</option>').join("");if(oldMediation)medSelect.value=oldMediation;}
 updateAdminMediationSelect();
}
function updateAdminMediationSelect(){
 const context=$("teamAdminAddContext")?.value,wrap=$("teamAdminMediationSelect"),teamId=$("teamAdminAddTeam")?.value,select=$("teamAdminAddMediation");
 if(!wrap||!select)return;
 wrap.hidden=context!=="mediation";
 [...select.options].forEach((o,i)=>{if(i)o.hidden=!!teamId&&o.dataset.teamId!==teamId;});
 if(select.selectedOptions[0]?.hidden)select.value="";
}
async function loadTeamAdminTools(){const panel=$("teamAdminPanel");if(!panel||!isNetworkAdmin)return;panel.hidden=false;try{const [teams,requests]=await Promise.all([call("teams_admin_list"),call("teams_admin_mediation_list")]);renderAdminAddOptions(teams,requests);const list=$("teamAdminList"),req=$("teamMediationRequests");list.innerHTML=(teams.items||[]).map(t=>'<div class="team-member-row"><div><strong>'+esc(t.name)+'</strong><p class="feed-meta">管理者監査用・通知なし</p></div><div class="actions"><button class="secondary" data-admin-view="'+esc(t.id)+'">チャット閲覧</button><button class="danger" data-admin-delete="'+esc(t.id)+'">完全削除</button></div></div>').join("")||'<p class="muted">チームはありません。</p>';req.innerHTML=(requests.items||[]).map(x=>'<div class="team-member-row"><div><strong>'+esc(x.team_name)+' / '+esc(x.requester_nickname)+'</strong><p>'+esc(x.message||"仲介依頼")+'</p><p class="feed-meta">状態：'+(x.status==="approved"?"仲介中":"承認待ち")+'</p></div><div class="actions">'+(x.status==="pending"?'<button class="primary" data-med-approve="'+esc(x.id)+'">仲介参加を許可</button>':'')+'<button class="secondary" data-med-close="'+esc(x.id)+'">仲介を終了</button></div></div>').join("")||'<p class="muted">仲介依頼はありません。</p>';list.querySelectorAll("[data-admin-view]").forEach(b=>b.addEventListener("click",()=>viewAdminTeamChat(b.dataset.adminView)));list.querySelectorAll("[data-admin-delete]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("管理者権限でチームと全チャット履歴を完全削除しますか？復元できません。"))return;try{await call("teams_delete",{team_id:b.dataset.adminDelete});await loadTeamAdminTools();await loadTeams();$("teamAdminChat").textContent="";}catch(e){alert(teamError(e));}}));req.querySelectorAll("[data-med-approve],[data-med-close]").forEach(b=>b.addEventListener("click",async()=>{try{await call("teams_admin_mediation_approve",{request_id:b.dataset.medApprove||b.dataset.medClose,decision:b.hasAttribute("data-med-approve")?"approved":"closed"});await loadTeamAdminTools();}catch(e){alert(teamError(e));}}));}catch(e){$("teamAdminList").textContent="管理者情報を読み込めませんでした："+teamError(e);}}
$("teamAdminAddContext")?.addEventListener("change",updateAdminMediationSelect);
$("teamAdminAddTeam")?.addEventListener("change",updateAdminMediationSelect);
$("teamAdminAddSearchButton")?.addEventListener("click",async()=>{
 const q=$("teamAdminAddSearch").value.trim(),out=$("teamAdminAddResults");
 if(q.length<2){out.textContent="2文字以上入力してください。";return;}
 out.textContent="検索中…";
 try{const r=await call("teams_admin_user_search",{query:q});out.innerHTML=(r.items||[]).map(x=>'<button type="button" class="secondary" data-admin-add-target="'+esc(x.user_id)+'" data-admin-add-name="'+esc(x.nickname||"ユーザー")+'">'+esc(x.nickname||"ユーザー")+' を選択</button>').join("")||'<p class="muted">ユーザーが見つかりませんでした。</p>';}
 catch(e){out.textContent="検索できませんでした："+teamError(e);}
});
$("teamAdminAddResults")?.addEventListener("click",e=>{
 const b=e.target.closest("[data-admin-add-target]");if(!b)return;
 selectedAdminAddTarget=b.dataset.adminAddTarget;
 $("teamAdminAddTarget").textContent="追加対象："+b.dataset.adminAddName+"（選択済み）";
});
$("teamAdminAddForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const teamId=$("teamAdminAddTeam").value,context=$("teamAdminAddContext").value,reason=$("teamAdminAddReason").value.trim(),mediationRequestId=$("teamAdminAddMediation").value,status=$("teamAdminAddStatus"),button=e.submitter;
 if(!teamId||!selectedAdminAddTarget||reason.length<5){status.textContent="チーム・追加対象・5文字以上の理由を指定してください。";return;}
 if(context==="mediation"&&!mediationRequestId){status.textContent="対象チームの承認済み仲介依頼を選択してください。";return;}
 if(!confirm("管理者権限でこのユーザーをチームに追加しますか？操作は監査記録に残ります。"))return;
 button.disabled=true;status.textContent="追加しています…";
 try{
  await call("teams_admin_add_member",{team_id:teamId,target_user_id:selectedAdminAddTarget,context,reason,mediation_request_id:context==="mediation"?mediationRequestId:null});
  status.textContent="メンバーを追加しました。監査記録に保存されています。";
  selectedAdminAddTarget=null;$("teamAdminAddTarget").textContent="追加対象：未選択";$("teamAdminAddReason").value="";$("teamAdminAddResults").innerHTML="";
  await Promise.all([loadTeamAdminTools(),loadTeams()]);
 }catch(err){status.textContent="追加できませんでした："+teamError(err);}
 finally{button.disabled=false;}
});
async function viewAdminTeamChat(id){try{const r=await call("teams_admin_chat_list",{team_id:id});$("teamAdminChatTitle").textContent="監査閲覧："+r.team.name+"（閲覧のみ・メンバー通知なし）";$("teamAdminChat").innerHTML=(r.items||[]).map(m=>'<article class="team-chat-message"><div class="team-chat-meta"><strong>'+esc(m.nickname)+'</strong><time>'+esc(date(m.created_at))+'</time></div><p>'+esc(m.body)+'</p></article>').join("")||'<p class="muted">メッセージはありません。</p>';$("teamAdminChatForm").dataset.teamId=id;$("teamAdminChatForm").hidden=!r.mediation_allowed;$("teamAdminChatStatus").textContent=r.mediation_allowed?"仲介許可済み：管理者からメッセージを送信できます。":"監査閲覧のみです。仲介依頼が承認されると送信できます。";}catch(e){$("teamAdminChat").textContent="閲覧できませんでした："+teamError(e);}}
$("teamAdminChatForm")?.addEventListener("submit",async e=>{e.preventDefault();const id=$("teamAdminChatForm").dataset.teamId,input=$("teamAdminChatInput");if(!id||!input.value.trim())return;try{await call("teams_chat_send",{team_id:id,body:input.value.trim()});input.value="";await viewAdminTeamChat(id);}catch(e){$("teamAdminChatStatus").textContent="仲介メッセージを送信できません："+teamError(e);}});
if($("teamAdminPanel")){const originalViewAdminTeamChat=viewAdminTeamChat;window.__unusedTeamAdminView=originalViewAdminTeamChat;}
if(document.documentElement.dataset.page==="teams"){teamRefreshTimer=setInterval(()=>{if(!document.hidden){loadTeams();if(isNetworkAdmin)loadTeamAdminTools();}},5000);if(isNetworkAdmin)loadTeamAdminTools();}
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

let friendsRefreshTimer=null;
function roleBadges(p={}){
 const tags=[];
 if(p.is_admin)tags.push('<span class="role-badge role-admin">👑 ADMIN</span>');
 if(p.is_leader)tags.push('<span class="role-badge role-leader">⚑ LEADER</span>');
 if(p.is_blacklisted)tags.push('<span class="role-badge role-blacklisted">⛔ BLACKLIST</span>');
 return tags.length?'<span class="role-badges">'+tags.join('')+'</span>':'';
}
function userVisual(p){
 const d=p.profile||{},avatar=safeFeedUrl(d.avatar_url||''),nameColor=/^#[0-9a-f]{6}$/i.test(d.name_color||'')?d.name_color:'#ffffff';
 return '<div class="user-identity">'+(avatar?'<img class="user-avatar" src="'+esc(avatar)+'" alt="">':'<div class="user-avatar user-avatar-empty">👤</div>')+'<div class="user-identity-text"><strong style="color:'+nameColor+'">'+esc(p.nickname||'ユーザー')+'</strong>'+roleBadges(p)+'<p class="muted">'+esc(d.favorite_game||'ゲーム未設定')+'</p></div></div>';
}
function friendCard(p,actions=''){
 const presence=p.online?'<span class="presence-status is-online"><span class="presence-dot"></span>ONLINE</span>':'<span class="presence-status is-offline"><span class="presence-dot"></span>OFFLINE</span>';return '<article class="user-card">'+userVisual(p)+'<div class="user-card-actions">'+presence+'<a class="secondary" href="profile.html?user='+encodeURIComponent(p.user_id)+'">プロフィール</a>'+actions+'</div></article>';
}
let presenceHeartbeatTimer=null;
async function pingPresence(){if(!session||document.hidden||!navigator.onLine)return;try{await call("presence_ping");}catch(e){}}
function startPresenceHeartbeat(){if(presenceHeartbeatTimer)clearInterval(presenceHeartbeatTimer);pingPresence();presenceHeartbeatTimer=setInterval(pingPresence,30000);}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pingPresence();});
window.addEventListener("focus",()=>pingPresence());
window.addEventListener("online",()=>pingPresence());

async function loadFriendsPage(){
 const app=$('friendsApp'),note=$('friendsLoginNote');if(!app||!note)return;
 if(!session){app.hidden=true;note.hidden=false;if(friendsRefreshTimer)clearInterval(friendsRefreshTimer);friendsRefreshTimer=null;return;}
 note.hidden=true;app.hidden=false;
 try{
  const [r,me]=await Promise.all([call('friends_overview'),call('profile_get')]);
  const p=me.profile||{},d=p.profile||{};
  $('friendsMyProfile').innerHTML=userVisual({nickname:p.nickname||'ユーザー',profile:d,user_id:session.user.id});
  const friends=r.friends||[],incoming=r.received||[],outgoing=r.sent||[];
  $('friendsCount').textContent='('+friends.length+')';
  $('friendsList').innerHTML=friends.length?friends.map(x=>friendCard(x.user||x,'<button class="danger" data-friend-action="remove" data-user-id="'+esc(x.user_id)+'">解除</button>')).join(''):'<p class="muted">まだフレンドはいません。ユーザー検索から申請できます。</p>';
  $('friendsIncoming').innerHTML=incoming.length?incoming.map(x=>friendCard(x.user,'<button class="primary" data-friend-action="accept" data-request-id="'+esc(x.id)+'">承認</button><button class="secondary" data-friend-action="reject" data-request-id="'+esc(x.id)+'">拒否</button>')).join(''):'<p class="muted">届いた申請はありません。</p>';
  $('friendsOutgoing').innerHTML=outgoing.length?outgoing.map(x=>friendCard(x.user,'<span class="muted">承認待ち</span>')).join(''):'<p class="muted">送信中の申請はありません。</p>';
  if(!friendsRefreshTimer)friendsRefreshTimer=setInterval(()=>{if(document.documentElement.dataset.page==='friends'&&!document.hidden&&session){loadFriendsPage().catch(()=>{});if($('friendsSearchInput')?.value.trim())$('friendsSearchForm')?.requestSubmit();}},5000);
 }catch(e){$('friendsSearchStatus').textContent='フレンド情報を読み込めませんでした：'+e.message;}
}
$('friendsRefresh')?.addEventListener('click',()=>loadFriendsPage());
$('friendsSearchForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const q=$('friendsSearchInput').value.trim(),status=$('friendsSearchStatus'),out=$('friendsSearchResults');
 if(q.length<2){status.textContent='2文字以上入力してください。';out.innerHTML='';return;}
 status.textContent='検索中…';out.innerHTML='';
 try{const r=await call('friends_search',{query:q});const items=r.items||[];
  out.innerHTML=items.length?items.map(p=>{let action=p.relationship==='friend'?'<button class="secondary" type="button" disabled>フレンド追加済み</button>':p.relationship==='sent'?'<button class="secondary" type="button" disabled>申請済み</button>':p.relationship==='received'?'<span class="muted">申請が届いています</span>':'<button class="primary" data-friend-action="send" data-user-id="'+esc(p.user_id)+'">フレンド申請</button>';return friendCard(p,action);}).join(''):'<p class="muted">ユーザーが見つかりませんでした。</p>';
  status.textContent=items.length+'件見つかりました。';
 }catch(err){status.textContent='検索できませんでした：'+err.message;}
});
$('friendsApp')?.addEventListener('click',async e=>{
 const b=e.target.closest('[data-friend-action]');if(!b)return;
 const action=b.dataset.friendAction;b.disabled=true;
 try{
  if(action==='send'){
   b.textContent='送信中…';
   await call('friends_request_send',{user_id:b.dataset.userId});
   await loadFriendsPage();
   if($('friendsSearchForm')&&$('friendsSearchInput').value.trim())$('friendsSearchForm').requestSubmit();
   $('friendsSearchStatus').textContent='フレンド申請を送信しました。相手の返答をお待ちください。';
   return;
  }
  if(action==='accept'||action==='reject')await call('friends_request_respond',{request_id:b.dataset.requestId,decision:action==='accept'?'accepted':'rejected'});
  if(action==='remove'){if(!confirm('このユーザーをフレンドから解除しますか？')){b.disabled=false;return;}await call('friends_remove',{user_id:b.dataset.userId});}
  await loadFriendsPage();
  if($('friendsSearchForm')&&$('friendsSearchInput').value.trim())$('friendsSearchForm').requestSubmit();
 }catch(err){const map={already_friends:'すでにフレンドです。',friend_request_exists:'すでに申請を送っています。',friend_request_received:'相手から届いた申請を承認してください。',friend_request_not_found:'申請が見つかりません。'};alert(map[err.message]||'処理できませんでした：'+err.message);b.disabled=false;if(action==='send')b.textContent='フレンド申請';}
});
let profileBadgeRefreshTimer=null;
async function loadPublicProfilePage(){
 const area=$('publicProfileArea'),note=$('profileLoginNote');if(!area||!note)return;
 if(!session){area.hidden=true;note.hidden=false;return;}
 note.hidden=true;area.hidden=false;
 const target=new URLSearchParams(location.search).get('user'),own=!target||target===session.user.id,status=$('publicProfileStatus'),card=$('publicProfileCard'),actions=$('profileActions');
 try{
  const r=own?await call('profile_get'):await call('profile_public_get',{user_id:target}),p=own?(r.profile||{}):(r.profile||{}),d=p.profile||{};
  const avatar=safeFeedUrl(d.avatar_url||''),banner=safeFeedUrl(d.banner_url||''),accent=/^#[0-9a-f]{6}$/i.test(d.accent_color||'')?d.accent_color:'#8b7cff',nameColor=/^#[0-9a-f]{6}$/i.test(d.name_color||'')?d.name_color:'#ffffff';
  card.style.setProperty('--profile-accent',accent);
  card.innerHTML=(banner?'<div class="profile-banner" style="background-image:linear-gradient(90deg,#080b18aa,#080b1855),url(&quot;'+esc(banner)+'&quot;)"></div>':'<div class="profile-banner profile-banner-empty"></div>')+'<div class="profile-detail-head">'+(avatar?'<img class="profile-avatar" src="'+esc(avatar)+'" alt="">':'<div class="profile-avatar profile-avatar-empty">👤</div>')+'<div><h2 style="color:'+nameColor+'">'+esc(p.nickname||'ユーザー')+'</h2>'+roleBadges(p)+'<p class="muted">'+(d.favorite_game?esc(d.favorite_game):'ゲーム未設定')+'</p></div></div><div class="profile-detail-body"><p>'+esc(d.bio||'自己紹介はまだありません。')+'</p><div class="profile-facts"><div><span>プレイスタイル</span><strong>'+esc(d.play_style||'未設定')+'</strong></div><div><span>テーマ</span><strong>'+esc(({midnight:'ミッドナイト',neon:'ネオン',aurora:'オーロラ'})[d.theme]||'ミッドナイト')+'</strong></div></div></div>';
  if(own){actions.innerHTML='<p class="muted">これはあなたの公開プロフィールです。表示ネームの変更は14日ごとです。</p><a class="primary" href="account.html">プロフィールを編集</a>';}
  else{
   const ov=await call('friends_overview'),friend=(ov.friends||[]).some(x=>(x.user||x).user_id===p.user_id),sent=(ov.sent||[]).some(x=>x.recipient_id===p.user_id),received=(ov.received||[]).find(x=>x.sender_id===p.user_id);
   actions.innerHTML=friend?'<button class="secondary" type="button" disabled>フレンド追加済み</button><p class="muted">すでにフレンドのため、追加申請は送信できません。</p>':sent?'<p class="muted">フレンド申請を送信済みです。承認をお待ちください。</p>':received?'<p class="muted">このユーザーからフレンド申請が届いています。</p><button class="primary" id="profileAcceptFriend">申請を承認</button><button class="secondary" id="profileRejectFriend">拒否</button>':'<button class="primary" id="profileAddFriend">フレンド申請を送る</button>';
   $('profileAddFriend')?.addEventListener('click',async(e)=>{const button=e.currentTarget;button.disabled=true;button.textContent='送信中…';try{await call('friends_request_send',{user_id:p.user_id});await loadPublicProfilePage();status.textContent='フレンド申請を送信しました。相手の返答をお待ちください。';}catch(e){status.textContent='申請できませんでした：'+e.message;button.disabled=false;button.textContent='フレンド申請を送る';}});
   $('profileAcceptFriend')?.addEventListener('click',async()=>{try{await call('friends_request_respond',{request_id:received.id,decision:'accepted'});await loadPublicProfilePage();}catch(e){status.textContent='承認できませんでした：'+e.message;}});
   $('profileRejectFriend')?.addEventListener('click',async()=>{try{await call('friends_request_respond',{request_id:received.id,decision:'rejected'});await loadPublicProfilePage();}catch(e){status.textContent='拒否できませんでした：'+e.message;}});
  }
  status.textContent='';
 }catch(e){status.textContent='プロフィールを読み込めませんでした：'+(e.message==='profile_not_found'?'ユーザーが見つかりません。':e.message);card.innerHTML='';actions.innerHTML='';}
}
if(document.documentElement.dataset.page==='profile'){profileBadgeRefreshTimer=setInterval(()=>{if(!document.hidden&&session)loadPublicProfilePage().catch(()=>{});},5000);}

let sharedRealtimeClient=null;
function startSharedRealtime(){
 if(!window.supabase||sharedRealtimeClient)return;
 try{
  sharedRealtimeClient=window.supabase.createClient('https://vuqbbwdojwmtehgsyfaq.supabase.co','sb_publishable_BnrPnMn5fCDrXuloVe7XYw_W5R7JH4E',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  sharedRealtimeClient.channel('aev-shared-announcements')
   .on('postgres_changes',{event:'*',schema:'public',table:'aevtools_announcements'},()=>{
    if(document.documentElement.dataset.page==='index'||document.documentElement.dataset.page==='announcements')loadPublicFeed('announcements','publicAnnouncements');
    if(document.documentElement.dataset.page==='admin'&&$('adminKind')?.value==='announcements')loadContent();
   }).subscribe();
  if(document.documentElement.dataset.page==='community'){
   sharedRealtimeClient.channel('aev-shared-board')
    .on('postgres_changes',{event:'*',schema:'public',table:'aevnetwork_community_posts'},()=>loadCommunity())
    .on('postgres_changes',{event:'*',schema:'public',table:'aevnetwork_community_comments'},()=>loadCommunity())
    .subscribe();
   loadBoardDeletionNotices();
   setInterval(loadBoardDeletionNotices,30000);
  }
 }catch(e){console.warn('共有データのリアルタイム接続に失敗しました',e);}
}
(async()=>{try{session=JSON.parse(localStorage.getItem(KEY)||'null');showAccount();if(session)startPresenceHeartbeat();await loadSharedProfile();const yes=await refreshAdmin();await refreshServiceMaintenance();await restoreOwnNetworkSnapshot();if(yes&&document.documentElement.dataset.page==='admin')await loadAdmin();if(yes&&document.documentElement.dataset.page==='teams')await loadTeamAdminTools();if(document.documentElement.dataset.page==='index'||document.documentElement.dataset.page==='announcements')loadPublicFeed('announcements','publicAnnouncements');if(document.documentElement.dataset.page==='news')loadPublicFeed('news','publicNews');if(document.documentElement.dataset.page==='updates')loadPublicFeed('updates','publicUpdates');if(document.documentElement.dataset.page==='community')await loadCommunity();if(document.documentElement.dataset.page==='friends')await loadFriendsPage();if(document.documentElement.dataset.page==='profile')await loadPublicProfilePage();if(document.documentElement.dataset.page==='teams')await loadTeams();startSharedRealtime();setInterval(()=>{if(!document.hidden)refreshServiceMaintenance();},3000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshServiceMaintenance();});window.addEventListener('focus',refreshServiceMaintenance);}catch(e){localStorage.removeItem(KEY);session=null;showAccount();refreshTestHelperClaimPanel();}})();
})();