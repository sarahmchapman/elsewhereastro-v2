// ═══════════════════════════════════════════════════════════
// AUTO-TIMEZONE + CITY AUTOCOMPLETE + EPHEMERIS
// Meeus algorithms — no external dependencies
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// AUTO-TIMEZONE from longitude (approximate but standard)
// ═══════════════════════════════════════════════════════════
function tzFromLng(lng) {
  // Standard nautical timezone: round to nearest whole hour
  return Math.round(lng / 15);
}

// ═══════════════════════════════════════════════════════════
// CITY AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════
var selectedGeo = null, selectedFocus = 'Love', hiIdx = -1;
var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function pad(n){return String(n).padStart(2,'0');}

function normStr(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
// ── CITY SEARCH: local DB + live Nominatim geocoding ──────────────────────
function _localSearch(q){
  var n=normStr(q.trim()); if(n.length<1)return[];
  var a=[],b=[];
  for(var i=0;i<CITY_DB.length;i++){
    var city=CITY_DB[i],cn=normStr(city.n),cc=normStr(city.c),cr=normStr(city.r||'');
    if(cn.indexOf(n)===0||cc.indexOf(n)===0)a.push(city);
    else if(cn.indexOf(n)>0||cr.indexOf(n)>0||cc.indexOf(n)>0)b.push(city);
    if(a.length+b.length>=20)break;
  }
  return a.concat(b).slice(0,8);
}

(function(){
  var inp=document.getElementById('cityInput'),drop=document.getElementById('citySuggestions');
  if(!inp||!drop)return;
  var hi=-1, _debounce=null, _lastQ='', _apiResults=[];

  function its(){return drop.getElementsByClassName('city-item');}
  function close(){drop.classList.remove('show');hi=-1;}
  function hl(i){var x=its();[].forEach.call(x,function(el){el.classList.remove('hi');});hi=Math.max(-1,Math.min(i,x.length-1));if(hi>=0)x[hi].classList.add('hi');}

  function pick(city){
    inp.value=city.n+(city.r&&city.r!==city.n&&city.r!==city.c?', '+city.r:'')+', '+city.c;
    selectedGeo={lat:city.lat,lng:city.lng,city:city.n,country:city.c,display:inp.value,tz:tzFromLng(city.lng)};
    close();
    document.getElementById('geoErr').classList.remove('on');
  }

  function renderHits(hits){
    drop.innerHTML='';
    if(!hits.length){close();return;}
    hits.forEach(function(city){
      var div=document.createElement('div');
      div.className='city-item';
      div.innerHTML='<span class="ci-name">'+city.n+'</span>'
        +'<span class="ci-sub">'+(city.r&&city.r!==city.n&&city.r!==city.c?city.r+', ':'')+city.c+'</span>';
      div.addEventListener('mousedown',function(ev){ev.preventDefault();pick(city);});
      drop.appendChild(div);
    });
    drop.classList.add('show'); hi=-1;
  }

  function nominatimSearch(q){
    // Photon by Komoot — HTTPS, CORS-safe, no API key, full OSM (cities/towns/villages/hamlets)
    fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(q)+'&limit=20&lang=en')
      .then(function(r){return r.json();})
      .then(function(data){
        if(inp.value.trim()!==q)return;
        var PLACES=['city','town','village','hamlet','suburb','quarter',
          'neighbourhood','locality','municipality','borough','district','island'];
        var results=[];
        (data.features||[]).forEach(function(f){
          var p=f.properties||{};
          if(!p.name||!p.country)return;
          // Only keep settlement-type places — filter client-side
          if(p.osm_key!=='place' && PLACES.indexOf(p.osm_value)<0)return;
          var region=p.state||p.county||p.district||'';
          var dup=results.some(function(r){
            return normStr(r.n)===normStr(p.name)&&normStr(r.c)===normStr(p.country);
          });
          if(!dup)results.push({
            n:p.name, r:region, c:p.country,
            lat:f.geometry.coordinates[1], lng:f.geometry.coordinates[0]
          });
        });
        var local=_localSearch(q);
        var merged=local.slice();
        results.forEach(function(ar){
          var seen=merged.some(function(lr){
            return normStr(lr.n)===normStr(ar.n)&&normStr(lr.c)===normStr(ar.c);
          });
          if(!seen)merged.push(ar);
        });
        renderHits(merged.slice(0,12));
      })
      .catch(function(){});
  }

  inp.addEventListener('keydown',function(e){
    if(!drop.classList.contains('show'))return;
    var x=its();
    if(e.key==='ArrowDown'){e.preventDefault();hl(hi+1);}
    else if(e.key==='ArrowUp'){e.preventDefault();hl(hi-1);}
    else if(e.key==='Enter'){
      e.preventDefault();
      if(hi>=0&&hi<x.length){x[hi].dispatchEvent(new MouseEvent('mousedown'));}
      else if(x.length===1){x[0].dispatchEvent(new MouseEvent('mousedown'));}
    }
    else if(e.key==='Escape')close();
  });
  inp.addEventListener('blur',function(){setTimeout(close,200);});
  inp.addEventListener('input',function(){
    selectedGeo=null;
    var q=inp.value.trim();
    if(q.length<2){drop.innerHTML='';close();return;}
    // Show local results instantly
    var local=_localSearch(q);
    renderHits(local);
    // Then fetch from Nominatim after short debounce
    clearTimeout(_debounce);
    _debounce=setTimeout(function(){nominatimSearch(q);},400);
  });
})();

