/**
 * Supabase API - Dashboard PAES 2025
 * Reemplaza las llamadas PHP por consultas directas a Supabase
 */

// ============ CONFIGURACIÓN SUPABASE ============
const SUPABASE_URL = 'https://euwwsranoitzthwlwrms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WzhKy9rdFmlwAeeetTRa5g_lYNr5l2A';

// Initialize Supabase client
let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// ============ API FUNCTIONS ============

// Estadísticas generales
async function fetchStats() {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('*')
        .range(0, 2000);  // Supabase default limit is 1000, we need all 1601

    if (error) {
        console.error('Error fetching stats:', error);
        return null;
    }

    const total = data.length;
    const clecValues = data.filter(d => d.clec_reg_actual > 0).map(d => d.clec_reg_actual);
    const mate1Values = data.filter(d => d.mate1_reg_actual > 0).map(d => d.mate1_reg_actual);

    return {
        total_estudiantes: total,
        prom_clec: Math.round(clecValues.reduce((a, b) => a + b, 0) / clecValues.length) || 0,
        prom_mate1: Math.round(mate1Values.reduce((a, b) => a + b, 0) / mate1Values.length) || 0,
        max_promedio: Math.max(...data.map(d => d.promedio_notas))
    };
}

// Estadísticas por RBD (para radar chart)
async function fetchStatsByRbd(limit = 8) {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('rbd, clec_reg_actual, mate1_reg_actual, mate2_reg_actual, hcsoc_reg_actual, cien_reg_actual')
        .range(0, 2000);

    if (error) return [];

    // Agrupar por RBD
    const grouped = {};
    data.forEach(item => {
        if (!grouped[item.rbd]) {
            grouped[item.rbd] = { rbd: item.rbd, clec: [], mate1: [], mate2: [], hcsoc: [], cien: [], count: 0 };
        }
        if (item.clec_reg_actual > 0) grouped[item.rbd].clec.push(item.clec_reg_actual);
        if (item.mate1_reg_actual > 0) grouped[item.rbd].mate1.push(item.mate1_reg_actual);
        if (item.mate2_reg_actual > 0) grouped[item.rbd].mate2.push(item.mate2_reg_actual);
        if (item.hcsoc_reg_actual > 0) grouped[item.rbd].hcsoc.push(item.hcsoc_reg_actual);
        if (item.cien_reg_actual > 0) grouped[item.rbd].cien.push(item.cien_reg_actual);
        grouped[item.rbd].count++;
    });

    // Calcular promedios
    const result = Object.values(grouped)
        .filter(g => g.count >= 10)
        .map(g => ({
            rbd: g.rbd,
            total: g.count,
            clec: Math.round(g.clec.reduce((a, b) => a + b, 0) / g.clec.length) || 0,
            mate1: Math.round(g.mate1.reduce((a, b) => a + b, 0) / g.mate1.length) || 0,
            mate2: Math.round(g.mate2.reduce((a, b) => a + b, 0) / g.mate2.length) || 0,
            hcsoc: Math.round(g.hcsoc.reduce((a, b) => a + b, 0) / g.hcsoc.length) || 0,
            cien: Math.round(g.cien.reduce((a, b) => a + b, 0) / g.cien.length) || 0
        }))
        .sort((a, b) => (b.clec + b.mate1) - (a.clec + a.mate1))
        .slice(0, limit);

    return result;
}

