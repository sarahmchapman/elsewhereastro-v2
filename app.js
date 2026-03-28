// ═══════════════════════════════════════════════════════════
// APP — Form submission, chart rendering, reading card UI
// ═══════════════════════════════════════════════════════════
function handleSubmit(e){
  e.preventDefault();
  var geoErr=document.getElementById('geoErr');
  if(!selectedGeo){geoErr.classList.add('on');document.getElementById('cityInput').focus();return;}
  geoErr.classList.remove('on');

  var day  =parseInt(document.getElementById('inDay').value,10);
  var month=parseInt(document.getElementById('inMonth').value,10);
  var year =parseInt(document.getElementById('inYear').value,10);
  var hour =parseInt(document.getElementById('inHour').value||'12',10);
  var min  =parseInt(document.getElementById('inMinute').value||'0',10);
  var name =document.getElementById('inName').value.trim()||'You';

  // Show loading state
  var btn=document.querySelector('.submit-btn');
  var origText=btn.textContent;
  btn.textContent='Casting your chart…';
  btn.disabled=true;

  // GeoNames timezone lookup — returns correct UTC offset including DST
  // for this exact location and birth date
  var dateStr=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  var tzUrl='https://secure.geonames.org/timezoneJSON'
    +'?lat='+selectedGeo.lat.toFixed(4)
    +'&lng='+selectedGeo.lng.toFixed(4)
    +'&date='+dateStr
    +'&username=sarahmchapman';

  fetch(tzUrl)
    .then(function(r){return r.json();})
    .then(function(data){
      // GeoNames returns rawOffset (standard time) and dstOffset (with DST)
      // Use rawOffset as base — dstOffset can be wrong for historical dates
      var raw = (data&&data.rawOffset!=null) ? data.rawOffset : tzFromLng(selectedGeo.lng);
      var dst = (data&&data.dstOffset!=null) ? data.dstOffset : raw;
      var summerMonth = (month >= 4 && month <= 10);
      var tz = (summerMonth && dst !== raw) ? dst : raw;
      _buildChart(day,month,year,hour,min,name,tz);
    })
    .catch(function(){
      // Fallback to longitude-based estimate if API fails
      var tz=tzFromLng(selectedGeo.lng);
      _buildChart(day,month,year,hour,min,name,tz);
    })
    .finally(function(){
      btn.textContent=origText;
      btn.disabled=false;
    });
}

function _buildChart(day,month,year,hour,min,name,tz){
  var utH=hour-tz,utD=day,utMo=month,utY=year;
  if(utH>=24){utH-=24;utD++;}
  if(utH<0){utH+=24;utD--;}

  var jd=jdFromDate(utY,utMo,utD,utH,min);
  var planets=computePlanets(jd,selectedGeo.lat,selectedGeo.lng);
  var aspects=computeAspects(planets);
  acgData=buildACG(planets,jd);

  // All 10 planets on by default
  ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].forEach(function(p){toggleState[p]=true;});
  ltypeState={MC:true,IC:true,ASC:true,DSC:true};
  selectedFocus='Love';

  activeChart={
    name:name,
    birthDate:day+' '+MONTH_NAMES[month-1]+' '+year,
    birthTime:pad(hour)+':'+pad(min)+' (UTC'+(tz>=0?'+':'')+tz+')',
    birthPlace:selectedGeo.display,
    geo:selectedGeo,planets:planets,aspects:aspects
  };

  document.getElementById('formScreen').style.display='none';
  document.getElementById('mapScreen').style.display='block';

  // Reset filter buttons
  ['All','Love','Career','Healing','Self'].forEach(function(f){
    var b=document.getElementById('ff-'+f);if(b)b.classList.toggle('on',f==='All');
  });
  ['MC','IC','ASC','DSC'].forEach(function(lt){
    var b=document.getElementById('lt-'+lt);if(b)b.classList.add('on');
  });

  renderChart();
  buildToggleBar();
  buildLegend();
  drawMap();
}

