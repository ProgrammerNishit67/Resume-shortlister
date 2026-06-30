// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  loadHistory();
  setupEventListeners();
});

// Cache for historical scans
let scansHistory = [];

/**
 * Binds UI Event Listeners
 */
function setupEventListeners() {
  const form = document.getElementById('analyze-form');
  const jdModeText = document.getElementById('jd-mode-text');
  const jdModeFile = document.getElementById('jd-mode-file');
  const jdTextContainer = document.getElementById('jd-text-container');
  const jdFileContainer = document.getElementById('jd-file-container');
  const jdTextInput = document.getElementById('jd-text');
  const jdFileInput = document.getElementById('jd-file-input');

  const resumeInput = document.getElementById('resume-input');
  const removeResumeBtn = document.getElementById('remove-resume-btn');
  const resumeChip = document.getElementById('resume-file-chip');
  const resumeDropzone = document.getElementById('resume-dropzone');

  const jdChip = document.getElementById('jd-file-chip');
  const removeJdBtn = document.getElementById('remove-jd-btn');
  const jdDropzone = document.getElementById('jd-dropzone');

  const toggleHistoryBtn = document.getElementById('toggle-history-btn');
  const closeHistoryBtn = document.getElementById('close-history-btn');
  const historySidebar = document.getElementById('history-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const clearHistoryBtn = document.getElementById('clear-all-history-btn');

  const downloadReportBtn = document.getElementById('download-report-btn');
  const reanalyzeBtn = document.getElementById('reanalyze-btn');

  // Accordion Toggles
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');
      
      // Close all accordions first
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
      
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // JD Input Mode Toggle
  jdModeText.addEventListener('click', () => {
    jdModeText.classList.add('active');
    jdModeFile.classList.remove('active');
    jdTextContainer.classList.remove('hidden');
    jdFileContainer.classList.add('hidden');
    jdTextInput.required = true;
    jdFileInput.required = false;
    jdFileInput.value = '';
    jdChip.classList.add('hidden');
  });

  jdModeFile.addEventListener('click', () => {
    jdModeFile.classList.add('active');
    jdModeText.classList.remove('active');
    jdFileContainer.classList.remove('hidden');
    jdTextContainer.classList.add('hidden');
    jdFileInput.required = true;
    jdTextInput.required = false;
    jdTextInput.value = '';
  });

  // Drag and Drop styles
  ['dragenter', 'dragover'].forEach(eventName => {
    resumeDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      resumeDropzone.classList.add('dragover');
    }, false);
    
    jdDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      jdDropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    resumeDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      resumeDropzone.classList.remove('dragover');
    }, false);

    jdDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      jdDropzone.classList.remove('dragover');
    }, false);
  });

  // Input change displays (File Chips)
  resumeInput.addEventListener('change', () => {
    if (resumeInput.files.length > 0) {
      resumeChip.querySelector('.file-name').textContent = resumeInput.files[0].name;
      resumeChip.classList.remove('hidden');
    }
  });

  removeResumeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    resumeInput.value = '';
    resumeChip.classList.add('hidden');
  });

  jdFileInput.addEventListener('change', () => {
    if (jdFileInput.files.length > 0) {
      jdChip.querySelector('.file-name').textContent = jdFileInput.files[0].name;
      jdChip.classList.remove('hidden');
    }
  });

  removeJdBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    jdFileInput.value = '';
    jdChip.classList.add('hidden');
  });

  // Sidebar Toggles
  toggleHistoryBtn.addEventListener('click', () => {
    historySidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
  });

  const closeSidebar = () => {
    historySidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
  };

  closeHistoryBtn.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // Clear History
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all evaluation scans?')) {
      try {
        await fetch('/api/history/clear', { method: 'POST' });
        scansHistory = [];
        renderHistory();
      } catch (err) {
        console.error('Failed to clear history:', err);
      }
    }
  });

  // Action Button Listeners
  reanalyzeBtn.addEventListener('click', () => {
    document.getElementById('results-dashboard').classList.add('hidden');
    document.getElementById('empty-state-card').classList.remove('hidden');
    const errorBanner = document.getElementById('error-banner');
    if (errorBanner) errorBanner.classList.add('hidden');
    form.reset();
    resumeChip.classList.add('hidden');
    jdChip.classList.add('hidden');
  });

  downloadReportBtn.addEventListener('click', () => {
    if (scansHistory.length > 0) {
      // Print the currently viewed report
      triggerReportPrint(scansHistory[0]);
    }
  });

  // Form Analysis Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorBanner = document.getElementById('error-banner');
    if (errorBanner) errorBanner.classList.add('hidden');
    
    const formData = new FormData(form);
    
    // UI Visual Progression Loader
    showLoading(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || 'Server returned an invalid response.');
      }
      
      if (!response.ok) {
        throw new Error(data?.error || 'Server error during scanning.');
      }
      
      showLoading(false);
      renderDashboard(data);
      await loadHistory(); // Reload history items
    } catch (err) {
      showLoading(false);
      document.getElementById('empty-state-card').classList.remove('hidden');
      if (errorBanner) {
        document.getElementById('error-message').textContent = err.message;
        errorBanner.classList.remove('hidden');
      } else {
        alert(err.message);
      }
    }
  });
}

