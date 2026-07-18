export default class ChessTimer {
    private timerId: NodeJS.Timeout | null = null;
    private startTime: number = 0;
    private remainingTime: number = 0;
    private isRunning: boolean = false;

    constructor(initialTime: number) {
        this.remainingTime = initialTime;
    }

    start(callback: (remainingTime: number) => void) {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = Date.now();
            this.timerId = setInterval(() => {
                const elapsedTime = Date.now() - this.startTime;
                this.remainingTime = Math.max(
                    0,
                    this.remainingTime - elapsedTime
                );
                this.startTime = Date.now();
                callback(this.remainingTime);
                if (this.remainingTime === 0) {
                    this.stop();
                }
            }, 1000);
        }
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            if (this.timerId) {
                clearInterval(this.timerId);
                this.timerId = null;
            }
        }
    }

    getRemainingTime(): number {
        return this.remainingTime;
    }
}