function renderChart(){
  var chart=activeChart;
  document.getElementById('barName').innerHTML='<em>'+chart.name+'</em>';
  document.getElementById('barMeta').textContent=chart.birthDate+' · '+chart.birthTime+' · '+chart.birthPlace;

  var PORDER=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  var grid=document.getElementById('chartGrid');
  grid.innerHTML='';
  PORDER.forEach(function(p){
    var d=chart.planets[p];if(!d||d.sign==='?')return;
    var col=PCOL[p];
    grid.innerHTML+='<div class="chart-row"><span class="cr-glyph" style="color:'+col+'">'+PSYM[p]+'</span><span class="cr-name">'+p+'</span><span class="cr-pos">'+d.deg+'°'+pad(d.min)+"'"+'<span class="cr-sign"> '+d.sign+'</span></span></div>';
  });

  var ag=document.getElementById('anglesGrid');
  ag.innerHTML='';
  [{k:'Ascendant',l:'Ascendant (AC)'},{k:'Midheaven',l:'Midheaven (MC)'},{k:'Descendant',l:'Descendant (DC)'}].forEach(function(a){
    var d=chart.planets[a.k];if(!d||d.sign==='?')return;
    ag.innerHTML+='<div class="chart-row"><span class="cr-glyph" style="color:var(--gold);font-size:.65rem;font-family:var(--sans);font-weight:600">'+a.k.slice(0,2).toUpperCase()+'</span><span class="cr-name">'+a.l+'</span><span class="cr-pos">'+d.deg+'°'+pad(d.min)+"'"+'<span class="cr-sign"> '+d.sign+'</span></span></div>';
  });

  var al=document.getElementById('aspectList');
  al.innerHTML='';
  if(!chart.aspects.length){al.innerHTML='<div style="font-family:var(--serif);font-style:italic;color:var(--ink-3);padding:.4rem 0">No major aspects within standard orbs.</div>';return;}
  chart.aspects.forEach(function(a){
    var p1d=chart.planets[a.p1],p2d=chart.planets[a.p2];
    al.innerHTML+='<div class="asp-row '+a.type+'"><span class="asp-sym">'+a.sym+'</span><span class="asp-type">'+a.type+'</span><span class="asp-planets">'+PSYM[a.p1]+' '+a.p1+' '+p1d.deg+'° '+p1d.sign+' — '+PSYM[a.p2]+' '+a.p2+' '+p2d.deg+'° '+p2d.sign+'</span><span class="asp-orb">'+a.orb+'°</span></div>';
  });
}

function buildToggleBar(){
  var tb=document.getElementById('togBtns');
  tb.innerHTML='';
  // Show ALL 10 planets by default
  var allP=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  allP.forEach(function(p){
    if(!toggleState.hasOwnProperty(p))toggleState[p]=true;
    var col=PCOL[p];
    var btn=document.createElement('button');
    btn.className='tog-btn'+(toggleState[p]?'':' off');
    btn.id='togBtn-'+p;
    btn.style.borderColor=col;btn.style.color=col;
    btn.innerHTML='<span class="tg">'+PSYM[p]+'</span><span class="tn">'+p+'</span>';
    btn.onclick=(function(pp,bb){return function(){togglePlanet(pp,bb);};})(p,btn);
    tb.appendChild(btn);
  });
}
function buildLegend(){
  var leg=document.getElementById('mapLegend');
  leg.innerHTML='';
  var allP=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  allP.forEach(function(p){
    if(!toggleState[p])return;
    leg.innerHTML+='<span class="leg-item"><span class="leg-dot" style="background:'+PCOL[p]+'"></span><span style="font-size:.68rem;color:var(--ink-2)">'+PSYM[p]+' '+p+'</span></span>';
  });
  leg.innerHTML+='<span class="leg-item" style="margin-left:auto;color:var(--ink-3);font-size:.65rem">solid=MC/ASC &nbsp; dashed=IC/DSC</span>';
}

function togglePlanet(p,btn){
  toggleState[p]=!toggleState[p];
  btn.classList.toggle('off',!toggleState[p]);
  drawLines();buildLegend();
}
function toggleLT(lt,btn){
  ltypeState[lt]=!ltypeState[lt];
  btn.classList.toggle('on',ltypeState[lt]);
  drawLines();
}
function setFocusFilter(focus,btn){
  selectedFocus=(focus==='All'?'Love':focus);
  // Update active button
  ['All','Love','Career','Healing','Self'].forEach(function(f){
    var b=document.getElementById('ff-'+f);
    if(b)b.classList.toggle('on',f===focus);
  });
  // Show only the relevant planets (or all)
  var show=focus==='All'?null:(FOCUS_PLANETS[focus]||null);
  var allP=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  allP.forEach(function(p){
    toggleState[p]=show?show.indexOf(p)>=0:true;
    var b=document.getElementById('togBtn-'+p);
    if(b)b.classList.toggle('off',!toggleState[p]);
  });
  drawLines();buildLegend();
}