/**
 * Toggles dynamic progress indicators
 */
function showLoading(show) {
  const empty = document.getElementById('empty-state-card');
  const loading = document.getElementById('loading-state-card');
  const results = document.getElementById('results-dashboard');
  const progressFill = document.getElementById('loading-progress-fill');
  const stepText = document.getElementById('loading-step-text');
  
  if (show) {
    empty.classList.add('hidden');
    results.classList.add('hidden');
    loading.classList.remove('hidden');
    
    const steps = [
      'Extracting resume text contents...',
      'De-constructing experience dates...',
      'Analyzing required skills structure...',
      'Executing semantic NLP vector matching...',
      'Calculating keyword density...',
      'Rendering final visual report dashboard...'
    ];
    let idx = 0;
    let width = 10;
    progressFill.style.width = '10%';
    stepText.textContent = steps[0];
    
    window.loadTimer = setInterval(() => {
      width += 15;
      if (width > 95) width = 95;
      progressFill.style.width = `${width}%`;
      
      idx = (idx + 1) % steps.length;
      stepText.textContent = steps[idx];
    }, 700);
  } else {
    loading.classList.add('hidden');
    if (window.loadTimer) clearInterval(window.loadTimer);
  }
}

/**
 * Loads scans history from API
 */
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    scansHistory = await res.json();
    renderHistory();
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

/**
 * Paints the main dashboard using scan results
 */
