(()=>{
const API='https://vuqbbwdojwmtehgsyfaq.supabase.co/functions/v1/aevnetwork-api',KEY='aevnetwork_auth_session';
let session=null,adminUsers=[];
const $=id=>document.getElementById(id),sidebar=$('sidebar'),overlay=$('overlay'),hamb=$('hamb');
function menu(open){sidebar?.classList.toggle('open',open);overlay?.classList.toggle('show',open);document.body.style.overflow=open?'hidden':'';hamb?.setAttribute('aria-expanded',String(open));}
hamb?.addEventListener('click',()=>menu(!sidebar.classList.contains('open')));
overlay?.addEventListener('click',()=>menu(false));
document.querySelectorAll('.navbtn').forEach(a=>{if(a.dataset.page===document.documentElement.dataset.page){a.classList.add('active');const g=a.closest('.navgroup');if(g)g.open=true;}a.addEventListener('click',()=>menu(false));});
if($('year'))$('year').textContent=new Date().getFullYear();
async function call(action,extra={}){const headers={'Content-Type':'application/json'};if(session?.access_token)headers.Authorization='Bearer '+session.access_token;const res=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...extra})});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'API通信エラー');return data;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function date(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ja-JP');}
async function refreshAdmin(){const group=$('adminNavGroup'),denied=$('adminOnly'),content=$('adminContent');if(!session){if(group)group.hidden=true;if(denied)denied.hidden=false;if(content)content.hidden=true;return false;}try{const r=await call('is_admin'),yes=r.is_admin===true;if(group)group.hidden=!yes;if(document.documentElement.dataset.page==='admin'){if(denied)denied.hidden=yes;if(content)content.hidden=!yes;}return yes;}catch(e){if(group)group.hidden=true;if(document.documentElement.dataset.page==='admin'){if(denied){denied.hidden=false;denied.querySelector('p').textContent='管理者確認に失敗しました。通信状態を確認してください。';}if(content)content.hidden=true;}return false;}}
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
$('saveSharedProfile')?.addEventListener('click',async()=>{
 const b=$('saveSharedProfile'),status=$('profileStatus');
 const profile={bio:$('profileBio').value,favorite_game:$('profileGame').value,play_style:$('profileStyle').value,avatar_url:$('profileAvatar').value.trim(),banner_url:$('profileBanner').value.trim(),accent_color:$('profileAccent').value,theme:$('profileTheme').value,name_color:$('profileNameColor').value,name_effect:$('profileNameEffect').value,font_style:$('profileFont').value};
 b.disabled=true;status.textContent='保存しています…';
 try{await call('profile_save',{nickname:$('profileNickname').value.trim(),profile});await loadSharedProfile();status.textContent='保存しました。AevToolsにも反映されます。';$('accountEmailLabel').textContent=session?.user?.email||'';}
 catch(e){const map={nickname_taken:'このネームは既に使用されています。',nickname_reserved:'このネームは使用できません。',nickname_cooldown:'ネーム変更は14日ごとです。',nickname_length_invalid:'ネームは1〜20文字で入力してください。',invalid_avatar_url:'アイコンURLはHTTPSで入力してください。',invalid_banner_url:'バナーURLはHTTPSで入力してください。'};status.textContent=map[e.message]||'保存できませんでした：'+e.message;}
 finally{b.disabled=false;}
});
function showAccount(){const out=$('accountLoggedOut'),inside=$('accountLoggedIn');if(out)out.hidden=!!session;if(inside)inside.hidden=!session;if($('accountEmailLabel'))$('accountEmailLabel').textContent=session?.user?.email||'';if(status)status.textContent=session?'ログイン中です。':'ログインしていません。';}
const status=$('accountStatus');
$('accountLogin')?.addEventListener('click',async()=>{const email=$('accountEmail')?.value.trim(),password=$('accountPassword')?.value;if(!email||!password){if(status)status.textContent='メールアドレスとパスワードを入力してください。';return;}const b=$('accountLogin');b.disabled=true;try{const r=await call('login',{email,password});session=r.session;localStorage.setItem(KEY,JSON.stringify(session));showAccount();await loadSharedProfile();const yes=await refreshAdmin();if(yes&&document.documentElement.dataset.page==='admin')await loadAdmin();const page=document.documentElement.dataset.page;if(page==='index')await loadPublicFeed('announcements','publicAnnouncements');if(page==='news')await loadPublicFeed('news','publicNews');if(page==='updates')await loadPublicFeed('updates','publicUpdates');if(status)status.textContent='ログインしました。';$('accountPassword').value='';}catch(e){if(status)status.textContent='ログインできませんでした：'+e.message;}finally{b.disabled=false;}});
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
async function loadAdmin(){try{await Promise.all([loadMetrics(),loadContent(),loadUsers(),loadBlacklist()]);}catch(e){const p=document.createElement('p');p.className='status';p.textContent='管理情報を読み込めませんでした：'+e.message;$('adminContent').prepend(p);}}
(async()=>{try{session=JSON.parse(localStorage.getItem(KEY)||'null');showAccount();await loadSharedProfile();const yes=await refreshAdmin();if(yes&&document.documentElement.dataset.page==='admin')await loadAdmin();}catch(e){localStorage.removeItem(KEY);session=null;showAccount();}})();
})();