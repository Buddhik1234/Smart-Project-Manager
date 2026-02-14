// ============================================================
// SMART PROJECT MANAGER - Multi-Project System
// ============================================================

// === Data Structure & State ===
let appData = {
    projects: [],
    settings: {
        theme: 'dark',
        lastActivity: null
    }
};

let currentView = {
    type: 'home', // home, project, phase, week, day, materials, structure, project-analysis, project-calendar
    projectId: null,
    phaseId: null,
    weekId: null,
    dayId: null
};

let calendarDate = new Date();
let searchQuery = '';
let currentMaterialsTab = 'notes';
let currentMaterialsContext = 'project'; // 'project', 'phase:id', 'week:id', 'day:id'

// Charts
let taskBreakdownChart = null;

// === Initial Load ===
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    applyTheme();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupCalendarControls();
    renderView();

    // Dismiss loading screen after a short delay
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.remove(), 700);
        }
    }, 2000);
});

// === Data Persistence ===
function loadData() {
    const saved = localStorage.getItem('smartProjectManager');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };

            // Data migration: ensure all projects have proper structure
            appData.projects.forEach(project => {
                if (!project.structure) {
                    project.structure = {
                        hasPhases: false,
                        hasWeeks: false,
                        hasDays: false,
                        hasMaterials: false
                    };
                }
                if (!project.description) project.description = '';
                if (!project.tasks) project.tasks = [];
                if (!project.materials) {
                    project.materials = { notes: [], videos: [], files: [], links: [] };
                }

                // Ensure phases have proper structure
                if (project.phases) {
                    project.phases.forEach(phase => {
                        if (!phase.goals) phase.goals = [];
                        if (!phase.materials) {
                            phase.materials = { notes: [], videos: [], files: [], links: [] };
                        }

                        // Ensure weeks have proper structure
                        if (phase.weeks) {
                            phase.weeks.forEach(week => {
                                if (!week.goals) week.goals = [];
                                if (!week.materials) {
                                    week.materials = { notes: [], videos: [], files: [], links: [] };
                                }

                                // Ensure days have proper structure
                                if (week.days) {
                                    week.days.forEach(day => {
                                        if (!day.tasks) day.tasks = [];
                                        if (!day.materials) {
                                            day.materials = { notes: [], videos: [], files: [], links: [] };
                                        }
                                    });
                                }
                            });
                        }
                    });
                }

                // Ensure standalone weeks have materials
                if (project.weeks && !project.phases) {
                    project.weeks.forEach(week => {
                        if (!week.materials) {
                            week.materials = { notes: [], videos: [], files: [], links: [] };
                        }
                        if (week.days) {
                            week.days.forEach(day => {
                                if (!day.materials) {
                                    day.materials = { notes: [], videos: [], files: [], links: [] };
                                }
                            });
                        }
                    });
                }

                // Ensure standalone days have materials
                if (project.days && !project.weeks && !project.phases) {
                    project.days.forEach(day => {
                        if (!day.materials) {
                            day.materials = { notes: [], videos: [], files: [], links: [] };
                        }
                    });
                }
            });
        } catch (err) {
            console.error('Error loading data:', err);
        }
    }
}

function saveData() {
    appData.settings.lastActivity = new Date().toISOString();
    localStorage.setItem('smartProjectManager', JSON.stringify(appData));
    renderView();
}

function saveDataQuietly() {
    appData.settings.lastActivity = new Date().toISOString();
    localStorage.setItem('smartProjectManager', JSON.stringify(appData));
}

// === Theme Management ===
function setTheme(themeName) {
    appData.settings.theme = themeName;
    document.body.setAttribute('data-theme', themeName);
    saveDataQuietly();

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === themeName);
    });
}

function applyTheme() {
    const theme = appData.settings.theme || 'dark';
    document.body.setAttribute('data-theme', theme);

    setTimeout(() => {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
        });
    }, 100);
}

// === Navigation & Rendering ===
function navigateTo(type, id = null) {
    // Hide all special sections
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('project-analysis-dashboard').style.display = 'none';
    document.getElementById('project-calendar-view').style.display = 'none';
    document.getElementById('main-list-container').style.display = 'none';
    document.getElementById('structure-view').style.display = 'none';
    document.getElementById('materials-view').style.display = 'none';

    currentView = { type, projectId: null, phaseId: null, weekId: null, dayId: null };

    if (type === 'home') {
        currentView.type = 'home';
        renderHome();
    } else if (type === 'project') {
        currentView.projectId = id;
        currentView.type = 'project';
        renderProject(id);
    } else if (type === 'phase') {
        currentView.projectId = id.projectId;
        currentView.phaseId = id.phaseId;
        currentView.type = 'phase';
        renderPhase(id.projectId, id.phaseId);
    } else if (type === 'week') {
        currentView.projectId = id.projectId;
        currentView.phaseId = id.phaseId;
        currentView.weekId = id.weekId;
        currentView.type = 'week';
        renderWeek(id.projectId, id.phaseId, id.weekId);
    } else if (type === 'day') {
        currentView.projectId = id.projectId;
        currentView.phaseId = id.phaseId;
        currentView.weekId = id.weekId;
        currentView.dayId = id.dayId;
        currentView.type = 'day';
        renderDay(id.projectId, id.phaseId, id.weekId, id.dayId);
    } else if (type === 'materials') {
        currentView.projectId = id;
        currentView.type = 'materials';
        renderMaterials(id);
    } else if (type === 'structure') {
        currentView.projectId = id;
        currentView.type = 'structure';
        renderStructure(id);
    } else if (type === 'project-analysis') {
        currentView.projectId = id;
        currentView.type = 'project-analysis';
        renderProjectAnalysis(id);
    } else if (type === 'project-calendar') {
        currentView.projectId = id;
        currentView.type = 'project-calendar';
        renderProjectCalendar(id);
    }
}

function renderView() {
    if (currentView.type === 'home') {
        renderHome();
    } else if (currentView.type === 'project') {
        renderProject(currentView.projectId);
    } else if (currentView.type === 'phase') {
        renderPhase(currentView.projectId, currentView.phaseId);
    } else if (currentView.type === 'week') {
        renderWeek(currentView.projectId, currentView.phaseId, currentView.weekId);
    } else if (currentView.type === 'day') {
        renderDay(currentView.projectId, currentView.phaseId, currentView.weekId, currentView.dayId);
    } else if (currentView.type === 'materials') {
        renderMaterials(currentView.projectId);
    } else if (currentView.type === 'structure') {
        renderStructure(currentView.projectId);
    } else if (currentView.type === 'project-analysis') {
        renderProjectAnalysis(currentView.projectId);
    } else if (currentView.type === 'project-calendar') {
        renderProjectCalendar(currentView.projectId);
    }
}