// ═══════════════════════════════════════════════════════════
// READING CONTENT
// ═══════════════════════════════════════════════════════════
var LINE_DESC={
  MC:'The Midheaven line crowns this planet overhead — your public self, reputation, and life calling are fully illuminated here.',
  IC:'The Nadir line roots this planet beneath the earth — themes of home, ancestry, and your deepest private self surface with unusual clarity.',
  ASC:'The Rising line places this planet on the eastern horizon — your physical presence and first impressions carry its full signature here.',
  DSC:'The Descendant line mirrors this energy into your relationship axis — partners you attract here tend to embody this planetary quality.'
};var FEELING={
  Sun:    {Love:'warmly seen, radiant, effortlessly attractive',Career:'purposeful, visible, fully alive in your work',Healing:'vital and self-possessed',Self:'unmistakably yourself'},
  Moon:   {Love:'emotionally open, gently held',Career:'intuitive, nurtured by the work',Healing:'safe enough to feel everything',Self:'in rhythm with your inner tides'},
  Mercury:{Love:'witty, mentally stimulated, truly heard',Career:'sharp, articulate, strategically quick',Healing:'able to name what was unspeakable',Self:'curious, mobile, freely expressive'},
  Venus:  {Love:'irresistibly magnetic, drawn toward beauty',Career:'graceful under pressure, aesthetically attuned',Healing:'gentled back into pleasure and self-worth',Self:'at ease in your own skin'},
  Mars:   {Love:'charged, desirous, alive with chemistry',Career:'driven, decisive, boldly competitive',Healing:'empowered to confront what you\'ve avoided',Self:'on fire — motivated, fearlessly initiating'},
  Jupiter:{Love:'expansive, lucky in love, adventurous',Career:'abundant, opportunity-rich, doors swinging open',Healing:'hopeful, held by something larger',Self:'optimistic, growing, brushing your best self'},
  Saturn: {Love:'serious, building something lasting',Career:'disciplined, respected, earning authority',Healing:'confronting what must be released',Self:'becoming who you\'re supposed to be'},
  Uranus: {Love:'electrically alive, unconventional, free',Career:'innovative, disrupting old patterns',Healing:'suddenly liberated from what felt fixed',Self:'awakened, original, untameable'},
  Neptune:{Love:'dissolving into another, spiritually bonded',Career:'inspired, guided by invisible currents',Healing:'surrendered, compassionately restored',Self:'permeable to beauty, brushing the transcendent'},
  Pluto:  {Love:'compelled, transformed, irrevocably bonded',Career:'reborn professionally, power reclaimed',Healing:'in the crucible, burning toward regeneration',Self:'confronting the shadow, emerging reforged'}
};
var BEST_FOR={
  Sun:    {Love:'being truly seen; partners who witness you',Career:'public roles, leadership, creative direction',Healing:'reclaiming confidence and core vitality',Self:'living fully in your own light'},
  Moon:   {Love:'emotional intimacy, nurturing home life',Career:'work that serves the public',Healing:'processing grief, emotional intelligence',Self:'self-awareness, journaling, dreamwork'},
  Mercury:{Love:'conversations that matter, intellectual bonds',Career:'writing, media, teaching, negotiation',Healing:'naming what\'s been shapeless',Self:'study, movement, making sense of your mind'},
  Venus:  {Love:'romance, beauty, magnetic attraction',Career:'art, fashion, diplomacy, design',Healing:'pleasure practices, reclaiming desire',Self:'aesthetic environments, receiving care'},
  Mars:   {Love:'passionate beginnings, physical chemistry',Career:'entrepreneurship, athletics, competition',Healing:'anger work, reclaiming will',Self:'starting new things, bold action'},
  Jupiter:{Love:'growing together, expansive partnership',Career:'publishing, international work, education',Healing:'faith, optimism, trusting the process',Self:'philosophy, long travel, big vision'},
  Saturn: {Love:'serious commitment, long-term loyalty',Career:'mastery, building authority over time',Healing:'grief work, ancestral patterns',Self:'building structures that last'},
  Uranus: {Love:'unconventional bonds, freedom within commitment',Career:'technology, innovation, disruption',Healing:'breakthroughs, liberation from old identity',Self:'reinvention, originality'},
  Neptune:{Love:'spiritual connection, romantic depth',Career:'music, film, healing arts',Healing:'meditation, surrender, compassion',Self:'dreams, mysticism, creative flow'},
  Pluto:  {Love:'transformation through intimacy',Career:'power positions, depth research',Healing:'shadow work, death-and-rebirth cycles',Self:'confronting mortality, reinvention'}
};
var WATCH_FOR={
  Sun:    {Love:'ego clashes, needing to outshine',Career:'burnout from constant visibility',Healing:'conflating identity with performance',Self:'arrogance, chasing validation'},
  Moon:   {Love:'emotional volatility, over-dependency',Career:'mood-driven decisions',Healing:'staying in wounds rather than moving through',Self:'regression, difficulty with boundaries'},
  Mercury:{Love:'over-analysing, talking around feelings',Career:'scattered focus, too many projects',Healing:'intellectualising rather than feeling',Self:'anxiety, mental loops'},
  Venus:  {Love:'idealising, avoiding necessary conflict',Career:'over-accommodating, undercharging',Healing:'using pleasure to bypass real pain',Self:'people-pleasing'},
  Mars:   {Love:'aggression, power struggles',Career:'burnout, impulsiveness',Healing:'fighting the process',Self:'recklessness, misdirected anger'},
  Jupiter:{Love:'overcommitting, expecting too much',Career:'overexpansion, overpromising',Healing:'bypassing pain with premature positivity',Self:'excess, ego inflation'},
  Saturn: {Love:'emotional coldness, fear of vulnerability',Career:'perfectionism, delays',Healing:'self-punishment as discipline',Self:'rigidity, difficulty receiving help'},
  Uranus: {Love:'commitment phobia, erratic presence',Career:'unreliability, burning bridges',Healing:'wanting change without the work',Self:'instability, alienation'},
  Neptune:{Love:'illusion, idealising what isn\'t real',Career:'lack of clarity, dissolving boundaries',Healing:'escapism, confusion about what heals',Self:'dissolution of self'},
  Pluto:  {Love:'obsession, power dynamics',Career:'all-or-nothing thinking',Healing:'re-traumatisation without support',Self:'destruction before integration'}
};

