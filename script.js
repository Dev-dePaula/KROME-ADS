document.addEventListener('DOMContentLoaded', () => {

    // ======================= LISTA DE CLIENTES =======================
    // ATENÇÃO: PREENCHA AQUI COM OS DADOS DOS SEUS CLIENTES
    // Para cada cliente, adicione um objeto com nome, ID da conta e o Token de Acesso.
    const clients = [
        {
            name: 'Cliente - Roberta Nunes',
            adAccountId: 'act_664801212713219',
            accessToken: 'EAAsMEK8FyKkBPVZCb2ZCZA8LZAz3JZB5wzzs809SbuaI0JaL1zde24Bh8FpNvZAGCftotbBZA7qhdPkTNzskIa9u843YG7ZBNLNrZBQQNnVsGia1Kmg5D7Q0qRwOuXZCP4DDKGSEhiaYtedZBvvgrYdr9CfOmLyNjFeSqoqtQLL5dsQM2d8rv9lQ0a3erXQDPH24Ibo2NZCGClrT4MGlGdHVRoHZA9RV90SxhYuU80uKr8ZBsZD'
        },
        {
            name: 'Cliente - Carlos Bucaneiro',
            adAccountId: 'act_921227669694316',
            accessToken: 'EAAsMEK8FyKkBPQTsYolmPHtFfleKZBPQlqbxeZCKRmnkDRl5FEvC3n6OvypaMagzNV2GhbEtYymsrPJU5xPddm5akrsBT1lVcLPuFeREoc2rQXNgmesKlPoyTHZCJAPcpZBRV0vVzwEQ16ZBd1yddq1tsAmq3tyic12O2msFsOVA4qdcp3oEU33ag0VPnvGvZCqcPtSZA6lZAlb9swRJ8XwiEPryQb6Q8LiCZBcYLYXcZD'
        },
        {
            name: 'Cliente C - Delivery',
            adAccountId: 'act_333333333333333',
            accessToken: 'SEU_TOKEN_DE_ACESSO_PARA_CLIENTE_C'
        }
        // Adicione quantos clientes precisar...
    ];

    // Funções de formatação
    const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;
    const formatNumber = (value) => value.toLocaleString('pt-BR');
    const formatPercentage = (value) => `${parseFloat(value).toFixed(2)}%`;

    // As funções de busca agora recebem as credenciais como parâmetros
    async function fetchAccountMetrics(adAccountId, accessToken) {
        const fields = 'spend,reach,ctr,actions';
        const apiUrl = `https://graph.facebook.com/v20.0/${adAccountId}/insights?level=account&fields=${fields}&date_preset=last_30d&access_token=${accessToken}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Falha ao buscar dados gerais');
        const data = await response.json();
        return data.data[0];
    }

    async function fetchCampaignMetrics(adAccountId, accessToken) {
        const fields = 'campaign_name,spend,reach,ctr,actions';
        const apiUrl = `https://graph.facebook.com/v20.0/${adAccountId}/insights?level=campaign&fields=${fields}&date_preset=last_30d&limit=100&access_token=${accessToken}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Falha ao buscar dados de campanha');
        const data = await response.json();
        return data.data;
    }

    // Funções para popular o dashboard
    function updateDashboardCards(insights) {
        if (!insights) {
            document.querySelectorAll('.metric-card p').forEach(p => p.textContent = '--');
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

    // ======================= NOVA LÓGICA DE CONTROLE =======================

    async function loadClientData(client) {
        document.querySelectorAll('.metric-card p').forEach(p => p.textContent = '...');
        const tableBody = document.getElementById('campaign-table-body');
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando dados...</td></tr>';
        
        try {
            const [accountData, campaignData] = await Promise.all([
                fetchAccountMetrics(client.adAccountId, client.accessToken),
                fetchCampaignMetrics(client.adAccountId, client.accessToken)
            ]);
            updateDashboardCards(accountData);
            populateCampaignTable(campaignData);
        } catch (error) {
            console.error("Erro ao carregar dados do cliente:", error);
            alert("Não foi possível carregar os dados. Verifique o ID da conta e o Token de Acesso.");
            document.querySelectorAll('.metric-card p').forEach(p => p.textContent = '--');
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Falha ao carregar.</td></tr>';
        }
    }

    function populateClientSelector() {
        const selector = document.getElementById('client-selector');
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.adAccountId;
            option.textContent = client.name;
            selector.appendChild(option);
        });
    }

    // ======================= INICIALIZAÇÃO =======================
    function initializeDashboard() {
        const selector = document.getElementById('client-selector');
        
        populateClientSelector();

        selector.addEventListener('change', (event) => {
            const selectedAccountId = event.target.value;
            if (selectedAccountId) {
                const selectedClient = clients.find(c => c.adAccountId === selectedAccountId);
                loadClientData(selectedClient);
            }
        });
    }

    initializeDashboard();
});


