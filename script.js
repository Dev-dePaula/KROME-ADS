document.addEventListener('DOMContentLoaded', () => {

    // ======================= CONFIGURAÇÃO MESTRE DE MÉTRICAS =======================
    const availableMetrics = [
        { id: 'spend', label: 'Valor Gasto', group: 'Custo', format: 'currency' },
        { id: 'impressions', label: 'Impressões', group: 'Desempenho', format: 'number' },
        { id: 'reach', label: 'Alcance', group: 'Desempenho', format: 'number' },
        { id: 'frequency', label: 'Frequência', group: 'Desempenho', format: 'float' },
        { id: 'clicks', label: 'Cliques (Todos)', group: 'Desempenho', format: 'number' },
        { id: 'ctr', label: 'CTR (%)', group: 'Desempenho', format: 'percentage' },
        { id: 'cpc', label: 'CPC (Custo por Clique)', group: 'Custo', format: 'currency' },
        { id: 'cpm', label: 'CPM (Custo por Mil Imp.)', group: 'Custo', format: 'currency' },
        { id: 'purchase_roas', label: 'ROAS (Compra)', group: 'Conversões', format: 'roas' },
        { id: 'action_instagram_profile_visits', label: 'Visitas ao Perfil', group: 'Ações', format: 'action', actionType: 'instagram_profile_visits' },
        { id: 'action_purchase', label: 'Compras', group: 'Conversões', format: 'action', actionType: 'purchase' },
        { id: 'action_lead', label: 'Leads (Cadastro)', group: 'Conversões', format: 'action', actionType: 'lead' }
    ];

    // ======================= ESTADO DA APLICAÇÃO =======================
    let clients = JSON.parse(localStorage.getItem('crmClients')) || [];
    let selectedMetrics = JSON.parse(localStorage.getItem('crmSelectedMetrics')) || ['spend', 'reach', 'ctr', 'action_instagram_profile_visits'];
    
    let currentClient = null;
    let currentAccountData = null;
    let currentCampaignData = null;

    // Funções de formatação
    const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;
    const formatNumber = (value) => value.toLocaleString('pt-BR');
    const formatPercentage = (value) => `${parseFloat(value).toFixed(2)}%`;
    const formatFloat = (value) => parseFloat(value).toFixed(2);

    // ======================= LÓGICA DE API DINÂMICA =======================
    function getApiFields() {
        const fields = new Set(['campaign_name']);
        selectedMetrics.forEach(metricId => {
            const metricConfig = availableMetrics.find(m => m.id === metricId);
            if (!metricConfig) return;

            if (metricConfig.format === 'action') {
                fields.add('actions');
            } else if (metricConfig.format === 'roas') {
                fields.add('purchase_roas');
            } else {
                fields.add(metricConfig.id);
            }
        });
        return Array.from(fields).join(',');
    }
    
    async function fetchAccountMetrics(adAccountId, accessToken) {
        const fields = 'spend,reach,ctr,actions'; // Os cards são fixos, então a API call pode ser fixa
        const apiUrl = `https://graph.facebook.com/v20.0/${adAccountId}/insights?level=account&fields=${fields}&date_preset=last_30d&access_token=${accessToken}`;
        const response = await fetch(apiUrl);
        if (!response.ok) { const d = await response.json(); throw new Error(d.error.message); }
        const data = await response.json();
        return data.data[0];
    }

    async function fetchCampaignMetrics(adAccountId, accessToken) {
        const fields = getApiFields();
        const apiUrl = `https://graph.facebook.com/v20.0/${adAccountId}/insights?level=campaign&fields=${fields}&date_preset=last_30d&limit=100&access_token=${accessToken}`;
        const response = await fetch(apiUrl);
        if (!response.ok) { const d = await response.json(); throw new Error(d.error.message); }
        const data = await response.json();
        return data.data;
    }
    
    // ======================= RENDERIZAÇÃO DINÂMICA DE TABELAS =======================
    function populateDynamicTable(tableBodyId, campaignData) {
        const tableBody = document.getElementById(tableBodyId);
        const tableHead = tableBody.previousElementSibling.querySelector('tr');
        tableBody.innerHTML = '';
        tableHead.innerHTML = '';

        // 1. Criar Cabeçalho Dinâmico
        tableHead.innerHTML = '<th>Nome da Campanha</th>';
        const activeMetrics = availableMetrics.filter(m => selectedMetrics.includes(m.id));
        activeMetrics.forEach(metric => {
            tableHead.innerHTML += `<th>${metric.label}</th>`;
        });

        // 2. Popular Linhas Dinamicamente
        if (!campaignData || campaignData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${activeMetrics.length + 1}" style="text-align:center;">Nenhuma campanha encontrada.</td></tr>`;
            return;
        }

        campaignData.forEach(campaign => {
            let rowHtml = `<td>${campaign.campaign_name}</td>`;
            activeMetrics.forEach(metric => {
                let value = '--';
                let rawValue = campaign[metric.id];

                if (metric.format === 'action') {
                    const action = campaign.actions?.find(a => a.action_type === metric.actionType);
                    value = formatNumber(action ? parseInt(action.value) : 0);
                } else if (metric.format === 'roas') {
                    const roasAction = campaign.purchase_roas?.find(r => r.action_type === 'purchase');
                    value = formatFloat(roasAction ? roasAction.value : 0);
                } else if (rawValue !== undefined && rawValue !== null) {
                    switch (metric.format) {
                        case 'currency': value = formatCurrency(parseFloat(rawValue)); break;
                        case 'number': value = formatNumber(parseInt(rawValue)); break;
                        case 'percentage': value = formatPercentage(rawValue); break;
                        case 'float': value = formatFloat(rawValue); break;
                        default: value = rawValue;
                    }
                }
                rowHtml += `<td>${value}</td>`;
            });
            tableBody.innerHTML += `<tr>${rowHtml}</tr>`;
        });
    }

    // ======================= RENDERIZAÇÃO DE PÁGINAS =======================
    function updateDashboardCards(insights) {
        if (!insights) {
            document.querySelectorAll('#dashboard-view .metric-card p').forEach(p => p.textContent = '--');
            return;
        }
        document.getElementById('valor-investido').textContent = formatCurrency(parseFloat(insights.spend || 0));
        const profileVisitAction = insights.actions?.find(a => a.action_type === 'instagram_profile_visits');
        document.getElementById('visitas-perfil').textContent = formatNumber(profileVisitAction ? parseInt(profileVisitAction.value) : 0);
        document.getElementById('alcance').textContent = formatNumber(parseInt(insights.reach || 0));
        document.getElementById('ctr').textContent = formatPercentage(insights.ctr || 0);
    }

    function renderReport() {
        if (!currentClient || !currentAccountData) {
            document.getElementById('report-client-name').textContent = 'Nenhum Cliente Selecionado';
            document.querySelectorAll('#reports-view .metric-card p').forEach(p => p.textContent = '--');
            populateDynamicTable('report-campaign-table-body', []);
            return;
        }
        document.getElementById('report-client-name').textContent = currentClient.name;
        // Atualiza os cards fixos do relatório
        document.getElementById('report-valor-investido').textContent = formatCurrency(parseFloat(currentAccountData.spend || 0));
        const profileVisitAction = currentAccountData.actions?.find(a => a.action_type === 'instagram_profile_visits');
        document.getElementById('report-visitas-perfil').textContent = formatNumber(profileVisitAction ? parseInt(profileVisitAction.value) : 0);
        document.getElementById('report-alcance').textContent = formatNumber(parseInt(currentAccountData.reach || 0));
        document.getElementById('report-ctr').textContent = formatPercentage(currentAccountData.ctr || 0);
        // Atualiza a tabela dinâmica do relatório
        populateDynamicTable('report-campaign-table-body', currentCampaignData);
    }

    async function generatePDF() {
        const downloadBtn = document.getElementById('download-pdf-btn');
        const reportContent = document.getElementById('report-content');
        if (!currentClient) { alert("Selecione um cliente para gerar um relatório."); return; }
        downloadBtn.textContent = 'Gerando...';
        downloadBtn.disabled = true;
        const canvas = await html2canvas(reportContent, { scale: 2, backgroundColor: '#1a1a2e' });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`Relatorio_${currentClient.name.replace(/\s/g, '_')}.pdf`);
        downloadBtn.innerHTML = '<i class="ph ph-download-simple"></i> Baixar Relatório em PDF';
        downloadBtn.disabled = false;
    }

    // ======================= GESTÃO DE CLIENTES E CONFIGURAÇÕES =======================
    function saveClients() { localStorage.setItem('crmClients', JSON.stringify(clients)); }

    function renderClientsOnSettingsPage() {
        const list = document.getElementById('client-list');
        list.innerHTML = '';
        if (clients.length === 0) { list.innerHTML = '<li>Nenhum cliente cadastrado.</li>'; return; }
        clients.forEach((client, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<div class="client-info"><strong>${client.name}</strong><span>ID: ${client.adAccountId}</span></div><button class="btn-danger" data-index="${index}">Remover</button>`;
            list.appendChild(listItem);
        });
    }

    function handleAddClient(event) {
        event.preventDefault();
        const newClient = { name: document.getElementById('client-name').value, adAccountId: document.getElementById('ad-account-id').value, accessToken: document.getElementById('access-token').value };
        clients.push(newClient);
        saveClients();
        renderClientsOnSettingsPage();
        populateClientSelector();
        event.target.reset();
        alert('Cliente adicionado com sucesso!');
    }

    function handleRemoveClient(event) {
        if (event.target.classList.contains('btn-danger')) {
            const clientIndex = parseInt(event.target.getAttribute('data-index'));
            if (confirm(`Tem certeza que deseja remover "${clients[clientIndex].name}"?`)) {
                clients.splice(clientIndex, 1);
                saveClients();
                renderClientsOnSettingsPage();
                populateClientSelector();
            }
        }
    }

    function renderMetricsSelector() {
        const container = document.getElementById('metrics-selector-container');
        container.innerHTML = '';
        const groups = {};
        availableMetrics.forEach(metric => {
            if (!groups[metric.group]) groups[metric.group] = [];
            groups[metric.group].push(metric);
        });
        for (const groupName in groups) {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'metric-group';
            let itemsHtml = `<legend>${groupName}</legend>`;
            groups[groupName].forEach(metric => {
                const isChecked = selectedMetrics.includes(metric.id) ? 'checked' : '';
                itemsHtml += `<div class="metric-item"><input type="checkbox" id="metric-${metric.id}" value="${metric.id}" ${isChecked}><label for="metric-${metric.id}">${metric.label}</label></div>`;
            });
            fieldset.innerHTML = itemsHtml;
            container.appendChild(fieldset);
        }
    }

    function handleSaveMetrics() {
        const checkboxes = document.querySelectorAll('#metrics-selector-container input[type="checkbox"]:checked');
        selectedMetrics = Array.from(checkboxes).map(cb => cb.value);
        localStorage.setItem('crmSelectedMetrics', JSON.stringify(selectedMetrics));
        alert('Métricas salvas com sucesso!');
        if (currentClient) {
            loadClientData(currentClient);
        }
    }

    // ======================= LÓGICA DE CONTROLE E NAVEGAÇÃO =======================
    async function loadClientData(client) {
        currentClient = client;
        document.querySelectorAll('.metric-card p').forEach(p => p.textContent = '...');
        const tableBody = document.getElementById('campaign-table-body');
        tableBody.innerHTML = `<tr><td colspan="${selectedMetrics.length + 1}" style="text-align:center;">Carregando dados...</td></tr>`;

        try {
            const [accountData, campaignData] = await Promise.all([
                fetchAccountMetrics(client.adAccountId, client.accessToken),
                fetchCampaignMetrics(client.adAccountId, client.accessToken)
            ]);
            currentAccountData = accountData;
            currentCampaignData = campaignData;
            updateDashboardCards(accountData);
            populateDynamicTable('campaign-table-body', campaignData);
        } catch (error) {
            alert(`Não foi possível carregar os dados: ${error.message}`);
            updateDashboardCards(null);
            populateDynamicTable('campaign-table-body', []);
        }
    }

    function populateClientSelector() {
        const selector = document.getElementById('client-selector');
        selector.innerHTML = '<option value="">-- Escolha uma conta --</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.adAccountId;
            option.textContent = client.name;
            selector.appendChild(option);
        });
    }

    function setupNavigation() {
        const sidebarLinks = document.querySelectorAll('.sidebar ul a[data-view]');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const targetViewId = link.getAttribute('data-view');
                if (!targetViewId) return;

                if (targetViewId === 'settings-view') {
                    renderClientsOnSettingsPage();
                    renderMetricsSelector();
                }
                if (targetViewId === 'reports-view') {
                    renderReport();
                }

                document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
                document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
                document.getElementById(targetViewId).classList.add('active-view');
                link.parentElement.classList.add('active');
            });
        });
    }

    // ======================= INICIALIZAÇÃO =======================
    function initialize() {
        populateClientSelector();
        setupNavigation();
        document.getElementById('add-client-form').addEventListener('submit', handleAddClient);
        document.getElementById('client-list').addEventListener('click', handleRemoveClient);
        document.getElementById('save-metrics-btn').addEventListener('click', handleSaveMetrics);
        document.getElementById('download-pdf-btn').addEventListener('click', generatePDF);
        document.getElementById('client-selector').addEventListener('change', (event) => {
            const selectedAccountId = event.target.value;
            if (selectedAccountId) {
                const selectedClient = clients.find(c => c.adAccountId === selectedAccountId);
                loadClientData(selectedClient);
            } else {
                currentClient = null; currentAccountData = null; currentCampaignData = [];
                updateDashboardCards(null);
                populateDynamicTable('campaign-table-body', []);
            }
        });
    }

    initialize();
});