// ═══════════════════════════════════════════════════════════
// EPHEMERIS — Meeus algorithms, no external dependencies
// ═══════════════════════════════════════════════════════════
var SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
var PCOL={Sun:'#c9973f',Moon:'#5a7aa8',Mercury:'#4a8a6a',Venus:'#c0607a',Mars:'#9b3535',Jupiter:'#7a5a30',Saturn:'#6a6055',Uranus:'#3a7a7a',Neptune:'#4a4a9a',Pluto:'#7a4a6a'};
var PSYM={Sun:'☉',Moon:'☽',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇'};
var FOCUS_PLANETS={Love:['Venus','Moon','Neptune','Jupiter'],Career:['Saturn','Sun','Mars','Jupiter'],Healing:['Moon','Neptune','Venus','Pluto'],Self:['Sun','Mars','Mercury','Uranus']};
var OBL=23.4365;

function n360(x){return((x%360)+360)%360;}
function n180(x){return((x+540)%360)-180;}
function R(d){return d*Math.PI/180;}

function jdFromDate(y,mo,d,h,mn){
  if(mo<=2){y--;mo+=12;}
  var A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(mo+1))+d+h/24+mn/1440+B-1524.5;
}
// ── VSOP87 geocentric ephemeris (Meeus, scale 1e-8) ──────────────────────────
function _vs(t,tau){var s=0;t.forEach(function(v){s+=v[0]*Math.cos(v[1]+v[2]*tau);});return s;}
var _S=1e-8;
// Earth heliocentric
var _EL0=[[175347046*_S,0,0],[3341656*_S,4.6732156,6283.0758500],[34894*_S,4.62610,12566.15170],[3497*_S,2.7441,5753.3849],[3418*_S,2.8289,3.5231],[3136*_S,3.6277,77713.7715],[2676*_S,4.4181,7860.4194],[2343*_S,6.1352,3930.2097],[1324*_S,0.7425,11506.7698],[1273*_S,2.0371,529.6910]];
var _EL1=[[628331966747*_S,0,0],[206059*_S,2.678235,6283.075850],[4303*_S,2.6351,12566.1517],[425*_S,1.590,3.523],[119*_S,5.796,26.298],[109*_S,2.966,1577.344]];
var _EL2=[[52919*_S,0,0],[8720*_S,1.0721,6283.0758],[309*_S,0.867,12566.152]];
var _EB0=[[280*_S,3.199,84334.662],[102*_S,5.422,5507.553],[80*_S,3.88,5223.69]];
var _ER0=[[100013989*_S,0,0],[1670700*_S,3.0984635,6283.0758500],[13956*_S,3.05525,12566.15170],[3084*_S,5.1985,77713.7715],[1628*_S,1.1739,5753.3849],[1576*_S,2.8469,7860.4194]];
var _ER1=[[103019*_S,1.107490,6283.075850],[1721*_S,1.0644,12566.1517]];
// Venus heliocentric
var _VL0=[[317614667*_S,0,0],[1353968*_S,5.5931332,10213.2855462],[89892*_S,5.30650,20426.57109],[5477*_S,4.4163,7860.4194],[3456*_S,2.6996,11790.6291],[2372*_S,2.9938,3930.2097],[1664*_S,4.2502,1577.3435],[1438*_S,4.1575,9683.5946]];
var _VL1=[[1021352943052*_S,0,0],[95708*_S,2.46424,10213.28555],[14445*_S,0.51625,20426.57109]];
var _VL2=[[54127*_S,0,0],[3891*_S,0.3451,10213.2855]];
var _VB0=[[5923638*_S,0.2670278,10213.2855462],[40108*_S,1.14737,20426.57109],[32815*_S,3.14159,0]];
var _VB1=[[513348*_S,1.803643,10213.285546],[199*_S,0,0]];
var _VR0=[[72333282*_S,0,0],[489824*_S,4.021518,10213.285546],[1658*_S,4.9021,20426.5711]];
var _VR1=[[34551*_S,0.89199,10213.28555]];
// Mars heliocentric
var _MaL0=[[620347712*_S,0,0],[18656368*_S,5.0503417,3340.6124267],[1108217*_S,5.4009984,6681.2248534],[91798*_S,5.7547,10021.8373],[27745*_S,5.9705,2281.2305],[12316*_S,0.8496,2810.9215],[10610*_S,2.9396,2942.4634],[8927*_S,4.1578,0.0173],[8716*_S,6.1101,13362.4497]];
var _MaL1=[[334085627154*_S,0,0],[1458227*_S,3.6042605,3340.6124267],[164901*_S,3.9263,6681.2249],[19963*_S,4.2660,10021.8373],[3452*_S,4.7321,3337.0893]];
var _MaL2=[[58016*_S,2.0498,3340.6124],[54188*_S,0,0],[13908*_S,2.4574,6681.2248]];
var _MaB0=[[3197135*_S,3.7683204,3340.6124267],[298033*_S,4.1061,6681.2249],[289105*_S,3.14159,0],[31366*_S,4.4465,10021.8373]];
var _MaB1=[[350069*_S,5.368478,3340.612427],[14116*_S,3.14159,0],[9671*_S,5.4788,6681.2249]];
var _MaR0=[[153033488*_S,0,0],[14184953*_S,3.47971,3340.6124267],[660776*_S,3.817834,6681.224853],[46179*_S,4.15595,10021.83728],[8110*_S,5.5596,2810.9215]];
var _MaR1=[[1107433*_S,2.03253,3340.6124267],[103176*_S,2.37072,6681.224853],[12877*_S,0,0]];
// Jupiter heliocentric
var _JuL0=[[59954691*_S,0,0],[9695899*_S,5.0619179,529.6909651],[573610*_S,1.44406,7.11355],[306389*_S,5.41734,1059.38193],[97178*_S,4.14265,632.78374],[72903*_S,3.64042,522.57742],[64264*_S,3.41145,103.09277]];
var _JuL1=[[52993480757*_S,0,0],[489741*_S,4.22067,529.690965],[228919*_S,6.02648,7.11355],[55733*_S,0.24322,1059.38193]];
var _JuL2=[[47234*_S,4.32148,7.11355],[38966*_S,0,0],[30629*_S,2.93021,529.69097]];
var _JuB0=[[2268616*_S,3.5585261,529.6909651],[110090*_S,0,0],[109972*_S,3.908093,1059.381930]];
var _JuB1=[[177352*_S,5.701665,529.690965]];
var _JuR0=[[520887429*_S,0,0],[25209327*_S,3.49108640,529.6909651],[610600*_S,3.841154,1059.38193],[282029*_S,2.574199,632.78374]];
var _JuR1=[[1271802*_S,2.649375,529.6909651],[61662*_S,3.000992,1059.38193],[53444*_S,3.890718,522.57742],[41390*_S,0,0]];
// Saturn heliocentric
var _SaL0=[[87401354*_S,0,0],[11107660*_S,3.9620509,213.2990954],[1414151*_S,4.5858152,7.1135470],[398379*_S,0.52112,206.18555],[350769*_S,3.30330,426.59819],[206816*_S,0.24658,103.09277]];
var _SaL1=[[21354295596*_S,0,0],[1296855*_S,1.82821,213.29910],[564348*_S,2.88500,7.11355],[107679*_S,2.27770,206.18555],[98323*_S,1.08087,426.59819]];
var _SaL2=[[116441*_S,1.17988,7.11355],[91921*_S,0.07325,213.29910],[90592*_S,0,0],[15277*_S,4.06492,206.18555]];
var _SaB0=[[4330678*_S,3.6028443,213.2990954],[240348*_S,2.852385,426.598191],[84746*_S,0,0]];
var _SaB1=[[397555*_S,5.332900,213.299095],[49479*_S,3.14159,0]];
var _SaR0=[[955758136*_S,0,0],[52921382*_S,2.39226220,213.2990954],[1873680*_S,5.235496,206.18555],[1464664*_S,1.647631,426.59819]];
var _SaR1=[[6182981*_S,0.2584352,213.2990954],[506578*_S,0.711147,206.18555],[341394*_S,5.796358,426.59819],[188491*_S,0.472157,220.41264]];
// Uranus heliocentric (corrected L1[0])
var _UrL0=[[548129294*_S,0,0],[9260408*_S,0.8910642,74.7815986],[1504248*_S,3.6271490,1.4844727],[365982*_S,1.899715,73.2971259],[272328*_S,3.358255,149.5631971]];
var _UrL1=[[7502543122*_S,0,0],[154458*_S,5.242017,74.781599],[24456*_S,1.71256,1.48447]];
var _UrL2=[[53033*_S,0,0],[16983*_S,3.16565,138.5175],[9987*_S,5.9491,74.7816]];
var _UrB0=[[1346278*_S,2.6187781,74.7815986],[62341*_S,5.08111,149.5632],[61601*_S,3.14159,0]];
var _UrB1=[[206366*_S,4.12394,74.78160]];
var _UrR0=[[1921264848*_S,0,0],[88784984*_S,5.60377527,74.7815986],[3440835*_S,0.32836,73.2971259],[2055653*_S,1.78295,149.5631971]];
var _UrR1=[[1479896*_S,3.6720571,74.7815986],[71212*_S,6.22815,63.73590]];
// Neptune heliocentric
var _NeL0=[[531188633*_S,0,0],[1798476*_S,2.9010127,38.1330356],[1019728*_S,0.4858092,1.4844727],[124532*_S,4.830081,36.6485629]];
var _NeL1=[[3837687717*_S,0,0],[16604*_S,4.86319,1.48447],[15807*_S,2.27923,38.13304]];
var _NeL2=[[53892*_S,0,0],[296*_S,1.855,1.48447]];
var _NeB0=[[3088623*_S,1.4410437,38.1330356],[27701*_S,5.909627,76.2660712],[27237*_S,3.14159,0]];
var _NeB1=[[227279*_S,3.807931,38.133035],[2721*_S,3.14159,0]];
var _NeR0=[[3007013206*_S,0,0],[27062259*_S,1.32999459,38.1330356],[1691764*_S,3.2518614,36.6485629]];
var _NeR1=[[236339*_S,0.70498,38.133035]];

