document.addEventListener('DOMContentLoaded', () => {

    // ======================= CONFIGURAÇÕES DA API DO META =======================
    const ACCESS_TOKEN = 'EAAsMEK8FyKkBPVZCb2ZCZA8LZAz3JZB5wzzs809SbuaI0JaL1zde24Bh8FpNvZAGCftotbBZA7qhdPkTNzskIa9u843YG7ZBNLNrZBQQNnVsGia1Kmg5D7Q0qRwOuXZCP4DDKGSEhiaYtedZBvvgrYdr9CfOmLyNjFeSqoqtQLL5dsQM2d8rv9lQ0a3erXQDPH24Ibo2NZCGClrT4MGlGdHVRoHZA9RV90SxhYuU80uKr8ZBsZD';
    const AD_ACCOUNT_ID = 'act_664801212713219';

    // Funções de formatação
    const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;
    const formatNumber = (value) => value.toLocaleString('pt-BR');
    const formatPercentage = (value) => `${parseFloat(value).toFixed(2)}%`;

    // ======================= FUNÇÃO 1: BUSCAR DADOS GERAIS (PARA OS CARDS) =======================
    async function fetchAccountMetrics() {
        const fields = 'spend,reach,ctr,actions';
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

    // ======================= FUNÇÃO 2: BUSCAR DADOS POR CAMPANHA (PARA A TABELA) =======================
    async function fetchCampaignMetrics() {
        const fields = 'campaign_name,spend,reach,ctr,actions';
        const apiUrl = `https://graph.facebook.com/v20.0/${AD_ACCOUNT_ID}/insights?level=campaign&fields=${fields}&date_preset=last_30d&limit=100&access_token=${ACCESS_TOKEN}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API (Dados de Campanha): ${errorData.error.message}`);
            }
            const data = await response.json();
            return data.data; // Retorna o array de todas as campanhas
        } catch (error) {
            console.error(error);
            return []; // Retorna um array vazio em caso de erro
        }
    }

    // ======================= FUNÇÃO PARA POPULAR OS CARDS DE RESUMO =======================
    function updateDashboardCards(insights) {
        if (!insights) {
             document.querySelectorAll('.metric-card p').forEach(p => p.textContent = 'Erro');
             return;
        }
        const valorInvestido = parseFloat(insights.spend || 0);
        document.getElementById('valor-investido').textContent = formatCurrency(valorInvestido);

        const profileVisitAction = insights.actions?.find(a => a.action_type === 'instagram_profile_visits');
        const visitasPerfil = profileVisitAction ? parseInt(profileVisitAction.value) : 0;
        document.getElementById('visitas-perfil').textContent = formatNumber(visitasPerfil);

        const alcance = parseInt(insights.reach || 0);
        document.getElementById('alcance').textContent = formatNumber(alcance);

        const ctr = parseFloat(insights.ctr || 0);
        document.getElementById('ctr').textContent = formatPercentage(ctr);
    }

    // ======================= FUNÇÃO PARA POPULAR A TABELA DE CAMPANHAS =======================
    function populateCampaignTable(campaignData) {
        const tableBody = document.getElementById('campaign-table-body');
        tableBody.innerHTML = ''; 

        if (campaignData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhuma campanha encontrada.</td></tr>';
            return;
        }

        campaignData.forEach(campaign => {
            const profileVisitAction = campaign.actions?.find(a => a.action_type === 'instagram_profile_visits');
            const visitasPerfil = profileVisitAction ? parseInt(profileVisitAction.value) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${campaign.campaign_name}</td>
                <td>${formatCurrency(parseFloat(campaign.spend || 0))}</td>
                <td>${formatNumber(visitasPerfil)}</td>
                <td>${formatNumber(parseInt(campaign.reach || 0))}</td>
                <td>${formatPercentage(campaign.ctr || 0)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // ======================= INICIALIZAÇÃO =======================
    async function initializeDashboard() {
        document.querySelectorAll('.metric-card p').forEach(p => p.textContent = '...');
        const tableBody = document.getElementById('campaign-table-body');
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando dados...</td></tr>';
        
        // Busca todos os dados em paralelo
        const [accountData, campaignData] = await Promise.all([
            fetchAccountMetrics(),
            fetchCampaignMetrics()
        ]);

        // Popula as duas seções
        updateDashboardCards(accountData);
        populateCampaignTable(campaignData);
    }

    initializeDashboard();
});
