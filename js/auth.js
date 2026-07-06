// Authentication Manager - Handles user authentication with Crypto API
const Auth = {
    // Hash password using Web Crypto API
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },

    // Register new user
    async register(email, password, name) {
        const users = Storage.get('users') || [];
        
        // Check if email already exists
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email já cadastrado' };
        }

        // Hash password
        const hashedPassword = await this.hashPassword(password);

        // Create new user
        const newUser = {
            id: Date.now(),
            email,
            password: hashedPassword,
            name,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        Storage.set('users', users);

        return { success: true, message: 'Cadastro realizado com sucesso' };
    },

    // Login user
    async login(email, password) {
        const users = Storage.get('users') || [];
        const hashedPassword = await this.hashPassword(password);
        
        const user = users.find(u => u.email === email && u.password === hashedPassword);
        
        if (user) {
            // Set current user in session
            Storage.set('currentUser', {
                id: user.id,
                email: user.email,
                name: user.name
            });
            return { success: true, message: 'Login realizado com sucesso', user };
        }

        return { success: false, message: 'Email ou senha incorretos' };
    },

    // Logout user
    logout() {
        Storage.remove('currentUser');
        window.location.href = 'login.html';
    },

    // Get current logged user
    getCurrentUser() {
        return Storage.get('currentUser');
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    // Protect routes - redirect to login if not authenticated
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
        }
    },

    // Redirect to dashboard if already logged in
    redirectIfAuthenticated() {
        if (this.isLoggedIn()) {
            window.location.href = 'dashboard.html';
        }
    }
};