function renderDashboard(data) {
  const dashboard = document.getElementById('results-dashboard');
  const empty = document.getElementById('empty-state-card');
  
  empty.classList.add('hidden');
  dashboard.classList.remove('hidden');

  // 1. Overall Score Circular progress
  const scoreVal = document.getElementById('dashboard-score-val');
  const gaugeCircle = document.getElementById('score-gauge-circle');
  
  scoreVal.textContent = data.overallScore;
  
  // SVG Circumference = 2 * PI * r = 2 * 3.14159 * 42 = 263.89
  const offset = 264 - (data.overallScore / 100) * 264;
  gaugeCircle.style.strokeDashoffset = offset;
  
  // Set gauge color based on score tier
  if (data.overallScore >= 80) {
    gaugeCircle.style.stroke = 'var(--color-green)';
  } else if (data.overallScore >= 60) {
    gaugeCircle.style.stroke = 'var(--color-amber)';
  } else {
    gaugeCircle.style.stroke = 'var(--color-red)';
  }

  // 2. Metadata details
  document.getElementById('dashboard-resume-name').textContent = data.resumeName;
  document.getElementById('dashboard-role-name').textContent = data.targetRole;
  
  const readiness = document.getElementById('readiness-badge');
  readiness.textContent = data.hiringReadiness;
  readiness.className = ''; // reset classes
  readiness.classList.add(`readiness-${data.hiringReadiness.toLowerCase()}`);

  document.getElementById('interview-probability-val').textContent = `${data.interviewProbability}%`;
  const expVal = (data.experienceYears !== undefined && data.experienceYears !== null) ? `${data.experienceYears} Yrs` : 'N/A';
  document.getElementById('experience-matched-val').textContent = expVal;
  document.getElementById('formatting-score-val').textContent = `${data.formattingAnalysis.compatibilityScore}%`;

  // 3. Score Breakdown Cards
  const breakdownGrid = document.getElementById('breakdown-grid');
  breakdownGrid.innerHTML = '';
  
  const metrics = [
    { title: 'Skills Match', key: 'skillScore', weight: '30%', class: 'skills' },
    { title: 'Experience Match', key: 'experienceScore', weight: '20%', class: 'experience' },
    { title: 'Keywords Match', key: 'keywordScore', weight: '15%', class: 'keywords' },
    { title: 'Projects Relevance', key: 'projectScore', weight: '10%', class: 'projects' },
    { title: 'Education Match', key: 'educationScore', weight: '10%', class: 'education' },
    { title: 'Structure Check', key: 'structureScore', weight: '10%', class: 'structure' },
    { title: 'Certifications', key: 'certScore', weight: '5%', class: 'certs' }
  ];

  metrics.forEach(m => {
    const score = data.scoreBreakdown[m.key];
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.innerHTML = `
      <div class="metric-header">
        <span class="metric-title">${m.title}</span>
        <span class="text-muted" style="font-size: 0.65rem;">Weight ${m.weight}</span>
      </div>
      <div class="metric-val text-${m.class}">${score}%</div>
      <div class="progress-track margin-top-large">
        <div class="progress-fill fill-${m.class}" style="width: ${score}%"></div>
      </div>
    `;
    breakdownGrid.appendChild(card);
  });

  // 4. Missing Skills & Keywords lists
  const missingSkillsContainer = document.getElementById('missing-skills-list');
  missingSkillsContainer.innerHTML = '';
  if (data.missingSkills.length === 0) {
    missingSkillsContainer.innerHTML = '<span class="text-muted" style="font-size: 0.85rem;">No missing required skills! Excellent profile match.</span>';
  } else {
    data.missingSkills.forEach(s => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag tag-missing';
      tag.innerHTML = `<i data-lucide="minus-circle"></i> ${s}`;
      missingSkillsContainer.appendChild(tag);
    });
  }

  const missingKeywordsContainer = document.getElementById('missing-keywords-list');
  missingKeywordsContainer.innerHTML = '';
  if (data.missingKeywords.length === 0) {
    missingKeywordsContainer.innerHTML = '<span class="text-muted" style="font-size: 0.85rem;">Optimal density coverage.</span>';
  } else {
    data.missingKeywords.forEach(kw => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag tag-missing';
      tag.innerHTML = `<i data-lucide="minus-circle"></i> ${kw}`;
      missingKeywordsContainer.appendChild(tag);
    });
  }

  // 5. Keyword Density Meter & Summary Recommendation
  document.getElementById('density-val').textContent = `${data.keywordOptimization.density}%`;
  
  // Set fill size (capped at 5% width representation, standard optimization density range is 1.5% - 2.5%)
  const densityPercent = Math.min(100, (data.keywordOptimization.density / 3.5) * 100);
  document.getElementById('density-gauge-fill').style.width = `${densityPercent}%`;

  document.getElementById('suggested-summary-text').innerHTML = `&ldquo;${data.keywordOptimization.suggestedSummary}&rdquo;`;

  // 6. Skill Coverage Heatmap (Mixed elements showing matched vs missing cells)
  const heatmap = document.getElementById('skills-heatmap-grid');
  heatmap.innerHTML = '';
  
  // Merge skills together to demonstrate absolute profile metrics
  const displayLimit = 16;
  let cellsCount = 0;
  
  // Draw matched cells
  const displaySkillsMatched = data.keywordOptimization.densityList.filter(d => d.count > 0).slice(0, 10);
  displaySkillsMatched.forEach(item => {
    if (cellsCount >= displayLimit) return;
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell map-matched';
    cell.innerHTML = `<strong>${item.keyword}</strong><br><span style="font-size:0.65rem;">Count: ${item.count}</span>`;
    heatmap.appendChild(cell);
    cellsCount++;
  });

  // Draw missing cells
  const displaySkillsMissing = data.missingSkills.slice(0, 6);
  displaySkillsMissing.forEach(skill => {
    if (cellsCount >= displayLimit) return;
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell map-missing';
    cell.innerHTML = `<strong>${skill}</strong><br><span style="font-size:0.65rem;">Missing</span>`;
    heatmap.appendChild(cell);
    cellsCount++;
  });

  // 7. Suggested Action Items & Accordions
  const bulletContainer = document.getElementById('bullet-points-suggestions');
  bulletContainer.innerHTML = '';
  data.keywordOptimization.sampleBullets.forEach(bullet => {
    const li = document.createElement('li');
    li.innerHTML = bullet;
    bulletContainer.appendChild(li);
  });

  // Build high/medium/low prioritized recommendations lists
  const renderRecList = (targetId, suggestions) => {
    const box = document.getElementById(targetId);
    box.innerHTML = '';
    suggestions.forEach(s => {
      const item = document.createElement('div');
      item.className = 'rec-item';
      item.innerHTML = `<i data-lucide="check" style="width:12px;color:var(--text-muted);"></i> ${s}`;
      box.appendChild(item);
    });
  };

  renderRecList('suggestions-high-body', data.suggestions.high);
  renderRecList('suggestions-med-body', data.suggestions.medium);
  renderRecList('suggestions-low-body', data.suggestions.low);

  // Auto-open High Priority accordion on render
  document.querySelector('.high-priority').classList.add('open');

  // 8. Formatting warnings
  document.getElementById('formatting-gauge-val').textContent = `${data.formattingAnalysis.compatibilityScore}%`;
  
  // Circumference = 2 * PI * r = 2 * 3.14159 * 15.9155 = 100.0
  const formattingOffset = 100 - data.formattingAnalysis.compatibilityScore;
  document.getElementById('formatting-gauge-fill').setAttribute('stroke-dasharray', `${data.formattingAnalysis.compatibilityScore}, 100`);

  const issuesContainer = document.getElementById('formatting-issues-list');
  issuesContainer.innerHTML = '';
  if (data.formattingAnalysis.issues.length === 0) {
    issuesContainer.innerHTML = '<div class="issue-card" style="background:rgba(16,185,129,0.03);border-color:rgba(16,185,129,0.1);color:#34d399;"><i data-lucide="check-circle" style="color:var(--color-green);"></i> No layout issues detected! This resume is highly ATS-compliant.</div>';
  } else {
    data.formattingAnalysis.issues.forEach(issue => {
      const card = document.createElement('div');
      card.className = 'issue-card';
      card.innerHTML = `<i data-lucide="alert-triangle"></i> <span>${issue}</span>`;
      issuesContainer.appendChild(card);
    });
  }

  // 9. Role recommendations path
  document.getElementById('role-title-heading').textContent = `${data.roleRecommendations.role} Learning Path`;
  
  const fillList = (listId, array) => {
    const listEl = document.getElementById(listId);
    listEl.innerHTML = '';
    array.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      listEl.appendChild(li);
    });
  };

  fillList('role-tech-list', data.roleRecommendations.tech);
  fillList('role-projects-list', data.roleRecommendations.projects);
  fillList('role-certs-list', data.roleRecommendations.certs);

  // Trigger Lucide updates on newly drawn items
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Paints historical runs list and trend graphs
 */