function _helio(L0,L1,L2,B0,B1,R0,R1,tau){
  var L=_vs(L0,tau)+_vs(L1,tau)*tau+(L2?_vs(L2,tau)*tau*tau:0);
  var B=_vs(B0,tau)+(B1?_vs(B1,tau)*tau:0);
  var Rv=_vs(R0,tau)+_vs(R1,tau)*tau;
  return{x:Rv*Math.cos(B)*Math.cos(L),y:Rv*Math.cos(B)*Math.sin(L),z:Rv*Math.sin(B)};
}
function _geoLon(p,e){return n360(Math.atan2(p.y-e.y,p.x-e.x)*180/Math.PI);}

// Mercury + Pluto: Keplerian with full 3D elements (accurate enough)
function kepler(M,e){var E=M,d;for(var i=0;i<10;i++){d=E-e*Math.sin(E)-M;E-=d/(1-e*Math.cos(E));if(Math.abs(d)<1e-10)break;}return E;}
function _kepGeo(L0r,Lr,e0r,er,w0r,wr,i0r,ir,O0r,Or,ar,jd,ex,ey){
  var T=(jd-2451545)/36525,L=n360(L0r+Lr*T),e=e0r+er*T,w=n360(w0r+wr*T),i=R(i0r+ir*T),O=R(O0r+Or*T),M=R(n360(L-w)),E=kepler(M,e),nu=2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2),Math.sqrt(1-e)*Math.cos(E/2)),r=ar*(1-e*Math.cos(E));
  var sm=R(w)-O,u=nu+sm,x=r*(Math.cos(O)*Math.cos(u)-Math.sin(O)*Math.sin(u)*Math.cos(i)),y=r*(Math.sin(O)*Math.cos(u)+Math.cos(O)*Math.sin(u)*Math.cos(i));
  return n360(Math.atan2(y-ey,x-ex)*180/Math.PI);
}