// ═══════════════════════════════════════════════════════════
// READING CARD
// ═══════════════════════════════════════════════════════════
// One evocative word per planet+line+sign combo
var QUALITY={
  Sun:{MC:'radiant',IC:'rooted',ASC:'magnetic',DSC:'mirrored'},
  Moon:{MC:'visible',IC:'held',ASC:'open',DSC:'bonded'},
  Mercury:{MC:'articulate',IC:'reflective',ASC:'quick',DSC:'heard'},
  Venus:{MC:'luminous',IC:'cherished',ASC:'alluring',DSC:'devoted'},
  Mars:{MC:'driven',IC:'fierce',ASC:'alive',DSC:'charged'},
  Jupiter:{MC:'expansive',IC:'abundant',ASC:'fortunate',DSC:'growing'},
  Saturn:{MC:'authoritative',IC:'ancestral',ASC:'defined',DSC:'committed'},
  Uranus:{MC:'awakened',IC:'liberated',ASC:'electric',DSC:'free'},
  Neptune:{MC:'inspired',IC:'dissolved',ASC:'dreaming',DSC:'merged'},
  Pluto:{MC:'transformed',IC:'excavated',ASC:'intense',DSC:'compelled'}
};

// Distance in degrees between a click point and the nearest point on an ACG line
function _lineDistance(lat, lng, pts) {
  var best = Infinity;
  for (var i = 0; i < pts.length; i++) {
    var dlat = pts[i][0] - lat;
    var dlng = pts[i][1] - lng;
    // Wrap longitude diff
    if (dlng > 180) dlng -= 360;
    if (dlng < -180) dlng += 360;
    var d = Math.sqrt(dlat*dlat + dlng*dlng);
    if (d < best) best = d;
  }
  return best;
}