function renderHistory() {
  const listContainer = document.getElementById('history-items-container');
  const countVal = document.getElementById('history-count-val');
  
  countVal.textContent = scansHistory.length;
  listContainer.innerHTML = '';

  if (scansHistory.length === 0) {
    listContainer.innerHTML = '<p class="text-muted text-center" style="font-size: 0.85rem; padding: 2rem 0;">No previous scans found.</p>';
    drawTrendChart([]);
    return;
  }

  scansHistory.forEach(scan => {
    const item = document.createElement('div');
    item.className = 'history-item-card';
    
    // Formatting date
    const dateStr = new Date(scan.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    item.innerHTML = `
      <div class="history-item-left">
        <div class="history-item-name">${scan.resumeName}</div>
        <div class="history-item-meta">
          <span>${scan.targetRole}</span> &bull; <span>${dateStr}</span>
        </div>
      </div>
      <div class="history-item-right">
        <span class="history-item-score">${scan.overallScore}%</span>
        <button class="delete-item-btn" data-id="${scan.id}">&times;</button>
      </div>
    `;

    // Click to load scan into dashboard
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-item-btn') || e.target.parentElement.classList.contains('delete-item-btn')) {
        return; // handle delete clicks separately
      }
      renderDashboard(scan);
      // Close sidebar drawer
      document.getElementById('history-sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('visible');
    });

    // Delete single scan trigger
    item.querySelector('.delete-item-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this scan?')) {
        try {
          await fetch(`/api/history/${scan.id}`, { method: 'DELETE' });
          await loadHistory();
        } catch (err) {
          console.error(err);
        }
      }
    });

    listContainer.appendChild(item);
  });

  drawTrendChart(scansHistory);
}

/**
 * Draws a lightweight trend path line using pure inline SVG elements
 */
