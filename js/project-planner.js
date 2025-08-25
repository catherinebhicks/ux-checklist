/**
 * UX Project Planner JavaScript
 * Handles task selection, project plan generation, and export functionality
 */

class ProjectPlanner {
    constructor() {
        this.selectedTasks = new Set();
        this.projectPlan = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSavedPlan();
        this.updateSelectedCount();
    }

    bindEvents() {
        // Task selection checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-checkbox')) {
                this.handleTaskSelection(e.target);
            }
        });

        // Task card clicks
        document.addEventListener('click', (e) => {
            const taskCard = e.target.closest('.task-card');
            if (taskCard && !e.target.closest('.task-link')) {
                e.preventDefault();
                const checkbox = taskCard.querySelector('.task-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.handleTaskSelection(checkbox);
                }
            }
        });

        // Create plan button
        const createPlanBtn = document.getElementById('create-plan-btn');
        if (createPlanBtn) {
            createPlanBtn.addEventListener('click', () => this.generateProjectPlan());
        }

        // View plan button
        const viewPlanBtn = document.getElementById('view-plan-btn');
        if (viewPlanBtn) {
            viewPlanBtn.addEventListener('click', () => this.showCurrentPlan());
        }
    }

    handleTaskSelection(checkbox) {
        const taskCard = checkbox.closest('.task-card');
        const taskId = taskCard.dataset.task;
        const taskData = this.extractTaskData(taskCard);

        if (checkbox.checked) {
            this.selectedTasks.add(taskId);
            taskCard.classList.add('selected');
            this.addToProjectPlan(taskData);
        } else {
            this.selectedTasks.delete(taskId);
            taskCard.classList.remove('selected');
            this.removeFromProjectPlan(taskId);
        }

        this.updateSelectedCount();
        this.savePlan();
    }

    extractTaskData(taskCard) {
        const titleElement = taskCard.querySelector('.task-title');
        const descriptionElement = taskCard.querySelector('.task-description');
        const durationElement = taskCard.querySelector('.task-duration');
        const difficultyElement = taskCard.querySelector('.task-difficulty');

        return {
            id: taskCard.dataset.task,
            title: titleElement ? titleElement.textContent : 'Unknown Task',
            description: descriptionElement ? descriptionElement.textContent : '',
            duration: durationElement ? durationElement.textContent : '1-2 days',
            difficulty: difficultyElement ? difficultyElement.textContent : 'Beginner',
            category: taskCard.dataset.category || 'general'
        };
    }

    addToProjectPlan(taskData) {
        const existingIndex = this.projectPlan.findIndex(task => task.id === taskData.id);
        if (existingIndex === -1) {
            this.projectPlan.push(taskData);
        }
    }

    removeFromProjectPlan(taskId) {
        this.projectPlan = this.projectPlan.filter(task => task.id !== taskId);
    }

    updateSelectedCount() {
        const countElement = document.getElementById('selected-count');
        if (countElement) {
            countElement.textContent = this.selectedTasks.size;
        }

        // Update create plan button
        const createPlanBtn = document.getElementById('create-plan-btn');
        if (createPlanBtn) {
            if (this.selectedTasks.size > 0) {
                createPlanBtn.textContent = `Create Plan (${this.selectedTasks.size} tasks)`;
                createPlanBtn.disabled = false;
            } else {
                createPlanBtn.textContent = 'Create Project Plan';
                createPlanBtn.disabled = true;
            }
        }
    }

    savePlan() {
        localStorage.setItem('uxProjectPlan', JSON.stringify(this.projectPlan));
        localStorage.setItem('uxSelectedTasks', JSON.stringify([...this.selectedTasks]));
    }

    loadSavedPlan() {
        try {
            const savedPlan = localStorage.getItem('uxProjectPlan');
            const savedTasks = localStorage.getItem('uxSelectedTasks');

            if (savedPlan) {
                this.projectPlan = JSON.parse(savedPlan);
            }

            if (savedTasks) {
                const taskIds = JSON.parse(savedTasks);
                taskIds.forEach(taskId => {
                    this.selectedTasks.add(taskId);
                    const taskCard = document.querySelector(`[data-task="${taskId}"]`);
                    if (taskCard) {
                        const checkbox = taskCard.querySelector('.task-checkbox');
                        if (checkbox) {
                            checkbox.checked = true;
                            taskCard.classList.add('selected');
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading saved plan:', error);
        }
    }

    generateProjectPlan() {
        if (this.selectedTasks.size === 0) {
            alert('Please select at least one task to create a project plan.');
            return;
        }

        // Group tasks by category
        const tasksByCategory = this.groupTasksByCategory();
        
        // Generate timeline
        const timeline = this.generateTimeline();
        
        // Create plan document
        const planDocument = this.createPlanDocument(tasksByCategory, timeline);
        
        // Show plan modal
        this.showPlanModal(planDocument);
    }

    groupTasksByCategory() {
        const categories = {};
        this.projectPlan.forEach(task => {
            if (!categories[task.category]) {
                categories[task.category] = [];
            }
            categories[task.category].push(task);
        });
        return categories;
    }

    generateTimeline() {
        let totalDays = 0;
        const timeline = [];
        
        this.projectPlan.forEach(task => {
            const duration = this.parseDuration(task.duration);
            timeline.push({
                task: task.title,
                startDay: totalDays + 1,
                endDay: totalDays + duration,
                duration: duration
            });
            totalDays += duration;
        });
        
        return { timeline, totalDays };
    }

    parseDuration(durationStr) {
        // Parse duration strings like "2-4 days" or "1 week"
        const match = durationStr.match(/(\d+)(?:-(\d+))?\s*(day|week)/i);
        if (match) {
            const min = parseInt(match[1]);
            const max = match[2] ? parseInt(match[2]) : min;
            const unit = match[3].toLowerCase();
            const days = unit === 'week' ? (min + max) / 2 * 7 : (min + max) / 2;
            return Math.ceil(days);
        }
        return 2; // Default
    }

    createPlanDocument(tasksByCategory, timeline) {
        const today = new Date();
        const projectEnd = new Date(today);
        projectEnd.setDate(today.getDate() + timeline.totalDays);

        return {
            title: 'UX Project Plan',
            createdDate: today.toLocaleDateString(),
            estimatedDuration: `${timeline.totalDays} days`,
            estimatedCompletion: projectEnd.toLocaleDateString(),
            taskCount: this.projectPlan.length,
            categories: Object.keys(tasksByCategory).length,
            tasksByCategory,
            timeline: timeline.timeline,
            totalDays: timeline.totalDays
        };
    }

    showPlanModal(planDocument) {
        // Create modal HTML
        const modalHTML = this.generatePlanHTML(planDocument);
        
        // Show modal
        const modal = document.createElement('div');
        modal.className = 'plan-modal';
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);
        
        // Bind modal events
        this.bindModalEvents(modal, planDocument);
    }

    generatePlanHTML(plan) {
        const categoriesHTML = Object.entries(plan.tasksByCategory).map(([category, tasks]) => `
            <div class="plan-category">
                <h3>${this.formatCategoryName(category)}</h3>
                <ul class="plan-task-list">
                    ${tasks.map(task => `
                        <li class="plan-task-item">
                            <strong>${task.title}</strong>
                            <span class="task-meta">
                                ${task.duration} • ${task.difficulty}
                            </span>
                            <p>${task.description}</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');

        const timelineHTML = plan.timeline.map(item => `
            <div class="timeline-item">
                <div class="timeline-task">${item.task}</div>
                <div class="timeline-duration">Days ${item.startDay}-${item.endDay}</div>
            </div>
        `).join('');

        return `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${plan.title}</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="plan-summary">
                            <div class="summary-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Total Tasks</span>
                                    <span class="stat-value">${plan.taskCount}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Categories</span>
                                    <span class="stat-value">${plan.categories}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Estimated Duration</span>
                                    <span class="stat-value">${plan.estimatedDuration}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Target Completion</span>
                                    <span class="stat-value">${plan.estimatedCompletion}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="plan-sections">
                            <div class="plan-section">
                                <h3>Project Timeline</h3>
                                <div class="timeline">
                                    ${timelineHTML}
                                </div>
                            </div>
                            
                            <div class="plan-section">
                                <h3>Tasks by Category</h3>
                                ${categoriesHTML}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="button-secondary" id="email-plan">Email Plan</button>
                        <button class="button-primary" id="download-pdf">Download PDF</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindModalEvents(modal, planDocument) {
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                document.body.removeChild(modal);
            }
        });

        // Email plan
        modal.querySelector('#email-plan').addEventListener('click', () => {
            this.emailPlan(planDocument);
        });

        // Download PDF
        modal.querySelector('#download-pdf').addEventListener('click', () => {
            this.downloadPDF(planDocument);
        });
    }

    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
    }

    emailPlan(planDocument) {
        const subject = encodeURIComponent('UX Project Plan');
        const body = encodeURIComponent(this.generateEmailBody(planDocument));
        const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = mailtoLink;
    }

    generateEmailBody(plan) {
        return `
UX Project Plan
Created: ${plan.createdDate}

Project Overview:
- Total Tasks: ${plan.taskCount}
- Categories: ${plan.categories}
- Estimated Duration: ${plan.estimatedDuration}
- Target Completion: ${plan.estimatedCompletion}

Timeline:
${plan.timeline.map(item => `• ${item.task} (Days ${item.startDay}-${item.endDay})`).join('\n')}

Task Details:
${Object.entries(plan.tasksByCategory).map(([category, tasks]) => `
${this.formatCategoryName(category)}:
${tasks.map(task => `• ${task.title} (${task.duration})`).join('\n')}
`).join('\n')}

Generated by UX Project Planner
        `.trim();
    }

    downloadPDF(planDocument) {
        // For now, create a simple HTML version for download
        // In a real implementation, you'd use a library like jsPDF or Puppeteer
        const htmlContent = this.generatePDFHTML(planDocument);
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ux-project-plan-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generatePDFHTML(plan) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>UX Project Plan</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .stats { display: flex; justify-content: space-around; margin: 30px 0; }
        .stat { text-align: center; }
        .timeline { margin: 20px 0; }
        .timeline-item { padding: 10px; border-left: 3px solid #2563eb; margin: 10px 0; }
        .category { margin: 30px 0; }
        .task-item { margin: 15px 0; padding: 10px; background: #f9fafb; }
        @media print { 
            body { margin: 20px; } 
            .stats { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>UX Project Plan</h1>
        <p>Created: ${plan.createdDate}</p>
    </div>
    
    <div class="stats">
        <div class="stat">
            <strong>${plan.taskCount}</strong><br>Total Tasks
        </div>
        <div class="stat">
            <strong>${plan.categories}</strong><br>Categories
        </div>
        <div class="stat">
            <strong>${plan.estimatedDuration}</strong><br>Duration
        </div>
        <div class="stat">
            <strong>${plan.estimatedCompletion}</strong><br>Target Completion
        </div>
    </div>
    
    <h2>Project Timeline</h2>
    <div class="timeline">
        ${plan.timeline.map(item => `
            <div class="timeline-item">
                <strong>${item.task}</strong> - Days ${item.startDay}-${item.endDay}
            </div>
        `).join('')}
    </div>
    
    <h2>Tasks by Category</h2>
    ${Object.entries(plan.tasksByCategory).map(([category, tasks]) => `
        <div class="category">
            <h3>${this.formatCategoryName(category)}</h3>
            ${tasks.map(task => `
                <div class="task-item">
                    <strong>${task.title}</strong> (${task.duration}, ${task.difficulty})
                    <p>${task.description}</p>
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
        `;
    }

    showCurrentPlan() {
        if (this.projectPlan.length === 0) {
            alert('No tasks selected yet. Select some tasks first!');
            return;
        }
        
        this.generateProjectPlan();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.projectPlanner = new ProjectPlanner();
});