// === Home Page Rendering ===
function renderHome() {
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('page-title').innerText = 'Dashboard';
    document.getElementById('page-subtitle').innerText = 'Overview';
    document.getElementById('edit-subtitle-btn').style.display = 'none';
    
    // Hide progress bar on home/dashboard
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'none';

    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '';

    // Render nav header
    document.getElementById('nav-header').innerHTML = '';

    // Render sidebar
    const sidebarList = document.getElementById('sidebar-list');
    sidebarList.innerHTML = '';
    document.getElementById('sidebar-title').innerText = 'Projects';
    
    // Filter projects based on search
    const filtered = searchQuery ? appData.projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) : appData.projects;

    filtered.forEach(project => {
        const progress = calculateProjectProgress(project);
        const card = document.createElement('div');
        card.className = 'project-card glass-effect';
        
        const completed = progress === 100 ? '<i class="fas fa-check-circle"></i>' : '';

        card.innerHTML = `
            <div class="project-header">
                <h3>${completed} ${escapeHtml(project.name)}</h3>
                <div class="action-icons">
                    <i class="fas fa-pencil-alt"></i>
                    <i class="fas fa-trash"></i>
                </div>
            </div>
            <p>${escapeHtml(project.description || 'No description')}</p>
            <div class="project-progress">
                <div class="progress-labels">
                    <span>Progress</span>
                    <span>${progress}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                </div>
            </div>
        `;
        
        // Add click handler for the card
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.action-icons')) {
                navigateTo('project', project.id);
            }
        });
        
        // Add click handlers for action buttons
        const editBtn = card.querySelector('.fa-pencil-alt');
        const deleteBtn = card.querySelector('.fa-trash');
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renameProject(project.id);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProject(project.id);
        });
        
        grid.appendChild(card);

        // Also add to sidebar
        const sidebarItem = createSidebarItem(project.name, project.id, 
            () => navigateTo('project', project.id), 'project', progress);
        sidebarList.appendChild(sidebarItem);
    });

    if (filtered.length === 0 && appData.projects.length > 0) {
        grid.innerHTML = '<p class="empty-message">No projects match your search</p>';
    } else if (appData.projects.length === 0) {
        grid.innerHTML = '<p class="empty-message"></p>';
    }

    updateProgressBar(0);
}

// === Project Rendering ===
function renderProject(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) {
        renderHome();
        return;
    }

    document.getElementById('main-list-container').style.display = 'block';
    document.getElementById('page-title').innerText = project.name;
    document.getElementById('page-subtitle').innerText = project.description || 'No description';
    document.getElementById('edit-subtitle-btn').style.display = 'inline-block';

    // Show progress bar for projects
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'block';

    const progress = calculateProjectProgress(project);
    updateProgressBar(progress);

    // Render nav header with action buttons
    const navHeader = document.getElementById('nav-header');
    navHeader.innerHTML = `
        <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-left"></i> Home</button>
        <div class="nav-actions">
            <button class="btn-outline" onclick="navigateTo('project-analysis', '${projectId}')">
                <i class="fas fa-chart-pie"></i> Analysis
            </button>
            ${project.structure.hasDays ? `
                <button class="btn-outline" onclick="navigateTo('project-calendar', '${projectId}')">
                    <i class="fas fa-calendar"></i> Calendar
                </button>
            ` : ''}
            <button class="btn-outline" onclick="navigateTo('structure', '${projectId}')">
                <i class="fas fa-cog"></i> Structure
            </button>
            ${project.structure.hasMaterials ? `
                <button class="btn-outline" onclick="navigateTo('materials', '${projectId}')">
                    <i class="fas fa-folder"></i> Materials
                </button>
            ` : ''}
        </div>
    `;

    // Render sidebar
    const sidebarList = document.getElementById('sidebar-list');
    sidebarList.innerHTML = '';
    document.getElementById('sidebar-title').innerText = project.name;

    if (project.structure.hasPhases && project.phases) {
        project.phases.forEach(phase => {
            const phaseProgress = calculatePhaseProgress(phase);
            const item = createSidebarItem(phase.title, phase.id, 
                () => navigateTo('phase', { projectId, phaseId: phase.id }), 'phase', phaseProgress);
            sidebarList.appendChild(item);
        });
    } else if (project.structure.hasWeeks && project.weeks) {
        project.weeks.forEach(week => {
            const weekProgress = calculateWeekProgress(week);
            const item = createSidebarItem(week.title, week.id, 
                () => navigateTo('week', { projectId, phaseId: null, weekId: week.id }), 'week', weekProgress);
            sidebarList.appendChild(item);
        });
    } else if (project.structure.hasDays && project.days) {
        project.days.forEach(day => {
            const dayProgress = calculateDayProgress(day);
            const item = createSidebarItem(day.title, day.id, 
                () => navigateTo('day', { projectId, phaseId: null, weekId: null, dayId: day.id }), 'day', dayProgress);
            sidebarList.appendChild(item);
        });
    }

    // Render main content
    renderChecklist(project.tasks, 'task');
}

// === Phase Rendering ===
function renderPhase(projectId, phaseId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    const phase = project.phases.find(p => p.id === phaseId);
    if (!phase) return;

    document.getElementById('main-list-container').style.display = 'block';
    document.getElementById('page-title').innerText = phase.title;
    document.getElementById('page-subtitle').innerText = `Phase in ${project.name}`;
    document.getElementById('edit-subtitle-btn').style.display = 'inline-block';

    // Show progress bar for phase
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'block';

    const progress = calculatePhaseProgress(phase);
    updateProgressBar(progress);

    // Render nav header
    document.getElementById('nav-header').innerHTML = `
        <button class="back-btn" onclick="navigateTo('project', '${projectId}')">
            <i class="fas fa-arrow-left"></i> ${escapeHtml(project.name)}
        </button>
    `;

    // Render sidebar with weeks
    const sidebarList = document.getElementById('sidebar-list');
    sidebarList.innerHTML = '';
    document.getElementById('sidebar-title').innerText = phase.title;

    if (project.structure.hasWeeks && phase.weeks) {
        phase.weeks.forEach(week => {
            const weekProgress = calculateWeekProgress(week);
            const item = createSidebarItem(week.title, week.id, 
                () => navigateTo('week', { projectId, phaseId, weekId: week.id }), 'week', weekProgress);
            sidebarList.appendChild(item);
        });
    }

    renderChecklist(phase.goals, 'goal');
}

