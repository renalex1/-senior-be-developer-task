import { Message } from './Database';

interface MessageWithRetry extends Message {
    retryCount: number;
    retryDelay: number;      // Delay before retrying after a failure (in milliseconds)
    lastAttempt: number;     // Time of the last attempt
    processingStart: number; // Time when processing started
    ttl: number;             // Time-to-live for the message (in milliseconds)
    lockExpiry?: number;     // Optional lock expiry time (in milliseconds)
}

export class Queue {
    private readonly messages: MessageWithRetry[] = [];
    private readonly deadQueue: MessageWithRetry[] = [];
    private readonly processedMessageIds: Set<string> = new Set();
    private readonly keyProcessingLocks: Map<string, boolean> = new Map();
    private readonly workerProcessingLocks: Map<number, boolean> = new Map();
    private readonly messageKeyMap: Map<string, string> = new Map();

    // Constants for retry logic
    private static readonly MAX_RETRY_ATTEMPTS = 5;      // Maximum number of retry attempts
    private static readonly INITIAL_RETRY_DELAY = 1000;  // Initial delay (1 second)
    private static readonly RETRY_TIMEOUT_MS = 5000;     // Timeout for retry (5 seconds)
    private static readonly DEFAULT_TTL = 60000;         // 1 minute TTL
    private static readonly LOCK_EXPIRY_MS = 10000;      // Lock expiry time in milliseconds

    /**
     * Adds a message to the queue.
     * @param message The message to add to the queue
     */
    public Enqueue(message: Message): void {
        const now = Date.now();
        const messageWithRetry: MessageWithRetry = {
            ...message,
            retryCount: 0,
            retryDelay: Queue.INITIAL_RETRY_DELAY,
            lastAttempt: now,
            processingStart: now,
            ttl: Queue.DEFAULT_TTL,
            lockExpiry: now + Queue.LOCK_EXPIRY_MS,
        };
        this.messages.push(messageWithRetry);
    }

    /**
     * Retrieves a message from the queue for processing by a worker.
     * Locks the message and worker to prevent multiple workers from processing it at the same time.
     * @param workerId  The ID of the worker taking the task
     * @returns The message to process, or undefined if no messages are available
     */
    public Dequeue(workerId: number): MessageWithRetry | undefined {
        const now = Date.now();
        for (let i = 0; i < this.messages.length; i++) {
            const message = this.messages[i];

            // Check if the TTL has expired
            if (now - message.processingStart > message.ttl) {
                this.deadQueue.push(message);
                this.messages.splice(i, 1);
                i--;
                continue;
            }

            // Check if the lock has expired
            if (message.lockExpiry && now > message.lockExpiry) {
                this.releaseMessage(message.id);
                continue;
            }

            // Check if this message has already been processed
            if (this.processedMessageIds.has(message.id)) {
                continue;
            }

            // Check if the key is already locked for processing
            if (this.keyProcessingLocks.get(message.key)) {
                continue;
            }

            // Check if the retry limit has been reached
            if (message.retryCount >= Queue.MAX_RETRY_ATTEMPTS) {
                this.deadQueue.push(message);
                this.messages.splice(i, 1);
                i--;
                continue;
            }

            // Retry logic
            if (now - message.processingStart > Queue.RETRY_TIMEOUT_MS) {
                const retryDelay = Math.pow(2, message.retryCount) * message.retryDelay;
                if (now - message.lastAttempt < retryDelay) {
                    continue;
                }

                // Restart processing
                message.processingStart = now;
                message.retryCount++;
                message.lastAttempt = now;
                this.lockMessage(message);
                this.lockWorker(workerId);
                this.messages.splice(i, 1);
                i--;
                return message;
            }

            // Regular processing
            message.retryCount++;
            message.lastAttempt = now;
            this.lockMessage(message);
            this.lockWorker(workerId);
            this.messages.splice(i, 1);
            i--;
            return message;
        }

        return undefined;
    }

    /**
     * Marks a task as completed and removes it from the in-progress list.
     * @param workerId The ID of the worker confirming completion
     * @param messageId The ID of the completed message
     */
    public Confirm(workerId: number, messageId: string): void {
        if (this.processedMessageIds.has(messageId)) {
            return; // Message has already been confirmed
        }
        this.releaseMessage(messageId);
        this.processedMessageIds.add(messageId);
        this.releaseWorker(workerId);
    }

    /**
     * Retrieves the size of the queue.
     * @returns The number of messages in the queue
     */
    public Size(): number {
        return this.messages.length;
    }

    /**
     * This is an optional feature that can be used if necessary.
     * Forces the unlock of a message by its associated key.
     * This method removes the lock for the specified key, allowing other workers to process the message.
     * @param key The key associated with the message to unlock
     */
    public ForceUnlock(key: string): void {
        if (this.keyProcessingLocks.has(key)) {
            this.keyProcessingLocks.delete(key);
            const messageId = [...this.messageKeyMap.entries()].find(([_, storedKey]) => storedKey === key)?.[0];
            if (messageId) {
                this.messageKeyMap.delete(messageId);
            }
        }
    }

    /**
     * This is an optional feature that can be used if necessary.
     * Retrieves the dead queue for analysis or retries.
     * @returns The list of dead messages
     */
    public GetDeadQueue(): MessageWithRetry[] {
        return this.deadQueue;
    }

    /**
     * This is an optional feature that can be used if necessary.
     * Retries processing of messages in the dead queue.
     */
    public RetryDeadQueue(): void {
        for (let i = 0; i < this.deadQueue.length; i++) {
            const message = this.deadQueue[i];

            // Check if retry is possible
            if (message.retryCount < Queue.MAX_RETRY_ATTEMPTS) {
                message.retryCount++;
                message.lastAttempt = Date.now();
                this.Enqueue(message);
                this.deadQueue.splice(i, 1);
                i--;
            }
        }
    }

    /**
     * This is an optional feature that can be used if necessary.
     * Resets the state of the queue, clearing all messages and processed state.
     */
    public Reset(): void {
        this.messages.length = 0;
        this.deadQueue.length = 0;
        this.processedMessageIds.clear();
        this.keyProcessingLocks.clear();
        this.messageKeyMap.clear();
        this.workerProcessingLocks.clear(); // Clear worker locks
    }

    /**
     * Locks a message for processing.
     * @param message The message to lock
     */
    private lockMessage(message: MessageWithRetry): void {
        this.keyProcessingLocks.set(message.key, true);
        this.messageKeyMap.set(message.id, message.key);
    }

    /**
     * Releases a message lock.
     * @param messageId The ID of the message to release
     */
    private releaseMessage(messageId: string): void {
        const key = this.messageKeyMap.get(messageId);
        if (key) {
            this.keyProcessingLocks.delete(key);
            this.messageKeyMap.delete(messageId);
        }
    }

    /**
     * Locks a worker for processing.
     * @param workerId The ID of the worker to lock
     */
    private lockWorker(workerId: number): void {
        this.workerProcessingLocks.set(workerId, true);
    }

    /**
     * Releases a worker lock.
     * @param workerId The ID of the worker to release
     */
    private releaseWorker(workerId: number): void {
        this.workerProcessingLocks.delete(workerId);
    }
}