// Estadísticas por RBDs específicos (filtrados)
async function fetchStatsByRbdFiltered(rbds) {
    if (!rbds || rbds.length === 0) return fetchStatsByRbd();

    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('rbd, clec_reg_actual, mate1_reg_actual, mate2_reg_actual, hcsoc_reg_actual, cien_reg_actual')
        .in('rbd', rbds)
        .range(0, 2000);

    if (error) return [];

    // Agrupar por RBD
    const grouped = {};
    data.forEach(item => {
        if (!grouped[item.rbd]) {
            grouped[item.rbd] = { rbd: item.rbd, clec: [], mate1: [], mate2: [], hcsoc: [], cien: [], count: 0 };
        }
        if (item.clec_reg_actual > 0) grouped[item.rbd].clec.push(item.clec_reg_actual);
        if (item.mate1_reg_actual > 0) grouped[item.rbd].mate1.push(item.mate1_reg_actual);
        if (item.mate2_reg_actual > 0) grouped[item.rbd].mate2.push(item.mate2_reg_actual);
        if (item.hcsoc_reg_actual > 0) grouped[item.rbd].hcsoc.push(item.hcsoc_reg_actual);
        if (item.cien_reg_actual > 0) grouped[item.rbd].cien.push(item.cien_reg_actual);
        grouped[item.rbd].count++;
    });

    return Object.values(grouped).map(g => ({
        rbd: g.rbd,
        total: g.count,
        clec: Math.round(g.clec.reduce((a, b) => a + b, 0) / g.clec.length) || 0,
        mate1: Math.round(g.mate1.reduce((a, b) => a + b, 0) / g.mate1.length) || 0,
        mate2: Math.round(g.mate2.reduce((a, b) => a + b, 0) / g.mate2.length) || 0,
        hcsoc: Math.round(g.hcsoc.reduce((a, b) => a + b, 0) / g.hcsoc.length) || 0,
        cien: Math.round(g.cien.reduce((a, b) => a + b, 0) / g.cien.length) || 0
    }));
}

// Distribución de puntajes CLEC
async function fetchDistribution() {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('clec_reg_actual')
        .gt('clec_reg_actual', 0)
        .range(0, 2000);

    if (error) return [];

    const ranges = {
        '100-399': 0, '400-499': 0, '500-599': 0,
        '600-699': 0, '700-799': 0, '800-899': 0, '900+': 0
    };

    data.forEach(d => {
        const score = d.clec_reg_actual;
        if (score >= 900) ranges['900+']++;
        else if (score >= 800) ranges['800-899']++;
        else if (score >= 700) ranges['700-799']++;
        else if (score >= 600) ranges['600-699']++;
        else if (score >= 500) ranges['500-599']++;
        else if (score >= 400) ranges['400-499']++;
        else ranges['100-399']++;
    });

    return Object.entries(ranges).map(([rango, cantidad]) => ({ rango, cantidad }));
}

