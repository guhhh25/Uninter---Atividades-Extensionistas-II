// Dashboard Manager - Handles all dashboard functionality
const Dashboard = {
    currentUser: null,
    expenses: [],
    categories: [],
    bills: [],
    deleteCallback: null,
    charts: {},
    chartColors: [
        '#820AD1', '#10B981', '#EF4444', '#F59E0B', '#3B82F6',
        '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#84CC16'
    ],

    // Initialize dashboard
    init() {
        // Check authentication
        Auth.requireAuth();
        this.currentUser = Auth.getCurrentUser();

        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        // Load theme preference
        this.loadTheme();

        // Load data
        this.loadData();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI
        this.updateUserInfo();
        this.renderGeral();
        this.renderCategories();
        this.renderBills();
        this.populateCategorySelects();
        this.populateChartCategorySelect();
        this.populateBillCategorySelect();
        this.setupBillModalPopulation();
        this.setupCurrencyFormatting();

        // Set default date for expense form
        document.getElementById('expenseDate').valueAsDate = new Date();
    },

    // Load user data
    loadData() {
        this.expenses = Storage.getUserExpenses(this.currentUser.id);
        this.categories = Storage.getUserCategories(this.currentUser.id);
        this.bills = Storage.getUserBills(this.currentUser.id);
    },

    // Setup event listeners
    setupEventListeners() {
        // Navigation
        document.getElementById('navGeral').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('geral');
        });
        
        document.getElementById('navDashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('dashboard');
        });
        
        document.getElementById('navExpenses').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('expenses');
        });
        
        document.getElementById('navCategories').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('categories');
        });

        document.getElementById('navBills').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('bills');
        });

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Deseja realmente sair?')) {
                Auth.logout();
            }
        });

        // Expense modal
        document.getElementById('saveExpenseBtn').addEventListener('click', () => this.saveExpense());
        
        // Category modal
        document.getElementById('saveCategoryBtn').addEventListener('click', () => this.saveCategory());

        // Bill modal
        document.getElementById('saveBillBtn').addEventListener('click', () => this.saveBill());

        // Delete confirmation
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            if (this.deleteCallback) {
                this.deleteCallback();
            }
        });

        // Filters
        document.getElementById('filterCategory').addEventListener('change', () => this.renderExpenses());
        document.getElementById('filterStartDate').addEventListener('change', () => this.renderExpenses());
        document.getElementById('filterEndDate').addEventListener('change', () => this.renderExpenses());
        document.getElementById('filterSearch').addEventListener('input', () => this.renderExpenses());

        // Chart filters
        document.getElementById('chartFilterCategory').addEventListener('change', () => this.renderCharts());
        document.getElementById('chartFilterStartDate').addEventListener('change', () => this.renderCharts());
        document.getElementById('chartFilterEndDate').addEventListener('change', () => this.renderCharts());
        document.getElementById('chartFilterPeriod').addEventListener('change', () => this.handlePeriodFilter());

        // Bill filters
        document.getElementById('billFilterStatus').addEventListener('change', () => this.renderBills());
        document.getElementById('billFilterMonth').addEventListener('change', () => this.renderBills());
        document.getElementById('billFilterSearch').addEventListener('input', () => this.renderBills());

        // Reset expense modal on close
        document.getElementById('expenseModal').addEventListener('hidden.bs.modal', () => {
            this.resetExpenseForm();
        });

        // Reset category modal on close
        document.getElementById('categoryModal').addEventListener('hidden.bs.modal', () => {
            this.resetCategoryForm();
        });

        // Reset bill modal on close
        document.getElementById('billModal').addEventListener('hidden.bs.modal', () => {
            this.resetBillForm();
        });
    },

    // Show section
    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
        
        // Remove active class from nav items
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
        // Show selected section
        document.getElementById(`${section}Section`).classList.remove('d-none');
        document.getElementById(`nav${section.charAt(0).toUpperCase() + section.slice(1)}`).classList.add('active');
        
        // Update page title
        const titles = {
            geral: 'Visão Geral',
            dashboard: 'Dashboard',
            expenses: 'Despesas',
            categories: 'Categorias',
            bills: 'Contas'
        };
        document.getElementById('pageTitle').textContent = titles[section];
        
        // Refresh data
        if (section === 'geral') {
            this.renderGeral();
        } else if (section === 'dashboard') {
            this.renderCharts();
        } else if (section === 'expenses') {
            this.renderExpenses();
        } else if (section === 'categories') {
            this.renderCategories();
        } else if (section === 'bills') {
            this.renderBills();
        }
    },

    // Update user info
    updateUserInfo() {
        document.getElementById('userName').textContent = this.currentUser.name;
    },

    // Render geral (old dashboard)
    renderGeral() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter expenses for current month
        const monthExpenses = this.expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        // Calculate total spent
        const totalSpent = monthExpenses.reduce((sum, e) => sum + parseFloat(e.value), 0);

        // Count expenses
        const expenseCount = monthExpenses.length;

        // Find top category
        const categoryTotals = {};
        monthExpenses.forEach(e => {
            const category = this.categories.find(c => c.id === e.categoryId);
            const categoryName = category ? category.name : 'Outros';
            categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + parseFloat(e.value);
        });

        let topCategory = '-';
        let maxTotal = 0;
        for (const [name, total] of Object.entries(categoryTotals)) {
            if (total > maxTotal) {
                maxTotal = total;
                topCategory = name;
            }
        }

        // Recent expenses (last 5)
        const recentExpenses = [...this.expenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        // Calculate bills prediction for current month
        const billsPrediction = this.bills.filter(b => !b.paid).reduce((sum, b) => sum + parseFloat(b.value), 0);

        // Update UI
        document.getElementById('totalSpent').textContent = this.formatCurrency(totalSpent);
        document.getElementById('expenseCount').textContent = expenseCount;
        document.getElementById('topCategory').textContent = topCategory;
        document.getElementById('recentCount').textContent = recentExpenses.length;
        document.getElementById('billsPrediction').textContent = this.formatCurrency(billsPrediction);

        // Render recent expenses table
        this.renderRecentExpenses(recentExpenses);
    },

    // Render recent expenses
    renderRecentExpenses(expenses) {
        const tbody = document.getElementById('recentExpensesTable');
        tbody.innerHTML = '';

        if (expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma despesa encontrada</td></tr>';
            return;
        }

        expenses.forEach(expense => {
            const category = this.categories.find(c => c.id === expense.categoryId);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(expense.date)}</td>
                <td>${expense.description}</td>
                <td><span class="badge bg-secondary">${category ? category.name : 'Outros'}</span></td>
                <td class="text-danger fw-bold">${this.formatCurrency(expense.value)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="Dashboard.editExpense(${expense.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="Dashboard.confirmDeleteExpense(${expense.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Render expenses table
    renderExpenses() {
        const tbody = document.getElementById('expensesTable');
        tbody.innerHTML = '';

        // Get filter values
        const filterCategory = document.getElementById('filterCategory').value;
        const filterStartDate = document.getElementById('filterStartDate').value;
        const filterEndDate = document.getElementById('filterEndDate').value;
        const filterSearch = document.getElementById('filterSearch').value.toLowerCase();

        // Filter expenses
        let filtered = [...this.expenses];

        if (filterCategory) {
            filtered = filtered.filter(e => e.categoryId === parseInt(filterCategory));
        }

        if (filterStartDate) {
            filtered = filtered.filter(e => new Date(e.date) >= new Date(filterStartDate));
        }

        if (filterEndDate) {
            filtered = filtered.filter(e => new Date(e.date) <= new Date(filterEndDate));
        }

        if (filterSearch) {
            filtered = filtered.filter(e => e.description.toLowerCase().includes(filterSearch));
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhuma despesa encontrada</td></tr>';
            return;
        }

        filtered.forEach(expense => {
            const category = this.categories.find(c => c.id === expense.categoryId);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(expense.date)}</td>
                <td>${expense.description}</td>
                <td><span class="badge bg-secondary">${category ? category.name : 'Outros'}</span></td>
                <td class="text-danger fw-bold">${this.formatCurrency(expense.value)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="Dashboard.editExpense(${expense.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="Dashboard.confirmDeleteExpense(${expense.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Render categories table
    renderCategories() {
        const tbody = document.getElementById('categoriesTable');
        tbody.innerHTML = '';

        // Separate default and user categories
        const defaultCategories = this.categories.filter(c => c.id <= 10);
        const userCategories = this.categories.filter(c => c.id > 10);

        // Render default categories
        defaultCategories.forEach(category => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category.name} <span class="badge bg-light text-muted ms-2">Padrão</span></td>
                <td>
                    <span class="text-muted small">Não editável</span>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Render user categories
        userCategories.forEach(category => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category.name}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="Dashboard.editCategory(${category.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="Dashboard.confirmDeleteCategory(${category.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        if (userCategories.length === 0 && defaultCategories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Nenhuma categoria encontrada</td></tr>';
        }
    },

    // Populate category selects
    populateCategorySelects() {
        const selects = [
            document.getElementById('expenseCategory'),
            document.getElementById('filterCategory')
        ];

        selects.forEach(select => {
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '';
            
            if (select.id === 'filterCategory') {
                select.innerHTML = '<option value="">Todas Categorias</option>';
            }

            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });

            select.value = currentValue;
        });
    },

    // Populate chart category select
    populateChartCategorySelect() {
        const select = document.getElementById('chartFilterCategory');
        if (!select) return;
        
        select.innerHTML = '<option value="">Todas Categorias</option>';
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    },

    // Populate bill category select
    populateBillCategorySelect() {
        const select = document.getElementById('billCategory');
        if (!select) return;
        
        select.innerHTML = '';
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    },

    // Populate bill category select when modal opens
    setupBillModalPopulation() {
        const billModal = document.getElementById('billModal');
        if (!billModal) return;

        billModal.addEventListener('show.bs.modal', () => {
            // Reload categories to ensure they're up to date
            this.categories = Storage.getUserCategories(this.currentUser.id);
            this.populateBillCategorySelect();
        });
    },

    // Setup currency formatting for bill value and expense value
    setupCurrencyFormatting() {
        // Use event delegation that works even when modal is dynamically loaded
        document.addEventListener('input', (e) => {
            if (e.target && (e.target.id === 'billValue' || e.target.id === 'expenseValue')) {
                let value = e.target.value.replace(/\D/g, '');
                if (value === '') {
                    e.target.value = '';
                    return;
                }
                
                value = (parseInt(value) / 100).toFixed(2);
                e.target.value = 'R$ ' + value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            }
        });

        document.addEventListener('blur', (e) => {
            if (e.target && (e.target.id === 'billValue' || e.target.id === 'expenseValue')) {
                if (e.target.value === '') {
                    e.target.value = 'R$ 0,00';
                }
            }
        }, true);
    },

    // Parse currency value
    parseCurrencyValue(valueString) {
        if (!valueString) return 0;
        const cleanValue = valueString.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(cleanValue) || 0;
    },

    // Save expense
    saveExpense() {
        const form = document.getElementById('expenseForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const expenseId = document.getElementById('expenseId').value;
        const expenseData = {
            description: document.getElementById('expenseDescription').value,
            value: this.parseCurrencyValue(document.getElementById('expenseValue').value),
            categoryId: parseInt(document.getElementById('expenseCategory').value),
            date: document.getElementById('expenseDate').value,
            userId: this.currentUser.id
        };

        if (expenseId) {
            // Update existing expense
            Storage.updateExpense(parseInt(expenseId), expenseData);
            this.showToast('Despesa atualizada com sucesso!', 'success');
        } else {
            // Add new expense
            Storage.addExpense(expenseData);
            this.showToast('Despesa cadastrada com sucesso!', 'success');
        }

        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('expenseModal'));
        modal.hide();

        this.loadData();
        this.renderGeral();
        this.renderExpenses();
        this.renderBills();
        this.renderCharts();
    },

    // Edit expense
    editExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (!expense) return;

        document.getElementById('expenseId').value = expense.id;
        document.getElementById('expenseDescription').value = expense.description;
        document.getElementById('expenseValue').value = this.formatCurrency(expense.value);
        document.getElementById('expenseCategory').value = expense.categoryId;
        document.getElementById('expenseDate').value = expense.date;

        document.getElementById('expenseModalTitle').textContent = 'Editar Despesa';

        const modal = new bootstrap.Modal(document.getElementById('expenseModal'));
        modal.show();
    },

    // Confirm delete expense
    confirmDeleteExpense(id) {
        this.deleteCallback = () => {
            Storage.deleteExpense(id);
            this.loadData();
            this.renderGeral();
            this.renderExpenses();
            this.renderBills();
            this.renderCharts();
            this.showToast('Despesa excluída com sucesso!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            modal.hide();
        };

        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    },

    // Save category
    saveCategory() {
        const form = document.getElementById('categoryForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const categoryId = document.getElementById('categoryId').value;
        const categoryName = document.getElementById('categoryName').value;

        if (categoryId) {
            // Update existing category
            Storage.updateUserCategory(this.currentUser.id, parseInt(categoryId), { name: categoryName });
            this.showToast('Categoria atualizada com sucesso!', 'success');
        } else {
            // Add new category
            Storage.addUserCategory(this.currentUser.id, { name: categoryName });
            this.showToast('Categoria cadastrada com sucesso!', 'success');
        }

        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
        modal.hide();

        this.loadData();
        this.renderCategories();
        this.populateCategorySelects();
    },

    // Edit category
    editCategory(id) {
        const category = this.categories.find(c => c.id === id);
        if (!category) return;

        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;

        document.getElementById('categoryModalTitle').textContent = 'Editar Categoria';

        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        modal.show();
    },

    // Confirm delete category
    confirmDeleteCategory(id) {
        this.deleteCallback = () => {
            Storage.deleteUserCategory(this.currentUser.id, id);
            this.loadData();
            this.renderCategories();
            this.populateCategorySelects();
            this.showToast('Categoria excluída com sucesso!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            modal.hide();
        };

        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    },

    // Reset expense form
    resetExpenseForm() {
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseId').value = '';
        document.getElementById('expenseModalTitle').textContent = 'Nova Despesa';
        document.getElementById('expenseDate').valueAsDate = new Date();
    },

    // Reset category form
    resetCategoryForm() {
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryModalTitle').textContent = 'Nova Categoria';
    },

    // Format currency
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    },

    // Show toast notification
    showToast(message, type) {
        const toast = document.getElementById('notificationToast');
        const toastMessage = document.getElementById('toastMessage');
        
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toastMessage.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    },

    // Render bills
    renderBills() {
        const tbody = document.getElementById('billsTable');
        tbody.innerHTML = '';

        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth();

        // Get filter values
        const filterStatus = document.getElementById('billFilterStatus').value;
        const filterMonth = document.getElementById('billFilterMonth').value;
        const filterSearch = document.getElementById('billFilterSearch').value.toLowerCase();

        // Filter bills
        let filtered = [...this.bills];

        // Only filter by status if a specific status is selected
        if (filterStatus === 'pending') {
            filtered = filtered.filter(b => !b.paid);
        } else if (filterStatus === 'paid') {
            filtered = filtered.filter(b => b.paid);
        }
        // If filterStatus is empty (all), show all bills regardless of paid status

        if (filterMonth) {
            const filterMonthNum = parseInt(filterMonth) - 1;
            filtered = filtered.filter(b => {
                if (b.dueDate) {
                    const billDate = new Date(b.dueDate);
                    return billDate.getMonth() === filterMonthNum;
                }
                // For recurring bills, show all since they repeat every month
                return true;
            });
        }

        if (filterSearch) {
            filtered = filtered.filter(b => b.description.toLowerCase().includes(filterSearch));
        }

        console.log('DEBUG - Filtered Bills:', filtered);

        // Sort by due date (handle both old and new formats)
        filtered.sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate) : new Date(2024, currentMonth, a.dueDay || 1);
            const dateB = b.dueDate ? new Date(b.dueDate) : new Date(2024, currentMonth, b.dueDay || 1);
            return dateA - dateB;
        });

        // Calculate summary
        const totalToPay = filtered.filter(b => !b.paid).reduce((sum, b) => sum + parseFloat(b.value), 0);
        const totalPaid = filtered.filter(b => b.paid).reduce((sum, b) => sum + parseFloat(b.value), 0);
        const pendingCount = filtered.filter(b => !b.paid).length;

        document.getElementById('billsTotalToPay').textContent = this.formatCurrency(totalToPay);
        document.getElementById('billsTotalPaid').textContent = this.formatCurrency(totalPaid);
        document.getElementById('billsPendingCount').textContent = pendingCount;

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhuma conta encontrada</td></tr>';
            return;
        }

        filtered.forEach(bill => {
            const category = this.categories.find(c => c.id === bill.categoryId);
            const row = document.createElement('tr');
            
            const statusBadge = bill.paid 
                ? '<span class="badge bg-success">Pago</span>' 
                : '<span class="badge bg-warning">Pendente</span>';
            
            // Handle old format (dueDate) vs new format (dueDay only)
            let dueDateStr, isOverdue;
            
            if (bill.dueDate) {
                // Old format - full date
                const billDate = new Date(bill.dueDate);
                dueDateStr = this.formatDate(bill.dueDate);
                isOverdue = !bill.paid && billDate < now;
            } else if (bill.dueDay !== undefined) {
                // New format - day only (recurring monthly)
                dueDateStr = `Dia ${bill.dueDay.toString().padStart(2, '0')}`;
                isOverdue = !bill.paid && bill.dueDay < currentDay;
            } else {
                // Fallback
                dueDateStr = 'N/A';
                isOverdue = false;
            }
            
            const rowClass = isOverdue ? 'table-danger' : '';
            row.className = rowClass;
            
            row.innerHTML = `
                <td>${bill.description}</td>
                <td>${dueDateStr}${isOverdue ? ' <small class="text-danger">(Vencida)</small>' : ''}</td>
                <td class="text-danger fw-bold">${this.formatCurrency(bill.value)}</td>
                <td><span class="badge bg-secondary">${category ? category.name : 'Outros'}</span></td>
                <td>${statusBadge}</td>
                <td>
                    ${!bill.paid ? `
                    <button class="btn btn-sm btn-outline-success me-1" onclick="Dashboard.markAsPaid(${bill.id})" title="Marcar como Pago">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    ` : `
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="Dashboard.markAsUnpaid(${bill.id})" title="Marcar como Pendente">
                        <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                    `}
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="Dashboard.editBill(${bill.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="Dashboard.confirmDeleteBill(${bill.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Save bill
    saveBill() {
        const form = document.getElementById('billForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const billId = document.getElementById('billId').value;
        const dueDay = parseInt(document.getElementById('billDueDay').value);
        
        const billData = {
            description: document.getElementById('billDescription').value,
            value: this.parseCurrencyValue(document.getElementById('billValue').value),
            categoryId: parseInt(document.getElementById('billCategory').value),
            dueDay: dueDay,
            userId: this.currentUser.id
        };

        if (billId) {
            // Update existing bill
            Storage.updateBill(parseInt(billId), billData);
            this.showToast('Conta atualizada com sucesso!', 'success');
        } else {
            // Add new bill
            Storage.addBill(billData);
            this.showToast('Conta cadastrada com sucesso!', 'success');
        }

        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('billModal'));
        modal.hide();

        // Reset filter to show all bills
        document.getElementById('billFilterStatus').value = '';
        document.getElementById('billFilterMonth').value = '';
        document.getElementById('billFilterSearch').value = '';

        // Reload data from storage to ensure we have the latest
        this.bills = Storage.getUserBills(this.currentUser.id);
        this.renderGeral();
        this.renderBills();
    },

    // Edit bill
    editBill(id) {
        const bill = this.bills.find(b => b.id === id);
        if (!bill) return;

        document.getElementById('billId').value = bill.id;
        document.getElementById('billDescription').value = bill.description;
        document.getElementById('billValue').value = this.formatCurrency(bill.value);
        document.getElementById('billCategory').value = bill.categoryId;
        document.getElementById('billDueDay').value = bill.dueDay || 1;

        document.getElementById('billModalTitle').textContent = 'Editar Conta';

        const modal = new bootstrap.Modal(document.getElementById('billModal'));
        modal.show();
    },

    // Mark bill as paid
    markAsPaid(id) {
        const bill = Storage.markBillAsPaid(id);
        if (bill) {
            // Create expense from paid bill
            const expenseData = {
                description: bill.description,
                value: bill.value,
                categoryId: bill.categoryId,
                date: bill.paidAt.split('T')[0],
                userId: this.currentUser.id
            };
            const expense = Storage.addExpense(expenseData);
            
            // Link expense to bill
            if (expense) {
                Storage.linkExpenseToBill(id, expense.id);
            }
            
            this.showToast('Conta marcada como paga e despesa registrada!', 'success');
        }

        // Reload data from storage to ensure we have the latest
        this.bills = Storage.getUserBills(this.currentUser.id);
        this.expenses = Storage.getUserExpenses(this.currentUser.id);
        this.renderGeral();
        this.renderBills();
        this.renderExpenses();
        this.renderCharts();
    },

    // Mark bill as unpaid
    markAsUnpaid(id) {
        Storage.markBillAsUnpaid(id);
        this.showToast('Conta marcada como pendente!', 'warning');

        // Reload data from storage to ensure we have the latest
        this.bills = Storage.getUserBills(this.currentUser.id);
        this.expenses = Storage.getUserExpenses(this.currentUser.id);
        this.renderGeral();
        this.renderBills();
        this.renderExpenses();
        this.renderCharts();
    },

    // Confirm delete bill
    confirmDeleteBill(id) {
        this.deleteCallback = () => {
            Storage.deleteBill(id);
            this.loadData();
            this.renderGeral();
            this.renderBills();
            this.showToast('Conta excluída com sucesso!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            modal.hide();
        };

        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    },

    // Reset bill form
    resetBillForm() {
        document.getElementById('billForm').reset();
        document.getElementById('billId').value = '';
        document.getElementById('billValue').value = '';
        document.getElementById('billModalTitle').textContent = 'Nova Conta';
    },

    // Load theme preference
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            const icon = document.querySelector('#themeToggle i');
            if (icon) {
                icon.classList.remove('bi-moon');
                icon.classList.add('bi-sun');
            }
        }
    },

    // Toggle theme
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const icon = document.querySelector('#themeToggle i');

        if (currentTheme === 'dark') {
            html.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (icon) {
                icon.classList.remove('bi-sun');
                icon.classList.add('bi-moon');
            }
        } else {
            html.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (icon) {
                icon.classList.remove('bi-moon');
                icon.classList.add('bi-sun');
            }
        }
    },

    // Handle period filter
    handlePeriodFilter() {
        const period = document.getElementById('chartFilterPeriod').value;
        const now = new Date();
        const startDateInput = document.getElementById('chartFilterStartDate');
        const endDateInput = document.getElementById('chartFilterEndDate');

        if (period === 'month') {
            startDateInput.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDateInput.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (period === 'lastmonth') {
            startDateInput.value = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            endDateInput.value = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        } else if (period === 'year') {
            startDateInput.value = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            endDateInput.value = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        } else {
            startDateInput.value = '';
            endDateInput.value = '';
        }

        this.renderCharts();
    },

    // Get filtered expenses for charts
    getFilteredExpensesForCharts() {
        const filterCategory = document.getElementById('chartFilterCategory').value;
        const filterStartDate = document.getElementById('chartFilterStartDate').value;
        const filterEndDate = document.getElementById('chartFilterEndDate').value;

        let filtered = [...this.expenses];

        if (filterCategory) {
            filtered = filtered.filter(e => e.categoryId === parseInt(filterCategory));
        }

        if (filterStartDate) {
            filtered = filtered.filter(e => new Date(e.date) >= new Date(filterStartDate));
        }

        if (filterEndDate) {
            filtered = filtered.filter(e => new Date(e.date) <= new Date(filterEndDate));
        }

        return filtered;
    },

    // Render all charts
    renderCharts() {
        const filteredExpenses = this.getFilteredExpensesForCharts();
        
        this.renderCategoryPieChart(filteredExpenses);
        this.renderMonthlyBarChart(filteredExpenses);
        this.renderExpenseLineChart(filteredExpenses);
        this.renderTopCategoriesChart(filteredExpenses);
    },

    // Render category pie chart
    renderCategoryPieChart(expenses) {
        const ctx = document.getElementById('categoryPieChart');
        if (!ctx) return;

        // Calculate category totals
        const categoryTotals = {};
        expenses.forEach(e => {
            const category = this.categories.find(c => c.id === e.categoryId);
            const categoryName = category ? category.name : 'Outros';
            categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + parseFloat(e.value);
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        if (this.charts.categoryPie) {
            this.charts.categoryPie.destroy();
        }

        this.charts.categoryPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: this.chartColors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${Dashboard.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // Render monthly bar chart
    renderMonthlyBarChart(expenses) {
        const ctx = document.getElementById('monthlyBarChart');
        if (!ctx) return;

        // Calculate monthly totals
        const monthlyTotals = {};
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        expenses.forEach(e => {
            const date = new Date(e.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + parseFloat(e.value);
        });

        // Sort by date
        const sortedMonths = Object.keys(monthlyTotals).sort();
        const labels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            return `${monthNames[parseInt(month)]}/${year.slice(2)}`;
        });
        const data = sortedMonths.map(m => monthlyTotals[m]);

        if (this.charts.monthlyBar) {
            this.charts.monthlyBar.destroy();
        }

        this.charts.monthlyBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos',
                    data: data,
                    backgroundColor: '#820AD1',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Gastos: ${Dashboard.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return Dashboard.formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    },

    // Render expense line chart
    renderExpenseLineChart(expenses) {
        const ctx = document.getElementById('expenseLineChart');
        if (!ctx) return;

        // Group expenses by date
        const dailyTotals = {};
        expenses.forEach(e => {
            dailyTotals[e.date] = (dailyTotals[e.date] || 0) + parseFloat(e.value);
        });

        // Sort by date
        const sortedDates = Object.keys(dailyTotals).sort();
        const labels = sortedDates.map(d => this.formatDate(d));
        const data = sortedDates.map(d => dailyTotals[d]);

        if (this.charts.expenseLine) {
            this.charts.expenseLine.destroy();
        }

        this.charts.expenseLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos Diários',
                    data: data,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Gastos: ${Dashboard.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return Dashboard.formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    },

    // Render top categories chart
    renderTopCategoriesChart(expenses) {
        const ctx = document.getElementById('topCategoriesChart');
        if (!ctx) return;

        // Calculate category totals
        const categoryTotals = {};
        expenses.forEach(e => {
            const category = this.categories.find(c => c.id === e.categoryId);
            const categoryName = category ? category.name : 'Outros';
            categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + parseFloat(e.value);
        });

        // Sort and get top 5
        const sorted = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const labels = sorted.map(s => s[0]);
        const data = sorted.map(s => s[1]);

        if (this.charts.topCategories) {
            this.charts.topCategories.destroy();
        }

        this.charts.topCategories = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos',
                    data: data,
                    backgroundColor: this.chartColors.slice(0, 5),
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Gastos: ${Dashboard.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return Dashboard.formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