function openCard(cityName, planet, ltype, _lat, _lng) {
  if (!planet || !ltype || !activeChart) return;
  var chart = activeChart, pd = chart.planets[planet], col = PCOL[planet];
  var focus = selectedFocus;

  // Quality word: evocative single descriptor
  var quality = ((QUALITY[planet]||{})[ltype]) || 'transformed';

  // Distance context: how close is this location to the actual line?
  var distNote = '';
  if (_lat != null && _lng != null && acgData && acgData[planet] && acgData[planet][ltype]) {
    var dist = _lineDistance(_lat, _lng, acgData[planet][ltype]);
    // Convert degree distance to km (approximate, accounts for latitude)
    var kmDist = Math.round(dist * 111);
    if (dist < 2) distNote = 'You are <strong>on or very near</strong> this line.';
    else if (dist < 6) distNote = 'You are <strong>within orb</strong> of this line (~'+kmDist+'km). Its influence is active.';
    else if (dist < 15) distNote = 'You are in the <strong>extended field</strong> (~'+kmDist+'km). The energy is present but subtle.';
    else distNote = 'The nearest '+planet+' '+ltype+' line is approximately <strong>'+kmDist+'km</strong> away.';
  }

  // Aspects involving this planet
  var relA = chart.aspects.filter(function(a){ return a.p1===planet||a.p2===planet; });
  var personText = relA.length
    ? relA.slice(0,3).map(function(a){
        var other = a.p1===planet ? a.p2 : a.p1;
        var od = chart.planets[other];
        var tone = a.type==='square' ? 'creates productive tension'
          : a.type==='opposition' ? 'calls for balance'
          : a.type==='trine' ? 'flows with ease'
          : a.type==='conjunction' ? 'merges and amplifies'
          : 'opens a quiet door';
        return PSYM[planet]+' '+planet+' in '+pd.sign
          +' '+a.sym+' '+PSYM[other]+' '+other+' in '+od.sign
          +' <span style="color:var(--ink-3);font-size:.8em">('+a.type+', '+tone+')</span>';
      }).join('<br>')
    : PSYM[planet]+' '+planet+' in '+pd.sign+' — unaspected, its energy expresses purely here.';

  document.getElementById('rcAccent').style.background = col;
  document.getElementById('rcCity').innerHTML =
    (cityName||'This location')
    +'<br><em>'+quality+'</em>';

  document.getElementById('rcBody').innerHTML =
    // Planet header
    '<div class="rc-planet-row">'
      +'<span class="rc-glyph" style="color:'+col+'">'+PSYM[planet]+'</span>'
      +'<div>'
        +'<div class="rc-pname" style="color:'+col+'">'+planet+' in '+pd.sign+' '+pd.deg+'°'+pad(pd.min)+"'"+'</div>'
        +'<div class="rc-ltype">'
          +{MC:'Midheaven (MC)',IC:'Nadir (IC)',ASC:'Rising (ASC)',DSC:'Descendant (DSC)'}[ltype]
          +' line'
        +'</div>'
      +'</div>'
    +'</div>'
    // Distance context (shown whenever we have a position)
    +(distNote ? '<div class="rc-rule"></div><div class="rc-prose" style="font-size:.82rem">'+distNote+'</div>' : '')
    +'<div class="rc-rule"></div>'
    // Feeling
    +'<div class="rc-slbl">In this place you feel</div>'
    +'<div class="rc-feeling">'+((FEELING[planet]||{})[focus]||'powerfully present')+'.</div>'
    // What's activated
    +"<div class='rc-slbl'>What&#39;s activated</div>"
    +'<div class="rc-prose">'+(LINE_DESC[ltype]||'')+'</div>'
    // Natal signature
    +'<div class="rc-slbl">Your natal signature</div>'
    +'<div class="rc-prose">'+personText+'</div>'
    // Best for / Watch for
    +'<div class="rc-irow">'
      +'<div class="rc-ibox"><div class="rc-ilbl">Best for</div><div class="rc-itext">'+((BEST_FOR[planet]||{})[focus]||'')+'</div></div>'
      +'<div class="rc-ibox"><div class="rc-ilbl">Watch for</div><div class="rc-itext">'+((WATCH_FOR[planet]||{})[focus]||'')+'</div></div>'
    +'</div>';

  document.getElementById('readingCard').classList.add('open');
  document.getElementById('readingCard').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function closeCard(){document.getElementById('readingCard').classList.remove('open');}

function resetToForm(){
  document.getElementById('mapScreen').style.display='none';
  document.getElementById('formScreen').style.display='flex';
  selectedGeo=null;acgData=null;activeChart=null;
  toggleState={};ltypeState={MC:true,IC:true,ASC:true,DSC:true};
  _map.ready=false; _map.tileCache={}; _map.ctx=null; _map.octx=null;
  document.getElementById('cityInput').value='';
  document.getElementById('citySuggestions').innerHTML='';
  document.getElementById('chartGrid').innerHTML='';
  document.getElementById('anglesGrid').innerHTML='';
  document.getElementById('aspectList').innerHTML='';
  document.getElementById('readingCard').classList.remove('open');
  document.getElementById('mapLegend').innerHTML='';
}

// Redraw on resize
window.addEventListener('resize',function(){if(activeChart)drawMap();});
</script>

// Redraw on resize
window.addEventListener('resize',function(){if(activeChart)drawMap();});
