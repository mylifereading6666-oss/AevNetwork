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
async function call(action,extra={}){const headers={'Content-Type':'application/json'};if(session?.access_token)headers.Authorization='Bearer '+session.access_token;const res=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...extra})});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error([data.error||'API通信エラー',data.detail||'',data.code||'',data.hint||''].filter(Boolean).join(' / '));return data;}
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
$('accountLogin')?.addEventListener('click',async()=>{const email=$('accountEmail')?.value.trim(),password=$('accountPassword')?.value;if(!email||!password){if(status)status.textContent='メールアドレスとパスワードを入力してください。';return;}const b=$('accountLogin');b.disabled=true;try{const r=await call('login',{email,password});session=r.session;localStorage.setItem(KEY,JSON.stringify(session));showAccount();await loadSharedProfile();const yes=await refreshAdmin();if(yes&&document.documentElement.dataset.page==='admin')await loadAdmin();const page=document.documentElement.dataset.page;if(page==='index'||page==='announcements')await loadPublicFeed('announcements','publicAnnouncements');if(page==='news')await loadPublicFeed('news','publicNews');if(page==='updates')await loadPublicFeed('updates','publicUpdates');if(page==='community')await loadCommunity();if(status)status.textContent='ログインしました。';$('accountPassword').value='';}catch(e){if(status)status.textContent='ログインできませんでした：'+e.message;}finally{b.disabled=false;}});
$('accountLogout')?.addEventListener('click',()=>{localStorage.removeItem(KEY);session=null;showAccount();const pp=$('networkProfilePanel');if(pp)pp.hidden=true;refreshAdmin();if(status)status.textContent='ログアウトしました。';});
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
async function loadUsers(){const r=await call('admin_list_users',{page:1});adminUsers=r.users||[];$('adminUsers').innerHTML=adminUsers.length?'<div class="admin-user-list">'+adminUsers.map(u=>'<div class="card"><strong>'+esc(u.email||'(メール未登録)')+'</strong><p class="muted">登録：'+esc(date(u.created_at))+'<br>最終ログイン：'+esc(date(u.last_sign_in_at))+'</p></div>').join('')+'</div>':'<p class="muted">ユーザーはいません。</p>';$('blacklistUser').innerHTML='<option value="">ユーザーを選択</option>'+adminUsers.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.email||u.id)+'</option>').join('');}
$('reloadUsers')?.addEventListener('click',()=>loadUsers().catch(e=>$('adminUsers').textContent=e.message));
async function loadBlacklist(){const r=await call('admin_list_blacklist'),items=r.items||[];$('adminBlacklist').innerHTML=items.length?items.map(x=>'<div class="card"><strong>'+esc(x.email||x.user_id)+'</strong><p>'+esc(x.reason)+'</p><p class="muted">登録：'+esc(date(x.created_at))+'</p><button class="secondary" data-unblock="'+esc(x.user_id)+'">制限を解除</button></div>').join(''):'<p class="muted">ブラックリスト登録はありません。</p>';$('adminBlacklist').querySelectorAll('[data-unblock]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('このユーザーのAevNetwork利用制限を解除しますか？'))return;try{await call('admin_remove_blacklist',{user_id:b.dataset.unblock});await loadBlacklist();await loadMetrics();$('blacklistStatus').textContent='制限を解除しました。';}catch(e){$('blacklistStatus').textContent='解除できませんでした：'+e.message;}}));}
$('addBlacklist')?.addEventListener('click',async()=>{const user_id=$('blacklistUser').value,reason=$('blacklistReason').value.trim();if(!user_id||!reason){$('blacklistStatus').textContent='対象ユーザーと理由を入力してください。';return;}try{await call('admin_add_blacklist',{user_id,reason});$('blacklistReason').value='';$('blacklistStatus').textContent='ブラックリストに追加しました。';await loadBlacklist();await loadMetrics();}catch(e){$('blacklistStatus').textContent='追加できませんでした：'+e.message;}});


let communityStorageClient=null;
async function getCommunityStorageClient(){
 if(!window.supabase)throw new Error('画像アップロード機能を読み込めません。');
 if(!communityStorageClient)communityStorageClient=window.supabase.createClient('https://vuqbbwdojwmtehgsyfaq.supabase.co','sb_publishable_BnrPnMn5fCDrXuloVe7XYw_W5R7JH4E',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 if(!session?.access_token||!session?.refresh_token)throw new Error('ログイン状態を確認できません。再ログインしてください。');
 const {error}=await communityStorageClient.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
 if(error)throw error;
 return communityStorageClient;
}
async function loadBoardDeletionNotices(){
 const list=$('boardDeletionNotices'),badge=$('boardDeletionNoticeBadge');if(!list&&!badge)return;
 if(!session){if(list)list.innerHTML='<p class="muted">削除通知を見るにはログインしてください。</p>';if(badge)badge.hidden=true;return;}
 try{
  const r=await call('community_my_deletion_notices'),items=r.items||[],unread=items.filter(x=>!x.read_at).length;
  if(badge){badge.textContent=unread>99?'99+':String(unread);badge.hidden=unread===0;}
  if(!list)return;
  list.innerHTML=items.length?items.map(n=>'<article class="feed-item"><h3>'+(n.item_type==='post'?'投稿':'返信')+'が管理者によって削除されました</h3><div class="feed-meta">'+esc(date(n.created_at))+(n.read_at?' · 既読':' · 未読')+'</div><strong>削除された内容</strong><p>'+esc((n.item_type==='post'?(n.item_title||'')+'\n\n':'')+n.item_content)+'</p><strong>削除理由</strong><p>'+esc(n.reason)+'</p>'+(!n.read_at?'<button class="secondary" data-notice-read="'+esc(n.id)+'">既読にする</button>':'')+'</article>').join(''):'<p class="muted">削除通知はありません。</p>';
  list.querySelectorAll('[data-notice-read]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{await call('community_read_deletion_notice',{notice_id:b.dataset.noticeRead});await loadBoardDeletionNotices();}catch(e){b.disabled=false;alert('既読にできませんでした：'+e.message);}}));
 }catch(e){if(list)list.textContent='削除通知を読み込めませんでした：'+e.message;if(badge)badge.hidden=true;}
}
$('boardNoticesRefresh')?.addEventListener('click',loadBoardDeletionNotices);
async function loadCommunity(){
 const list=$('communityPosts'),form=$('communityPostForm'),loginNote=$('communityLoginNote');
 if(!list)return;
 if(form)form.hidden=!session;
 if(loginNote)loginNote.hidden=!!session;
 list.innerHTML='<p class="muted">掲示板を読み込んでいます…</p>';
 try{
  const r=await call('community_list_posts'),items=r.items||[];
  if(!items.length){list.innerHTML='<p class="muted">まだ投稿はありません。最初の投稿を作成できます。</p>';await loadBoardDeletionNotices();return;}
  list.innerHTML=items.map(p=>'<article class="feed-item community-post"><h3>'+esc(p.title)+'</h3><div class="feed-meta">'+esc(p.author_nickname)+' · '+esc(date(p.created_at))+'</div><p>'+esc(p.body)+'</p>'+(p.image_url&&/^https:\/\//i.test(p.image_url)?'<img class="community-image" src="'+esc(p.image_url)+'" alt="投稿画像" loading="lazy">':'')+'<div class="actions">'+(session&&(p.author_id===session.user?.id||isNetworkAdmin)?'<button class="secondary" data-post-delete="'+esc(p.id)+'">投稿を削除</button>':'')+(session&&p.author_id!==session.user?.id?'<button class="secondary" data-post-report="'+esc(p.id)+'">報告</button>':'')+'</div><div class="community-comments"><h4>返信 ('+(p.comments||[]).length+')</h4>'+((p.comments||[]).map(c=>'<div class="community-comment"><p>'+esc(c.body)+'</p><div class="feed-meta">'+esc(c.author_nickname)+' · '+esc(date(c.created_at))+'</div><div class="actions">'+(session&&(c.author_id===session.user?.id||isNetworkAdmin)?'<button class="secondary" data-comment-delete="'+esc(c.id)+'">返信を削除</button>':'')+(session&&c.author_id!==session.user?.id?'<button class="secondary" data-comment-report="'+esc(c.id)+'">報告</button>':'')+'</div></div>').join('')||'<p class="muted">返信はまだありません。</p>')+(session?'<form class="community-comment-form" data-comment-form="'+esc(p.id)+'"><label>返信</label><textarea class="field" name="body" rows="2" maxlength="2000" required placeholder="返信を入力"></textarea><button class="secondary" type="submit">返信する</button></form>':'')+'</div></article>').join('');
  list.querySelectorAll('[data-post-delete]').forEach(b=>b.addEventListener('click',async()=>{
   const post=items.find(x=>x.id===b.dataset.postDelete),moderator=isNetworkAdmin&&post?.author_id!==session?.user?.id;let reason='';
   if(moderator){reason=prompt('管理者削除の理由を入力してください（3文字以上）');if(reason===null)return;if(reason.trim().length<3){alert('削除理由を3文字以上入力してください。');return;}}
   if(!confirm('この投稿を削除しますか？'))return;
   b.disabled=true;try{await call('community_delete_post',{id:b.dataset.postDelete,reason});await loadCommunity();}catch(e){b.disabled=false;alert('削除できませんでした：'+e.message);}
  }));
  list.querySelectorAll('[data-comment-delete]').forEach(b=>b.addEventListener('click',async()=>{
   const comment=items.flatMap(x=>x.comments||[]).find(x=>x.id===b.dataset.commentDelete),moderator=isNetworkAdmin&&comment?.author_id!==session?.user?.id;let reason='';
   if(moderator){reason=prompt('管理者削除の理由を入力してください（3文字以上）');if(reason===null)return;if(reason.trim().length<3){alert('削除理由を3文字以上入力してください。');return;}}
   if(!confirm('この返信を削除しますか？'))return;
   b.disabled=true;try{await call('community_delete_comment',{id:b.dataset.commentDelete,reason});await loadCommunity();}catch(e){b.disabled=false;alert('削除できませんでした：'+e.message);}
  }));
  list.querySelectorAll('[data-post-report],[data-comment-report]').forEach(b=>b.addEventListener('click',async()=>{const isPost=b.hasAttribute('data-post-report'),targetId=b.dataset.postReport||b.dataset.commentReport,reason=prompt('報告理由を入力してください（5〜500文字）');if(reason===null)return;try{await call('community_report',{target_type:isPost?'post':'comment',target_id:targetId,reason});alert('報告を送信しました。管理者が確認します。');}catch(e){alert('報告できませんでした：'+e.message);}}));
  list.querySelectorAll('[data-comment-form]').forEach(f=>f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button[type=submit]');b.disabled=true;try{await call('community_create_comment',{post_id:f.dataset.commentForm,body:f.elements.body.value});await loadCommunity();}catch(err){alert('返信できませんでした：'+err.message);b.disabled=false;}}));
  await loadBoardDeletionNotices();
 }catch(e){list.innerHTML='<p class="muted">掲示板を読み込めませんでした：'+esc(e.message)+'</p>';}
}
$('communityPostForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,b=form.querySelector('button[type=submit]'),status=$('communityPostStatus'),file=form.elements.image?.files?.[0];
 b.disabled=true;status.textContent='投稿しています…';let imagePath=null,imageUrl=null,storage=null;
 try{
  if(file){
   if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>5*1024*1024)throw new Error('画像はJPEG・PNG・WebP・GIF形式、5MB以内にしてください。');
   storage=await getCommunityStorageClient();
   const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
   imagePath=session.user.id+'/'+(crypto.randomUUID?crypto.randomUUID():String(Date.now()))+'.'+ext;
   const {error}=await storage.storage.from('aev-board-images').upload(imagePath,file,{contentType:file.type,upsert:false});
   if(error)throw error;
   imageUrl=storage.storage.from('aev-board-images').getPublicUrl(imagePath).data.publicUrl;
  }
  await call('community_create_post',{title:form.elements.title.value,body:form.elements.body.value,image_url:imageUrl,image_path:imagePath});
  form.reset();status.textContent='投稿しました。';await loadCommunity();
 }catch(err){if(imagePath&&storage)await storage.storage.from('aev-board-images').remove([imagePath]);status.textContent='投稿できませんでした：'+err.message;}
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

let activeTeamId=null,teamChatTimer=null,teamRefreshTimer=null,lastTeamChatSignature="",teamDirectoryCache=[];
function teamError(e){const m={missing_session:"利用するにはログインしてください。",team_application_exists:"このチームには申請済み、または参加中です。",team_chat_members_only:"チャットは承認済みメンバー限定です。",team_leader_required:"チームリーダーのみ操作できます。",leader_cannot_leave:"リーダーはチームを退出できません。",team_full:"このチームは定員4人に達しています。",team_delete_forbidden:"作成したリーダーまたは管理者のみ削除できます。"};return m[e.message]||e.message||"処理に失敗しました。";}
async function loadTeams(){const directory=$("teamDirectory"),mineEl=$("myTeams");if(!directory||!mineEl)return;try{const a=await call("teams_list"),b=session?await call("teams_my"):{items:[]};teamDirectoryCache=a.items||[];renderTeamDirectory();renderMyTeams(b.items||[]);}catch(e){directory.textContent="チームを読み込めませんでした："+teamError(e);mineEl.textContent="ログイン後に申請状況を確認できます。";}}
function renderTeamDirectory(){const el=$("teamDirectory"),q=($("teamSearch")?.value||"").trim().toLowerCase();const items=teamDirectoryCache.filter(t=>(t.name+" "+(t.game||"")+" "+(t.description||"")).toLowerCase().includes(q));el.innerHTML=items.length?items.map(t=>'<article class="team-card"><div class="team-card-top"><h3>'+esc(t.name)+'</h3><span class="team-count">'+t.member_count+'/4人</span></div><p class="team-game">'+esc(t.game||"ゲーム未設定")+'</p><p>'+esc(t.description||"紹介文はありません。")+'</p><p class="feed-meta">リーダー：'+esc(t.owner_nickname)+' · '+esc(date(t.created_at))+'</p><div class="actions">'+(t.my_status==="approved"?'<button class="primary" data-team-open="'+esc(t.id)+'">チームを開く</button>':t.my_status==="pending"?'<button class="secondary" disabled>申請中</button>':t.my_status==="rejected"?'<button class="secondary" disabled>申請却下済み</button>':session?'<button class="primary" data-team-apply="'+esc(t.id)+'" '+(t.member_count>=4?'disabled':'')+'>参加申請</button>':'<a class="secondary" href="account.html">ログインして参加申請</a>')+'</div></article>').join(""):'<p class="muted">該当するチームはありません。</p>';el.querySelectorAll("[data-team-apply]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;try{await call("teams_apply",{team_id:b.dataset.teamApply});await loadTeams();}catch(e){alert("申請できませんでした："+teamError(e));b.disabled=false;}}));el.querySelectorAll("[data-team-open]").forEach(b=>b.addEventListener("click",()=>openTeam(b.dataset.teamOpen)));}
function renderMyTeams(items){const el=$("myTeams");if(!session){el.innerHTML='<p class="muted">チーム作成・参加申請にはログインが必要です。</p>';return;}el.innerHTML=items.length?items.map(x=>'<article class="team-card"><div class="team-card-top"><h3>'+esc(x.team.name)+'</h3><span class="team-status">'+(x.status==="approved"?(x.role==="leader"?"リーダー":"参加中"):x.status==="pending"?"承認待ち":"申請却下")+'</span></div><p>'+esc(x.team.game||"ゲーム未設定")+'</p>'+(x.status==="approved"?'<div class="actions"><button class="primary" data-team-open="'+esc(x.team_id)+'">チームを開く</button>'+(x.role!=="leader"?'<button class="secondary" data-team-leave="'+esc(x.team_id)+'">チームを退出</button>':'')+'</div>':'')+'</article>').join(""):'<p class="muted">まだチームへの参加・申請はありません。</p>';el.querySelectorAll("[data-team-open]").forEach(b=>b.addEventListener("click",()=>openTeam(b.dataset.teamOpen)));el.querySelectorAll("[data-team-leave]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("チームを退出しますか？過去のメッセージは他のメンバー側に残ります。"))return;try{await call("teams_leave",{team_id:b.dataset.teamLeave});closeTeam();await loadTeams();}catch(e){alert(teamError(e));}}));}
$("teamSearch")?.addEventListener("input",renderTeamDirectory);
$("teamCreateForm")?.addEventListener("submit",async e=>{e.preventDefault();const b=e.submitter,status=$("teamCreateStatus");b.disabled=true;status.textContent="チームを作成しています…";try{await call("teams_create",{name:$("teamName").value,game:$("teamGame").value,description:$("teamDescription").value});e.currentTarget.reset();status.textContent="チームを作成しました。あなたがリーダーです。";await loadTeams();}catch(err){status.textContent="作成できませんでした："+teamError(err);}finally{b.disabled=false;}});
async function openTeam(id){try{const r=await call("teams_members",{team_id:id}),items=r.items||[],team=teamDirectoryCache.find(x=>x.id===id);activeTeamId=id;$("teamManagePanel").hidden=false;$("teamChatPanel").hidden=false;$("teamChatTitle").textContent="💬 "+(team?.name||"チーム")+" のチャット";$("teamManageContent").innerHTML='<h3>メンバー・参加申請</h3>'+(items.length?items.map(m=>'<div class="team-member-row"><div><strong>'+esc(m.nickname)+'</strong><p class="feed-meta">'+(m.role==="leader"?"リーダー":m.status==="pending"?"参加申請中":m.status==="approved"?"メンバー":"申請却下")+'</p></div>'+(r.is_leader&&m.status==="pending"?'<div class="actions"><button class="primary" data-team-approve="'+esc(m.id)+'">承認</button><button class="secondary" data-team-reject="'+esc(m.id)+'">拒否</button></div>':'')+'</div>').join(""):'<p class="muted">メンバーはいません。</p>')+(r.is_owner?'<div class="actions"><button class="danger" id="teamDeleteButton">チームを完全削除</button></div><p class="muted">削除するとチーム・メンバー・全チャット履歴が全員分から完全に削除され、復元できません。</p>':'');$("teamManageContent").querySelectorAll("[data-team-approve],[data-team-reject]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;try{await call("teams_review",{member_id:b.dataset.teamApprove||b.dataset.teamReject,decision:b.hasAttribute("data-team-approve")?"approved":"rejected"});await openTeam(id);await loadTeams();}catch(e){alert("処理できませんでした："+teamError(e));b.disabled=false;}}));$("teamDeleteButton")?.addEventListener("click",async()=>{if(!confirm("このチームを完全削除しますか？全員のチャット履歴も完全に消え、復元できません。"))return;if(!confirm("最終確認：本当に削除しますか？"))return;try{await call("teams_delete",{team_id:id});closeTeam();await loadTeams();alert("チームを完全削除しました。");}catch(e){alert("削除できませんでした："+teamError(e));}});lastTeamChatSignature="";await loadTeamChat(true);if(teamChatTimer)clearInterval(teamChatTimer);teamChatTimer=setInterval(()=>{if(activeTeamId===id&&!document.hidden)loadTeamChat(false).catch(()=>{closeTeam();loadTeams();});},5000);$("teamChatPanel").scrollIntoView({behavior:"smooth",block:"start"});}catch(e){alert("チーム情報を開けませんでした："+teamError(e));}}
function closeTeam(){activeTeamId=null;if(teamChatTimer)clearInterval(teamChatTimer);teamChatTimer=null;$("teamManagePanel").hidden=true;$("teamChatPanel").hidden=true;}
async function loadTeamChat(forceBottom=false){if(!activeTeamId)return;const el=$("teamChatMessages"),r=await call("teams_chat_list",{team_id:activeTeamId}),items=r.items||[],signature=items.map(x=>x.id).join("|");if(signature===lastTeamChatSignature&&!forceBottom)return;el.innerHTML=items.length?items.map(m=>'<article class="team-chat-message '+(m.mine?"mine":"")+'"><div class="team-chat-meta"><strong>'+esc(m.nickname)+'</strong><time>'+esc(date(m.created_at))+'</time></div><p>'+esc(m.body)+'</p></article>').join(""):'<p class="muted">まだメッセージはありません。最初のメッセージを送ってみましょう。</p>';lastTeamChatSignature=signature;el.scrollTop=el.scrollHeight;}
$("teamChatForm")?.addEventListener("submit",async e=>{e.preventDefault();const input=$("teamChatInput"),b=e.submitter,status=$("teamChatStatus"),body=input.value.trim();if(!body||!activeTeamId)return;b.disabled=true;try{await call("teams_chat_send",{team_id:activeTeamId,body});input.value="";await loadTeamChat(true);status.textContent="送信しました。";}catch(err){status.textContent="送信できませんでした："+teamError(err);}finally{b.disabled=false;}});
$("teamMediationButton")?.addEventListener("click",async()=>{if(!activeTeamId)return;const message=prompt("管理者に仲介してほしい内容を入力してください（任意・1000文字以内）");if(message===null)return;try{await call("teams_mediation_request",{team_id:activeTeamId,message});$("teamMediationStatus").textContent="管理者へ仲介を依頼しました。確認されるまでお待ちください。";}catch(e){$("teamMediationStatus").textContent="依頼できませんでした："+teamError(e);}});
$("teamHideChatButton")?.addEventListener("click",async()=>{if(!activeTeamId)return;if(!confirm("チームを退出し、このチームチャットを自分の一覧から削除しますか？自分の履歴は復元できません。他のメンバーの履歴には影響しません。"))return;try{await call("teams_chat_hide",{team_id:activeTeamId});closeTeam();await loadTeams();}catch(e){alert("削除できませんでした："+teamError(e));}});
async function loadTeamAdminTools(){const panel=$("teamAdminPanel");if(!panel||!isNetworkAdmin)return;panel.hidden=false;try{const [teams,requests]=await Promise.all([call("teams_admin_list"),call("teams_admin_mediation_list")]);const list=$("teamAdminList"),req=$("teamMediationRequests");list.innerHTML=(teams.items||[]).map(t=>'<div class="team-member-row"><div><strong>'+esc(t.name)+'</strong><p class="feed-meta">管理者監査用・通知なし</p></div><div class="actions"><button class="secondary" data-admin-view="'+esc(t.id)+'">チャット閲覧</button><button class="danger" data-admin-delete="'+esc(t.id)+'">完全削除</button></div></div>').join("")||'<p class="muted">チームはありません。</p>';req.innerHTML=(requests.items||[]).map(x=>'<div class="team-member-row"><div><strong>'+esc(x.team_name)+' / '+esc(x.requester_nickname)+'</strong><p>'+esc(x.message||"仲介依頼")+'</p></div><div class="actions"><button class="primary" data-med-approve="'+esc(x.id)+'">仲介参加を許可</button><button class="secondary" data-med-close="'+esc(x.id)+'">閉じる</button></div></div>').join("")||'<p class="muted">未対応の仲介依頼はありません。</p>';list.querySelectorAll("[data-admin-view]").forEach(b=>b.addEventListener("click",()=>viewAdminTeamChat(b.dataset.adminView)));list.querySelectorAll("[data-admin-delete]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("管理者権限でチームと全チャット履歴を完全削除しますか？復元できません。"))return;try{await call("teams_delete",{team_id:b.dataset.adminDelete});await loadTeamAdminTools();await loadTeams();$("teamAdminChat").textContent="";}catch(e){alert(teamError(e));}}));req.querySelectorAll("[data-med-approve],[data-med-close]").forEach(b=>b.addEventListener("click",async()=>{try{await call("teams_admin_mediation_approve",{request_id:b.dataset.medApprove||b.dataset.medClose,decision:b.hasAttribute("data-med-approve")?"approved":"closed"});await loadTeamAdminTools();}catch(e){alert(teamError(e));}}));}catch(e){$("teamAdminList").textContent="管理者情報を読み込めませんでした："+teamError(e);}}
async function viewAdminTeamChat(id){try{const r=await call("teams_admin_chat_list",{team_id:id});$("teamAdminChatTitle").textContent="監査閲覧："+r.team.name+"（閲覧のみ・メンバー通知なし）";$("teamAdminChat").innerHTML=(r.items||[]).map(m=>'<article class="team-chat-message"><div class="team-chat-meta"><strong>'+esc(m.nickname)+'</strong><time>'+esc(date(m.created_at))+'</time></div><p>'+esc(m.body)+'</p></article>').join("")||'<p class="muted">メッセージはありません。</p>';$("teamAdminChatForm").dataset.teamId=id;$("teamAdminChatForm").hidden=!r.mediation_allowed;$("teamAdminChatStatus").textContent=r.mediation_allowed?"仲介許可済み：管理者からメッセージを送信できます。":"監査閲覧のみです。仲介依頼が承認されると送信できます。";}catch(e){$("teamAdminChat").textContent="閲覧できませんでした："+teamError(e);}}
$("teamAdminChatForm")?.addEventListener("submit",async e=>{e.preventDefault();const id=$("teamAdminChatForm").dataset.teamId,input=$("teamAdminChatInput");if(!id||!input.value.trim())return;try{await call("teams_chat_send",{team_id:id,body:input.value.trim()});input.value="";await viewAdminTeamChat(id);}catch(e){$("teamAdminChatStatus").textContent="仲介メッセージを送信できません："+teamError(e);}});
if($("teamAdminPanel")){const originalViewAdminTeamChat=viewAdminTeamChat;window.__unusedTeamAdminView=originalViewAdminTeamChat;}
if(document.documentElement.dataset.page==="teams"){teamRefreshTimer=setInterval(()=>{if(!document.hidden)loadTeams();},10000);if(isNetworkAdmin)loadTeamAdminTools();}
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
(async()=>{try{session=JSON.parse(localStorage.getItem(KEY)||'null');showAccount();await loadSharedProfile();const yes=await refreshAdmin();if(yes&&document.documentElement.dataset.page==='admin')await loadAdmin();if(yes&&document.documentElement.dataset.page==='teams')await loadTeamAdminTools();if(document.documentElement.dataset.page==='index'||document.documentElement.dataset.page==='announcements')loadPublicFeed('announcements','publicAnnouncements');if(document.documentElement.dataset.page==='news')loadPublicFeed('news','publicNews');if(document.documentElement.dataset.page==='updates')loadPublicFeed('updates','publicUpdates');if(document.documentElement.dataset.page==='community')await loadCommunity();if(document.documentElement.dataset.page==='teams')await loadTeams();startSharedRealtime();}catch(e){localStorage.removeItem(KEY);session=null;showAccount();}})();
})();