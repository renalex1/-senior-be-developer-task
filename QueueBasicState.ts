import { Message } from "./Database";

type TaskState = "queued" | "processing" | "done";

interface Task {
    message: Message;
    state: TaskState;
    workerId?: number;
    attempts: number;
}

export class Queue {
    private tasks: Map<string, Task> = new Map(); 

    Enqueue(message: Message): void {
        if (!this.tasks.has(message.id)) {
            this.tasks.set(message.id, {
                message,
                state: "queued",
                attempts: 0,
            });
        }
    }


    Dequeue(workerId: number): Message | undefined {
        for (const task of this.tasks.values()) {
            if (task.state === "queued" && !this.isKeyInProcessing(task.message.key)) {
                task.state = "processing";
                task.workerId = workerId;
                task.attempts += 1;
                return task.message;
            }
        }
        return undefined;
    }

    Confirm(workerId: number, messageId: string): void {
        const task = this.tasks.get(messageId);
        if (task && task.state === "processing" && task.workerId === workerId) {
            task.state = "done";
            task.workerId = undefined;
        }
    }

    private isKeyInProcessing(key: string): boolean {
        for (const task of this.tasks.values()) {
            if (task.state === "processing" && task.message.key === key) {
                return true;
            }
        }
        return false;
    }

    Size(): number {
        let count = 0;
        for (const task of this.tasks.values()) {
            if (task.state === "queued") count++;
        }
        return count;
    }

    InProcessing(): number {
        let count = 0;
        for (const task of this.tasks.values()) {
            if (task.state === "processing") count++;
        }
        return count;
    }

    Done(): number {
        let count = 0;
        for (const task of this.tasks.values()) {
            if (task.state === "done") count++;
        }
        return count;
    }
}
