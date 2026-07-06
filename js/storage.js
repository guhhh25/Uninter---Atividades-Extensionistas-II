// Storage Manager - Handles all LocalStorage operations
const Storage = {
    // Get data from LocalStorage
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    // Set data to LocalStorage
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    // Remove data from LocalStorage
    remove(key) {
        localStorage.removeItem(key);
    },

    // Clear all data
    clear() {
        localStorage.clear();
    },

    // Initialize default data structure
    initialize() {
        if (!this.get('users')) {
            this.set('users', []);
        }
        // Always update categories to ensure they have the latest structure
        this.set('categories', [
            { id: 1, name: 'Alimentação' },
            { id: 2, name: 'Aluguel' },
            { id: 3, name: 'Farmácia' },
            { id: 4, name: 'Transporte' },
            { id: 5, name: 'Lazer' },
            { id: 6, name: 'Saúde' },
            { id: 7, name: 'Educação' },
            { id: 8, name: 'Internet' },
            { id: 9, name: 'Contas em Geral' }
        ]);
        if (!this.get('expenses')) {
            this.set('expenses', []);
        }
        if (!this.get('bills')) {
            this.set('bills', []);
        }
    },

    // Get user-specific data
    getUserData(userId) {
        const users = this.get('users') || [];
        return users.find(u => u.id === userId);
    },

    // Get user's expenses
    getUserExpenses(userId) {
        const expenses = this.get('expenses') || [];
        return expenses.filter(e => e.userId === userId);
    },

    // Get user's categories
    getUserCategories(userId) {
        const categories = this.get('categories') || [];
        const userCategories = this.get(`userCategories_${userId}`) || [];
        return [...categories, ...userCategories];
    },

    // Add user-specific category
    addUserCategory(userId, category) {
        const userCategories = this.get(`userCategories_${userId}`) || [];
        const newCategory = {
            id: Date.now(),
            name: category.name
        };
        userCategories.push(newCategory);
        this.set(`userCategories_${userId}`, userCategories);
        return newCategory;
    },

    // Update user-specific category
    updateUserCategory(userId, categoryId, name) {
        const userCategories = this.get(`userCategories_${userId}`) || [];
        const index = userCategories.findIndex(c => c.id === categoryId);
        if (index !== -1) {
            userCategories[index].name = name;
            this.set(`userCategories_${userId}`, userCategories);
            return true;
        }
        return false;
    },

    // Delete user-specific category
    deleteUserCategory(userId, categoryId) {
        const userCategories = this.get(`userCategories_${userId}`) || [];
        const filtered = userCategories.filter(c => c.id !== categoryId);
        this.set(`userCategories_${userId}`, filtered);
    },

    // Add expense
    addExpense(expense) {
        const expenses = this.get('expenses') || [];
        const newExpense = {
            id: Date.now(),
            ...expense
        };
        expenses.push(newExpense);
        this.set('expenses', expenses);
        return newExpense;
    },

    // Update expense
    updateExpense(expenseId, expenseData) {
        const expenses = this.get('expenses') || [];
        const index = expenses.findIndex(e => e.id === expenseId);
        if (index !== -1) {
            expenses[index] = { ...expenses[index], ...expenseData };
            this.set('expenses', expenses);
            return true;
        }
        return false;
    },

    // Delete expense
    deleteExpense(expenseId) {
        const expenses = this.get('expenses') || [];
        const filtered = expenses.filter(e => e.id !== expenseId);
        this.set('expenses', filtered);
    },

    // Get user's bills
    getUserBills(userId) {
        const bills = this.get('bills') || [];
        return bills.filter(b => b.userId === userId);
    },

    // Add bill
    addBill(bill) {
        const bills = this.get('bills') || [];
        const newBill = {
            id: Date.now(),
            ...bill,
            paid: false,
            paidAt: null
        };
        bills.push(newBill);
        this.set('bills', bills);
        return newBill;
    },

    // Update bill
    updateBill(billId, billData) {
        const bills = this.get('bills') || [];
        const index = bills.findIndex(b => b.id === billId);
        if (index !== -1) {
            bills[index] = { ...bills[index], ...billData };
            this.set('bills', bills);
            return true;
        }
        return false;
    },

    // Mark bill as paid
    markBillAsPaid(billId) {
        const bills = this.get('bills') || [];
        const index = bills.findIndex(b => b.id === billId);
        if (index !== -1) {
            const now = new Date();
            const bill = bills[index];
            
            // Calculate payment date based on current month and bill's due day
            const paymentDate = new Date(now.getFullYear(), now.getMonth(), bill.dueDay);
            
            bills[index].paid = true;
            bills[index].paidAt = paymentDate.toISOString();
            this.set('bills', bills);
            return bills[index];
        }
        return null;
    },

    // Mark bill as unpaid
    markBillAsUnpaid(billId) {
        const bills = this.get('bills') || [];
        const index = bills.findIndex(b => b.id === billId);
        if (index !== -1) {
            bills[index].paid = false;
            bills[index].paidAt = null;
            this.set('bills', bills);
            return true;
        }
        return false;
    },

    // Delete bill
    deleteBill(billId) {
        const bills = this.get('bills') || [];
        const filtered = bills.filter(b => b.id !== billId);
        this.set('bills', filtered);
    }
};

// Initialize storage on load
Storage.initialize();