function drawTrendChart(history) {
  const svg = document.getElementById('trend-svg');
  svg.innerHTML = '';

  if (history.length < 2) {
    svg.innerHTML = `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="var(--text-muted)" font-size="11">Need 2+ scans to construct trend line</text>`;
    return;
  }

  // Reverse history chronologically (oldest to newest)
  const sorted = [...history].reverse();
  const maxIdx = sorted.length - 1;

  // Calculate coordinates mapping: Width 300, Height 120 (Chart padding: left 20, right 20, top 20, bottom 20)
  const coords = sorted.map((scan, index) => {
    const x = 30 + (index * (240 / maxIdx));
    // Score range 0-100 mapped to Y coordinates range 100 to 20
    const y = 100 - (scan.overallScore * 0.8);
    return { x, y, score: scan.overallScore };
  });

  // Construct path string
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  let areaD = `M ${coords[0].x} 100 L ${coords[0].x} ${coords[0].y}`;
  
  for (let i = 1; i < coords.length; i++) {
    pathD += ` L ${coords[i].x} ${coords[i].y}`;
    areaD += ` L ${coords[i].x} ${coords[i].y}`;
  }
  
  areaD += ` L ${coords[coords.length - 1].x} 100 Z`;

  // Draw Area under curve (linear gradient representation)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--color-indigo)" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="var(--color-indigo)" stop-opacity="0"/>
    </linearGradient>
  `;
  svg.appendChild(defs);

  const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  areaPath.setAttribute('d', areaD);
  areaPath.setAttribute('fill', 'url(#trend-grad)');
  svg.appendChild(areaPath);

  // Draw Line
  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  linePath.setAttribute('d', pathD);
  linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', 'var(--color-indigo)');
  linePath.setAttribute('stroke-width', '2');
  svg.appendChild(linePath);

  // Draw dots and tooltips
  coords.forEach((coord, i) => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', coord.x);
    dot.setAttribute('cy', coord.y);
    dot.setAttribute('r', '3.5');
    dot.setAttribute('fill', 'var(--bg-secondary)');
    dot.setAttribute('stroke', 'var(--color-indigo)');
    dot.setAttribute('stroke-width', '2');
    
    // Lightweight browser tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `Scan #${i+1}: ${coord.score}%`;
    dot.appendChild(title);
    
    svg.appendChild(dot);
  });
}

/**
 * Assembles the print-friendly output and triggers standard window print dialog.
 */
