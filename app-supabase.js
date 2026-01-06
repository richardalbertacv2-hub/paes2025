/**
 * Dashboard PAES 2025 - JavaScript Application (Supabase Version)
 * Frontend-only - Compatible with GitHub Pages
 */

// Chart instances
let radarChart, distributionChart, ramaChart, comparisonChart;

// Chart.js default configuration
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadFilters();
    loadDashboardData();
    loadRankingData();
    initFilterListeners();
});

// ========== Tab System ==========
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// ========== Load Filters ==========
async function loadFilters() {
    const data = await fetchFilters();
    if (!data) return;

    // Populate RBD multi-select
    const rbdOptions = document.getElementById('rbdOptions');
    rbdOptions.innerHTML = data.rbds.map(rbd => `
        <div class="multi-select-option">
            <input type="checkbox" id="rbd_${rbd}" value="${rbd}" onchange="updateRbdSelection()">
            <label for="rbd_${rbd}">${rbd}</label>
        </div>
    `).join('');

    const comunaSelect = document.getElementById('filterComuna');
    const ramaSelect = document.getElementById('filterRama');

    const comunaNames = {
        8101: 'Concepción',
        8103: 'Chiguayante',
        8104: 'Hualqui',
        8105: 'Florida'
    };
    data.comunas.forEach(comuna => {
        const name = comunaNames[comuna] || comuna;
        comunaSelect.innerHTML += `<option value="${comuna}">${name}</option>`;
    });

    data.ramas.forEach(rama => {
        ramaSelect.innerHTML += `<option value="${rama}">${rama}</option>`;
    });
}

// ========== Multi-Select Functions ==========
function toggleMultiSelect(id) {
    const multiSelect = document.getElementById(id);
    multiSelect.classList.toggle('open');
}

function updateRbdSelection() {
    const checkboxes = document.querySelectorAll('#rbdOptions input[type="checkbox"]:checked');
    const selectedText = document.getElementById('rbdSelectedText');

    if (checkboxes.length === 0) {
        selectedText.textContent = 'Todos los RBD';
    } else if (checkboxes.length <= 2) {
        selectedText.textContent = Array.from(checkboxes).map(cb => cb.value).join(', ');
    } else {
        selectedText.textContent = `${checkboxes.length} seleccionados`;
    }

    loadFilteredStats();
}

// Close multi-select when clicking outside
document.addEventListener('click', (e) => {
    const multiSelects = document.querySelectorAll('.multi-select');
    multiSelects.forEach(ms => {
        if (!ms.contains(e.target)) {
            ms.classList.remove('open');
        }
    });
});

// ========== Filter Listeners ==========
function initFilterListeners() {
    const filters = ['filterComuna', 'filterRama'];
    filters.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            loadFilteredStats();
        });
    });
}

async function loadFilteredStats() {
    // Get selected RBDs
    const rbdCheckboxes = document.querySelectorAll('#rbdOptions input[type="checkbox"]:checked');
    const rbds = Array.from(rbdCheckboxes).map(cb => parseInt(cb.value));

    const comuna = document.getElementById('filterComuna').value;
    const rama = document.getElementById('filterRama').value;

    const data = await fetchFiltered({
        rbds: rbds,
        comuna: comuna ? parseInt(comuna) : null,
        rama: rama || null
    });

    if (data) {
        updateKPIs(data);
    }

    // Reload radar chart with selected RBDs
    loadRadarChartFiltered(rbds);
}

// ========== Dashboard Data ==========
async function loadDashboardData() {
    // Load general stats
    const stats = await fetchStats();
    if (stats) {
        updateKPIs(stats);
    }

    // Load charts data
    loadRadarChart();
    loadDistributionChart();
    loadRamaChart();
    loadComparisonChart();
}

function updateKPIs(data) {
    document.getElementById('kpiTotal').textContent = formatNumber(data.total_estudiantes);
    document.getElementById('kpiClec').textContent = formatNumber(data.prom_clec);
    document.getElementById('kpiMate').textContent = formatNumber(data.prom_mate1);
    document.getElementById('kpiMaxProm').textContent = data.max_promedio || data.prom_notas || '-';
}