// === Week Rendering ===
function renderWeek(projectId, phaseId, weekId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    const week = findWeek(project, weekId);
    if (!week) return;

    document.getElementById('main-list-container').style.display = 'block';
    document.getElementById('page-title').innerText = week.title;
    
    let subtitle = `Week in ${project.name}`;
    if (phaseId) {
        const phase = project.phases.find(p => p.id === phaseId);
        if (phase) subtitle = `Week in ${phase.title}`;
    }
    document.getElementById('page-subtitle').innerText = subtitle;
    document.getElementById('edit-subtitle-btn').style.display = 'inline-block';

    // Show progress bar for week
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'block';

    const progress = calculateWeekProgress(week);
    updateProgressBar(progress);

    // Render nav header
    const backTarget = phaseId ? 
        `navigateTo('phase', { projectId: '${projectId}', phaseId: '${phaseId}' })` :
        `navigateTo('project', '${projectId}')`;
    
    document.getElementById('nav-header').innerHTML = `
        <button class="back-btn" onclick="${backTarget}">
            <i class="fas fa-arrow-left"></i> Back
        </button>
    `;

    // Render sidebar with days
    const sidebarList = document.getElementById('sidebar-list');
    sidebarList.innerHTML = '';
    document.getElementById('sidebar-title').innerText = week.title;

    if (project.structure.hasDays && week.days) {
        week.days.forEach(day => {
            const dayProgress = calculateDayProgress(day);
            const item = createSidebarItem(day.title, day.id, 
                () => navigateTo('day', { projectId, phaseId, weekId, dayId: day.id }), 'day', dayProgress);
            sidebarList.appendChild(item);
        });
    }

    renderChecklist(week.goals, 'goal');
}

// === Day Rendering ===
function renderDay(projectId, phaseId, weekId, dayId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    const day = findDay(project, dayId);
    if (!day) return;

    document.getElementById('main-list-container').style.display = 'block';
    document.getElementById('page-title').innerText = day.title;
    document.getElementById('page-subtitle').innerText = day.date || 'No date set';
    document.getElementById('edit-subtitle-btn').style.display = 'inline-block';

    // Show progress bar for day
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'block';

    const progress = calculateDayProgress(day);
    updateProgressBar(progress);

    // Render nav header
    let backTarget = `navigateTo('project', '${projectId}')`;
    if (weekId) {
        backTarget = `navigateTo('week', { projectId: '${projectId}', phaseId: ${phaseId ? `'${phaseId}'` : 'null'}, weekId: '${weekId}' })`;
    }

    document.getElementById('nav-header').innerHTML = `
        <button class="back-btn" onclick="${backTarget}">
            <i class="fas fa-arrow-left"></i> Back
        </button>
    `;

    // Render sidebar (empty for day view)
    document.getElementById('sidebar-list').innerHTML = '';
    document.getElementById('sidebar-title').innerText = day.title;

    renderChecklist(day.tasks, 'task');
}

// === Project Analysis Rendering ===
function renderProjectAnalysis(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    document.getElementById('project-analysis-dashboard').style.display = 'block';
    document.getElementById('page-title').innerText = 'Project Analysis';
    document.getElementById('page-subtitle').innerText = project.name;
    document.getElementById('edit-subtitle-btn').style.display = 'none';

    // Hide progress bar in analysis view
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'none';

    // Render nav header
    document.getElementById('nav-header').innerHTML = `
        <button class="back-btn" onclick="navigateTo('project', '${projectId}')">
            <i class="fas fa-arrow-left"></i> ${escapeHtml(project.name)}
        </button>
    `;

    // Calculate statistics
    const stats = calculateProjectStats(project);

    // Update overview cards
    document.getElementById('analysis-total-tasks').innerText = stats.totalTasks;
    document.getElementById('analysis-completed-tasks').innerText = stats.completedTasks;
    document.getElementById('analysis-total-phases').innerText = stats.totalPhases;
    document.getElementById('analysis-total-weeks').innerText = stats.totalWeeks;
    document.getElementById('analysis-total-days').innerText = stats.totalDays;
    document.getElementById('analysis-completion-rate').innerText = stats.completionRate + '%';

    // Render task breakdown chart
    renderTaskBreakdownChart(stats);

    // Render phase progress list
    renderPhaseProgressList(project);

    // Clear sidebar
    document.getElementById('sidebar-list').innerHTML = '';
    document.getElementById('sidebar-title').innerText = 'Analysis';

    updateProgressBar(stats.completionRate);
}

function calculateProjectStats(project) {
    let totalTasks = 0;
    let completedTasks = 0;
    let totalPhases = 0;
    let totalWeeks = 0;
    let totalDays = 0;

    // Count project tasks
    totalTasks += project.tasks ? project.tasks.length : 0;
    completedTasks += project.tasks ? project.tasks.filter(t => t.completed).length : 0;

    // Count phases
    if (project.phases) {
        totalPhases = project.phases.length;
        project.phases.forEach(phase => {
            totalTasks += phase.goals ? phase.goals.length : 0;
            completedTasks += phase.goals ? phase.goals.filter(g => g.completed).length : 0;

            if (phase.weeks) {
                totalWeeks += phase.weeks.length;
                phase.weeks.forEach(week => {
                    totalTasks += week.goals ? week.goals.length : 0;
                    completedTasks += week.goals ? week.goals.filter(g => g.completed).length : 0;

                    if (week.days) {
                        totalDays += week.days.length;
                        week.days.forEach(day => {
                            totalTasks += day.tasks ? day.tasks.length : 0;
                            completedTasks += day.tasks ? day.tasks.filter(t => t.completed).length : 0;
                        });
                    }
                });
            }
        });
    }

    // Count standalone weeks
    if (project.weeks && !project.phases) {
        totalWeeks = project.weeks.length;
        project.weeks.forEach(week => {
            totalTasks += week.goals ? week.goals.length : 0;
            completedTasks += week.goals ? week.goals.filter(g => g.completed).length : 0;

            if (week.days) {
                totalDays += week.days.length;
                week.days.forEach(day => {
                    totalTasks += day.tasks ? day.tasks.length : 0;
                    completedTasks += day.tasks ? day.tasks.filter(t => t.completed).length : 0;
                });
            }
        });
    }

    // Count standalone days
    if (project.days && !project.weeks && !project.phases) {
        totalDays = project.days.length;
        project.days.forEach(day => {
            totalTasks += day.tasks ? day.tasks.length : 0;
            completedTasks += day.tasks ? day.tasks.filter(t => t.completed).length : 0;
        });
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
        totalTasks,
        completedTasks,
        totalPhases,
        totalWeeks,
        totalDays,
        completionRate
    };
}

