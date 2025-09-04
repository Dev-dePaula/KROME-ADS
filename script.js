document.addEventListener('DOMContentLoaded', () => {

    // ======================= CONFIGURAÇÕES DA API DO META =======================
    const ACCESS_TOKEN = 'EAAsMEK8FyKkBPSoo31FGe4N1VKQZC2oqvHimlONAAMCHNJtySXhlf4ul9O8GPNB8hOpwnw98vENKydFVJPXmArz0GHJIR05qmHl6XuuXuKOUeoQMkLIlNjU77PLz1EIXJDvDMYmESBAZBt0mmphtBlXZACGy8Hs2YZCaxZAohknhuywiyB14CCb2fyXHZBN0DLkxZBtJMwVZCQ2cRhiaNDjIviNctrZAJsyZC7fQMKHZCnX';
    const AD_ACCOUNT_ID = 'act_664801212713219';

    // Funções de formatação para reutilização
    const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;
    const formatNumber = (value) => value.toLocaleString('pt-BR');
    const formatPercentage = (value) => `${parseFloat(value).toFixed(2)}%`;
    const formatFloat = (value) => parseFloat(value).toFixed(2);
    const translateRanking = (ranking) => {
        if (!ranking) return 'N/A';
        const translations = {
            'ABOVE_AVERAGE': 'Acima da média',
            'AVERAGE': 'Na média',
            'BELOW_AVERAGE_10': 'Abaixo da média (10%)',
            'BELOW_AVERAGE_20': 'Abaixo da média (20%)',
            'BELOW_AVERAGE_35': 'Abaixo da média (35%)',
        };
        const genericRanking = ranking.replace(/_PERCENT$/, '');
        return translations[genericRanking] || ranking.replace(/_/g, ' ').toLowerCase();
    };

    // ======================= FUNÇÃO 1: BUSCAR DADOS GERAIS (PARA OS CARDS) =======================
    async function fetchAccountMetrics() {
        const fields = 'spend,impressions,reach,actions,cost_per_action_type,cost_per_result';
        const apiUrl = `https://graph.facebook.com/v20.0/${AD_ACCOUNT_ID}/insights?level=account&fields=${fields}&date_preset=last_30d&access_token=${ACCESS_TOKEN}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API (Dados Gerais): ${errorData.error.message}`);
            }
            const data = await response.json();
            return data.data[0];
        } catch (error) {
            console.error(error);
            return null;
        }
    }
    
    // ======================= FUNÇÃO 2A: BUSCAR DETALHES DAS CAMPANHAS (CONFIGURAÇÕES) =======================
    async function fetchCampaignDetails() {
        const fields = 'id,name,bid_strategy';
        const apiUrl = `https://graph.facebook.com/v20.0/${AD_ACCOUNT_ID}/campaigns?fields=${fields}&limit=100&access_token=${ACCESS_TOKEN}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Falha ao buscar detalhes das campanhas');
            const data = await response.json();
            return data.data.reduce((map, campaign) => {
                map[campaign.id] = { name: campaign.name, bid_strategy: campaign.bid_strategy };
                return map;
            }, {});
        } catch (error) {
            console.error(error);
            return {};
        }
    }

    // ======================= FUNÇÃO 2B: BUSCAR INSIGHTS DAS CAMPANHAS (PERFORMANCE) =======================
    async function fetchCampaignInsights() {
        const fields = 'campaign_id,spend,impressions,results,cost_per_result,actions,purchase_roas,frequency,ctr,quality_ranking,engagement_rate_ranking,conversion_rate_ranking';
        const apiUrl = `https://graph.facebook.com/v20.0/${AD_ACCOUNT_ID}/insights?level=campaign&fields=${fields}&date_preset=last_30d&limit=100&access_token=${ACCESS_TOKEN}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Falha ao buscar insights das campanhas');
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    // ======================= FUNÇÃO PARA POPULAR OS CARDS DE RESUMO =======================
    function updateDashboardCards(insights) {
        if (!insights) {
             document.querySelectorAll('.metric-card p').forEach(p => p.textContent = 'Erro');
             return;
        }
        const valorGasto = parseFloat(insights.spend || 0);
        const impressoes = parseInt(insights.impressions || 0);
        const alcance = parseInt(insights.reach || 0);
        const custoPorResultado = parseFloat(insights.cost_per_result || 0);
        const leadAction = insights.actions?.find(a => a.action_type === 'lead');
        const totalLeads = leadAction ? parseInt(leadAction.value) : 0;
        const cplAction = insights.cost_per_action_type?.find(a => a.action_type === 'lead');
        const custoPorLead = cplAction ? parseFloat(cplAction.value) : 0;

        document.getElementById('valor-gasto').textContent = formatCurrency(valorGasto);
        document.getElementById('impressoes').textContent = formatNumber(impressoes);
        document.getElementById('alcance').textContent = formatNumber(alcance);
        document.getElementById('total-leads').textContent = formatNumber(totalLeads);
        document.getElementById('cpr').textContent = formatCurrency(custoPorResultado);
        document.getElementById('cpl').textContent = formatCurrency(custoPorLead);
    }

    // ======================= FUNÇÃO PARA POPULAR A TABELA DE CAMPANHAS =======================
    function populateCampaignTable(campaignInsights, campaignDetails) {
        const tableBody = document.getElementById('campaign-table-body');
        tableBody.innerHTML = ''; 

        if (campaignInsights.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">Nenhum dado de campanha encontrado.</td></tr>';
            return;
        }

        campaignInsights.forEach(insight => {
            const details = campaignDetails[insight.campaign_id] || { name: 'Nome não encontrado', bid_strategy: 'N/A' };
            const results = insight.results ? insight.results[0]?.value || 0 : 0;
            const purchaseAction = insight.actions?.find(a => a.action_type === 'purchase');
            const compras = purchaseAction ? parseInt(purchaseAction.value) : 0;
            const purchaseRoasAction = insight.purchase_roas?.find(r => r.action_type === 'purchase');
            const roas = purchaseRoasAction ? parseFloat(purchaseRoasAction.value) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${details.name}</td>
                <td>${(details.bid_strategy || 'N/A').replace(/_/g, ' ')}</td>
                <td>${formatCurrency(parseFloat(insight.spend || 0))}</td>
                <td>${formatNumber(parseInt(insight.impressions || 0))}</td>
                <td>${formatNumber(parseInt(results))}</td>
                <td>${formatCurrency(parseFloat(insight.cost_per_result || 0))}</td>
                <td>${formatNumber(compras)}</td>
                <td>${formatFloat(roas)}</td>
                <td>${formatFloat(insight.frequency || 0)}</td>
                <td>${formatPercentage(insight.ctr || 0)}</td>
                <td>${translateRanking(insight.quality_ranking)}</td>
                <td>${translateRanking(insight.engagement_rate_ranking)}</td>
                <td>${translateRanking(insight.conversion_rate_ranking)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // ======================= INICIALIZAÇÃO =======================
    async function initializeDashboard() {
        document.querySelectorAll('.metric-card p').forEach(p => p.textContent = '...');
        const tableBody = document.getElementById('campaign-table-body');
        tableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">Carregando dados...</td></tr>';
        
        const [accountData, campaignDetails, campaignInsights] = await Promise.all([
            fetchAccountMetrics(),
            fetchCampaignDetails(),
            fetchCampaignInsights()
        ]);

        updateDashboardCards(accountData);
        populateCampaignTable(campaignInsights, campaignDetails);
    }

    initializeDashboard();

});