// ========== Radar Chart ==========
async function loadRadarChart() {
    const data = await fetchStatsByRbd();
    if (!data || data.length === 0) return;

    renderRadarChart(data);
}

async function loadRadarChartFiltered(selectedRbds) {
    if (!selectedRbds || selectedRbds.length === 0) {
        loadRadarChart();
        return;
    }

    const data = await fetchStatsByRbdFiltered(selectedRbds);
    if (!data || data.length === 0) {
        loadRadarChart();
        return;
    }

    renderRadarChart(data);
}

function renderRadarChart(data) {
    const ctx = document.getElementById('radarChart').getContext('2d');

    const colors = [
        { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgb(99, 102, 241)' },
        { bg: 'rgba(34, 211, 238, 0.2)', border: 'rgb(34, 211, 238)' },
        { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgb(16, 185, 129)' },
        { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgb(245, 158, 11)' },
        { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgb(239, 68, 68)' },
        { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgb(139, 92, 246)' },
        { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgb(236, 72, 153)' },
        { bg: 'rgba(20, 184, 166, 0.2)', border: 'rgb(20, 184, 166)' }
    ];

    const datasets = data.slice(0, 8).map((item, idx) => ({
        label: `RBD ${item.rbd}`,
        data: [
            item.clec || 0,
            item.mate1 || 0,
            item.mate2 || 0,
            item.hcsoc || 0,
            item.cien || 0
        ],
        backgroundColor: colors[idx % colors.length].bg,
        borderColor: colors[idx % colors.length].border,
        borderWidth: 2,
        pointBackgroundColor: colors[idx % colors.length].border
    }));

    if (radarChart) radarChart.destroy();

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['CLEC', 'MATE 1', 'MATE 2', 'Hª y CS', 'Ciencias'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 1000,
                    ticks: { stepSize: 200 },
                    grid: { color: 'rgba(148, 163, 184, 0.2)' },
                    angleLines: { color: 'rgba(148, 163, 184, 0.2)' }
                }
            }
        }
    });
}

// ========== Distribution Chart ==========
async function loadDistributionChart() {
    const data = await fetchDistribution();
    if (!data) return;

    const ctx = document.getElementById('distributionChart').getContext('2d');

    if (distributionChart) distributionChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)');

    distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.rango),
            datasets: [{
                label: 'Cantidad de Estudiantes',
                data: data.map(d => d.cantidad),
                backgroundColor: gradient,
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ========== Rama Chart ==========
async function loadRamaChart() {
    const data = await fetchByRama();
    if (!data) return;

    const ctx = document.getElementById('ramaChart').getContext('2d');

    if (ramaChart) ramaChart.destroy();

    const colors = [
        'rgba(99, 102, 241, 0.8)',
        'rgba(34, 211, 238, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)'
    ];

    ramaChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.rama),
            datasets: [{
                data: data.map(d => d.cantidad),
                backgroundColor: colors,
                borderColor: 'rgba(15, 23, 42, 1)',
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true }
                }
            }
        }
    });
}