function renderTaskBreakdownChart(stats) {
    const ctx = document.getElementById('task-breakdown-chart');
    
    // Destroy previous chart
    if (taskBreakdownChart) {
        taskBreakdownChart.destroy();
        taskBreakdownChart = null;
    }

    const completedTasks = stats.completedTasks;
    const pendingTasks = stats.totalTasks - stats.completedTasks;

    try {
        taskBreakdownChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending'],
                datasets: [{
                    data: [completedTasks, pendingTasks],
                    backgroundColor: [
                        'rgba(92, 227, 141, 0.8)',
                        'rgba(255, 152, 0, 0.6)'
                    ],
                    borderColor: 'rgba(0, 0, 0, 0.5)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            padding: 10
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering task breakdown chart:', error);
    }
}

function renderPhaseProgressList(project) {
    const container = document.getElementById('phase-progress-list');
    container.innerHTML = '';

    if (project.phases && project.phases.length > 0) {
        project.phases.forEach(phase => {
            const progress = calculatePhaseProgress(phase);
            const item = document.createElement('div');
            item.className = 'phase-progress-item';
            item.innerHTML = `
                <div class="phase-info">
                    <span class="phase-name">${escapeHtml(phase.title)}</span>
                    <span class="phase-percentage">${progress}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                </div>
            `;
            container.appendChild(item);
        });
    } else {
        container.innerHTML = '<p class="empty-message">No phases in this project</p>';
    }
}

// === Project Calendar Rendering ===
function renderProjectCalendar(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    document.getElementById('project-calendar-view').style.display = 'block';
    document.getElementById('page-title').innerText = 'Project Calendar';
    document.getElementById('page-subtitle').innerText = project.name;
    document.getElementById('edit-subtitle-btn').style.display = 'none';

    // Hide progress bar in calendar view
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'none';

    // Render nav header
    document.getElementById('nav-header').innerHTML = `
        <button class="back-btn" onclick="navigateTo('project', '${projectId}')">
            <i class="fas fa-arrow-left"></i> ${escapeHtml(project.name)}
        </button>
    `;

    // Clear sidebar
    document.getElementById('sidebar-list').innerHTML = '';
    document.getElementById('sidebar-title').innerText = 'Calendar';

    // Render calendar
    renderCalendarGrid(project);

    updateProgressBar(0);
}

function renderCalendarGrid(project) {
    const grid = document.getElementById('project-calendar-grid');
    const monthYear = document.getElementById('cal-month-year');

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    monthYear.innerText = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Get all days from project
    const workDays = getAllWorkDays(project);

    // Calculate calendar
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    grid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.innerText = day;
        grid.appendChild(header);
    });

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        grid.appendChild(emptyCell);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';

        // Check if this is today
        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayCell.classList.add('today');
        }

        // Check if this is a work day
        const workDay = workDays.find(wd => wd.date === dateStr);
        if (workDay) {
            dayCell.classList.add('work-day');
            dayCell.onclick = () => navigateToDayByDate(project.id, workDay.dayId);
        }

        dayCell.innerHTML = `<span class="day-number">${day}</span>`;
        grid.appendChild(dayCell);
    }
}

function getAllWorkDays(project) {
    const workDays = [];

    const collectDays = (days, projectId, phaseId, weekId) => {
        if (!days) return;
        days.forEach(day => {
            if (day.date) {
                workDays.push({
                    date: day.date,
                    dayId: day.id,
                    projectId,
                    phaseId,
                    weekId
                });
            }
        });
    };

    // Collect from phases > weeks > days
    if (project.phases) {
        project.phases.forEach(phase => {
            if (phase.weeks) {
                phase.weeks.forEach(week => {
                    collectDays(week.days, project.id, phase.id, week.id);
                });
            }
        });
    }

    // Collect from standalone weeks > days
    if (project.weeks && !project.phases) {
        project.weeks.forEach(week => {
            collectDays(week.days, project.id, null, week.id);
        });
    }

    // Collect from standalone days
    if (project.days && !project.weeks && !project.phases) {
        collectDays(project.days, project.id, null, null);
    }

    return workDays;
}

function navigateToDayByDate(projectId, dayId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    // Find the day and its context
    let phaseId = null;
    let weekId = null;

    if (project.phases) {
        for (const phase of project.phases) {
            if (phase.weeks) {
                for (const week of phase.weeks) {
                    if (week.days) {
                        const day = week.days.find(d => d.id === dayId);
                        if (day) {
                            phaseId = phase.id;
                            weekId = week.id;
                            break;
                        }
                    }
                }
            }
            if (weekId) break;
        }
    }

    if (!weekId && project.weeks) {
        for (const week of project.weeks) {
            if (week.days) {
                const day = week.days.find(d => d.id === dayId);
                if (day) {
                    weekId = week.id;
                    break;
                }
            }
        }
    }

    navigateTo('day', { projectId, phaseId, weekId, dayId });
}

function setupCalendarControls() {
    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');

    if (prevBtn) {
        prevBtn.onclick = () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            if (currentView.type === 'project-calendar') {
                renderProjectCalendar(currentView.projectId);
            }
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            if (currentView.type === 'project-calendar') {
                renderProjectCalendar(currentView.projectId);
            }
        };
    }
}


// === Structure Rendering ===
function renderStructure(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    document.getElementById('structure-view').style.display = 'block';
    document.getElementById('page-title').innerText = 'Project Structure';
    document.getElementById('page-subtitle').innerText = project.name;
    document.getElementById('edit-subtitle-btn').style.display = 'none';

    // Hide progress bar in structure view
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'none';

    // Render nav header
    document.getElementById('nav-header').innerHTML = `
        <button class="back-btn" onclick="navigateTo('project', '${projectId}')">
            <i class="fas fa-arrow-left"></i> ${escapeHtml(project.name)}
        </button>
    `;

    // Set checkbox states
    document.getElementById('struct-phases').checked = project.structure.hasPhases;
    document.getElementById('struct-weeks').checked = project.structure.hasWeeks;
    document.getElementById('struct-days').checked = project.structure.hasDays;
    document.getElementById('struct-materials').checked = project.structure.hasMaterials;

    // Clear sidebar
    document.getElementById('sidebar-list').innerHTML = '';
    document.getElementById('sidebar-title').innerText = 'Structure';

    updateProgressBar(0);
}

function updateProjectStructure() {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    const hasPhases = document.getElementById('struct-phases').checked;
    const hasWeeks = document.getElementById('struct-weeks').checked;
    const hasDays = document.getElementById('struct-days').checked;
    const hasMaterials = document.getElementById('struct-materials').checked;

    project.structure = { hasPhases, hasWeeks, hasDays, hasMaterials };

    // Initialize arrays if checked
    if (hasPhases && !project.phases) project.phases = [];
    if (hasWeeks && !project.weeks && !hasPhases) project.weeks = [];
    if (hasDays && !project.days && !hasWeeks && !hasPhases) project.days = [];

    saveData();
}

