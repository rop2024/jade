class ErrorHandler {
    constructor({ logger, mainWindow }) {
        this.logger = logger;
        this.mainWindow = mainWindow;
        this.errorCount = 0;
        this.errorHistory = [];
    }

    async handleError(error, context = {}) {
        this.errorCount++;
        this.errorHistory.push({
            error: error.message,
            context,
            timestamp: new Date(),
            stack: error.stack,
        });

        if (this.errorHistory.length > 100) {
            this.errorHistory.shift();
        }

        if (this.logger) {
            await this.logger.logError(error, context.operation || 'unknown');
        }

        return {
            handled: true,
            recoverable: error.recoverable !== false,
            retryable: true, // Update per-error-type as needed
            userMessage: error.userMessage || error.message,
            action: 'retry',
        };
    }

    async retryWithBackoff(operation, maxAttempts = 3, baseDelay = 1000) {
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (error.recoverable === false) {
                    throw error;
                }

                const delay = baseDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * 0.5 + 0.75;
                const actualDelay = delay * jitter;

                if (this.logger) {
                    await this.logger.log(`Retry ${attempt}/${maxAttempts} after ${Math.round(actualDelay)}ms`, 'RETRY');
                }

                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, actualDelay));
                }
            }
        }

        throw lastError;
    }

    getStats() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorHistory.slice(-10),
            uniqueErrors: new Set(this.errorHistory.map(e => e.error)).size,
        };
    }

    clearHistory() {
        this.errorHistory = [];
        this.errorCount = 0;
    }
}

module.exports = { ErrorHandler };