function sunLon(jd){
  var T=(jd-2451545)/36525,L0=n360(280.46646+36000.76983*T),M=n360(357.52911+35999.05029*T-.0001537*T*T),Mr=R(M);
  return n360(L0+(1.914602-.004817*T-.000014*T*T)*Math.sin(Mr)+(0.019993-.000101*T)*Math.sin(2*Mr)+.000289*Math.sin(3*Mr));
}
function moonLon(jd){
  var T=(jd-2451545)/36525,L0=n360(218.3165+481267.8813*T),M=n360(357.5291+35999.0503*T),Mp=n360(134.9634+477198.8676*T),D=n360(297.8502+445267.1115*T),F=n360(93.2721+483202.0175*T);
  return n360(L0+6.2888*Math.sin(R(Mp))+1.274*Math.sin(R(2*D-Mp))+.6583*Math.sin(R(2*D))+.2136*Math.sin(R(2*Mp))-.1851*Math.sin(R(M))-.1143*Math.sin(R(2*F))+.0588*Math.sin(R(2*D-2*Mp))+.0572*Math.sin(R(2*D-M-Mp))+.0533*Math.sin(R(2*D+Mp)));
}
function parseLon(lon){
  var si=Math.floor(lon/30)%12,s=lon-si*30,d=Math.floor(s),m=Math.floor((s-d)*60);
  return{totalDeg:lon,sign:SIGNS[si],deg:d,min:m};
}
function lonToRA(lon){var l=R(lon),e=R(OBL);return n360(Math.atan2(Math.sin(l)*Math.cos(e),Math.cos(l))*180/Math.PI);}
function lonToDec(lon){var l=R(lon),e=R(OBL);return Math.asin(Math.sin(e)*Math.sin(l))*180/Math.PI;}