// === Materials Rendering ===
function renderMaterials(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    document.getElementById('materials-view').style.display = 'block';
    document.getElementById('page-title').innerText = 'Materials';
    document.getElementById('page-subtitle').innerText = project.name;
    document.getElementById('edit-subtitle-btn').style.display = 'none';

    // Hide progress bar in materials view
    const progressBlock = document.querySelector('.progress-block');
    if (progressBlock) progressBlock.style.display = 'none';

    // Render nav header
    document.getElementById('nav-header').innerHTML = `
        <button class="back-btn" onclick="navigateTo('project', '${projectId}')">
            <i class="fas fa-arrow-left"></i> ${escapeHtml(project.name)}
        </button>
    `;

    // Populate context selector
    const contextSelect = document.getElementById('materials-context');
    contextSelect.innerHTML = '<option value="project">Entire Project</option>';

    if (project.phases) {
        project.phases.forEach(phase => {
            const option = document.createElement('option');
            option.value = `phase:${phase.id}`;
            option.innerText = `Phase: ${phase.title}`;
            contextSelect.appendChild(option);

            if (phase.weeks) {
                phase.weeks.forEach(week => {
                    const weekOption = document.createElement('option');
                    weekOption.value = `week:${week.id}`;
                    weekOption.innerText = `└─ Week: ${week.title}`;
                    weekOption.style.paddingLeft = '20px';
                    contextSelect.appendChild(weekOption);

                    if (week.days) {
                        week.days.forEach(day => {
                            const dayOption = document.createElement('option');
                            dayOption.value = `day:${day.id}`;
                            dayOption.innerText = `  └─ Day: ${day.title}`;
                            dayOption.style.paddingLeft = '40px';
                            contextSelect.appendChild(dayOption);
                        });
                    }
                });
            }
        });
    } else if (project.weeks) {
        project.weeks.forEach(week => {
            const option = document.createElement('option');
            option.value = `week:${week.id}`;
            option.innerText = `Week: ${week.title}`;
            contextSelect.appendChild(option);

            if (week.days) {
                week.days.forEach(day => {
                    const dayOption = document.createElement('option');
                    dayOption.value = `day:${day.id}`;
                    dayOption.innerText = `└─ Day: ${day.title}`;
                    dayOption.style.paddingLeft = '20px';
                    contextSelect.appendChild(dayOption);
                });
            }
        });
    } else if (project.days) {
        project.days.forEach(day => {
            const option = document.createElement('option');
            option.value = `day:${day.id}`;
            option.innerText = `Day: ${day.title}`;
            contextSelect.appendChild(option);
        });
    }

    contextSelect.value = currentMaterialsContext;

    // Clear sidebar
    document.getElementById('sidebar-list').innerHTML = '';
    document.getElementById('sidebar-title').innerText = 'Materials';

    switchMaterialsTab(currentMaterialsTab);
    updateProgressBar(0);
}

function switchMaterialsContext(context) {
    currentMaterialsContext = context;
    renderMaterialsContent(getMaterialsContext());
}