// ========== Comparison Chart ==========
async function loadComparisonChart() {
    const data = await fetchComparison();
    if (!data || data.length < 2) return;

    const ctx = document.getElementById('comparisonChart').getContext('2d');

    if (comparisonChart) comparisonChart.destroy();

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['CLEC', 'MATE 1', 'Ciencias'],
            datasets: [
                {
                    label: 'Proceso Actual',
                    data: [data[0].clec, data[0].mate1, data[0].cien],
                    backgroundColor: 'rgba(34, 211, 238, 0.8)',
                    borderColor: 'rgb(34, 211, 238)',
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: 'Proceso Anterior',
                    data: [data[1].clec, data[1].mate1, data[1].cien],
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true }
                }
            },
            scales: {
                y: { beginAtZero: true, max: 800, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ========== Ranking Data ==========
async function loadRankingData() {
    loadRankingNotas();
    loadRankingPaes();
    loadRankingRbd();
}

async function loadRankingNotas() {
    const data = await fetchRankingNotas();
    if (!data) return;

    const container = document.getElementById('rankingNotasContainer');
    container.innerHTML = createRankingTable(data, 'notas');
}

async function loadRankingPaes() {
    const data = await fetchRankingPaes();
    if (!data) return;

    const container = document.getElementById('rankingPaesContainer');
    container.innerHTML = createRankingTable(data, 'paes');
}

async function loadRankingRbd() {
    const data = await fetchBestByRbd();
    if (!data) return;

    const container = document.getElementById('rankingRbdContainer');
    container.innerHTML = createRbdTable(data);
}

function createRankingTable(data, type) {
    let headers = '';
    let rows = '';

    if (type === 'notas') {
        headers = `
            <tr>
                <th>#</th>
                <th>RBD</th>
                <th>Rama</th>
                <th>Promedio Notas</th>
                <th>NEM</th>
                <th>Ranking</th>
                <th>CLEC</th>
                <th>MATE1</th>
            </tr>`;

        rows = data.map((item, idx) => `
            <tr>
                <td><span class="rank-badge ${getRankClass(idx + 1)}">${idx + 1}</span></td>
                <td>${item.rbd}</td>
                <td>${item.rama_educacional}</td>
                <td><span class="score-badge score-high">${item.promedio_notas}</span></td>
                <td>${item.ptje_nem}</td>
                <td>${item.ptje_ranking}</td>
                <td>${item.clec_reg_actual || '-'}</td>
                <td>${item.mate1_reg_actual || '-'}</td>
            </tr>`).join('');
    } else {
        headers = `
            <tr>
                <th>#</th>
                <th>RBD</th>
                <th>Rama</th>
                <th>CLEC</th>
                <th>MATE1</th>
                <th>MATE2</th>
                <th>Hª y CS</th>
                <th>Ciencias</th>
                <th>Promedio PAES</th>
            </tr>`;

        rows = data.map((item, idx) => `
            <tr>
                <td><span class="rank-badge ${getRankClass(idx + 1)}">${idx + 1}</span></td>
                <td>${item.rbd}</td>
                <td>${item.rama_educacional}</td>
                <td>${item.clec_reg_actual}</td>
                <td>${item.mate1_reg_actual}</td>
                <td>${item.mate2_reg_actual || '-'}</td>
                <td>${item.hcsoc_reg_actual || '-'}</td>
                <td>${item.cien_reg_actual || '-'}</td>
                <td><span class="score-badge ${getScoreClass(item.promedio_paes)}">${Math.round(item.promedio_paes)}</span></td>
            </tr>`).join('');
    }

    return `<table class="ranking-table"><thead>${headers}</thead><tbody>${rows}</tbody></table>`;
}

function createRbdTable(data) {
    const headers = `
        <tr>
            <th>RBD</th>
            <th>Total Estudiantes</th>
            <th>Mejor Promedio</th>
            <th>Mejor CLEC</th>
            <th>Mejor MATE1</th>
        </tr>`;

    const rows = data.map(item => `
        <tr>
            <td><strong>${item.rbd}</strong></td>
            <td>${item.total_estudiantes}</td>
            <td><span class="score-badge score-high">${item.mejor_promedio}</span></td>
            <td>${item.mejor_clec || '-'}</td>
            <td>${item.mejor_mate1 || '-'}</td>
        </tr>`).join('');

    return `<table class="ranking-table"><thead>${headers}</thead><tbody>${rows}</tbody></table>`;
}

// ========== Utility Functions ==========
function formatNumber(num) {
    if (num === null || num === undefined || num === '-') return '-';
    return Number(num).toLocaleString('es-CL');
}

function getRankClass(rank) {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'rank-default';
}

function getScoreClass(score) {
    if (score >= 800) return 'score-high';
    if (score >= 600) return 'score-medium';
    return 'score-low';
}

// ========== PDF Export - Enhanced Version ==========
async function exportToPdf() {
    const btn = document.getElementById('btnExportPdf');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<span>⏳</span> Generando PDF...';
    btn.classList.add('loading');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        // ========== PAGE 1: COVER & KPIs ==========
        // Gradient background
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Decorative top gradient bar
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, 0, pageWidth, 8, 'F');
        pdf.setFillColor(139, 92, 246);
        pdf.rect(0, 8, pageWidth, 4, 'F');

        // Logo placeholder (circle with initials)
        pdf.setFillColor(99, 102, 241);
        pdf.circle(pageWidth / 2, 40, 15, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AS', pageWidth / 2, 44, { align: 'center' });

        // Title
        pdf.setTextColor(241, 245, 249);
        pdf.setFontSize(32);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Dashboard PAES 2025', pageWidth / 2, 70, { align: 'center' });

        // Subtitle
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(148, 163, 184);
        pdf.text('SLEP Andalién Sur - Resultados Consolidados', pageWidth / 2, 82, { align: 'center' });

        // Date badge
        const date = new Date().toLocaleDateString('es-CL', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        pdf.setFillColor(34, 211, 238);
        pdf.roundedRect(pageWidth / 2 - 30, 90, 60, 10, 3, 3, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(10);
        pdf.text(date, pageWidth / 2, 97, { align: 'center' });

        // KPI Section Title
        pdf.setTextColor(34, 211, 238);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('📊 Indicadores Principales', margin, 120);

        // KPI Cards
        const kpiData = [
            { icon: '👥', label: 'Total Estudiantes', value: document.getElementById('kpiTotal').textContent, color: [99, 102, 241] },
            { icon: '📖', label: 'Promedio CLEC', value: document.getElementById('kpiClec').textContent, color: [34, 211, 238] },
            { icon: '🔢', label: 'Promedio MATE1', value: document.getElementById('kpiMate').textContent, color: [16, 185, 129] },
            { icon: '⭐', label: 'Mejor NEM', value: document.getElementById('kpiMaxProm').textContent, color: [245, 158, 11] }
        ];

        const cardWidth = (contentWidth - 15) / 2;
        const cardHeight = 35;

        kpiData.forEach((kpi, i) => {
            const x = margin + (i % 2) * (cardWidth + 5);
            const y = 130 + Math.floor(i / 2) * (cardHeight + 8);

            // Card background
            pdf.setFillColor(30, 41, 59);
            pdf.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'F');

            // Top accent bar
            pdf.setFillColor(...kpi.color);
            pdf.rect(x, y, cardWidth, 3, 'F');

            // Label
            pdf.setTextColor(148, 163, 184);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text(kpi.label.toUpperCase(), x + 8, y + 14);

            // Value
            pdf.setTextColor(241, 245, 249);
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text(kpi.value, x + 8, y + 28);
        });

        // ========== PAGE 2: CHARTS ==========
        pdf.addPage();
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, 0, pageWidth, 6, 'F');

        pdf.setTextColor(34, 211, 238);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('📈 Análisis Gráfico', margin, 20);

        // Charts in 2x2 grid - larger size
        const charts = [
            { id: 'radarChart', title: 'Comparación por Establecimiento' },
            { id: 'distributionChart', title: 'Distribución de Puntajes CLEC' },
            { id: 'ramaChart', title: 'Distribución por Rama Educacional' },
            { id: 'comparisonChart', title: 'Proceso Actual vs Anterior' }
        ];

        const chartW = (contentWidth - 10) / 2;
        const chartH = 75;
        const startY = 30;

        for (let i = 0; i < charts.length; i++) {
            const canvas = document.getElementById(charts[i].id);
            if (canvas) {
                const x = margin + (i % 2) * (chartW + 10);
                const y = startY + Math.floor(i / 2) * (chartH + 20);

                // Chart card background
                pdf.setFillColor(30, 41, 59);
                pdf.roundedRect(x - 2, y - 2, chartW + 4, chartH + 14, 3, 3, 'F');

                // Chart title
                pdf.setTextColor(241, 245, 249);
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text(charts[i].title, x, y + 6);

                // Chart image
                const imgData = canvas.toDataURL('image/png', 1.0);
                pdf.addImage(imgData, 'PNG', x, y + 10, chartW, chartH - 5);
            }
        }

        // ========== PAGE 3: RANKING ==========
        pdf.addPage();
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header
        pdf.setFillColor(245, 158, 11);
        pdf.rect(0, 0, pageWidth, 6, 'F');

        pdf.setTextColor(245, 158, 11);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('🏆 Cuadro de Honor - Top 10 Mejores Promedios', margin, 20);

        // Get ranking data
        const rankingData = await fetchRankingNotas();
        if (rankingData && rankingData.length > 0) {
            // Table header
            const headers = ['#', 'RBD', 'Rama', 'Promedio', 'NEM', 'CLEC', 'MATE1'];
            const colWidths = [12, 22, 25, 30, 28, 30, 30];
            let tableY = 30;

            // Header row
            pdf.setFillColor(99, 102, 241);
            pdf.roundedRect(margin, tableY - 5, contentWidth, 12, 2, 2, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');

            let tableX = margin + 3;
            headers.forEach((h, i) => {
                pdf.text(h, tableX, tableY + 2);
                tableX += colWidths[i];
            });

            tableY += 14;

            // Data rows
            const top10 = rankingData.slice(0, 10);
            top10.forEach((item, idx) => {
                // Alternating row colors
                if (idx % 2 === 0) {
                    pdf.setFillColor(30, 41, 59);
                } else {
                    pdf.setFillColor(38, 50, 72);
                }
                pdf.rect(margin, tableY - 4, contentWidth, 11, 'F');

                // Medal for top 3
                let rankText = (idx + 1).toString();
                if (idx === 0) rankText = '🥇';
                else if (idx === 1) rankText = '🥈';
                else if (idx === 2) rankText = '🥉';

                tableX = margin + 3;

                // Rank
                pdf.setTextColor(245, 158, 11);
                pdf.setFontSize(10);
                pdf.text(rankText, tableX, tableY + 3);
                tableX += colWidths[0];

                // Other columns
                pdf.setTextColor(241, 245, 249);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');

                const rowData = [
                    item.rbd.toString(),
                    (item.rama_educacional || 'H1').substring(0, 4),
                    item.promedio_notas.toString(),
                    item.ptje_nem.toString(),
                    (item.clec_reg_actual || '-').toString(),
                    (item.mate1_reg_actual || '-').toString()
                ];

                rowData.forEach((val, i) => {
                    // Highlight promedio
                    if (i === 2) {
                        pdf.setTextColor(16, 185, 129);
                        pdf.setFont('helvetica', 'bold');
                    } else {
                        pdf.setTextColor(241, 245, 249);
                        pdf.setFont('helvetica', 'normal');
                    }
                    pdf.text(val, tableX, tableY + 3);
                    tableX += colWidths[i + 1];
                });

                tableY += 11;
            });
        }

        // ========== FOOTER ON ALL PAGES ==========
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);

            // Footer background
            pdf.setFillColor(20, 30, 48);
            pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');

            // Footer text
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 6);
            pdf.text('Dashboard PAES 2025 - SLEP Andalién Sur', margin, pageHeight - 6);

            // Credits on page 1
            if (i === 1) {
                pdf.setTextColor(148, 163, 184);
                pdf.setFontSize(8);
                pdf.text('Generado por IA y Ricardo Acevedo Carrasco | Enero 2026', pageWidth / 2, pageHeight - 6, { align: 'center' });
            }
        }

        // Save PDF
        pdf.save(`Informe_PAES_2025_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error al generar el PDF. Intente nuevamente.');
    } finally {
        btn.innerHTML = originalText;
        btn.classList.remove('loading');
    }
}