function computePlanets(jd,lat,lng){
  var p={};
  var tau=(jd-2451545)/365250;
  // Earth heliocentric (VSOP87)
  var E=_helio(_EL0,_EL1,_EL2,_EB0,null,_ER0,_ER1,tau);
  // Sun (geocentric = opposite of Earth helio)
  p.Sun=parseLon(sunLon(jd));
  // Moon
  p.Moon=parseLon(moonLon(jd));
  // Planets: VSOP87 geocentric
  p.Venus  =parseLon(_geoLon(_helio(_VL0,_VL1,_VL2,_VB0,_VB1,_VR0,_VR1,tau),E));
  p.Mars   =parseLon(_geoLon(_helio(_MaL0,_MaL1,_MaL2,_MaB0,_MaB1,_MaR0,_MaR1,tau),E));
  p.Jupiter=parseLon(_geoLon(_helio(_JuL0,_JuL1,_JuL2,_JuB0,_JuB1,_JuR0,_JuR1,tau),E));
  p.Saturn =parseLon(_geoLon(_helio(_SaL0,_SaL1,_SaL2,_SaB0,_SaB1,_SaR0,_SaR1,tau),E));
  p.Uranus =parseLon(_geoLon(_helio(_UrL0,_UrL1,_UrL2,_UrB0,_UrB1,_UrR0,_UrR1,tau),E));
  p.Neptune=parseLon(_geoLon(_helio(_NeL0,_NeL1,_NeL2,_NeB0,_NeB1,_NeR0,_NeR1,tau),E));
  // Mercury & Pluto: Keplerian 3D (accurate to ~1°)
  p.Mercury=parseLon(_kepGeo(252.250906,149472.6746358,0.20563175,-0.000020407,77.45779628,0.15940013,7.00498625,-0.00594749,48.33076593,-0.12534081,0.387098310,jd,E.x,E.y));
  p.Pluto  =parseLon(_kepGeo(238.929038,145.2078051,0.24880766,0,224.068916,0,17.1410426,0,110.3034700,0,39.48211675,jd,E.x,E.y));
  // Angles
  var gmst=n360(280.46061837+360.98564736629*(jd-2451545));
  var ramc=n360(gmst+lng),rr=R(ramc),er=R(OBL),lr=R(lat);
  var mc=n360(Math.atan2(Math.tan(rr),Math.cos(er))*180/Math.PI);
  if(Math.cos(rr)<0)mc=n360(mc+180);
  var asc=n360(Math.atan2(Math.cos(rr),-(Math.sin(rr)*Math.cos(er)+Math.tan(lr)*Math.sin(er)))*180/Math.PI);
  p.Midheaven=parseLon(mc);
  p.Ascendant=parseLon(asc);
  p.Descendant=parseLon(n360(asc+180));
  return p;
}