function switchMaterialsTab(tab) {
    currentMaterialsTab = tab;

    // Update tab buttons
    document.querySelectorAll('.materials-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.materials-tab[onclick*="${tab}"]`).classList.add('active');

    // Show/hide tab content
    document.querySelectorAll('.materials-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`materials-${tab}`).classList.add('active');

    renderMaterialsContent(getMaterialsContext());
}

function renderMaterialsContent(materials) {
    if (!materials) return;

    if (currentMaterialsTab === 'notes') {
        renderNotes(materials.notes || []);
    } else if (currentMaterialsTab === 'videos') {
        renderVideos(materials.videos || []);
    } else if (currentMaterialsTab === 'files') {
        renderFiles(materials.files || []);
    } else if (currentMaterialsTab === 'links') {
        renderLinks(materials.links || []);
    }
}

function renderNotes(notes) {
    const container = document.getElementById('notes-list-container');
    container.innerHTML = '';

    notes.forEach((note, index) => {
        const el = document.createElement('div');
        el.className = 'note-card glass-effect';
        el.innerHTML = `
            <p>${escapeHtml(note.text)}</p>
            <div class="action-icons">
                <i class="fas fa-pencil-alt" onclick="editNote(${index})"></i>
                <i class="fas fa-trash" onclick="deleteNote(${index})"></i>
            </div>
        `;
        container.appendChild(el);
    });

    if (notes.length === 0) {
        container.innerHTML = '<p class="empty-message">No notes yet. Click + to add one.</p>';
    }
}

function renderVideos(videos) {
    const container = document.getElementById('video-list-container');
    container.innerHTML = '';

    videos.forEach((video, index) => {
        const el = document.createElement('div');
        el.className = 'video-card glass-effect';
        el.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${video.id}" frameborder="0" allowfullscreen></iframe>
            <i class="fas fa-trash video-delete-btn" onclick="deleteVideo(${index})"></i>
        `;
        container.appendChild(el);
    });

    if (videos.length === 0) {
        container.innerHTML = '<p class="empty-message">No videos yet. Paste a YouTube link to add one.</p>';
    }
}

function renderFiles(files) {
    const container = document.getElementById('files-list-container');
    container.innerHTML = '';

    files.forEach((file, index) => {
        const el = document.createElement('div');
        el.className = 'file-card glass-effect';
        el.innerHTML = `
            <div class="file-info">
                <i class="fas fa-file"></i>
                <span>${escapeHtml(file.name)}</span>
            </div>
            <div class="action-icons">
                <i class="fas fa-download" onclick="downloadFile(${index})"></i>
                <i class="fas fa-trash" onclick="deleteFile(${index})"></i>
            </div>
        `;
        container.appendChild(el);
    });

    if (files.length === 0) {
        container.innerHTML = '<p class="empty-message">No files yet. Click "Add Files" to upload.</p>';
    }
}

function renderLinks(links) {
    const container = document.getElementById('links-list-container');
    container.innerHTML = '';

    links.forEach((link, index) => {
        const el = document.createElement('div');
        el.className = 'link-card glass-effect';
        el.innerHTML = `
            <div class="link-info">
                <i class="fas fa-link"></i>
                <a href="${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.title)}</a>
            </div>
            <i class="fas fa-trash" onclick="deleteLink(${index})"></i>
        `;
        container.appendChild(el);
    });

    if (links.length === 0) {
        container.innerHTML = '<p class="empty-message">No links yet. Enter a URL to add one.</p>';
    }
}

// === Materials Management ===
function addNote() {
    const materials = getMaterialsContext();
    if (!materials) return;

    openModal('Add Note', '', (text) => {
        if (text.trim()) {
            if (!materials.notes) materials.notes = [];
            materials.notes.push({ text: text.trim() });
            saveData();
        }
    }, 'textarea');
}

function editNote(index) {
    const materials = getMaterialsContext();
    if (!materials || !materials.notes) return;

    const note = materials.notes[index];
    openModal('Edit Note', note.text, (text) => {
        if (text.trim()) {
            note.text = text.trim();
            saveData();
        }
    }, 'textarea');
}

function deleteNote(index) {
    const materials = getMaterialsContext();
    if (materials && materials.notes) {
        materials.notes.splice(index, 1);
        saveData();
    }
}

function addVideo() {
    const urlInput = document.getElementById('youtube-url');
    const url = urlInput.value.trim();
    if (!url) return;

    const videoId = extractYouTubeId(url);
    if (!videoId) {
        alert('Invalid YouTube URL');
        return;
    }

    const materials = getMaterialsContext();
    if (materials) {
        if (!materials.videos) materials.videos = [];
        materials.videos.push({ id: videoId, url });
        urlInput.value = '';
        saveData();
    }
}

function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function deleteVideo(index) {
    const materials = getMaterialsContext();
    if (materials && materials.videos) {
        materials.videos.splice(index, 1);
        saveData();
    }
}

function addFiles() {
    document.getElementById('file-upload-input').click();
}

function handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const materials = getMaterialsContext();
    if (!materials) return;

    if (!materials.files) materials.files = [];

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            materials.files.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result
            });
            saveDataQuietly();
            renderMaterialsContent(materials);
        };
        reader.readAsDataURL(file);
    });

    event.target.value = '';
}

function deleteFile(index) {
    const materials = getMaterialsContext();
    if (materials && materials.files) {
        materials.files.splice(index, 1);
        saveData();
    }
}

function downloadFile(index) {
    const materials = getMaterialsContext();
    if (materials && materials.files && materials.files[index]) {
        const file = materials.files[index];
        const a = document.createElement('a');
        a.href = file.data;
        a.download = file.name;
        a.click();
    }
}

function addLink() {
    const urlInput = document.getElementById('link-url');
    const url = urlInput.value.trim();
    if (!url) return;

    const materials = getMaterialsContext();
    if (materials) {
        if (!materials.links) materials.links = [];
        materials.links.push({ url, title: url });
        urlInput.value = '';
        saveData();
    }
}

function deleteLink(index) {
    const materials = getMaterialsContext();
    if (materials && materials.links) {
        materials.links.splice(index, 1);
        saveData();
    }
}

function getMaterialsContext() {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return null;

    if (currentMaterialsContext === 'project') {
        return project.materials;
    }

    const [type, id] = currentMaterialsContext.split(':');

    if (type === 'phase') {
        const phase = project.phases?.find(p => p.id === id);
        return phase ? phase.materials : null;
    } else if (type === 'week') {
        const week = findWeek(project, id);
        return week ? week.materials : null;
    } else if (type === 'day') {
        const day = findDay(project, id);
        return day ? day.materials : null;
    }

    return project.materials;
}

// === Rendering Functions ===
function renderChecklist(items, itemType) {
    const container = document.getElementById('main-list-container');
    container.innerHTML = '';

    const filtered = searchQuery ? items.filter(item =>
        item.text.toLowerCase().includes(searchQuery.toLowerCase())
    ) : items;

    filtered.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = `${itemType}-item glass-effect ${item.completed ? 'completed' : ''}`;
        el.innerHTML = `
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleItem(${items.indexOf(item)}, '${itemType}')">
            <span class="item-text">${escapeHtml(item.text)}</span>
            <div class="action-icons">
                <i class="fas fa-pencil-alt" onclick="editItem(${items.indexOf(item)}, '${itemType}')"></i>
                <i class="fas fa-trash" onclick="deleteItem(${items.indexOf(item)}, '${itemType}')"></i>
            </div>
        `;
        container.appendChild(el);
    });

    if (filtered.length === 0 && items.length > 0) {
        container.innerHTML = '<p class="empty-message">No items match your search</p>';
    } else if (items.length === 0) {
        container.innerHTML = '<p class="empty-message"></p>';
    }
}

function toggleItem(index, itemType) {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    let items = getItemsArray(project, itemType);
    if (items && items[index]) {
        items[index].completed = !items[index].completed;
        saveData();
    }
}

function editItem(index, itemType) {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    let items = getItemsArray(project, itemType);
    if (!items || !items[index]) return;

    openModal('Edit Item', items[index].text, (newText) => {
        if (newText.trim()) {
            items[index].text = newText.trim();
            saveData();
        }
    }, 'text');
}

function deleteItem(index, itemType) {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    let items = getItemsArray(project, itemType);
    if (items) {
        items.splice(index, 1);
        saveData();
    }
}

function getItemsArray(project, itemType) {
    if (currentView.type === 'project') {
        return project.tasks;
    } else if (currentView.type === 'phase') {
        const phase = project.phases.find(p => p.id === currentView.phaseId);
        return phase ? phase.goals : null;
    } else if (currentView.type === 'week') {
        const week = findWeek(project, currentView.weekId);
        return week ? week.goals : null;
    } else if (currentView.type === 'day') {
        const day = findDay(project, currentView.dayId);
        return day ? day.tasks : null;
    }
    return null;
}

function createSidebarItem(title, id, onClick, type, progress = 0) {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.onclick = onClick;

    const completed = progress === 100 ? '<i class="fas fa-check-circle"></i> ' : '';

    el.innerHTML = `
        <div class="nav-item-content">
            <span>${completed}${escapeHtml(title)}</span>
            <small>${progress}%</small>
        </div>
        <div class="action-icons">
            <i class="fas fa-pencil-alt" onclick="event.stopPropagation(); editSidebarItem('${id}', '${type}')"></i>
            <i class="fas fa-trash" onclick="event.stopPropagation(); deleteSidebarItem('${id}', '${type}')"></i>
        </div>
    `;

    return el;
}

function editSidebarItem(id, type) {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    let item = null;

    if (type === 'project') {
        item = appData.projects.find(p => p.id === id);
    } else if (type === 'phase') {
        item = project.phases.find(p => p.id === id);
    } else if (type === 'week') {
        item = findWeek(project, id);
    } else if (type === 'day') {
        item = findDay(project, id);
    }

    if (!item) return;

    openModal('Edit Title', item.title || item.name, (newTitle) => {
        if (newTitle.trim()) {
            if (item.title !== undefined) item.title = newTitle.trim();
            else if (item.name !== undefined) item.name = newTitle.trim();
            saveData();
        }
    }, 'text');
}

function deleteSidebarItem(id, type) {
    if (type === 'project') {
        // Handle project deletion from sidebar
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
        appData.projects = appData.projects.filter(p => p.id !== id);
        saveData();
        navigateTo('home');
        return;
    }

    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    if (!confirm('Are you sure you want to delete this item?')) return;

    if (type === 'phase' && project.phases) {
        project.phases = project.phases.filter(p => p.id !== id);
        saveData();
    } else if (type === 'week') {
        if (currentView.phaseId) {
            const phase = project.phases.find(p => p.id === currentView.phaseId);
            if (phase && phase.weeks) {
                phase.weeks = phase.weeks.filter(w => w.id !== id);
                saveData();
            }
        } else if (project.weeks) {
            project.weeks = project.weeks.filter(w => w.id !== id);
            saveData();
        }
    } else if (type === 'day') {
        if (currentView.weekId) {
            const week = findWeek(project, currentView.weekId);
            if (week && week.days) {
                week.days = week.days.filter(d => d.id !== id);
                saveData();
            }
        } else if (project.days) {
            project.days = project.days.filter(d => d.id !== id);
            saveData();
        }
    }
}

// === Project Management ===
function createProject() {
    document.getElementById('template-modal').style.display = 'flex';
}

function closeTemplateModal() {
    document.getElementById('template-modal').style.display = 'none';
}

function createProjectFromTemplate(template) {
    openModal('New Project', '', (name) => {
        if (!name.trim()) return;

        const project = {
            id: generateId(),
            name: name.trim(),
            description: '',
            tasks: [],
            materials: { notes: [], videos: [], files: [], links: [] },
            structure: {
                hasPhases: false,
                hasWeeks: false,
                hasDays: false,
                hasMaterials: false
            }
        };

        if (template === 'phased') {
            project.structure.hasPhases = true;
            project.structure.hasMaterials = true;
            project.phases = [];
        } else if (template === 'weekly') {
            project.structure.hasWeeks = true;
            project.structure.hasMaterials = true;
            project.weeks = [];
        } else if (template === 'daily') {
            project.structure.hasDays = true;
            project.structure.hasMaterials = true;
            project.days = [];
        } else if (template === 'full') {
            project.structure.hasPhases = true;
            project.structure.hasWeeks = true;
            project.structure.hasDays = true;
            project.structure.hasMaterials = true;
            project.phases = [];
        }

        appData.projects.push(project);
        saveData();
        navigateTo('project', project.id);
        closeTemplateModal();
    }, 'text');
}

function renameProject(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    openModal('Rename Project', project.name, (newName) => {
        if (newName.trim()) {
            project.name = newName.trim();
            saveData();
        }
    }, 'text');
}

function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    appData.projects = appData.projects.filter(p => p.id !== projectId);
    saveData();
    navigateTo('home');
}

// === Add Item Functions ===
function addItem() {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    if (currentView.type === 'project') {
        openModal('New Task', '', (text) => {
            if (text.trim()) {
                project.tasks.push({ text: text.trim(), completed: false });
                saveData();
            }
        }, 'text');
    } else if (currentView.type === 'phase') {
        const phase = project.phases.find(p => p.id === currentView.phaseId);
        if (phase) {
            openModal('New Goal', '', (text) => {
                if (text.trim()) {
                    phase.goals.push({ text: text.trim(), completed: false });
                    saveData();
                }
            }, 'text');
        }
    } else if (currentView.type === 'week') {
        const week = findWeek(project, currentView.weekId);
        if (week) {
            openModal('New Goal', '', (text) => {
                if (text.trim()) {
                    week.goals.push({ text: text.trim(), completed: false });
                    saveData();
                }
            }, 'text');
        }
    } else if (currentView.type === 'day') {
        const day = findDay(project, currentView.dayId);
        if (day) {
            openModal('New Task', '', (text) => {
                if (text.trim()) {
                    day.tasks.push({ text: text.trim(), completed: false });
                    saveData();
                }
            }, 'text');
        }
    }
}

function addPhase() {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    openModal('New Phase', '', (title) => {
        if (title.trim()) {
            if (!project.phases) project.phases = [];
            const phase = {
                id: generateId(),
                title: title.trim(),
                goals: [],
                materials: { notes: [], videos: [], files: [], links: [] }
            };
            if (project.structure.hasWeeks) phase.weeks = [];
            project.phases.push(phase);
            saveData();
        }
    }, 'text');
}

function addWeek() {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    openModal('New Week', '', (title) => {
        if (title.trim()) {
            const week = {
                id: generateId(),
                title: title.trim(),
                goals: [],
                materials: { notes: [], videos: [], files: [], links: [] }
            };
            if (project.structure.hasDays) week.days = [];

            if (currentView.type === 'phase' && currentView.phaseId) {
                const phase = project.phases.find(p => p.id === currentView.phaseId);
                if (phase) {
                    if (!phase.weeks) phase.weeks = [];
                    phase.weeks.push(week);
                }
            } else {
                if (!project.weeks) project.weeks = [];
                project.weeks.push(week);
            }
            saveData();
        }
    }, 'text');
}

function addDay() {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    openModal('New Day', '', (title) => {
        if (title.trim()) {
            const day = {
                id: generateId(),
                title: title.trim(),
                date: '',
                tasks: [],
                materials: { notes: [], videos: [], files: [], links: [] }
            };

            if (currentView.type === 'week' && currentView.weekId) {
                const week = findWeek(project, currentView.weekId);
                if (week) {
                    if (!week.days) week.days = [];
                    week.days.push(day);
                }
            } else {
                if (!project.days) project.days = [];
                project.days.push(day);
            }
            saveData();
        }
    }, 'text');
}

function editSubtitle() {
    const project = appData.projects.find(p => p.id === currentView.projectId);
    if (!project) return;

    if (currentView.type === 'project') {
        openModal('Edit Description', project.description, (desc) => {
            project.description = desc.trim();
            saveData();
        }, 'textarea');
    } else if (currentView.type === 'day') {
        const day = findDay(project, currentView.dayId);
        if (day) {
            openModal('Set Date', day.date || '', (date) => {
                day.date = date;
                saveData();
            }, 'date');
        }
    }
}

// === Helper Functions ===
function findWeek(project, weekId) {
    if (project.phases) {
        for (const phase of project.phases) {
            if (phase.weeks) {
                const week = phase.weeks.find(w => w.id === weekId);
                if (week) return week;
            }
        }
    }
    if (project.weeks) {
        return project.weeks.find(w => w.id === weekId);
    }
    return null;
}

function findDay(project, dayId) {
    if (project.phases) {
        for (const phase of project.phases) {
            if (phase.weeks) {
                for (const week of phase.weeks) {
                    if (week.days) {
                        const day = week.days.find(d => d.id === dayId);
                        if (day) return day;
                    }
                }
            }
        }
    }
    if (project.weeks) {
        for (const week of project.weeks) {
            if (week.days) {
                const day = week.days.find(d => d.id === dayId);
                if (day) return day;
            }
        }
    }
    if (project.days) {
        return project.days.find(d => d.id === dayId);
    }
    return null;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === Progress Calculations ===
function calculateProjectProgress(project) {
    let totalItems = 0;
    let completedItems = 0;

    const countItems = (items) => {
        if (!items) return;
        totalItems += items.length;
        completedItems += items.filter(item => item.completed).length;
    };

    countItems(project.tasks);

    if (project.phases) {
        project.phases.forEach(phase => {
            countItems(phase.goals);
            if (phase.weeks) {
                phase.weeks.forEach(week => {
                    countItems(week.goals);
                    if (week.days) {
                        week.days.forEach(day => countItems(day.tasks));
                    }
                });
            }
        });
    }

    if (project.weeks && !project.phases) {
        project.weeks.forEach(week => {
            countItems(week.goals);
            if (week.days) {
                week.days.forEach(day => countItems(day.tasks));
            }
        });
    }

    if (project.days && !project.weeks && !project.phases) {
        project.days.forEach(day => countItems(day.tasks));
    }

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
}

function calculatePhaseProgress(phase) {
    let totalItems = 0;
    let completedItems = 0;

    const countItems = (items) => {
        if (!items) return;
        totalItems += items.length;
        completedItems += items.filter(item => item.completed).length;
    };

    countItems(phase.goals);

    if (phase.weeks) {
        phase.weeks.forEach(week => {
            countItems(week.goals);
            if (week.days) {
                week.days.forEach(day => countItems(day.tasks));
            }
        });
    }

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
}

function calculateWeekProgress(week) {
    let totalItems = 0;
    let completedItems = 0;

    const countItems = (items) => {
        if (!items) return;
        totalItems += items.length;
        completedItems += items.filter(item => item.completed).length;
    };

    countItems(week.goals);

    if (week.days) {
        week.days.forEach(day => countItems(day.tasks));
    }

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
}

function calculateDayProgress(day) {
    if (!day.tasks || day.tasks.length === 0) return 0;
    const completed = day.tasks.filter(t => t.completed).length;
    return Math.round((completed / day.tasks.length) * 100);
}

function updateProgressBar(percent) {
    const bar = document.getElementById('main-progress-bar');
    const text = document.getElementById('progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.innerText = `${percent}%`;
}

// === Modal Management ===
function openModal(title, initialValue, callback, type = 'text') {
    const modal = document.getElementById('input-modal');
    const modalTitle = document.getElementById('modal-title');
    const input = document.getElementById('modal-input');
    const textarea = document.getElementById('modal-textarea');
    const dateInput = document.getElementById('modal-date-input');
    const saveBtn = document.getElementById('modal-save');
    const cancelBtn = document.getElementById('modal-cancel');

    modalTitle.innerText = title;

    // Show appropriate input
    input.classList.add('hidden');
    textarea.classList.add('hidden');
    dateInput.classList.add('hidden');

    let activeInput;
    if (type === 'textarea') {
        textarea.classList.remove('hidden');
        textarea.value = initialValue;
        activeInput = textarea;
    } else if (type === 'date') {
        dateInput.classList.remove('hidden');
        dateInput.value = initialValue;
        activeInput = dateInput;
    } else {
        input.classList.remove('hidden');
        input.value = initialValue;
        activeInput = input;
    }

    modal.style.display = 'flex';
    setTimeout(() => activeInput.focus(), 100);

    const handleSave = () => {
        callback(activeInput.value);
        modal.style.display = 'none';
        cleanup();
    };

    const handleCancel = () => {
        modal.style.display = 'none';
        cleanup();
    };

    const handleKeypress = (e) => {
        if (e.key === 'Enter' && type !== 'textarea') {
            handleSave();
        }
    };

    const cleanup = () => {
        saveBtn.removeEventListener('click', handleSave);
        cancelBtn.removeEventListener('click', handleCancel);
        activeInput.removeEventListener('keypress', handleKeypress);
    };

    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);
    activeInput.addEventListener('keypress', handleKeypress);
}

// === Event Listeners ===
function setupEventListeners() {
    // Sidebar add button
    document.getElementById('sidebar-add-btn').addEventListener('click', () => {
        if (currentView.type === 'home') {
            createProject();
        } else if (currentView.type === 'project') {
            const project = appData.projects.find(p => p.id === currentView.projectId);
            if (project.structure.hasPhases) addPhase();
            else if (project.structure.hasWeeks) addWeek();
            else if (project.structure.hasDays) addDay();
            else addItem();
        } else if (currentView.type === 'phase') {
            const project = appData.projects.find(p => p.id === currentView.projectId);
            if (project.structure.hasWeeks) addWeek();
            else addItem();
        } else if (currentView.type === 'week') {
            const project = appData.projects.find(p => p.id === currentView.projectId);
            if (project.structure.hasDays) addDay();
            else addItem();
        } else if (currentView.type === 'day') {
            addItem();
        }
    });

    // Edit subtitle button
    document.getElementById('edit-subtitle-btn').addEventListener('click', editSubtitle);

    // Search
    document.getElementById('global-search').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderView();
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').style.display = 'flex';
    });

    // Export data
    document.getElementById('export-btn').addEventListener('click', exportData);

    // Import data
    document.getElementById('import-file').addEventListener('change', importData);

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Materials event listeners
    document.getElementById('add-note-btn').addEventListener('click', addNote);
    document.getElementById('add-video-btn').addEventListener('click', addVideo);
    document.getElementById('add-file-btn').addEventListener('click', addFiles);
    document.getElementById('file-upload-input').addEventListener('change', handleFileUpload);
    document.getElementById('add-link-btn').addEventListener('click', addLink);
}

// === Keyboard Shortcuts ===
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'n') {
                e.preventDefault();
                document.getElementById('sidebar-add-btn').click();
            } else if (e.key === 'f') {
                e.preventDefault();
                document.getElementById('global-search').focus();
            } else if (e.key === 'h') {
                e.preventDefault();
                navigateTo('home');
            } else if (e.key === 't') {
                e.preventDefault();
                const themes = ['dark', 'blue', 'purple', 'orange'];
                const currentIndex = themes.indexOf(appData.settings.theme);
                const nextTheme = themes[(currentIndex + 1) % themes.length];
                setTheme(nextTheme);
            } else if (e.key === 'e') {
                e.preventDefault();
                exportData();
            }
        } else if (e.key === '?') {
            e.preventDefault();
            const panel = document.getElementById('shortcuts-panel');
            panel.classList.toggle('hidden');
        }
    });
}

// === Data Import/Export ===
function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-project-manager-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    document.getElementById('backup-status').innerText = 'Data exported successfully!';
    setTimeout(() => {
        document.getElementById('backup-status').innerText = '';
    }, 3000);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm('This will replace all current data. Continue?')) {
                appData = imported;
                saveData();
                navigateTo('home');
                document.getElementById('backup-status').innerText = 'Data imported successfully!';
                setTimeout(() => {
                    document.getElementById('backup-status').innerText = '';
                }, 3000);
            }
        } catch (err) {
            alert('Error importing data: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}