function triggerReportPrint(scan) {
  const container = document.getElementById('print-container');
  
  const dateStr = new Date(scan.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const missingSkillsLi = scan.missingSkills.length > 0
    ? scan.missingSkills.map(s => `<li>${s}</li>`).join('')
    : '<li>None! Candidate matching skills criteria.</li>';

  const missingKeywordsLi = scan.missingKeywords.length > 0
    ? scan.missingKeywords.map(kw => `<li>${kw}</li>`).join('')
    : '<li>None! Excellent keywords coverage.</li>';

  const actionsLi = [
    ...scan.suggestions.high.map(s => `<li><strong>[High]</strong> ${s}</li>`),
    ...scan.suggestions.medium.map(s => `<li><strong>[Medium]</strong> ${s}</li>`),
    ...scan.suggestions.low.map(s => `<li><strong>[Low]</strong> ${s}</li>`)
  ].join('');

  container.innerHTML = `
    <div class="print-header">
      <div>
        <h1>ATSOptima Match Report</h1>
        <p style="color:#64748b; font-size: 0.85rem; margin-top: 0.25rem;">Candidate Score & Hiring Readiness Assessment</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 0.85rem; font-weight: 500; color: #64748b;">Report Date: ${dateStr}</span>
      </div>
    </div>

    <div class="print-score-box">
      <div class="print-score-circle">${scan.overallScore}</div>
      <div>
        <h2 style="margin-bottom: 0.25rem;">${scan.resumeName}</h2>
        <p style="color: #64748b; font-size: 0.9rem;">Target Role: <strong>${scan.targetRole}</strong> &bull; Hiring Readiness: <strong>${scan.hiringReadiness}</strong></p>
        <p style="color: #64748b; font-size: 0.85rem; margin-top: 0.25rem;">Interview Probability: <strong>${scan.interviewProbability}%</strong> &bull; Extracted Experience: <strong>${(scan.experienceYears !== undefined && scan.experienceYears !== null) ? `${scan.experienceYears} Years` : 'N/A'}</strong></p>
      </div>
    </div>

    <div class="print-grid">
      <div class="print-section">
        <h3>Evaluation Scoring Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
            <th style="padding: 0.5rem 0; color: #64748b;">Component</th>
            <th style="padding: 0.5rem 0; text-align: right; color: #64748b;">Match %</th>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 0.5rem 0;">Skills Match (30%)</td>
            <td style="padding: 0.5rem 0; text-align: right; font-weight: 600;">${scan.scoreBreakdown.skillScore}%</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 0.5rem 0;">Experience Match (20%)</td>
            <td style="padding: 0.5rem 0; text-align: right; font-weight: 600;">${scan.scoreBreakdown.experienceScore}%</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 0.5rem 0;">Keywords Optimization (15%)</td>
            <td style="padding: 0.5rem 0; text-align: right; font-weight: 600;">${scan.scoreBreakdown.keywordScore}%</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 0.5rem 0;">Projects Relevance (10%)</td>
            <td style="padding: 0.5rem 0; text-align: right; font-weight: 600;">${scan.scoreBreakdown.projectScore}%</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 0.5rem 0;">Education Compatibility (10%)</td>
            <td style="padding: 0.5rem 0; text-align: right; font-weight: 600;">${scan.scoreBreakdown.educationScore}%</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 0.5rem 0;">Resume Structure & Layout (10%)</td>
            <td style="padding: 0.5rem 0; text-align: right; font-weight: 600;">${scan.scoreBreakdown.structureScore}%</td>
          </tr>
          <tr>
            <td style="padding: 0.5rem 0;">Certifications Verification (5%)</td>
            <td style="padding: 0.5rem 0; text-align: right; font-weight: 600;">${scan.scoreBreakdown.certScore}%</td>
          </tr>
        </table>
      </div>

      <div class="print-section">
        <h3>Formatting & Compatibility Audit</h3>
        <p style="font-size:0.85rem; margin-bottom: 0.75rem;">Layout Compliance: <strong>${scan.formattingAnalysis.compatibilityScore}%</strong></p>
        <ul class="print-list" style="font-size: 0.85rem;">
          ${scan.formattingAnalysis.issues.map(issue => `<li>${issue}</li>`).join('') || '<li>No parsing warnings detected. Format is highly optimized.</li>'}
        </ul>
      </div>
    </div>

    <div class="print-grid">
      <div class="print-section">
        <h3>Missing Skill Gaps</h3>
        <ul class="print-list" style="font-size: 0.85rem;">
          ${missingSkillsLi}
        </ul>

        <h3 style="margin-top: 1.5rem;">Missing Focus Keywords</h3>
        <ul class="print-list" style="font-size: 0.85rem;">
          ${missingKeywordsLi}
        </ul>
      </div>

      <div class="print-section">
        <h3>Prioritized Improvement Recommendations</h3>
        <ul class="print-list" style="font-size: 0.85rem;">
          ${actionsLi}
        </ul>
      </div>
    </div>

    <div class="print-section" style="page-break-before: always;">
      <h3>Role Path Mappings: ${scan.roleRecommendations.role}</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
        <div>
          <h4 style="font-size: 0.9rem; color:#475569; border-bottom: 1px solid #e2e8f0; padding-bottom:0.25rem;">Tech to Learn</h4>
          <ul style="padding-left:1.2rem; font-size:0.8rem; margin-top: 0.5rem; line-height: 1.5;">
            ${scan.roleRecommendations.tech.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h4 style="font-size: 0.9rem; color:#475569; border-bottom: 1px solid #e2e8f0; padding-bottom:0.25rem;">Suggested Projects</h4>
          <ul style="padding-left:1.2rem; font-size:0.8rem; margin-top: 0.5rem; line-height: 1.5;">
            ${scan.roleRecommendations.projects.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h4 style="font-size: 0.9rem; color:#475569; border-bottom: 1px solid #e2e8f0; padding-bottom:0.25rem;">Recommended Certs</h4>
          <ul style="padding-left:1.2rem; font-size:0.8rem; margin-top: 0.5rem; line-height: 1.5;">
            ${scan.roleRecommendations.certs.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
    
    <div style="margin-top: 3rem; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 1rem; font-size: 0.75rem; color: #94a3b8;">
      Report compiled by ATSOptima NLP Semantic Engine. Offline local vector spaces.
    </div>
  `;

  // Trigger standard browser print window
  window.print();
}
