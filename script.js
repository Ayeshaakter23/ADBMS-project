
// ══════════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('edumetrics-theme') || 'dark';
  document.getElementById('htmlRoot').setAttribute('data-theme', saved);
  updateThemeBtn(saved);
}

function toggleTheme() {
  const html    = document.getElementById('htmlRoot');
  const current = html.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('edumetrics-theme', next);
  updateThemeBtn(next);
}

function updateThemeBtn(theme) {
  const btn = document.getElementById('dashThemeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

initTheme();

// ══════════════════════════════════════════════
//  DATA
// ══════════════════════════════════════════════
let students = [];
const CLASSES = ['6A','6B','7A','7B','8A','8B','9A','9B','10A','10B','11A','11B','12A','12B'];
const DEFAULT_SUBJECTS = ['Mathematics','Science','English','History','Geography','Art'];
const SUBJECT_STORAGE_KEYS = ['math','sci','eng','his','geo','art'];
const CLASS_SUBJECTS = Object.fromEntries(CLASSES.map(cls => [cls, [...DEFAULT_SUBJECTS]]));
let classSubjects = JSON.parse(JSON.stringify(CLASS_SUBJECTS));

function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function randScore(){ return randInt(30,100); }

// (calcGrade and calcStatus can be removed from JS, as Python handles it now, 
// but you can keep them if you want them for the live preview tool).
function calcGrade(avg){
  if(avg>=90) return 'A';
  if(avg>=75) return 'B';
  if(avg>=60) return 'C';
  if(avg>=45) return 'D';
  return 'F';
}
function calcStatus(avg){
  if(avg>=60) return 'Pass';
  if(avg>=45) return 'At Risk';
  return 'Fail';
}

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
const TITLES = {dashboard:'Dashboard',students:'Students',grades:'Grade Entry',analytics:'Analytics',attendance:'Attendance',reports:'Reports',settings:'Settings'};

function updateStudentBadge() {
  const badge = document.querySelector('.nav-badge');
  if (badge) badge.textContent = students.length;
}

function navigate(id, el){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  document.getElementById('pageTitle').textContent = TITLES[id]||id;

  if(id==='analytics') initAnalyticsCharts();
  if(id==='attendance') initAttendance();
  if(id==='settings') renderSubjectSettingsSummary();
}

// ══════════════════════════════════════════════
//  CHARTS
// ══════════════════════════════════════════════
const CHART_DEFAULTS = {
  color:'#e8ecf4',
  plugins:{ legend:{ labels:{ color:'#6b7592', font:{ family:"'DM Sans',sans-serif", size:11 } } } },
  scales:{
    x:{ grid:{ color:'rgba(30,37,64,.8)' }, ticks:{ color:'#6b7592', font:{ family:"'DM Sans',sans-serif" } } },
    y:{ grid:{ color:'rgba(30,37,64,.8)' }, ticks:{ color:'#6b7592', font:{ family:"'DM Sans',sans-serif" } } }
  }
};

const MONTHLY = [68,71,69,74,72,75,73,76,74,78,75,79];
const WEEKLY  = [70,74,71,75,78,76,79,77,80,74,78,82];
let trendChart, gradeChart, subjectChart, distChart, classChart, attChart;

function initDashboardCharts(){
  // TREND
  const ctx1 = document.getElementById('trendChart').getContext('2d');
  trendChart = new Chart(ctx1, {
    type:'line',
    data:{
      labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets:[{
        label:'Average Score',
        data: MONTHLY,
        borderColor:'#4f7cff',
        backgroundColor:'rgba(79,124,255,.08)',
        fill:true,
        tension:.4,
        pointBackgroundColor:'#4f7cff',
        pointRadius:4,
        pointHoverRadius:6
      }]
    },
    options:{ ...CHART_DEFAULTS, responsive:true, maintainAspectRatio:true }
  });

  // GRADE DONUT
  const ctx2 = document.getElementById('gradeChart').getContext('2d');
  const gCounts = {A:0,B:0,C:0,D:0,F:0};
  students.forEach(s=>gCounts[s.grade]++);
  gradeChart = new Chart(ctx2,{
    type:'doughnut',
    data:{
      labels:['A','B','C','D','F'],
      datasets:[{
        data:[gCounts.A,gCounts.B,gCounts.C,gCounts.D,gCounts.F],
        backgroundColor:['rgba(34,211,165,.8)','rgba(79,124,255,.8)','rgba(255,194,71,.8)','rgba(167,139,250,.8)','rgba(255,90,90,.8)'],
        borderWidth:0,
        hoverOffset:4
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:true,
      plugins:{ legend:{ position:'bottom', labels:{ color:'#6b7592', padding:14, font:{ family:"'DM Sans',sans-serif", size:11 } } } },
      cutout:'68%'
    }
  });
}

function switchTrendTab(el, mode){
  document.querySelectorAll('.chip-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  trendChart.data.datasets[0].data = mode==='monthly' ? MONTHLY : WEEKLY;
  trendChart.update();
}

function initAnalyticsCharts(){
  const subjects = ['Math','Science','English','History','Geography','Art'];
  const keys = ['math','sci','eng','his','geo','art'];
  const avgs = keys.map(k=>Math.round(students.reduce((a,s)=>a+s[k],0)/students.length));
  const colors = ['#4f7cff','#00e5c3','#ffc247','#a78bfa','#ff6b6b','#22d3a5'];

  // SUBJECT BAR
  if(!subjectChart){
    const ctx = document.getElementById('subjectChart').getContext('2d');
    subjectChart = new Chart(ctx,{
      type:'bar',
      data:{
        labels:subjects,
        datasets:[{
          label:'Class Average',
          data:avgs,
          backgroundColor: colors.map(c=>c+'cc'),
          borderColor: colors,
          borderWidth:1.5,
          borderRadius:6,
        }]
      },
      options:{
        ...CHART_DEFAULTS,
        responsive:true, maintainAspectRatio:true,
        plugins:{ legend:{ display:false } }
      }
    });
  }

  // SUBJECT LIST
  const list = document.getElementById('subjectAvgList');
  list.innerHTML = subjects.map((s,i)=>`
    <div class="subject-row">
      <div class="subject-name">${s}</div>
      <div class="subject-bar"><div class="subject-fill" style="width:${avgs[i]}%;background:${colors[i]}"></div></div>
      <div class="subject-pct">${avgs[i]}%</div>
    </div>
  `).join('');

  // DISTRIBUTION
  if(!distChart){
    const ranges = ['0-44','45-59','60-74','75-89','90-100'];
    const counts = [0,0,0,0,0];
    students.forEach(s=>{
      if(s.avg<45) counts[0]++;
      else if(s.avg<60) counts[1]++;
      else if(s.avg<75) counts[2]++;
      else if(s.avg<90) counts[3]++;
      else counts[4]++;
    });
    const ctx = document.getElementById('distChart').getContext('2d');
    distChart = new Chart(ctx,{
      type:'bar',
      data:{
        labels:ranges,
        datasets:[{
          label:'# Students',
          data:counts,
          backgroundColor:['rgba(255,90,90,.7)','rgba(255,194,71,.7)','rgba(79,124,255,.7)','rgba(0,229,195,.7)','rgba(34,211,165,.7)'],
          borderRadius:6,
          borderWidth:0
        }]
      },
      options:{
        ...CHART_DEFAULTS, responsive:true, maintainAspectRatio:true,
        plugins:{ legend:{ display:false } }
      }
    });
  }

  // CLASS COMPARISON
  if(!classChart){
    const classAvgs = CLASSES.map(cls=>{
      const stu = students.filter(s=>s.class===cls);
      return Math.round(stu.reduce((a,s)=>a+s.avg,0)/stu.length);
    });
    const ctx = document.getElementById('classChart').getContext('2d');
    classChart = new Chart(ctx,{
      type:'radar',
      data:{
        labels:['Math','Science','English','History','Geo'],
        datasets: CLASSES.map((cls,i)=>{
          const stu = students.filter(s=>s.class===cls);
          const keys2 = ['math','sci','eng','his','geo'];
          return {
            label:cls,
            data:keys2.map(k=>Math.round(stu.reduce((a,s)=>a+s[k],0)/stu.length)),
            borderColor:colors[i],
            backgroundColor:colors[i]+'22',
            pointBackgroundColor:colors[i],
            borderWidth:1.5
          };
        })
      },
      options:{
        responsive:true, maintainAspectRatio:true,
        scales:{ r:{ grid:{ color:'rgba(30,37,64,.8)' }, ticks:{ display:false }, pointLabels:{ color:'#6b7592', font:{ family:"'DM Sans',sans-serif", size:11 } } } },
        plugins:{ legend:{ position:'bottom', labels:{ color:'#6b7592', font:{ family:"'DM Sans',sans-serif", size:11 } } } }
      }
    });
  }
}

// ══════════════════════════════════════════════
//  DASHBOARD STATS COMPUTATION
// ══════════════════════════════════════════════
function computeDashboardStats() {
  const total = students.length;
  
  if (total === 0) {
    document.getElementById('statTotal').textContent = '0';
    document.getElementById('statAvg').textContent = '—';
    document.getElementById('statAvgChangeText').textContent = 'No students yet';
    document.getElementById('statRisk').textContent = '0';
    document.getElementById('statRiskChangeText').textContent = 'All safe';
    document.getElementById('statPass').textContent = '—';
    document.getElementById('statPassChangeText').textContent = 'No data yet';
    return;
  }

  // Total students
  document.getElementById('statTotal').textContent = total;

  // Class average
  const classAvg = Math.round(students.reduce((sum, s) => sum + s.avg, 0) / total);
  document.getElementById('statAvg').textContent = classAvg;
  document.getElementById('statAvgChangeText').textContent = `Class average: ${classAvg}%`;

  // At risk students
  const atRiskCount = students.filter(s => s.status === 'At Risk').length;
  const failCount = students.filter(s => s.status === 'Fail').length;
  const riskTotal = atRiskCount + failCount;
  document.getElementById('statRisk').textContent = riskTotal;
  document.getElementById('statRiskChangeText').textContent = `${riskTotal} need attention`;

  // Pass rate
  const passCount = students.filter(s => s.status === 'Pass').length;
  const passRate = Math.round((passCount / total) * 100);
  document.getElementById('statPass').textContent = `${passRate}%`;
  document.getElementById('statPassChangeText').textContent = `${passCount} of ${total} passing`;
}

// ══════════════════════════════════════════════
//  DASHBOARD TABLES
// ══════════════════════════════════════════════
function renderDashboard(){
  computeDashboardStats();

  // Recent students (last 6)
  const recent = [...students].slice(0,6);
  document.getElementById('recentTable').innerHTML = recent.map(s=>`
    <tr onclick="openProfile(${students.indexOf(s)})">
      <td><div class="stu-name">${s.name}</div><div class="stu-id">${s.id}</div></td>
      <td>
        <div class="score-bar-wrap">
          <span style="width:32px;font-size:13px">${s.avg}</span>
          <div class="score-bar"><div class="score-bar-fill" style="width:${s.avg}%;background:${scoreColor(s.avg)}"></div></div>
        </div>
      </td>
      <td><span class="grade-badge grade-${s.grade}">${s.grade}</span></td>
      <td><span class="tag tag-${s.status==='Pass'?'pass':s.status==='At Risk'?'at-risk':'fail'}">${s.status}</span></td>
    </tr>
  `).join('');

  // Top performers
  const top = [...students].sort((a,b)=>b.avg-a.avg).slice(0,5);
  const rankClass = ['first','second','third','',''];
  document.getElementById('topPerformers').innerHTML = top.map((s,i)=>`
    <div class="performer-item">
      <div class="perf-rank ${rankClass[i]}">${i+1}</div>
      <div class="perf-info">
        <div class="perf-name">${s.name}</div>
        <div class="perf-sub">${s.class} · ${s.id}</div>
      </div>
      <div class="perf-score" style="color:${scoreColor(s.avg)}">${s.avg}</div>
    </div>
  `).join('');
}

function scoreColor(avg){
  if(avg>=75) return 'var(--green)';
  if(avg>=60) return 'var(--accent)';
  if(avg>=45) return 'var(--yellow)';
  return 'var(--red)';
}

// ══════════════════════════════════════════════
//  STUDENTS TABLE
// ══════════════════════════════════════════════
let filteredStudents = [...students];

function renderStudentsTable(list){
  const isTeacher = currentUser && currentUser.role === 'teacher';
  document.getElementById('allStudentsTable').innerHTML = list.map((s)=>{
    const idx = students.indexOf(s);
    return `<tr onclick="openProfile(${idx})" style="cursor:pointer">
      <td><div class="stu-name">${s.name}</div><div class="stu-id">${s.id}</div></td>
      <td><span style="font-size:12px;padding:3px 10px;border-radius:20px;background:var(--surface2)">${s.class}</span></td>
      <td style="color:${scoreColor(s.math)}">${s.math}</td>
      <td style="color:${scoreColor(s.sci)}">${s.sci}</td>
      <td style="color:${scoreColor(s.eng)}">${s.eng}</td>
      <td>
        <div class="score-bar-wrap">
          <span style="width:28px;font-size:13px;font-weight:500">${s.avg}</span>
          <div class="score-bar"><div class="score-bar-fill" style="width:${s.avg}%;background:${scoreColor(s.avg)}"></div></div>
        </div>
      </td>
      <td><span class="grade-badge grade-${s.grade}">${s.grade}</span></td>
      <td><span class="tag tag-${s.status==='Pass'?'pass':s.status==='At Risk'?'at-risk':'fail'}">${s.status}</span></td>
      <td>
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="event.stopPropagation();openProfile(${idx})">View</button>
        ${isTeacher ? `<button class="btn btn-ghost" style="padding:5px 10px;font-size:11px;margin-left:4px;border-color:rgba(79,124,255,.3);color:var(--accent)" onclick="event.stopPropagation();openGradeEntryForStudent('${s.id}')">Edit</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function filterStudents(){
  const g = document.getElementById('filterGrade').value;
  const st = document.getElementById('filterStatus').value;
  const cl = document.getElementById('filterClass').value;
  filteredStudents = students.filter(s=>{
    return (!g||s.grade===g) && (!st||s.status===st) && (!cl||s.class===cl);
  });
  renderStudentsTable(filteredStudents);
}

function handleSearch(v) {
  const box = document.getElementById('globalSearchResults');
  if (!v.trim()) {
    filteredStudents = [...students];
    renderStudentsTable(filteredStudents);
    box.style.display = 'none';
    return;
  }
  const q = v.toLowerCase();
  filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  );
  renderStudentsTable(filteredStudents);

  // Show dropdown
  if (!filteredStudents.length) {
    box.innerHTML = `<div style="padding:18px;text-align:center;font-size:13px;color:var(--text-muted)">No students found for "<strong>${v}</strong>"</div>`;
    box.style.display = 'block';
    return;
  }

  const shown = filteredStudents.slice(0, 7);
  box.innerHTML = `
    <div style="padding:8px 12px 4px;font-size:10px;font-weight:700;color:var(--text-dim);letter-spacing:.08em;text-transform:uppercase">
      ${filteredStudents.length} result${filteredStudents.length !== 1 ? 's' : ''}
    </div>
    ${shown.map(s => {
      const idx = students.indexOf(s);
      return `
        <div onclick="selectSearchResult(${idx})" style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;transition:background .15s" onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background=''">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#4f7cff);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">
            ${s.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${s.id} · Class ${s.class}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="grade-badge grade-${s.grade}" style="width:22px;height:22px;font-size:10px">${s.grade}</span>
            <span class="tag tag-${s.status==='Pass'?'pass':s.status==='At Risk'?'at-risk':'fail'}" style="font-size:10px;padding:2px 7px">${s.status}</span>
          </div>
        </div>`;
    }).join('')}
    ${filteredStudents.length > 7 ? `
      <div onclick="goToStudentsView()" style="padding:10px 14px;font-size:12px;color:var(--accent);text-align:center;cursor:pointer;border-top:1px solid var(--border)" onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background=''">
        View all ${filteredStudents.length} results →
      </div>` : ''}
  `;
  box.style.display = 'block';
}

function selectSearchResult(idx) {
  // Close dropdown, navigate to Students view, open profile
  document.getElementById('globalSearchResults').style.display = 'none';
  document.getElementById('globalSearch').value = '';
  navigate('students', document.querySelector('[data-view=students]'));
  setTimeout(() => openProfile(idx), 60);
}

function goToStudentsView() {
  document.getElementById('globalSearchResults').style.display = 'none';
  navigate('students', document.querySelector('[data-view=students]'));
}

// Close search dropdown on outside click
document.addEventListener('click', e => {
  const box = document.getElementById('globalSearchResults');
  const inp = document.getElementById('globalSearch');
  if (box && !box.contains(e.target) && e.target !== inp) box.style.display = 'none';
});

// ══════════════════════════════════════════════
//  STUDENT PROFILE MODAL
// ══════════════════════════════════════════════
function openProfile(idx){
  const s = students[idx];
  const isTeacher = currentUser && currentUser.role === 'teacher';
  const initials = s.name.split(' ').map(n=>n[0]).join('');
  const subjects = [
    {n:'Math',v:s.math},{n:'Science',v:s.sci},{n:'English',v:s.eng},
    {n:'History',v:s.his},{n:'Geography',v:s.geo},{n:'Art',v:s.art}
  ];
  document.getElementById('profileModalTitle').textContent = isTeacher ? 'Student Profile' : 'Student Details';
  document.getElementById('profileContent').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${initials}</div>
      <div class="profile-meta">
        <div class="profile-name">${s.name}</div>
        <p>${s.id} · Class ${s.class}</p>
        <p style="margin-top:6px"><span class="tag tag-${s.status==='Pass'?'pass':s.status==='At Risk'?'at-risk':'fail'}">${s.status}</span></p>
      </div>
    </div>
    <div class="profile-stats">
      <div class="p-stat"><div class="p-stat-val" style="color:${scoreColor(s.avg)}">${s.avg}</div><div class="p-stat-lbl">Avg Score</div></div>
      <div class="p-stat"><div class="p-stat-val" style="color:var(--accent)">${s.grade}</div><div class="p-stat-lbl">Grade</div></div>
      <div class="p-stat"><div class="p-stat-val" style="color:var(--green)">${s.attendance}%</div><div class="p-stat-lbl">Attendance</div></div>
    </div>
    <div class="card-title" style="margin-bottom:12px">Subject Scores</div>
    <div class="subject-list">
      ${subjects.map(sub=>`
        <div class="subject-row">
          <div class="subject-name">${sub.n}</div>
          <div class="subject-bar"><div class="subject-fill" style="width:${sub.v}%;background:${scoreColor(sub.v)}"></div></div>
          <div class="subject-pct">${sub.v}</div>
        </div>
      `).join('')}
    </div>
    ${isTeacher ? `
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:10px">
      <button class="btn btn-primary" style="flex:1" onclick="closeModal('profileModal');openGradeEntryForStudent('${s.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Edit Grades
      </button>
      <button class="btn btn-ghost" onclick="closeModal('profileModal')">Close</button>
    </div>` : `
    <div style="margin-top:20px;text-align:center">
      <button class="btn btn-ghost" onclick="closeModal('profileModal')" style="width:100%">Close</button>
    </div>`}
  `;
  openModal('profileModal');
}

// ══════════════════════════════════════════════
//  GRADE ENTRY STUDENT SEARCH & AUTOCOMPLETE
// ══════════════════════════════════════════════
let selectedGradeStudentId = null;

function onGradeStudentSearch(val) {
  const box = document.getElementById('gradeSuggestions');
  if (!val.trim()) { box.style.display = 'none'; return; }
  const q = val.toLowerCase();
  const matches = students.filter(s =>
    s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  ).slice(0, 8);
  if (!matches.length) { box.style.display = 'none'; return; }
  box.innerHTML = matches.map(s => `
    <div class="grade-suggestion-item" onclick="selectGradeStudent('${s.id}')">
      <div style="flex:1">
        <div style="font-weight:500">${s.name}</div>
        <div class="sug-id">${s.id} · Class ${s.class}</div>
      </div>
      <span class="grade-badge ${s.status==='Pass'?'student':'teacher'}" style="font-size:10px;padding:2px 8px">${s.grade}</span>
    </div>
  `).join('');
  box.style.display = 'block';
}

function selectGradeStudent(sid) {
  const s = students.find(st => st.id === sid);
  if (!s) return;
  selectedGradeStudentId = sid;
  document.getElementById('gradeStudentSearch').value = s.name;
  document.getElementById('gradeSuggestions').style.display = 'none';
  document.getElementById('gradeStudentName').value = s.name;
  document.getElementById('gradeStudentId').value   = s.id;
  document.getElementById('gradeClass').value        = s.class;

  // Render class-specific fields and fill scores
  renderGradeSubjectFields(s.class);
  const entries = getSubjectInputs('gradeSubjectFields');
  entries.forEach((entry, index) => {
    const score = s[SUBJECT_STORAGE_KEYS[index]] ?? 0;
    entry.input.value = score;
  });
  updateGradePreview();
}

// Navigate from Students table Edit button → Grade Entry pre-filled
function openGradeEntryForStudent(sid) {
  navigate('grades', document.querySelector('[data-view=grades]'));
  // small delay to let view render
  setTimeout(() => selectGradeStudent(sid), 100);
}

// Close suggestions on outside click
document.addEventListener('click', e => {
  const box = document.getElementById('gradeSuggestions');
  if (box && !box.contains(e.target) && e.target.id !== 'gradeStudentSearch') {
    box.style.display = 'none';
  }
});

// ══════════════════════════════════════════════
//  GRADE ENTRY LIVE PREVIEW
// ══════════════════════════════════════════════
function getSubjectInputs(containerId){
  return Array.from(document.querySelectorAll(`#${containerId} .grade-score-input`)).map(input => ({
    subject: input.dataset.subject,
    value: Number(input.value) || 0,
    input
  }));
}

function updateGradePreview(){
  const subjectEntries = getSubjectInputs('gradeSubjectFields');
  if (!subjectEntries.length) return;
  const values = subjectEntries.map(entry => entry.value);
  if (!values.some(v => v > 0)) return;
  const avg = Math.round(values.reduce((a,b)=>a+b,0)/values.length);
  const grade = calcGrade(avg);
  const status = calcStatus(avg);
  document.getElementById('gradePreview').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-family:'Syne',sans-serif;font-size:52px;font-weight:800;color:${scoreColor(avg)}">${avg}</div>
      <div style="font-size:13px;color:var(--text-muted)">Average Score</div>
      <div style="margin-top:10px;display:flex;justify-content:center;gap:10px">
        <span class="grade-badge grade-${grade}" style="width:36px;height:36px;font-size:15px">${grade}</span>
        <span class="tag tag-${status==='Pass'?'pass':status==='At Risk'?'at-risk':'fail'}" style="align-self:center">${status}</span>
      </div>
    </div>
    <div class="subject-list">
      ${subjectEntries.map(entry=>`
        <div class="subject-row">
          <div class="subject-name">${entry.subject}</div>
          <div class="subject-bar"><div class="subject-fill" style="width:${entry.value}%;background:${scoreColor(entry.value)}"></div></div>
          <div class="subject-pct">${entry.value}</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function submitGrades(){
  if (!selectedGradeStudentId) {
    showToast('Please search and select a student first','error');
    return;
  }

  const subjectEntries = getSubjectInputs('gradeSubjectFields');
  if (!subjectEntries.length) {
    showToast('No subjects configured for this class','error');
    return;
  }

  const payload = {};
  subjectEntries.forEach((entry, index) => {
    payload[SUBJECT_STORAGE_KEYS[index]] = entry.value;
  });
  SUBJECT_STORAGE_KEYS.slice(subjectEntries.length).forEach(key => {
    payload[key] = 0;
  });

  try {
    const res = await fetch(`/api/students/${selectedGradeStudentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) { window.location.href = '/'; return; }
    if (res.status === 403) { showToast('Only teachers can update grades','error'); return; }
    if (!res.ok) { showToast('Failed to save grades','error'); return; }

    const updated = await res.json();
    // Update local students array
    const idx = students.findIndex(s => s.id === selectedGradeStudentId);
    if (idx !== -1) students[idx] = updated;
    filteredStudents = [...students];
    renderStudentsTable(filteredStudents);
    renderDashboard();
    showToast(`Grades saved for ${updated.name}!`, 'success');
    clearGradeForm();
  } catch(err) {
    showToast('Network error — please try again','error');
  }
}

function clearGradeForm(){
  selectedGradeStudentId = null;
  ['gradeStudentSearch','gradeStudentName','gradeStudentId','gradeClass'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const container = document.getElementById('gradeSubjectFields');
  if (container) container.innerHTML = '';
  document.getElementById('gradePreview').innerHTML=`
    <div class="empty-state" style="padding:40px 20px">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      <h3>Search a student first</h3>
      <p>Select a student above, then fill in scores to see a real-time performance summary.</p>
    </div>`;
}

// ══════════════════════════════════════════════
//  ADD STUDENT — 2-STEP MODAL
// ══════════════════════════════════════════════

function openAddStudentModal() {
  // Reset to step 1
  backToAddStep1(true);
  openModal('addStudentModal');
}

function goToAddStep2() {
  const first = document.getElementById('newFirst').value.trim();
  const last  = document.getElementById('newLast').value.trim();
  if (!first || !last) { showToast('Please fill in first and last name', 'error'); return; }

  const name = `${first} ${last}`;
  const cls  = document.getElementById('newClass').value;
  const initials = (first[0] + (last[0] || '')).toUpperCase();

  // Populate step-2 chip
  document.getElementById('addNewStudentInitials').textContent  = initials;
  document.getElementById('addNewStudentChipName').textContent  = name;
  document.getElementById('addNewStudentChipClass').textContent = `Class ${cls}`;

  renderNewStudentSubjectFields(cls);

  // Activate step 2 UI
  document.getElementById('addStudentStep1').style.display = 'none';
  document.getElementById('addStudentStep2').style.display = 'block';
  document.getElementById('addModalSub').textContent = 'Step 2 of 2 — Grade Entry';

  // Step dot visuals
  document.getElementById('addStep2Num').style.background  = 'var(--accent)';
  document.getElementById('addStep2Num').style.color       = '#fff';
  document.getElementById('addStep2Num').style.border      = 'none';
  document.getElementById('addStep2Dot').style.color       = 'var(--accent)';
  document.getElementById('addStepLine').style.background  = 'var(--accent)';

  // Clear dynamic score fields & preview
  const inputs = document.querySelectorAll('#newStudentSubjectFields .grade-score-input');
  inputs.forEach(input => { input.value = ''; });
  document.getElementById('addGradePreview').innerHTML = '';
  if (inputs[0]) inputs[0].focus();
}

function backToAddStep1(reset) {
  document.getElementById('addStudentStep1').style.display = 'block';
  document.getElementById('addStudentStep2').style.display = 'none';
  document.getElementById('addModalSub').textContent = 'Step 1 of 2 — Student Information';

  // Reset step dot visuals
  document.getElementById('addStep2Num').style.background  = 'var(--surface2)';
  document.getElementById('addStep2Num').style.color       = 'var(--text-dim)';
  document.getElementById('addStep2Num').style.border      = '2px solid var(--border)';
  document.getElementById('addStep2Dot').style.color       = 'var(--text-dim)';
  document.getElementById('addStepLine').style.background  = 'var(--border)';

  if (reset === true) {
    ['newFirst','newLast','newAttendance'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = id === 'newAttendance' ? '90' : '';
    });
  }
}

function updateAddPreview() {
  const subjectEntries = getSubjectInputs('newStudentSubjectFields');
  if (!subjectEntries.length) return;
  const values = subjectEntries.map(entry => entry.value);
  if (!values.some(v => v > 0)) { document.getElementById('addGradePreview').innerHTML = ''; return; }
  const allFilled = values.every(f => f > 0);
  const avg    = Math.round(values.reduce((a,b) => a+b, 0) / values.length);
  const grade  = calcGrade(avg);
  const status = calcStatus(avg);

  const preview = document.getElementById('addGradePreview');
  if (!values.some(f => f > 0)) { preview.innerHTML = ''; return; }

  preview.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:${scoreColor(avg)};line-height:1">${avg}</div>
        <div style="font-size:10px;color:var(--text-muted)">Average</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="grade-badge grade-${grade}" style="width:30px;height:30px;font-size:13px">${grade}</span>
        <span class="tag tag-${status==='Pass'?'pass':status==='At Risk'?'at-risk':'fail'}">${status}</span>
      </div>
      ${allFilled
        ? '<div style="margin-left:auto;font-size:11px;color:var(--green);font-weight:600">✓ All subjects filled</div>'
        : '<div style="margin-left:auto;font-size:11px;color:var(--text-muted)">Fill all 6 subjects</div>'}
    </div>`;
}

async function addStudent() {
  const first = document.getElementById('newFirst').value.trim();
  const last  = document.getElementById('newLast').value.trim();
  if (!first || !last) { showToast('Please go back and fill in the name', 'error'); return; }

  const entries = getSubjectInputs('newStudentSubjectFields');
  if (!entries.length) { showToast('Please configure subjects for this class first', 'error'); return; }

  const scores = {};
  entries.forEach((entry, index) => {
    scores[SUBJECT_STORAGE_KEYS[index]] = entry.value;
  });

  const missing = Object.values(scores).some(v => v === 0 || v === '');
  if (missing) { showToast('Please fill in all subject scores', 'error'); return; }

  const name = `${first} ${last}`;
  const payload = {
    name,
    class: document.getElementById('newClass').value,
    attendance: +document.getElementById('newAttendance').value || 90,
    ...scores
  };

  const btn = document.getElementById('addStudentSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Adding…';

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) { window.location.href = '/'; return; }
    if (!res.ok) { showToast('Failed to add student', 'error'); btn.disabled=false; btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Student'; return; }

    const newStudent = await res.json();
    students.push(newStudent);
    filteredStudents = [...students];
    renderStudentsTable(filteredStudents);
    renderDashboard();
    closeModal('addStudentModal');
    showToast(`${name} added successfully!`, 'success');
    document.getElementById('statTotal').textContent = students.length;
    updateStudentBadge();

    // Navigate to students view to show the new entry
    navigate('students', document.querySelector('[data-view=students]'));
  } catch(err) {
    showToast('Network error — please try again', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Student';
  }
}

// ══════════════════════════════════════════════
//  ATTENDANCE
// ══════════════════════════════════════════════
function initAttendance(){
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const grid = document.getElementById('attCalendar');
  grid.innerHTML = '';
  // Day labels
  days.forEach(d=>{ const el=document.createElement('div'); el.className='att-day-label'; el.textContent=d; grid.appendChild(el); });
  // April 2025: starts Tuesday
  const startOffset=1;
  for(let i=0;i<startOffset;i++){ const el=document.createElement('div'); el.className='att-cell att-empty'; grid.appendChild(el); }
  for(let d=1;d<=30;d++){
    const el=document.createElement('div');
    const dayOfWeek=(startOffset+d-1)%7;
    const isSat=dayOfWeek===5, isSun=dayOfWeek===6;
    if(isSat||isSun){ el.className='att-cell att-holiday'; el.title='Weekend'; }
    else if(d>24){ el.className='att-cell att-empty'; el.title='Future'; }
    else if([7,14].includes(d)){ el.className='att-cell att-absent'; el.title=`Apr ${d}: Absent`; }
    else { el.className='att-cell att-present'; el.title=`Apr ${d}: Present`; }
    el.style.fontSize='8px';
    el.textContent=d;
    grid.appendChild(el);
  }

  // ATTENDANCE CHART
  if(!attChart){
    const ctx=document.getElementById('attChart').getContext('2d');
    const classAtt = CLASSES.map(cls=>{
      const stu=students.filter(s=>s.class===cls);
      return Math.round(stu.reduce((a,s)=>a+s.attendance,0)/stu.length);
    });
    attChart=new Chart(ctx,{
      type:'doughnut',
      data:{
        labels:CLASSES,
        datasets:[{
          data:classAtt,
          backgroundColor:['rgba(79,124,255,.8)','rgba(0,229,195,.8)','rgba(255,194,71,.8)','rgba(167,139,250,.8)'],
          borderWidth:0, hoverOffset:4
        }]
      },
      options:{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{ position:'bottom', labels:{ color:'#6b7592', font:{ family:"'DM Sans',sans-serif",size:11 }, padding:10 } } }, cutout:'60%' }
    });
  }

  const attListEl = document.getElementById('attList');
  const colors2=['#4f7cff','#00e5c3','#ffc247','#a78bfa'];
  attListEl.innerHTML=CLASSES.map((cls,i)=>{
    const stu=students.filter(s=>s.class===cls);
    const avg=Math.round(stu.reduce((a,s)=>a+s.attendance,0)/stu.length);
    return `<div class="subject-row">
      <div class="subject-name">${cls}</div>
      <div class="subject-bar"><div class="subject-fill" style="width:${avg}%;background:${colors2[i]}"></div></div>
      <div class="subject-pct">${avg}%</div>
    </div>`;
  }).join('');
}

function markAttendance(){
  showToast("Today's attendance marked!",'success');
}

// ══════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════
function generateReport(type){
  document.getElementById('reportOutput').style.display='block';
  document.getElementById('reportTitle').textContent=`${type} — Semester 2, 2024–25`;
  let html='';
  if(type==='Merit List'){
    const sorted=[...students].sort((a,b)=>b.avg-a.avg);
    html=`<table><thead><tr><th>Rank</th><th>Student</th><th>Class</th><th>Avg Score</th><th>Grade</th></tr></thead><tbody>
      ${sorted.map((s,i)=>`<tr>
        <td style="font-family:'Syne',sans-serif;font-weight:700;color:${i<3?'var(--yellow)':'var(--text-muted)'}">${i+1}</td>
        <td><div class="stu-name">${s.name}</div><div class="stu-id">${s.id}</div></td>
        <td>${s.class}</td>
        <td style="color:${scoreColor(s.avg)};font-weight:500">${s.avg}</td>
        <td><span class="grade-badge grade-${s.grade}">${s.grade}</span></td>
      </tr>`).join('')}
    </tbody></table>`;
  } else if(type==='At-Risk Students'){
    const risk=students.filter(s=>s.status!=='Pass');
    html=`<table><thead><tr><th>Student</th><th>Class</th><th>Avg</th><th>Status</th><th>Attendance</th></tr></thead><tbody>
      ${risk.map(s=>`<tr>
        <td><div class="stu-name">${s.name}</div><div class="stu-id">${s.id}</div></td>
        <td>${s.class}</td>
        <td style="color:${scoreColor(s.avg)};font-weight:500">${s.avg}</td>
        <td><span class="tag tag-${s.status==='At Risk'?'at-risk':'fail'}">${s.status}</span></td>
        <td>${s.attendance}%</td>
      </tr>`).join('')}
    </tbody></table>`;
  } else {
    html=`<div class="empty-state" style="padding:40px"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>${type} Generated</h3><p>Report has been generated and is ready for export.</p></div>`;
  }
  document.getElementById('reportContent').innerHTML=html;
  document.getElementById('reportOutput').scrollIntoView({behavior:'smooth'});
  showToast(`${type} generated!`,'info');
}

function exportReport(){
  showToast('Exporting as PDF… (demo)','info');
}

// ══════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

const DEFAULT_GRADING_SCALE = [
  { grade:'A', description:'Excellent', range:'90 – 100' },
  { grade:'B', description:'Good', range:'75 – 89' },
  { grade:'C', description:'Average', range:'60 – 74' },
  { grade:'D', description:'Below Avg', range:'45 – 59' },
  { grade:'F', description:'Fail', range:'Below 45' }
];
let gradingScale = [...DEFAULT_GRADING_SCALE];

function openGradingScaleEditor(){
  renderGradingScaleRows();
  openModal('gradingScaleModal');
}

function renderGradingScaleRows(){
  const container = document.getElementById('gradingScaleRows');
  container.innerHTML = gradingScale.map((item,index)=>`
    <div class="form-group" data-index="${index}">
      <label class="form-label">Grade ${item.grade}</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <input class="form-input" placeholder="Grade" value="${item.grade}" onchange="updateGradingScaleField(${index}, 'grade', this.value)">
        <input class="form-input" placeholder="Description" value="${item.description}" onchange="updateGradingScaleField(${index}, 'description', this.value)">
        <input class="form-input" placeholder="Range" value="${item.range}" onchange="updateGradingScaleField(${index}, 'range', this.value)">
        <button class="btn btn-ghost" style="margin-top:0" onclick="removeGradingScaleRow(${index})">Remove</button>
      </div>
    </div>
  `).join('');
}

function updateGradingScaleField(index, field, value){
  gradingScale[index] = { ...gradingScale[index], [field]: value };
}

function addGradingScaleRow(){
  gradingScale.push({ grade:'', description:'', range:'' });
  renderGradingScaleRows();
}

function removeGradingScaleRow(index){
  gradingScale.splice(index,1);
  renderGradingScaleRows();
}

function saveGradingScaleChanges(){
  const valid = gradingScale.every(item => item.grade && item.range);
  if(!valid){ showToast('Fill grade and range for every entry','error'); return; }
  renderGradingScaleSummary();
  closeModal('gradingScaleModal');
  showToast('Grading scale saved successfully','success');
}

function renderGradingScaleSummary(){
  const summary = document.getElementById('gradingScaleSummary');
  summary.innerHTML = gradingScale.map(item=>`
    <div class="scale-row">
      <div><strong>${item.grade}</strong> <span class="scale-meta">${item.description}</span></div>
      <div>${item.range}</div>
    </div>
  `).join('');
}

function openSubjectSettings(){
  renderSubjectSettingsSummary();
  renderSubjectSettingsModal();
  openModal('subjectSettingsModal');
}

function populateClassSelect(selectId, selected){
  const select = document.getElementById(selectId);
  if(!select) return null;
  const currentValue = selected || select.value || CLASSES[0];
  select.innerHTML = CLASSES.map(cls=>`<option value="${cls}">${cls}</option>`).join('');
  select.value = currentValue;
  return select.value || CLASSES[0];
}

function renderSubjectSettingsSummary(){
  const cls = populateClassSelect('subjectSettingsClassSummary');
  if(!cls) return;
  const list = document.getElementById('subjectSettingsListSummary');
  if(!list) return;
  const subjects = classSubjects[cls] || [];
  list.innerHTML = subjects.map((sub, i)=>`
    <div class="scale-row">
      <div><strong>${i+1}.</strong> <span class="scale-meta">${sub}</span></div>
    </div>
  `).join('');
}

function renderSubjectSettingsModal(){
  const cls = populateClassSelect('subjectSettingsClassModal');
  if(!cls) return;
  const list = document.getElementById('subjectSettingsListModal');
  if(!list) return;
  const subjects = classSubjects[cls] || [];
  list.innerHTML = subjects.map((sub, i)=>`
    <div class="scale-row">
      <div><strong>${i+1}.</strong> <span class="scale-meta">${sub}</span></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" style="font-size:11px;padding:6px 10px" onclick="editClassSubject('${cls}', ${i})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          Edit
        </button>
        <button class="btn btn-ghost" style="font-size:11px;padding:6px 10px" onclick="removeClassSubject('${cls}', ${i})">
          Remove
        </button>
      </div>
    </div>
  `).join('');
}

function promptAddClassSubject(){
  const cls = document.getElementById('subjectSettingsClassModal')?.value || CLASSES[0];
  const newSubject = prompt(`Add a new subject for class ${cls}:`);
  if (!newSubject) return;
  addClassSubject(cls, newSubject.trim());
}

function addClassSubject(cls, subjectName){
  if (!subjectName) return;
  classSubjects[cls] = classSubjects[cls] || [];
  classSubjects[cls].push(subjectName);
  renderSubjectSettingsModal();
  renderSubjectSettingsSummary();
  showToast(`Added ${subjectName} to ${cls}`,'success');
}

function removeClassSubject(cls, index){
  if (!classSubjects[cls] || classSubjects[cls].length <= 1) {
    showToast('At least one subject must remain', 'error');
    return;
  }
  classSubjects[cls].splice(index, 1);
  renderSubjectSettingsModal();
  renderSubjectSettingsSummary();
  showToast('Subject removed','success');
}

function editClassSubject(cls, index){
  const subject = classSubjects[cls][index];
  const newName = prompt(`Update subject name for ${cls}:`, subject);
  if (newName === null) return;
  classSubjects[cls][index] = newName.trim() || subject;
  renderSubjectSettingsModal();
  renderSubjectSettingsSummary();
  showToast(`Updated subject for ${cls}`,'success');
}

function getSubjectsForClass(cls){
  return classSubjects[cls] ? [...classSubjects[cls]] : [...DEFAULT_SUBJECTS];
}

function renderGradeSubjectFields(cls){
  const container = document.getElementById('gradeSubjectFields');
  const subjects = getSubjectsForClass(cls);
  container.innerHTML = subjects.map(sub=>`
    <div class="form-group">
      <label class="form-label">${sub}</label>
      <input class="form-input grade-score-input" type="number" min="0" max="100" placeholder="0–100" data-subject="${sub}">
    </div>
  `).join('');
  document.querySelectorAll('#gradeSubjectFields .grade-score-input').forEach(el=>el.addEventListener('input', updateGradePreview));
}

function renderNewStudentSubjectFields(cls){
  const container = document.getElementById('newStudentSubjectFields');
  const subjects = getSubjectsForClass(cls);
  container.innerHTML = subjects.map(sub=>`
    <div class="form-group">
      <label class="form-label">${sub}</label>
      <input class="form-input grade-score-input" type="number" min="0" max="100" placeholder="0–100" data-subject="${sub}" oninput="updateAddPreview()">
    </div>
  `).join('');
}

function getSubjectValues(containerId){
  const inputs = document.querySelectorAll(`#${containerId} .grade-score-input`);
  const values = {};
  inputs.forEach(input => {
    const key = input.getAttribute('data-subject');
    const value = Number(input.value) || 0;
    values[key] = value;
  });
  return values;
}

renderGradingScaleSummary();

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click',e=>{ if(e.target===el) el.classList.remove('open'); });
});

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
function showToast(msg, type='info'){
  const el=document.createElement('div');
  const icons={success:'✓',error:'✕',info:'i'};
  el.className=`toast ${type}`;
  el.innerHTML=`<span style="font-weight:700;color:${type==='success'?'var(--green)':type==='error'?'var(--red)':'var(--accent)'}">${icons[type]}</span>${msg}`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(()=>el.remove(),3500);
}

// ══════════════════════════════════════════════
//  AUTH & USER
// ══════════════════════════════════════════════
let currentUser = null;

async function logoutUser() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

function applyRoleRestrictions(user) {
  const isTeacher = user.role === 'teacher';

  // Show teacher-only elements (inline style beats the CSS class display:none)
  document.querySelectorAll('.teacher-only').forEach(el => {
    el.style.display = isTeacher ? 'block' : 'none';
  });
  // gradeFormButtons needs flex layout specifically
  const gradeButtons = document.getElementById('gradeFormButtons');
  if (gradeButtons) gradeButtons.style.display = isTeacher ? 'flex' : 'none';

  // Grade Entry: show readonly notice and lock inputs for students
  const gradeNotice = document.getElementById('gradeReadonlyNotice');
  if (gradeNotice) gradeNotice.style.display = isTeacher ? 'none' : 'block';

  const scoreInputs = document.querySelectorAll('.grade-score-input');
  scoreInputs.forEach(inp => {
    if (!isTeacher) {
      inp.setAttribute('readonly', 'readonly');
    } else {
      inp.removeAttribute('readonly');
    }
  });

  // Grade search input — students can browse, teachers can edit
  const gradeSearch = document.getElementById('gradeStudentSearch');
  if (gradeSearch) gradeSearch.placeholder = isTeacher ? 'Type name or ID to select…' : 'Type name or ID to view…';
}

function updateSidebarUser(user) {
  if (!user) return;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent   = user.name;
  document.getElementById('sidebarRole').textContent   = user.role === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student';
}

// ══════════════════════════════════════════════
//  USER PROFILE MODAL
// ══════════════════════════════════════════════
function openUserProfile() {
  if (!currentUser) return;
  const u = currentUser;
  const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isTeacher = u.role === 'teacher';

  let academicSection = '';
  if (!isTeacher) {
    // Student: show their own performance if we can find them in the students array
    const myRecord = students.find(s =>
      s.name.toLowerCase() === u.name.toLowerCase()
    );
    if (myRecord) {
      academicSection = `
        <div style="margin-top:20px">
          <div class="card-title" style="margin-bottom:12px">My Academic Summary</div>
          <div class="profile-stats" style="margin-bottom:16px">
            <div class="p-stat">
              <div class="p-stat-val" style="color:${scoreColor(myRecord.avg)}">${myRecord.avg}</div>
              <div class="p-stat-lbl">Avg Score</div>
            </div>
            <div class="p-stat">
              <div class="p-stat-val" style="color:var(--accent)">${myRecord.grade}</div>
              <div class="p-stat-lbl">Grade</div>
            </div>
            <div class="p-stat">
              <div class="p-stat-val" style="color:var(--green)">${myRecord.attendance}%</div>
              <div class="p-stat-lbl">Attendance</div>
            </div>
          </div>
          <div class="subject-list">
            ${[{n:'Math',k:'math'},{n:'Science',k:'sci'},{n:'English',k:'eng'},{n:'History',k:'his'},{n:'Geography',k:'geo'},{n:'Art',k:'art'}]
              .map(sub=>`
                <div class="subject-row">
                  <div class="subject-name">${sub.n}</div>
                  <div class="subject-bar"><div class="subject-fill" style="width:${myRecord[sub.k]}%;background:${scoreColor(myRecord[sub.k])}"></div></div>
                  <div class="subject-pct">${myRecord[sub.k]}</div>
                </div>
              `).join('')}
          </div>
        </div>`;
    }
  } else {
    // Teacher: show summary stats
    const totalStudents = students.length;
    const passCount = students.filter(s => s.status === 'Pass').length;
    const passRate = totalStudents ? Math.round(passCount/totalStudents*100) : 0;
    const classAvg = totalStudents ? Math.round(students.reduce((a,s)=>a+s.avg,0)/totalStudents) : 0;
    academicSection = `
      <div style="margin-top:20px">
        <div class="card-title" style="margin-bottom:12px">Class Overview</div>
        <div class="profile-stats">
          <div class="p-stat">
            <div class="p-stat-val" style="color:var(--accent)">${totalStudents}</div>
            <div class="p-stat-lbl">Total Students</div>
          </div>
          <div class="p-stat">
            <div class="p-stat-val" style="color:var(--green)">${passRate}%</div>
            <div class="p-stat-lbl">Pass Rate</div>
          </div>
          <div class="p-stat">
            <div class="p-stat-val" style="color:var(--yellow)">${classAvg}</div>
            <div class="p-stat-lbl">Class Avg</div>
          </div>
        </div>
      </div>`;
  }

  document.getElementById('userProfileContent').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar" style="background:${isTeacher
        ? 'linear-gradient(135deg,#4f7cff,#00e5c3)'
        : 'linear-gradient(135deg,#a78bfa,#4f7cff)'}">${initials}</div>
      <div class="profile-meta">
        <div class="profile-name">${u.name}</div>
        <div style="margin-top:6px">
          <span class="role-badge ${u.role}">${isTeacher ? '👨‍🏫 Teacher' : '🎓 Student'}</span>
        </div>
      </div>
    </div>
    <div class="profile-info-list">
      <div class="profile-info-row">
        <span class="pir-label">Full Name</span>
        <span class="pir-value">${u.name}</span>
      </div>
      <div class="profile-info-row">
        <span class="pir-label">Email</span>
        <span class="pir-value">${u.email}</span>
      </div>
      <div class="profile-info-row">
        <span class="pir-label">Role</span>
        <span class="pir-value">${isTeacher ? 'Teacher / Instructor' : 'Student'}</span>
      </div>
      ${u.class ? `<div class="profile-info-row">
        <span class="pir-label">Class</span>
        <span class="pir-value">${u.class}</span>
      </div>` : ''}
      <div class="profile-info-row">
        <span class="pir-label">Permissions</span>
        <span class="pir-value" style="color:${isTeacher?'var(--accent)':'var(--green)'}">
          ${isTeacher ? '✏️ Full Edit Access' : '👁️ View Only'}
        </span>
      </div>
    </div>
    ${academicSection}
  `;
  openModal('userProfileModal');
}

/// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
async function initializeApp() {
  // 1. Check authentication
  try {
    const authRes = await fetch('/api/me');
    if (authRes.status === 401) {
      window.location.href = '/';
      return;
    }
    const authData = await authRes.json();
    currentUser = authData.user;
    updateSidebarUser(currentUser);
    applyRoleRestrictions(currentUser);
  } catch(err) {
    window.location.href = '/';
    return;
  }

  // 2. Load student data
  try {
    const res = await fetch('/api/students');
    if (res.status === 401) { window.location.href = '/'; return; }
    students = await res.json();
    filteredStudents = [...students];

    renderDashboard();
    renderStudentsTable(filteredStudents);
    initDashboardCharts();
    updateStudentBadge();
  } catch(err) {
    console.error('Could not fetch students:', err);
    showToast('Failed to connect to server', 'error');
  }
}

initializeApp();

// ───────────── TEST DATA (Fresh Start) ─────────────
async function addTestStudents() {
  for (let i = 1; i <= 50; i++) {
    const first = `Student${i}`;
    const last  = `Test`;
    const cls   = CLASSES[Math.floor(Math.random()*CLASSES.length)];
    const payload = {
      name: `${first} ${last}`,
      class: cls,
      math: Math.floor(Math.random()*71)+30,
      sci:  Math.floor(Math.random()*71)+30,
      eng:  Math.floor(Math.random()*71)+30,
      his:  Math.floor(Math.random()*71)+30,
      geo:  Math.floor(Math.random()*71)+30,
      art:  Math.floor(Math.random()*71)+30
    };
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log(`Added: ${data.name}`);
    } catch(e) {
      console.error('Error adding student', e);
    }
  }
  
  try {
    const res = await fetch('/api/students');
    students = await res.json();
    filteredStudents = [...students];
    renderDashboard();
    renderStudentsTable(filteredStudents);
    updateStudentBadge();
    showToast('50 Test Students Added & Dashboard Updated', 'success');
  } catch(err) {
    showToast('Test students added but failed to refresh dashboard', 'error');
  }
}