var ADEFS=[{n:'conjunction',a:0,o:8,s:'☌'},{n:'sextile',a:60,o:4,s:'⚹'},{n:'square',a:90,o:7,s:'□'},{n:'trine',a:120,o:7,s:'△'},{n:'opposition',a:180,o:8,s:'☍'}];
function computeAspects(p){
  var names=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'],out=[];
  for(var i=0;i<names.length;i++)for(var j=i+1;j<names.length;j++){
    var p1=names[i],p2=names[j],diff=Math.abs(p[p1].totalDeg-p[p2].totalDeg),ang=diff>180?360-diff:diff;
    ADEFS.forEach(function(a){var orb=Math.abs(ang-a.a);if(orb<=a.o)out.push({p1:p1,p2:p2,type:a.n,sym:a.s,orb:Math.round(orb*10)/10});});
  }
  return out.sort(function(a,b){return a.orb-b.orb;});
}

// ═══════════════════════════════════════════════════════════
// ACG LINE MATH
// ═══════════════════════════════════════════════════════════
function buildACG(planets,jd){
  // Full IAU GMST formula (Meeus, accurate to 0.1 arcsec)
  var T=(jd-2451545.0)/36525.0;
  var gmst=n360(280.46061837+360.98564736629*(jd-2451545)
    +0.000387933*T*T-T*T*T/38710000.0);
  var lines={};
  var e=R(OBL); // obliquity in radians
  ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].forEach(function(nm){
    var lon=R(planets[nm].totalDeg);
    // Proper RA/Dec using full spherical trig (not just ecliptic longitude projection)
    var ra=n360(Math.atan2(Math.sin(lon)*Math.cos(e),Math.cos(lon))*180/Math.PI);
    var dec=Math.asin(Math.sin(e)*Math.sin(lon))*180/Math.PI;
    var dr=R(dec);
    // MC longitude = RAMC - RA of planet, expressed as geographic longitude
    var ramc=gmst; // RAMC = GMST for longitude 0; shifts by 1° per degree of longitude
    var mcL=n180(ra-gmst);
    var icL=n180(mcL+180);
    var mc=[],ic=[],asc=[],dsc=[];
    for(var lat=-80;lat<=80;lat+=1){mc.push([lat,mcL]);ic.push([lat,icL]);}
    for(var lat2=-66;lat2<=66;lat2+=1){
      var cH=-Math.tan(R(lat2))*Math.tan(dr);
      if(Math.abs(cH)>1)continue;
      var H=Math.acos(Math.max(-1,Math.min(1,cH)))*180/Math.PI;
      asc.push([lat2,n180(ra-H-gmst)]);
      dsc.push([lat2,n180(ra+H-gmst)]);
    }
    lines[nm]={MC:mc,IC:ic,ASC:asc,DSC:dsc,mcLon:mcL,ra:ra,dec:dec};
  });
  return lines;
}