// Distribución por rama educacional
async function fetchByRama() {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('rama_educacional, promedio_notas')
        .range(0, 2000);

    if (error) return [];

    const grouped = {};
    data.forEach(item => {
        const rama = item.rama_educacional || 'H1';
        if (!grouped[rama]) {
            grouped[rama] = { rama, count: 0, notas: [] };
        }
        grouped[rama].count++;
        if (item.promedio_notas > 0) grouped[rama].notas.push(item.promedio_notas);
    });

    return Object.values(grouped)
        .map(g => ({
            rama: g.rama,
            cantidad: g.count,
            prom_notas: (g.notas.reduce((a, b) => a + b, 0) / g.notas.length).toFixed(2)
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

// Comparación actual vs anterior
async function fetchComparison() {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('clec_reg_actual, mate1_reg_actual, cien_reg_actual, clec_reg_anterior, mate1_reg_anterior')
        .range(0, 2000);

    if (error) return [];

    const actual = data.filter(d => d.clec_reg_actual > 0);
    const anterior = data.filter(d => d.clec_reg_anterior > 0);

    return [
        {
            periodo: 'Actual',
            clec: Math.round(actual.reduce((a, b) => a + b.clec_reg_actual, 0) / actual.length) || 0,
            mate1: Math.round(actual.reduce((a, b) => a + b.mate1_reg_actual, 0) / actual.length) || 0,
            cien: Math.round(actual.reduce((a, b) => a + (b.cien_reg_actual || 0), 0) / actual.length) || 0
        },
        {
            periodo: 'Anterior',
            clec: Math.round(anterior.reduce((a, b) => a + b.clec_reg_anterior, 0) / anterior.length) || 0,
            mate1: Math.round(anterior.reduce((a, b) => a + (b.mate1_reg_anterior || 0), 0) / anterior.length) || 0,
            cien: 0
        }
    ];
}

// Ranking mejores notas
async function fetchRankingNotas() {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('*')
        .gt('promedio_notas', 0)
        .order('promedio_notas', { ascending: false })
        .limit(20);

    return error ? [] : data;
}

// Ranking mejores puntajes PAES
async function fetchRankingPaes() {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('*')
        .gt('clec_reg_actual', 0)
        .gt('mate1_reg_actual', 0)
        .range(0, 2000);

    if (error) return [];

    return data
        .map(d => ({
            ...d,
            promedio_paes: (d.clec_reg_actual + d.mate1_reg_actual) / 2
        }))
        .sort((a, b) => b.promedio_paes - a.promedio_paes)
        .slice(0, 20);
}

// Mejores por RBD
async function fetchBestByRbd() {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('rbd, promedio_notas, clec_reg_actual, mate1_reg_actual')
        .range(0, 2000);

    if (error) return [];

    const grouped = {};
    data.forEach(item => {
        if (!grouped[item.rbd]) {
            grouped[item.rbd] = {
                rbd: item.rbd,
                mejor_promedio: 0,
                mejor_clec: 0,
                mejor_mate1: 0,
                total_estudiantes: 0
            };
        }
        grouped[item.rbd].total_estudiantes++;
        grouped[item.rbd].mejor_promedio = Math.max(grouped[item.rbd].mejor_promedio, item.promedio_notas || 0);
        grouped[item.rbd].mejor_clec = Math.max(grouped[item.rbd].mejor_clec, item.clec_reg_actual || 0);
        grouped[item.rbd].mejor_mate1 = Math.max(grouped[item.rbd].mejor_mate1, item.mate1_reg_actual || 0);
    });

    return Object.values(grouped).sort((a, b) => b.mejor_promedio - a.mejor_promedio);
}

// Obtener filtros disponibles
async function fetchFilters() {
    const { data, error } = await getSupabase()
        .from('resultados_paes')
        .select('rbd, codigo_comuna, rama_educacional')
        .range(0, 2000);

    if (error) return { rbds: [], comunas: [], ramas: [] };

    return {
        rbds: [...new Set(data.map(d => d.rbd))].sort((a, b) => a - b),
        comunas: [...new Set(data.map(d => d.codigo_comuna))].filter(Boolean).sort((a, b) => a - b),
        ramas: [...new Set(data.map(d => d.rama_educacional))].filter(Boolean).sort()
    };
}

// Datos filtrados
async function fetchFiltered(filters) {
    let query = getSupabase().from('resultados_paes').select('*');

    if (filters.rbds && filters.rbds.length > 0) {
        query = query.in('rbd', filters.rbds);
    }
    if (filters.comuna) {
        query = query.eq('codigo_comuna', filters.comuna);
    }
    if (filters.rama) {
        query = query.eq('rama_educacional', filters.rama);
    }

    const { data, error } = await query.range(0, 2000);

    if (error) return null;

    const clecValues = data.filter(d => d.clec_reg_actual > 0).map(d => d.clec_reg_actual);
    const mate1Values = data.filter(d => d.mate1_reg_actual > 0).map(d => d.mate1_reg_actual);

    return {
        total_estudiantes: data.length,
        prom_clec: Math.round(clecValues.reduce((a, b) => a + b, 0) / clecValues.length) || 0,
        prom_mate1: Math.round(mate1Values.reduce((a, b) => a + b, 0) / mate1Values.length) || 0,
        prom_notas: (data.reduce((a, b) => a + (b.promedio_notas || 0), 0) / data.length).toFixed(2)
    };
}
